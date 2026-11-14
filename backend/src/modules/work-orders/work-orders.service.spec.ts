import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { CreateWorkOrderDto } from "./dto/create-work-order.dto";
import {
  MyWorkOrdersQueryDto,
  QueryWorkOrdersDto,
} from "./dto/query-work-orders.dto";
import { WorkOrdersService } from "./work-orders.service";
import { WorkOrderStatus, WorkOrderType } from "./entities/work-order.enums";

describe("Work Order input and business rules", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const manager = {
    id: "00000000-0000-4000-8000-000000000001",
    role: { name: "MAINTENANCE_MANAGER" },
  };
  const technician = { ...manager, role: { name: "TECHNICIAN" } };
  const input = {
    assetId: "00000000-0000-4000-8000-000000000002",
    title: " Repair ",
    type: WorkOrderType.CORRECTIVE,
    breakdownTime: "2026-01-01T08:00:00+07:00",
  };
  const validateCreate = (value: unknown) =>
    pipe.transform(value, { type: "body", metatype: CreateWorkOrderDto });
  let transaction: jest.Mock;
  let service: WorkOrdersService;

  beforeEach(() => {
    transaction = jest.fn();
    service = new WorkOrdersService({} as any, { transaction } as any);
  });

  it("trims titles and rejects forged server-owned fields", async () => {
    expect((await validateCreate(input)).title).toBe("Repair");
    for (const property of [
      "createdById",
      "status",
      "workOrderCode",
      "downtimeHours",
      "assignedTechnicianId",
    ]) {
      await expect(
        validateCreate({ ...input, [property]: "forged" }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it.each([
    { title: "   " },
    { assetId: "invalid" },
    { type: null },
    { priority: "URGENT" },
    { breakdownTime: "2026-01-01T08:00:00" },
    { scheduledStartDate: "2026-02-30" },
    { estimatedCost: -1 },
    { estimatedCost: 1.234 },
  ])("rejects invalid creation input %j", async (patch) => {
    await expect(validateCreate({ ...input, ...patch })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("validates pagination and prevents my-tasks assignee override", async () => {
    const result = await pipe.transform(
      { page: "2", limit: "5" },
      { type: "query", metatype: QueryWorkOrdersDto },
    );
    expect(result.page).toBe(2);
    for (const query of [{ page: "0" }, { limit: "101" }, { page: "1.5" }]) {
      await expect(
        pipe.transform(query, { type: "query", metatype: QueryWorkOrdersDto }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      pipe.transform(
        { assignedTechnicianId: manager.id },
        { type: "query", metatype: MyWorkOrdersQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("requires breakdown time for failure orders and rejects future times/reversed planned dates", async () => {
    await expect(
      service.create({ ...input, breakdownTime: undefined } as any, manager),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        { ...input, breakdownTime: "2999-01-01T00:00:00Z" } as any,
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        {
          ...input,
          scheduledStartDate: "2026-02-02",
          scheduledEndDate: "2026-02-01",
        } as any,
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("enforces manager privileges in the service as well as HTTP guards", async () => {
    await expect(
      service.create(input as any, technician),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assign("id", { assignedTechnicianId: technician.id }, technician),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(() => service.findAll(new QueryWorkOrdersDto(), technician)).toThrow(
      ForbiddenException,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it.each([
    WorkOrderStatus.IN_PROGRESS,
    WorkOrderStatus.ON_HOLD,
    WorkOrderStatus.COMPLETED,
    WorkOrderStatus.CLOSED,
    WorkOrderStatus.CANCELLED,
    WorkOrderStatus.REWORK_REQUIRED,
  ])("rejects assignment of %s orders", async (status) => {
    const lockedManager = { findOne: jest.fn().mockResolvedValue({ status }) };
    transaction.mockImplementation((callback) => callback(lockedManager));
    await expect(
      service.assign("id", { assignedTechnicianId: technician.id }, manager),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(lockedManager.findOne).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lock: { mode: "pessimistic_write" } }),
    );
  });
});
