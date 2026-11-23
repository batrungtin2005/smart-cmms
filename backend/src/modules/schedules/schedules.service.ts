import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DataSource, EntityManager } from "typeorm";
import { Asset } from "../assets/entities/asset.entity";
import { WorkOrder } from "../work-orders/entities/work-order.entity";
import { MaintenanceSchedule, ScheduleType } from "./entities/maintenance-schedule.entity";
import { AssetReading } from "./entities/asset-reading.entity";
import { ScheduleTrigger } from "./entities/schedule-trigger.entity";
import { PmActor, requirePmManager, lockPm, OPEN_STATUSES } from "./pm.types";
import { QuerySchedulesDto, ScheduleDto, UpdateScheduleDto, ScheduleActivationDto, PmPageDto } from "./dto/schedule.dto";
import { evaluateSchedule } from "./schedule-evaluator";

@Injectable()
export class SchedulesService {
  constructor(private readonly db: DataSource) {}

  private async config(manager: EntityManager, dto: ScheduleDto, excluding?: string) {
    const asset = await manager.findOne(Asset, { where: { id: dto.assetId, isActive: true }, lock: { mode: "pessimistic_write" } });
    if (!asset || asset.status === "DECOMMISSIONED") throw new BadRequestException("Asset is unavailable");
    const time = dto.scheduleType === ScheduleType.TIME_BASED;
    const usage = dto.scheduleType === ScheduleType.USAGE_BASED;
    const condition = dto.scheduleType === ScheduleType.CONDITION_BASED;
    if ((time && (!dto.intervalDays || !dto.nextDueDate)) || (usage && (!dto.intervalHours || dto.nextDueHours == null)) ||
      (condition && (!dto.conditionParameter || dto.conditionThreshold == null || !dto.conditionOperator || !dto.maxReadingAgeMinutes || !dto.cooldownMinutes || !dto.measurementLocation?.trim()))) {
      throw new BadRequestException("Required schedule configuration is missing");
    }
    const forbidden = time ? [dto.intervalHours, dto.nextDueHours, dto.conditionParameter, dto.conditionThreshold, dto.conditionOperator, dto.maxReadingAgeMinutes, dto.cooldownMinutes, dto.measurementLocation]
      : usage ? [dto.intervalDays, dto.nextDueDate, dto.conditionParameter, dto.conditionThreshold, dto.conditionOperator, dto.maxReadingAgeMinutes, dto.cooldownMinutes, dto.measurementLocation]
      : [dto.intervalDays, dto.nextDueDate, dto.intervalHours, dto.nextDueHours];
    if (forbidden.some(value => value != null)) throw new BadRequestException("Configuration contains fields for a different schedule type");
    if (condition) {
      if (dto.conditionParameter === "VIBRATION" && dto.conditionThreshold < 0) throw new BadRequestException("Vibration threshold cannot be negative");
      const other = await manager.getRepository(MaintenanceSchedule).createQueryBuilder("s")
        .where("s.assetId = :asset AND s.conditionParameter = :parameter", { asset: dto.assetId, parameter: dto.conditionParameter })
        .andWhere("s.id <> :id", { id: excluding ?? "00000000-0000-0000-0000-000000000000" }).getMany();
      if (other.some(s => s.measurementLocation && s.measurementLocation !== dto.measurementLocation.trim())) throw new ConflictException("This template supports one measurement location per asset/parameter");
    }
    return {
      assetId: dto.assetId, title: dto.title.trim(), description: dto.description ?? null, scheduleType: dto.scheduleType,
      priority: dto.priority, intervalDays: dto.intervalDays ?? null, nextDueDate: dto.nextDueDate ?? null,
      intervalHours: dto.intervalHours ?? null, nextDueHours: dto.nextDueHours ?? null,
      conditionParameter: dto.conditionParameter ?? null, conditionThreshold: dto.conditionThreshold ?? null,
      conditionOperator: dto.conditionOperator ?? null, maxReadingAgeMinutes: dto.maxReadingAgeMinutes ?? null,
      cooldownMinutes: dto.cooldownMinutes ?? null, measurementLocation: dto.measurementLocation?.trim() ?? null,
      advanceNoticeDays: dto.advanceNoticeDays,
    };
  }

  async create(dto: ScheduleDto, actor: PmActor) {
    requirePmManager(actor);
    return this.db.transaction(async manager => {
      await lockPm(manager);
      const config = await this.config(manager, dto);
      return manager.save(MaintenanceSchedule, manager.create(MaintenanceSchedule, { ...config, scheduleCode: `PM-${randomUUID()}`, createdById: actor.id }));
    });
  }
  async update(id: string, dto: UpdateScheduleDto, actor: PmActor) {
    requirePmManager(actor);
    return this.db.transaction(async manager => {
      await lockPm(manager);
      const schedule = await manager.findOneBy(MaintenanceSchedule, { id });
      if (!schedule) throw new NotFoundException();
      if (schedule.revision !== dto.expectedRevision) throw new ConflictException("Schedule was changed; reload it first");
      if (schedule.assetId !== dto.assetId || schedule.scheduleType !== dto.scheduleType) throw new BadRequestException("Asset and type are immutable; create another schedule");
      if (await this.openOrder(manager, id)) throw new ConflictException("Cannot edit configuration while a PM work order is open");
      if (schedule.measurementLocation && dto.measurementLocation?.trim() !== schedule.measurementLocation) throw new ConflictException("Measurement location cannot be changed after configuration");
      Object.assign(schedule, await this.config(manager, dto, id));
      schedule.revision += 1;
      return manager.save(MaintenanceSchedule, schedule);
    });
  }
  async activation(id: string, dto: ScheduleActivationDto, actor: PmActor) {
    requirePmManager(actor);
    return this.db.transaction(async manager => {
      await lockPm(manager);
      const schedule = await manager.findOneBy(MaintenanceSchedule, { id });
      if (!schedule) throw new NotFoundException();
      if (schedule.revision !== dto.expectedRevision) throw new ConflictException("Schedule was changed; reload it first");
      schedule.isActive = dto.isActive;
      schedule.revision += 1;
      return manager.save(MaintenanceSchedule, schedule);
    });
  }
  async openOrder(manager: EntityManager, scheduleId: string) {
    return manager.getRepository(WorkOrder).createQueryBuilder("wo")
      .where("wo.scheduleId = :id AND wo.status IN (:...states)", { id: scheduleId, states: OPEN_STATUSES }).getOne();
  }
  async state(manager: EntityManager, schedule: MaintenanceSchedule, now = new Date()) {
    const parameter = schedule.scheduleType === ScheduleType.USAGE_BASED ? "OPERATING_HOURS" : schedule.conditionParameter;
    const reading = parameter ? await manager.findOne(AssetReading, { where: { assetId: schedule.assetId, parameter, isCurrentVersion: true }, order: { measuredAt: "DESC" } }) : null;
    const result = evaluateSchedule(schedule, reading, now);
    const open = await this.openOrder(manager, schedule.id);
    const asset = await manager.findOneBy(Asset, { id: schedule.assetId });
    return { ...result, due: result.due && !open && !!asset?.isActive && asset.status !== "DECOMMISSIONED",
      state: !asset?.isActive || asset.status === "DECOMMISSIONED" ? "ASSET_UNAVAILABLE" : open ? "WORK_ORDER_OPEN" : result.state,
      conditionState: result.state, blockingWorkOrderId: open?.id ?? null, latestReading: reading };
  }
  async detail(id: string, actor: PmActor) {
    requirePmManager(actor);
    const schedule = await this.db.manager.findOneBy(MaintenanceSchedule, { id });
    if (!schedule) throw new NotFoundException();
    return { ...schedule, evaluation: await this.state(this.db.manager, schedule) };
  }
  async list(query: QuerySchedulesDto, actor: PmActor, dueOnly = false) {
    requirePmManager(actor);
    const qb = this.db.getRepository(MaintenanceSchedule).createQueryBuilder("s");
    if (query.assetId) qb.andWhere("s.assetId = :assetId", { assetId: query.assetId });
    if (query.scheduleType) qb.andWhere("s.scheduleType = :type", { type: query.scheduleType });
    if (query.active) qb.andWhere("s.isActive = :active", { active: query.active === "true" });
    // /due evaluates the filtered set before pagination so no due rows disappear between pages.
    if (dueOnly) {
      const rows = await qb.orderBy("s.id", "ASC").getMany();
      const evaluated = [];
      for (const schedule of rows) {
        const evaluation = await this.state(this.db.manager, schedule);
        if (evaluation.due || evaluation.state === "UPCOMING") evaluated.push({ ...schedule, evaluation });
      }
      return { items: evaluated.slice((query.page - 1) * query.limit, query.page * query.limit), meta: { total: evaluated.length, page: query.page, limit: query.limit } };
    }
    const [items, total] = await qb.orderBy("s.createdAt", "DESC").addOrderBy("s.id", "ASC").skip((query.page - 1) * query.limit).take(query.limit).getManyAndCount();
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }
  async workOrders(id: string, query: PmPageDto, actor: PmActor) {
    await this.detail(id, actor);
    const [items, total] = await this.db.getRepository(ScheduleTrigger).findAndCount({ where: { scheduleId: id }, relations: { workOrder: true }, order: { cycle: "DESC" }, skip: (query.page - 1) * query.limit, take: query.limit });
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }
}
