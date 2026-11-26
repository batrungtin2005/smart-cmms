import { BadRequestException, ConflictException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import type { WorkOrder } from "../work-orders/entities/work-order.entity";
import { MaintenanceSchedule, ScheduleType } from "./entities/maintenance-schedule.entity";
import { ScheduleTrigger } from "./entities/schedule-trigger.entity";
import { AssetReading } from "./entities/asset-reading.entity";
import { addDays, localDate } from "./pm.types";

export async function acceptPmWorkOrder(manager: EntityManager, wo: WorkOrder, now: Date, meterReadingId?: string) {
  if (!wo.scheduleId) return;
  const schedule = await manager.findOne(MaintenanceSchedule, { where: { id: wo.scheduleId }, lock: { mode: "pessimistic_write" } });
  const trigger = await manager.findOneBy(ScheduleTrigger, { workOrderId: wo.id, outcome: "OPEN" });
  if (!schedule || !trigger || schedule.cycle !== trigger.cycle) throw new ConflictException("PM cycle requires reconciliation");
  if (schedule.scheduleType === ScheduleType.TIME_BASED) schedule.nextDueDate = addDays(localDate(now), schedule.intervalDays);
  if (schedule.scheduleType === ScheduleType.USAGE_BASED) {
    if (!meterReadingId) throw new BadRequestException("meterReadingId is required for usage-based acceptance");
    const reading = await manager.findOneBy(AssetReading, { id: meterReadingId, assetId: wo.assetId, parameter: "OPERATING_HOURS", isCurrentVersion: true });
    if (!reading || reading.measuredAt < wo.completedTime || reading.measuredAt > now || now.getTime() - reading.measuredAt.getTime() > 15 * 60000) {
      throw new ConflictException("Select a meter reading measured after completion and within 15 minutes of acceptance");
    }
    const next = Number(reading.value) + Number(schedule.intervalHours);
    if (next > 99999999.99) throw new ConflictException("Next meter threshold exceeds the supported range");
    schedule.nextDueHours = Number(next.toFixed(2));
    trigger.acceptedReadingId = reading.id;
  }
  schedule.lastCompletedAt = now;
  schedule.notBefore = null;
  schedule.cycle += 1;
  schedule.revision += 1;
  trigger.outcome = "ACCEPTED";
  trigger.resolutionNotes = wo.verificationNotes;
  await manager.save(MaintenanceSchedule, schedule);
  await manager.save(ScheduleTrigger, trigger);
}

export async function cancelPmWorkOrder(manager: EntityManager, wo: WorkOrder, dto: {
  scheduleAction?: "DEFER" | "DISABLE"; deferDate?: string; deferHours?: number; deferUntil?: string; reason?: string;
}, now: Date) {
  if (!wo.scheduleId) {
    if (dto.scheduleAction || dto.deferDate || dto.deferHours !== undefined || dto.deferUntil) throw new BadRequestException("Schedule action only applies to PM work orders");
    return;
  }
  if (!["DEFER", "DISABLE"].includes(dto.scheduleAction)) throw new BadRequestException("Choose DEFER or DISABLE when cancelling a PM work order");
  const schedule = await manager.findOne(MaintenanceSchedule, { where: { id: wo.scheduleId }, lock: { mode: "pessimistic_write" } });
  const trigger = await manager.findOneBy(ScheduleTrigger, { workOrderId: wo.id, outcome: "OPEN" });
  if (!schedule || !trigger || trigger.cycle !== schedule.cycle) throw new ConflictException("PM cycle requires reconciliation");
  if (dto.scheduleAction === "DISABLE") {
    if (dto.deferDate || dto.deferHours !== undefined || dto.deferUntil) throw new BadRequestException("DISABLE does not accept deferral fields");
    schedule.isActive = false;
  } else if (schedule.scheduleType === ScheduleType.TIME_BASED) {
    if (!dto.deferDate || dto.deferDate <= localDate(now) || dto.deferHours !== undefined || dto.deferUntil) throw new BadRequestException("Provide a future deferDate only");
    schedule.nextDueDate = dto.deferDate;
  } else if (schedule.scheduleType === ScheduleType.USAGE_BASED) {
    const latest = await manager.findOne(AssetReading, { where: { assetId: wo.assetId, parameter: "OPERATING_HOURS", isCurrentVersion: true }, order: { measuredAt: "DESC" } });
    if (dto.deferHours === undefined || dto.deferHours <= Number(latest?.value ?? schedule.nextDueHours) || dto.deferDate || dto.deferUntil) throw new BadRequestException("Provide deferHours beyond the current meter only");
    schedule.nextDueHours = dto.deferHours;
  } else {
    if (!dto.deferUntil || new Date(dto.deferUntil) <= now || dto.deferDate || dto.deferHours !== undefined) throw new BadRequestException("Provide a future deferUntil only");
    schedule.notBefore = new Date(dto.deferUntil);
  }
  schedule.cycle += 1;
  schedule.revision += 1;
  trigger.outcome = "CANCELLED";
  trigger.resolutionNotes = JSON.stringify({ action: dto.scheduleAction, date: dto.deferDate, hours: dto.deferHours, until: dto.deferUntil, reason: dto.reason });
  await manager.save(MaintenanceSchedule, schedule);
  await manager.save(ScheduleTrigger, trigger);
}
