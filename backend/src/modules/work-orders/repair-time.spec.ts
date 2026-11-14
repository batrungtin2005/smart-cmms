import { ConflictException } from "@nestjs/common";
import { calculateRepairHours } from "./repair-time";
import { WorkOrderStatus as S } from "./entities/work-order.enums";

describe("Work Order repair duration", () => {
  const at = (hour: number) => new Date(Date.UTC(2026, 0, 1, hour));
  const event = (fromStatus: S, toStatus: S, hour: number) => ({
    fromStatus,
    toStatus,
    createdAt: at(hour),
  });
  it("excludes holds and verification delays across rework cycles", () => {
    const events = [
      event(S.ASSIGNED, S.IN_PROGRESS, 0),
      event(S.IN_PROGRESS, S.ON_HOLD, 1),
      event(S.ON_HOLD, S.IN_PROGRESS, 3),
      event(S.IN_PROGRESS, S.COMPLETED, 5),
      event(S.COMPLETED, S.REWORK_REQUIRED, 7),
      event(S.REWORK_REQUIRED, S.IN_PROGRESS, 8),
    ];
    expect(calculateRepairHours(at(0), events, at(10))).toBe(5);
  });
  it("handles orders without holds", () => {
    expect(
      calculateRepairHours(at(0), [event(S.ASSIGNED, S.IN_PROGRESS, 0)], at(2)),
    ).toBe(2);
  });
  it.each(
    [
      [],
      [event(S.ON_HOLD, S.IN_PROGRESS, 0)],
      [event(S.ASSIGNED, S.IN_PROGRESS, 0), event(S.IN_PROGRESS, S.ON_HOLD, 1)],
      [event(S.ASSIGNED, S.IN_PROGRESS, 0), event(S.ON_HOLD, S.IN_PROGRESS, 1)],
      [
        event(S.ASSIGNED, S.IN_PROGRESS, 0),
        event(S.IN_PROGRESS, S.ON_HOLD, 2),
        event(S.ON_HOLD, S.IN_PROGRESS, 1),
      ],
    ].map((events) => ({ events })),
  )("rejects incomplete or inconsistent timelines %#", ({ events }) => {
    expect(() => calculateRepairHours(at(0), events as any, at(3))).toThrow(
      ConflictException,
    );
  });
});
