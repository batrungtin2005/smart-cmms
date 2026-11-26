import { Injectable, ConflictException, Logger } from "@nestjs/common";
import { DataSource, MoreThan } from "typeorm";
import { Asset } from "../assets/entities/asset.entity";
import { WorkOrdersService } from "../work-orders/work-orders.service";
import { MaintenanceSchedule } from "./entities/maintenance-schedule.entity";
import { ScheduleTrigger } from "./entities/schedule-trigger.entity";
import { SchedulesService } from "./schedules.service";
import { lockPm } from "./pm.types";

@Injectable()
export class ScheduleEngine {
  private readonly logger = new Logger(ScheduleEngine.name);
  constructor(private readonly db: DataSource, private readonly schedules: SchedulesService, private readonly workOrders: WorkOrdersService) {}

  async evaluate(id: string) {
    try {
      return await this.db.transaction(async manager => {
        await lockPm(manager);
        const schedule = await manager.findOne(MaintenanceSchedule, { where: { id }, lock: { mode: "pessimistic_write" } });
        if (!schedule) return null;
        // Same advisory lock precedes lifecycle row locks, so schedule/WO ordering cannot deadlock.
        await manager.findOne(Asset, { where: { id: schedule.assetId }, lock: { mode: "pessimistic_write" } });
        const now = new Date();
        const evaluation = await this.schedules.state(manager, schedule, now);
        schedule.lastEvaluatedAt = now;
        schedule.lastError = null;
        if (!evaluation.due) {
          await manager.save(MaintenanceSchedule, schedule);
          return { scheduleId: id, ...evaluation, workOrderId: null };
        }
        const existing = await manager.findOneBy(ScheduleTrigger, { scheduleId: id, cycle: schedule.cycle });
        if (existing) throw new ConflictException("Cycle already triggered; reconcile its work order before retrying");
        const system = await manager.query(`SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id
          WHERE u.username = '__pm_scheduler__' AND u.is_active = false AND r.name = 'ADMIN'`);
        if (!system.length) throw new ConflictException("Disabled PM system account is missing; apply the PM migration");
        const candidates = await manager.query(`SELECT u.id,
          (SELECT count(*) FROM work_orders wo WHERE wo.assigned_technician_id = u.id AND wo.status IN ('ASSIGNED','IN_PROGRESS','ON_HOLD','COMPLETED','REWORK_REQUIRED')) AS load,
          (SELECT max(t.created_at) FROM schedule_triggers t WHERE t.assigned_technician_id = u.id) AS last_auto
          FROM users u JOIN roles r ON r.id = u.role_id WHERE u.is_active = true AND r.name = 'TECHNICIAN'
          ORDER BY load ASC, last_auto ASC NULLS FIRST, u.id ASC LIMIT 1 FOR UPDATE OF u`);
        const technicianId = candidates[0]?.id ?? null;
        const wo = await this.workOrders.createScheduled(manager, schedule, system[0].id, technicianId);
        await manager.save(ScheduleTrigger, manager.create(ScheduleTrigger, {
          scheduleId: id, cycle: schedule.cycle, workOrderId: wo.id,
          readingId: evaluation.readingId, assignedTechnicianId: technicianId,
          snapshot: { scheduleCode: schedule.scheduleCode, revision: schedule.revision, type: schedule.scheduleType,
            intervalDays: schedule.intervalDays, intervalHours: schedule.intervalHours, nextDueDate: schedule.nextDueDate,
            nextDueHours: schedule.nextDueHours, parameter: schedule.conditionParameter, threshold: schedule.conditionThreshold,
            operator: schedule.conditionOperator, location: schedule.measurementLocation, reason: evaluation.state,
            reading: evaluation.latestReading ? { id: evaluation.latestReading.id, value: evaluation.latestReading.value, unit: evaluation.latestReading.unit, measuredAt: evaluation.latestReading.measuredAt } : null },
        }));
        schedule.lastTriggeredAt = now;
        schedule.lastWorkOrderId = wo.id;
        if (schedule.scheduleType === "USAGE_BASED") schedule.operatingHoursAtLastTrigger = Number(evaluation.latestReading.value);
        await manager.save(MaintenanceSchedule, schedule);
        return { scheduleId: id, due: false, state: "TRIGGERED", workOrderId: wo.id };
      });
    } catch (error) {
      const message = error instanceof ConflictException ? error.message : "PM evaluation failed; see server logs";
      await this.db.getRepository(MaintenanceSchedule).update(id, { lastError: message, lastEvaluatedAt: new Date() });
      this.logger.error(`PM schedule ${id}: ${message}`);
      throw error;
    }
  }
  async evaluateAssets(assetIds: string[]) {
    if (!assetIds.length) return;
    const schedules = await this.db.getRepository(MaintenanceSchedule).createQueryBuilder("s")
      .where("s.assetId IN (:...ids) AND s.isActive = true", { ids: assetIds }).orderBy("s.id", "ASC").getMany();
    let failed = false;
    for (const schedule of schedules) {
      try { await this.evaluate(schedule.id); } catch { failed = true; }
    }
    if (failed) throw new ConflictException("Some schedules failed; readings are saved and evaluation will retry");
  }
  async sweep() {
    let after: string | undefined;
    for (;;) {
      const schedules = await this.db.getRepository(MaintenanceSchedule).find({
        where: { isActive: true, ...(after ? { id: MoreThan(after) } : {}) }, order: { id: "ASC" }, take: 100,
      });
      if (!schedules.length) break;
      for (const schedule of schedules) { try { await this.evaluate(schedule.id); } catch { /* retained in lastError */ } }
      after = schedules[schedules.length - 1].id;
    }
  }
}
