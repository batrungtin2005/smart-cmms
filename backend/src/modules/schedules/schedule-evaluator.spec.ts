import { MaintenanceSchedule, ScheduleType } from "./entities/maintenance-schedule.entity";
import { AssetReading } from "./entities/asset-reading.entity";
import { evaluateSchedule } from "./schedule-evaluator";
import { addDays, localDate } from "./pm.types";

describe("PM due rules", () => {
  const now = new Date("2026-12-05T02:00:00Z");
  const schedule = (patch: Partial<MaintenanceSchedule>) => Object.assign(new MaintenanceSchedule(), { isActive: true, advanceNoticeDays: 3 }, patch);
  const reading = (value: number, time = now) => Object.assign(new AssetReading(), { id: "reading", value, measuredAt: time });
  it("uses Vietnam dates and acceptance date plus days", () => {
    expect(localDate(new Date("2026-12-04T18:00:00Z"))).toBe("2026-12-05");
    expect(addDays("2026-12-05", 30)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
  it.each([["2026-12-04", "OVERDUE", true], ["2026-12-05", "DUE", true], ["2026-12-08", "UPCOMING", false], ["2026-12-09", "NOT_DUE", false]])("evaluates calendar date %s", (date, state, due) => {
    expect(evaluateSchedule(schedule({ scheduleType: ScheduleType.TIME_BASED, intervalDays: 30, nextDueDate: date as string }), null, now)).toMatchObject({ state, due });
  });
  it("checks cumulative usage, not elapsed wall time", () => {
    const s = schedule({ scheduleType: ScheduleType.USAGE_BASED, nextDueHours: 1500, intervalHours: 1500 });
    expect(evaluateSchedule(s, reading(1499), now).due).toBe(false);
    expect(evaluateSchedule(s, reading(1500), now).due).toBe(true);
    expect(evaluateSchedule(s, null, now).state).toBe("NO_READING");
  });
  it("requires fresh post-acceptance readings and cooldown, without requiring a return to normal", () => {
    const s = schedule({ scheduleType: ScheduleType.CONDITION_BASED, conditionThreshold: 85,
      conditionOperator: ">", measurementLocation: "Bearing", maxReadingAgeMinutes: 60, cooldownMinutes: 10,
      lastCompletedAt: new Date(now.getTime() - 20 * 60000) });
    expect(evaluateSchedule(s, reading(90, new Date(now.getTime() - 120 * 60000)), now).state).toBe("STALE_READING");
    expect(evaluateSchedule(s, reading(90, s.lastCompletedAt), now).state).toBe("AWAITING_NEW_READING");
    expect(evaluateSchedule(s, reading(90), now).due).toBe(true);
    s.lastCompletedAt = new Date(now.getTime() - 5 * 60000);
    expect(evaluateSchedule(s, reading(90), now).state).toBe("COOLDOWN");
  });
  it("handles disabled, deferred and exact threshold conditions", () => {
    const s = schedule({ scheduleType: ScheduleType.CONDITION_BASED, conditionThreshold: 5, conditionOperator: ">",
      measurementLocation: "Bearing", maxReadingAgeMinutes: 60, cooldownMinutes: 10 });
    expect(evaluateSchedule(s, reading(5), now).due).toBe(false);
    s.conditionOperator = ">=";
    expect(evaluateSchedule(s, reading(5), now).due).toBe(true);
    s.notBefore = new Date(now.getTime() + 1000);
    expect(evaluateSchedule(s, reading(5), now).state).toBe("DEFERRED");
    s.isActive = false;
    expect(evaluateSchedule(s, reading(5), now).state).toBe("DISABLED");
  });
});
