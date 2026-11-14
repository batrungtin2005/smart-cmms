import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { DataSource, EntityManager, Repository } from "typeorm";
import { Asset, AssetStatus } from "../assets/entities/asset.entity";
import { User } from "../auth/entities/user.entity";
import { AssignWorkOrderDto } from "./dto/assign-work-order.dto";
import { ChangeWorkOrderStatusDto } from "./dto/change-work-order-status.dto";
import { WorkOrderStatusHistory } from "./entities/work-order-status-history.entity";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto";
import {
  MyWorkOrdersQueryDto,
  QueryWorkOrdersDto,
} from "./dto/query-work-orders.dto";
import { WorkOrder } from "./entities/work-order.entity";
import { WorkOrderPart } from "./entities/work-order-part.entity";
import {
  AssetHistory,
  MaintenanceEventType,
} from "../history/entities/asset-history.entity";
import {
  MaterialRequest,
  MaterialRequestStatus,
} from "./entities/material-request.entity";
import { CompleteWorkOrderDto } from "./dto/complete-work-order.dto";
import { VerifyWorkOrderDto } from "./dto/verify-work-order.dto";
import { calculateRepairHours } from "./repair-time";
import { RedisService } from "../../common/redis/redis.service";
import {
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderType,
} from "./entities/work-order.enums";

export interface WorkOrderActor {
  id: string;
  role: { name: string };
}

@Injectable()
export class WorkOrdersService {
  constructor(
    @InjectRepository(WorkOrder)
    private readonly workOrders: Repository<WorkOrder>,
    private readonly dataSource: DataSource,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private requireRole(actor: WorkOrderActor, roles: string[]) {
    if (!actor?.id || !roles.includes(actor.role?.name)) {
      throw new ForbiddenException("Bạn không có quyền thực hiện thao tác này");
    }
  }

  private requireManager(actor: WorkOrderActor) {
    this.requireRole(actor, ["ADMIN", "MAINTENANCE_MANAGER"]);
  }

  async create(dto: CreateWorkOrderDto, actor: WorkOrderActor) {
    this.requireManager(actor);
    const type = dto.type ?? WorkOrderType.CORRECTIVE;
    const isFailure = [
      WorkOrderType.CORRECTIVE,
      WorkOrderType.EMERGENCY,
    ].includes(type);
    if (isFailure && !dto.breakdownTime) {
      throw new BadRequestException("Phiếu sự cố phải có breakdownTime");
    }
    if (
      dto.breakdownTime &&
      new Date(dto.breakdownTime).getTime() > Date.now()
    ) {
      throw new BadRequestException("Thời điểm hỏng không được ở tương lai");
    }
    if (
      dto.scheduledStartDate &&
      dto.scheduledEndDate &&
      dto.scheduledEndDate < dto.scheduledStartDate
    ) {
      throw new BadRequestException(
        "Ngày kết thúc kế hoạch phải từ ngày bắt đầu trở đi",
      );
    }

    const result = await this.dataSource.transaction(async (manager) => {
      // Prevent an asset from being disabled/decommissioned between validation and insertion.
      const asset = await manager.findOne(Asset, {
        where: { id: dto.assetId },
        lock: { mode: "pessimistic_write" },
      });
      if (
        !asset ||
        !asset.isActive ||
        asset.status === AssetStatus.DECOMMISSIONED
      ) {
        throw new NotFoundException(
          "Thiết bị không tồn tại hoặc đã ngừng sử dụng",
        );
      }
      const id = randomUUID();
      const workOrder = manager.create(WorkOrder, {
        id,
        // Full UUID + unique constraint avoids count-based races without a schema migration.
        workOrderCode: `WO-${new Date().getUTCFullYear()}-${id}`,
        assetId: asset.id,
        title: dto.title.trim(),
        description: dto.description ?? null,
        type,
        priority: dto.priority ?? WorkOrderPriority.MEDIUM,
        status: WorkOrderStatus.OPEN,
        createdById: actor.id,
        assignedTechnicianId: null,
        scheduleId: null,
        breakdownTime: dto.breakdownTime ? new Date(dto.breakdownTime) : null,
        scheduledStartDate: dto.scheduledStartDate ?? null,
        scheduledEndDate: dto.scheduledEndDate ?? null,
        estimatedCost: dto.estimatedCost ?? 0,
        operatingHoursAtFailure: isFailure ? asset.operatingHours : null,
      });
      await manager.save(WorkOrder, workOrder);
      await this.recordStatus(manager, workOrder, null, actor);
      if (isFailure) await this.refreshAssetStatus(manager, asset, false);
      return this.detail(id, actor, manager);
    });
    await this.redis?.delByPattern("assets:*");
    return result;
  }

  findAll(query: QueryWorkOrdersDto, actor: WorkOrderActor) {
    this.requireManager(actor);
    return this.list(query, query.assignedTechnicianId);
  }

  myTasks(query: MyWorkOrdersQueryDto, actor: WorkOrderActor) {
    this.requireRole(actor, ["TECHNICIAN"]);
    return this.list(query, actor.id);
  }

  // Select only public user summaries. Never serialize User.passwordHash through relations.
  private summaryQuery(repository: Repository<WorkOrder>) {
    return repository
      .createQueryBuilder("wo")
      .leftJoin("wo.asset", "asset")
      .addSelect(["asset.id", "asset.assetCode", "asset.name", "asset.status"])
      .leftJoin("wo.assignedTechnician", "technician")
      .addSelect([
        "technician.id",
        "technician.username",
        "technician.fullName",
      ])
      .leftJoin("wo.createdBy", "creator")
      .addSelect(["creator.id", "creator.username", "creator.fullName"]);
  }

  private async list(
    query: MyWorkOrdersQueryDto,
    assignedTechnicianId?: string,
  ) {
    if (
      query.createdFrom &&
      query.createdTo &&
      new Date(query.createdFrom) > new Date(query.createdTo)
    ) {
      throw new BadRequestException("createdTo phải từ createdFrom trở đi");
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.summaryQuery(this.workOrders);
    if (assignedTechnicianId)
      qb.andWhere("wo.assignedTechnicianId = :assignedTechnicianId", {
        assignedTechnicianId,
      });
    if (query.assetId)
      qb.andWhere("wo.assetId = :assetId", { assetId: query.assetId });
    if (query.status)
      qb.andWhere("wo.status = :status", { status: query.status });
    if (query.priority)
      qb.andWhere("wo.priority = :priority", { priority: query.priority });
    if (query.type) qb.andWhere("wo.type = :type", { type: query.type });
    if (query.createdFrom)
      qb.andWhere("wo.createdAt >= :createdFrom", {
        createdFrom: query.createdFrom,
      });
    if (query.createdTo)
      qb.andWhere("wo.createdAt <= :createdTo", { createdTo: query.createdTo });
    if (query.search) {
      const search = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
      qb.andWhere(
        "(wo.workOrderCode ILIKE :search OR wo.title ILIKE :search)",
        { search },
      );
    }
    const [items, total] = await qb
      .orderBy("wo.createdAt", "DESC")
      .addOrderBy("wo.id", "DESC")
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  findOne(id: string, actor: WorkOrderActor) {
    return this.detail(id, actor, this.dataSource.manager);
  }

  private async detail(
    id: string,
    actor: WorkOrderActor,
    manager: EntityManager,
  ) {
    this.requireRole(actor, ["ADMIN", "MAINTENANCE_MANAGER", "TECHNICIAN"]);
    const qb = this.summaryQuery(manager.getRepository(WorkOrder)).where(
      "wo.id = :id",
      { id },
    );
    if (actor.role.name === "TECHNICIAN") {
      qb.andWhere("wo.assignedTechnicianId = :actorId", { actorId: actor.id });
    }
    const workOrder = await qb.getOne();
    if (!workOrder)
      throw new NotFoundException("Không tìm thấy phiếu công việc");
    const parts = await manager
      .getRepository(WorkOrderPart)
      .createQueryBuilder("usage")
      .leftJoin("usage.part", "part")
      .addSelect(["part.id", "part.partCode", "part.name", "part.unit"])
      .where("usage.workOrderId = :id", { id })
      .orderBy("usage.createdAt", "ASC")
      .addOrderBy("usage.id", "ASC")
      .getMany();
    const statusHistory = await manager
      .getRepository(WorkOrderStatusHistory)
      .createQueryBuilder("history")
      .leftJoin("history.performedBy", "actor")
      .addSelect(["actor.id", "actor.username", "actor.fullName"])
      .where("history.workOrderId = :id", { id })
      .orderBy("history.sequence", "ASC")
      .getMany();
    return { ...workOrder, parts, statusHistory };
  }

  async assign(id: string, dto: AssignWorkOrderDto, actor: WorkOrderActor) {
    this.requireManager(actor);
    return this.dataSource.transaction(async (manager) => {
      const workOrder = await manager.findOne(WorkOrder, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!workOrder)
        throw new NotFoundException("Không tìm thấy phiếu công việc");
      if (
        ![WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED].includes(
          workOrder.status,
        )
      ) {
        throw new ConflictException(
          "Chỉ được phân công/giao lại phiếu OPEN hoặc ASSIGNED",
        );
      }
      const technician = await manager
        .getRepository(User)
        .createQueryBuilder("user")
        .innerJoin("user.role", "role")
        .where("user.id = :id AND user.isActive = true AND role.name = :role", {
          id: dto.assignedTechnicianId,
          role: "TECHNICIAN",
        })
        .select(["user.id"])
        .getOne();
      if (!technician)
        throw new BadRequestException(
          "Người nhận phải là TECHNICIAN đang hoạt động",
        );
      if (
        workOrder.assignedTechnicianId !== technician.id ||
        workOrder.status !== WorkOrderStatus.ASSIGNED
      ) {
        const previousStatus = workOrder.status;
        workOrder.assignedTechnicianId = technician.id;
        workOrder.status = WorkOrderStatus.ASSIGNED;
        await manager.save(WorkOrder, workOrder);
        await this.recordStatus(manager, workOrder, previousStatus, actor);
      }
      return this.detail(id, actor, manager);
    });
  }

  // Caller holds the work-order row lock, or has just inserted the row.
  private async recordStatus(
    manager: EntityManager,
    workOrder: WorkOrder,
    fromStatus: WorkOrderStatus | null,
    actor: WorkOrderActor,
    reason?: string,
    occurredAt = new Date(),
  ) {
    const last = await manager.findOne(WorkOrderStatusHistory, {
      where: { workOrderId: workOrder.id },
      order: { sequence: "DESC" },
    });
    await manager.save(
      WorkOrderStatusHistory,
      manager.create(WorkOrderStatusHistory, {
        workOrderId: workOrder.id,
        sequence: (last?.sequence ?? 0) + 1,
        fromStatus,
        toStatus: workOrder.status,
        performedById: actor.id,
        assignedTechnicianId: workOrder.assignedTechnicianId,
        reason: reason?.trim() ?? null,
        createdAt: occurredAt,
      }),
    );
  }

  private async lockAsset(manager: EntityManager, id: string) {
    const asset = await manager.findOne(Asset, {
      where: { id },
      lock: { mode: "pessimistic_write" },
    });
    if (!asset) throw new NotFoundException("Asset not found");
    return asset;
  }

  // The caller holds this asset's lock. Sibling rows are read, never locked in reverse order.
  private async refreshAssetStatus(
    manager: EntityManager,
    asset: Asset,
    canRestore: boolean,
  ) {
    if (!asset.isActive || asset.status === AssetStatus.DECOMMISSIONED) return;
    const siblings = await manager.find(WorkOrder, {
      where: { assetId: asset.id },
      select: { status: true, type: true },
    });
    const working = siblings.some((wo) =>
      [
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.ON_HOLD,
        WorkOrderStatus.COMPLETED,
        WorkOrderStatus.REWORK_REQUIRED,
      ].includes(wo.status),
    );
    const waitingFailure = siblings.some(
      (wo) =>
        [WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED].includes(wo.status) &&
        [WorkOrderType.CORRECTIVE, WorkOrderType.EMERGENCY].includes(wo.type),
    );
    const status = working
      ? AssetStatus.MAINTENANCE
      : waitingFailure
        ? AssetStatus.DOWN
        : canRestore
          ? AssetStatus.OPERATIONAL
          : asset.status;
    await manager.update(Asset, asset.id, { status });
    asset.status = status;
  }

  private async requireNoPendingMaterials(
    manager: EntityManager,
    workOrderId: string,
  ) {
    if (
      await manager.existsBy(MaterialRequest, {
        workOrderId,
        status: MaterialRequestStatus.PENDING,
      })
    ) {
      throw new ConflictException(
        "Resolve or cancel pending material requests before completing the work order",
      );
    }
  }

  async complete(id: string, dto: CompleteWorkOrderDto, actor: WorkOrderActor) {
    this.requireRole(actor, ["TECHNICIAN"]);
    if (!dto.rootCause?.trim() || !dto.solution?.trim())
      throw new BadRequestException("rootCause and solution are required");
    const result = await this.dataSource.transaction(async (manager) => {
      const wo = await manager.findOne(WorkOrder, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!wo || wo.assignedTechnicianId !== actor.id)
        throw new NotFoundException();
      if (wo.status !== WorkOrderStatus.IN_PROGRESS)
        throw new ConflictException("Only IN_PROGRESS orders can be completed");
      const asset = await this.lockAsset(manager, wo.assetId);
      await this.requireNoPendingMaterials(manager, id);
      const now = new Date();
      if (wo.breakdownTime && now < wo.breakdownTime)
        throw new ConflictException("Invalid breakdown time");
      const events = await manager.find(WorkOrderStatusHistory, {
        where: { workOrderId: id },
        order: { sequence: "ASC" },
      });
      wo.actualRepairTimeHours = calculateRepairHours(
        wo.startTime,
        events,
        now,
      );
      wo.completedTime = now;
      wo.rootCause = dto.rootCause.trim();
      wo.solution = dto.solution.trim();
      wo.completionNotes = dto.completionNotes?.trim() ?? null;
      wo.status = WorkOrderStatus.COMPLETED;
      await manager.save(WorkOrder, wo);
      await this.recordStatus(
        manager,
        wo,
        WorkOrderStatus.IN_PROGRESS,
        actor,
        wo.completionNotes,
        now,
      );
      await this.refreshAssetStatus(manager, asset, false);
      return this.detail(id, actor, manager);
    });
    await this.redis?.delByPattern("assets:*");
    return result;
  }

  async verify(id: string, dto: VerifyWorkOrderDto, actor: WorkOrderActor) {
    this.requireManager(actor);
    if (
      !["ACCEPT", "REJECT"].includes(dto.decision) ||
      !dto.verificationNotes?.trim()
    )
      throw new BadRequestException(
        "Decision and verificationNotes are required",
      );
    const result = await this.dataSource.transaction(async (manager) => {
      const wo = await manager.findOne(WorkOrder, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!wo) throw new NotFoundException();
      if (wo.status !== WorkOrderStatus.COMPLETED)
        throw new ConflictException("Only COMPLETED orders can be verified");
      const asset = await this.lockAsset(manager, wo.assetId);
      const now = new Date();
      wo.verificationNotes = dto.verificationNotes.trim();
      if (dto.decision === "REJECT") {
        wo.status = WorkOrderStatus.REWORK_REQUIRED;
        wo.completedTime = null;
        wo.verifiedAt = null;
        wo.verifiedById = null;
      } else {
        await this.requireNoPendingMaterials(manager, id);
        if (!wo.completedTime || !wo.rootCause?.trim() || !wo.solution?.trim())
          throw new ConflictException("Completion data is missing");
        if (await manager.existsBy(AssetHistory, { workOrderId: id }))
          throw new ConflictException(
            "A maintenance history already exists for this work order; reconcile legacy data first",
          );
        wo.status = WorkOrderStatus.CLOSED;
        wo.verifiedAt = now;
        wo.verifiedById = actor.id;
      }
      await manager.save(WorkOrder, wo);
      await this.recordStatus(
        manager,
        wo,
        WorkOrderStatus.COMPLETED,
        actor,
        wo.verificationNotes,
        now,
      );
      await this.refreshAssetStatus(manager, asset, dto.decision === "ACCEPT");
      if (dto.decision === "ACCEPT")
        await this.recordMaintenance(manager, wo, asset);
      return this.detail(id, actor, manager);
    });
    await this.redis?.delByPattern("assets:*");
    return result;
  }

  private async recordMaintenance(
    manager: EntityManager,
    wo: WorkOrder,
    asset: Asset,
  ) {
    const parts = await manager.find(WorkOrderPart, {
      where: { workOrderId: wo.id },
      relations: { part: true },
    });
    const failure = [
      WorkOrderType.CORRECTIVE,
      WorkOrderType.EMERGENCY,
    ].includes(wo.type);
    const refreshed = await manager.findOneByOrFail(WorkOrder, { id: wo.id });
    await manager.save(
      AssetHistory,
      manager.create(AssetHistory, {
        assetId: asset.id,
        workOrderId: wo.id,
        eventType: failure
          ? MaintenanceEventType.CORRECTIVE_REPAIR
          : wo.type === WorkOrderType.PREVENTIVE
            ? MaintenanceEventType.PREVENTIVE_MAINTENANCE
            : MaintenanceEventType.INSPECTION,
        title: wo.title,
        description: wo.completionNotes,
        breakdownTime: wo.breakdownTime,
        repairStartTime: wo.startTime,
        repairEndTime: wo.completedTime,
        actualRepairTimeHours: wo.actualRepairTimeHours,
        downtimeHours: refreshed.downtimeHours,
        operatingHoursAtFailure: wo.operatingHoursAtFailure,
        timeBetweenFailuresHours: null,
        isFailureCounted: failure,
        failureCause: wo.rootCause,
        actionTaken: wo.solution,
        statusBefore: wo.assetStatusAtStart,
        statusAfter: asset.status,
        partsReplaced: parts.map((p) => ({
          partId: p.partId,
          partCode: p.part.partCode,
          partName: p.part.name,
          quantity: p.quantityUsed,
          unitPrice: Number(p.unitPrice),
          totalPrice: Number(p.subtotal),
        })),
        costParts: wo.actualCostParts,
        costLabor: wo.actualCostLabor,
        totalCost: wo.totalActualCost,
        performedById: wo.assignedTechnicianId,
      }),
    );
    await manager.query(
      `WITH metrics AS (
      SELECT count(*)::int AS failures, COALESCE(sum(actual_repair_time_hours), 0) AS repair,
        max(breakdown_time) AS last_failure FROM asset_maintenance_history
      WHERE asset_id = $1 AND is_failure_counted = true
    ) UPDATE assets SET total_failures = metrics.failures, total_repair_time_hours = metrics.repair,
      cached_mttr_hours = CASE WHEN metrics.failures > 0 THEN metrics.repair / metrics.failures ELSE 0 END,
      cached_mtbf_hours = CASE WHEN metrics.failures > 0 THEN operating_hours / metrics.failures ELSE operating_hours END,
      last_failure_date = metrics.last_failure, metrics_last_updated_at = now(), updated_at = now()
      FROM metrics WHERE id = $1`,
      [asset.id],
    );
  }

  async changeStatus(
    id: string,
    dto: ChangeWorkOrderStatusDto,
    actor: WorkOrderActor,
  ) {
    const cancelling = dto.status === WorkOrderStatus.CANCELLED;
    this.requireRole(
      actor,
      cancelling ? ["ADMIN", "MAINTENANCE_MANAGER"] : ["TECHNICIAN"],
    );
    if (
      ![
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.ON_HOLD,
        WorkOrderStatus.CANCELLED,
      ].includes(dto.status)
    ) {
      throw new BadRequestException("Trạng thái đích chưa được hỗ trợ");
    }
    if (
      (cancelling || dto.status === WorkOrderStatus.ON_HOLD) &&
      !dto.reason?.trim()
    ) {
      throw new BadRequestException("Phải nhập lý do tạm dừng hoặc hủy");
    }
    const result = await this.dataSource.transaction(async (manager) => {
      const workOrder = await manager.findOne(WorkOrder, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (
        !workOrder ||
        (!cancelling && workOrder.assignedTechnicianId !== actor.id)
      ) {
        throw new NotFoundException("Không tìm thấy phiếu công việc");
      }
      const allowed = cancelling
        ? [WorkOrderStatus.OPEN, WorkOrderStatus.ASSIGNED]
        : dto.status === WorkOrderStatus.ON_HOLD
          ? [WorkOrderStatus.IN_PROGRESS]
          : [
              WorkOrderStatus.ASSIGNED,
              WorkOrderStatus.ON_HOLD,
              WorkOrderStatus.REWORK_REQUIRED,
            ];
      if (!allowed.includes(workOrder.status)) {
        throw new ConflictException(
          "Không được chuyển trạng thái phiếu theo yêu cầu",
        );
      }
      const asset = await this.lockAsset(manager, workOrder.assetId);
      if (
        !cancelling &&
        (!asset.isActive || asset.status === AssetStatus.DECOMMISSIONED)
      ) {
        throw new ConflictException("Asset is inactive or decommissioned");
      }
      const now = new Date();
      const previousStatus = workOrder.status;
      if (dto.status === WorkOrderStatus.IN_PROGRESS && !workOrder.startTime) {
        workOrder.startTime = now;
        workOrder.assetStatusAtStart = asset.status;
      }
      workOrder.status = dto.status;
      await manager.save(WorkOrder, workOrder);
      await this.recordStatus(
        manager,
        workOrder,
        previousStatus,
        actor,
        dto.reason,
        now,
      );
      await this.refreshAssetStatus(manager, asset, cancelling);
      return this.detail(id, actor, manager);
    });
    await this.redis?.delByPattern("assets:*");
    return result;
  }
}
