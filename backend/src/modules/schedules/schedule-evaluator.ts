import { MaintenanceSchedule, ScheduleType } from "./entities/maintenance-schedule.entity";
import { AssetReading } from "./entities/asset-reading.entity";
import { addDays, localDate } from "./pm.types";

export function evaluateSchedule(schedule: MaintenanceSchedule, reading: AssetReading | null, now: Date) {
  const result = (state: string, due = false) => ({ state, due, readingId: reading?.id ?? null });
  if (!schedule.isActive) return result("DISABLED");
  if (schedule.notBefore && schedule.notBefore > now) return result("DEFERRED");
  if (schedule.scheduleType === ScheduleType.TIME_BASED) {
    if (!schedule.nextDueDate || !schedule.intervalDays) return result("CONFIGURATION_REQUIRED");
    const today = localDate(now);
    if (schedule.nextDueDate <= today) return result(schedule.nextDueDate === today ? "DUE" : "OVERDUE", true);
    return result(schedule.nextDueDate <= addDays(today, schedule.advanceNoticeDays) ? "UPCOMING" : "NOT_DUE");
  }
  if (!reading) return result("NO_READING");
  if (reading.measuredAt > now) return result("FUTURE_READING");
  if (schedule.scheduleType === ScheduleType.USAGE_BASED) {
    if (schedule.nextDueHours === null || !schedule.intervalHours) return result("CONFIGURATION_REQUIRED");
    return Number(reading.value) >= Number(schedule.nextDueHours) ? result("DUE", true) : result("NOT_DUE");
  }
  if (!schedule.maxReadingAgeMinutes || !schedule.cooldownMinutes || !schedule.measurementLocation || schedule.conditionThreshold === null) return result("CONFIGURATION_REQUIRED");
  if (now.getTime() - reading.measuredAt.getTime() > schedule.maxReadingAgeMinutes * 60000) return result("STALE_READING");
  if (schedule.lastCompletedAt) {
    if (reading.measuredAt <= schedule.lastCompletedAt) return result("AWAITING_NEW_READING");
    if (now.getTime() < schedule.lastCompletedAt.getTime() + schedule.cooldownMinutes * 60000) return result("COOLDOWN");
  }
  const over = schedule.conditionOperator === ">" ? Number(reading.value) > Number(schedule.conditionThreshold)
    : schedule.conditionOperator === ">=" && Number(reading.value) >= Number(schedule.conditionThreshold);
  return over ? result("THRESHOLD_EXCEEDED", true) : result("NOT_DUE");
}
