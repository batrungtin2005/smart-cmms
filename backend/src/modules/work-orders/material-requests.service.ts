import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { Part } from "../parts/entities/part.entity";
import {
  PartTransaction,
  TransactionType,
} from "../parts/entities/part-transaction.entity";
import { WorkOrder } from "./entities/work-order.entity";
import { WorkOrderStatus } from "./entities/work-order.enums";
import {
  MaterialRequest,
  MaterialRequestStatus as Status,
} from "./entities/material-request.entity";
import { MaterialRequestItem } from "./entities/material-request-item.entity";
import {
  CreateMaterialRequestDto,
  QueryMaterialRequestsDto,
} from "./dto/material-request.dto";
import { WorkOrderActor } from "./work-orders.service";

@Injectable()
export class MaterialRequestsService {
  constructor(private readonly database: DataSource) {}

  private role(actor: WorkOrderActor, roles: string[]) {
    if (!actor?.id || !roles.includes(actor.role?.name))
      throw new ForbiddenException();
  }

  private active(workOrder: WorkOrder) {
    if (
      ![WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.ON_HOLD].includes(
        workOrder.status,
      )
    ) {
      throw new ConflictException(
        "Material requests require an IN_PROGRESS or ON_HOLD work order",
      );
    }
  }

  async create(
    workOrderId: string,
    dto: CreateMaterialRequestDto,
    actor: WorkOrderActor,
  ) {
    this.role(actor, ["TECHNICIAN"]);
    return this.database.transaction(async (manager) => {
      const wo = await manager.findOne(WorkOrder, {
        where: { id: workOrderId },
        lock: { mode: "pessimistic_write" },
      });
      if (!wo || wo.assignedTechnicianId !== actor.id)
        throw new NotFoundException();
      this.active(wo);
      const partIds = dto.items.map((item) => item.partId.toLowerCase());
      if (new Set(partIds).size !== partIds.length)
        throw new BadRequestException("Duplicate part");
      // No stock reservation or deduction at request time. Check again when issuing.
      for (const id of [...partIds].sort()) {
        if (!(await manager.existsBy(Part, { id, isActive: true })))
          throw new BadRequestException("Part is missing or inactive");
      }
      const request = await manager.save(
        MaterialRequest,
        manager.create(MaterialRequest, {
          workOrderId,
          requestedById: actor.id,
          notes: dto.notes ?? null,
          status: Status.PENDING,
        }),
      );
      await manager.save(
        MaterialRequestItem,
        dto.items.map((item) =>
          manager.create(MaterialRequestItem, {
            requestId: request.id,
            partId: item.partId.toLowerCase(),
            quantity: item.quantity,
          }),
        ),
      );
      return this.detail(request.id, actor, manager);
    });
  }

  async list(query: QueryMaterialRequestsDto, actor: WorkOrderActor) {
    this.role(actor, [
      "TECHNICIAN",
      "WAREHOUSE_KEEPER",
      "ADMIN",
      "MAINTENANCE_MANAGER",
    ]);
    const qb = this.database
      .getRepository(MaterialRequest)
      .createQueryBuilder("request")
      .innerJoin("request.workOrder", "wo")
      .addSelect(["wo.id", "wo.workOrderCode", "wo.title", "wo.status"]);
    if (actor.role.name === "TECHNICIAN")
      qb.andWhere("request.requestedById = :actorId", { actorId: actor.id });
    if (query.workOrderId)
      qb.andWhere("request.workOrderId = :workOrderId", {
        workOrderId: query.workOrderId,
      });
    if (query.status)
      qb.andWhere("request.status = :status", { status: query.status });
    const [items, total] = await qb
      .orderBy("request.createdAt", "DESC")
      .addOrderBy("request.id", "DESC")
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(
    id: string,
    actor: WorkOrderActor,
    manager = this.database.manager,
  ) {
    this.role(actor, [
      "TECHNICIAN",
      "WAREHOUSE_KEEPER",
      "ADMIN",
      "MAINTENANCE_MANAGER",
    ]);
    const request = await manager.findOneBy(MaterialRequest, { id });
    if (
      !request ||
      (actor.role.name === "TECHNICIAN" && request.requestedById !== actor.id)
    )
      throw new NotFoundException();
    const items = await manager
      .getRepository(MaterialRequestItem)
      .createQueryBuilder("item")
      .innerJoin("item.part", "part")
      .addSelect([
        "part.id",
        "part.partCode",
        "part.name",
        "part.unit",
        "part.currentStock",
      ])
      .where("item.requestId = :id", { id })
      .orderBy("item.partId", "ASC")
      .getMany();
    return { ...request, items };
  }

  async resolve(
    id: string,
    action: "approve" | "reject" | "cancel",
    actor: WorkOrderActor,
    reason?: string,
  ) {
    this.role(
      actor,
      action === "cancel" ? ["TECHNICIAN"] : ["WAREHOUSE_KEEPER", "ADMIN"],
    );
    if (
      action !== "approve" &&
      (!reason?.trim() || reason.trim().length > 1000)
    )
      throw new BadRequestException(
        "A reason is required (max 1000 characters)",
      );
    return this.database.transaction(async (manager) => {
      const candidate = await manager.findOneBy(MaterialRequest, { id });
      if (
        !candidate ||
        (action === "cancel" && candidate.requestedById !== actor.id)
      )
        throw new NotFoundException();
      // Global lock order: work order -> request -> parts ordered by UUID.
      const wo = await manager.findOne(WorkOrder, {
        where: { id: candidate.workOrderId },
        lock: { mode: "pessimistic_write" },
      });
      const request = await manager.findOne(MaterialRequest, {
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!wo || !request) throw new NotFoundException();
      if (request.status !== Status.PENDING)
        throw new ConflictException("Request has already been resolved");
      if (action === "approve") {
        this.active(wo);
        if (wo.assignedTechnicianId !== request.requestedById)
          throw new ConflictException(
            "Requester is no longer the assigned technician",
          );
        await this.issue(manager, request, actor);
      }
      request.status =
        action === "approve"
          ? Status.APPROVED
          : action === "reject"
            ? Status.REJECTED
            : Status.CANCELLED;
      request.resolvedById = actor.id;
      request.resolvedAt = new Date();
      request.resolutionReason = reason?.trim() ?? null;
      await manager.save(MaterialRequest, request);
      return this.detail(id, actor, manager);
    });
  }

  private async issue(
    manager: EntityManager,
    request: MaterialRequest,
    actor: WorkOrderActor,
  ) {
    const items = await manager.find(MaterialRequestItem, {
      where: { requestId: request.id },
      order: { partId: "ASC" },
    });
    if (!items.length)
      throw new ConflictException("Empty request cannot be approved");
    for (const item of items) {
      const part = await manager.findOne(Part, {
        where: { id: item.partId },
        lock: { mode: "pessimistic_write" },
      });
      if (!part?.isActive || part.currentStock < item.quantity)
        throw new ConflictException(
          "Part is inactive or stock is insufficient",
        );
      const before = part.currentStock;
      await manager.update(Part, part.id, {
        currentStock: before - item.quantity,
      });
      const tx = await manager.save(
        PartTransaction,
        manager.create(PartTransaction, {
          partId: part.id,
          workOrderId: request.workOrderId,
          transactionType: TransactionType.EXPORT,
          quantity: item.quantity,
          stockBefore: before,
          stockAfter: before - item.quantity,
          unitPrice: part.unitPrice,
          referenceCode: `MR-${request.id}`,
          performedById: actor.id,
          notes: "Approved material request and issued from warehouse",
        }),
      );
      item.unitPrice = part.unitPrice;
      item.transactionId = tx.id;
      await manager.save(MaterialRequestItem, item);
      // Price batches preserve exact costs when the same part is issued at different prices.
      await manager.query(
        `INSERT INTO work_order_parts (work_order_id, part_id, quantity_used, unit_price)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (work_order_id, part_id, unit_price)
        DO UPDATE SET quantity_used = work_order_parts.quantity_used + EXCLUDED.quantity_used`,
        [request.workOrderId, part.id, item.quantity, part.unitPrice],
      );
    }
    // Arithmetic stays in PostgreSQL numeric; no floating-point money calculations.
    const updated = await manager.query(
      `WITH cost AS (
      SELECT COALESCE(SUM(subtotal), 0) AS value FROM work_order_parts WHERE work_order_id = $1
    ) UPDATE work_orders SET actual_cost_parts = cost.value,
      total_actual_cost = cost.value + actual_cost_labor, updated_at = now()
      FROM cost WHERE id = $1 AND cost.value + actual_cost_labor <= 9999999999.99 RETURNING id`,
      [request.workOrderId],
    );
    // node-postgres UPDATE returns [rows, rowCount] through TypeORM.
    if (!updated[1])
      throw new ConflictException(
        "Work order cost exceeds the supported maximum",
      );
  }
}
