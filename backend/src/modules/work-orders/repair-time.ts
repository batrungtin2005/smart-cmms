import { ConflictException } from "@nestjs/common";
import { WorkOrderStatus as Status } from "./entities/work-order.enums";

type Transition = {
  fromStatus: Status | null;
  toStatus: Status;
  createdAt: Date;
};

// History must cover the first start. Never guess missing repair/hold durations.
export function calculateRepairHours(
  start: Date | null,
  events: Transition[],
  end: Date,
): number {
  const fail = () => {
    throw new ConflictException(
      "Repair timeline is incomplete or inconsistent; reconcile historical data first",
    );
  };
  if (!start || !Number.isFinite(start.getTime()) || end < start) fail();
  const first = events.findIndex((e) => e.toStatus === Status.IN_PROGRESS);
  if (first < 0 || events[first].fromStatus !== Status.ASSIGNED) fail();
  let state = Status.IN_PROGRESS;
  let last = start.getTime();
  // Older history used transaction-start timestamps; normalize just the first start.
  if (Math.abs(events[first].createdAt.getTime() - last) > 60000) fail();
  let milliseconds = 0;
  for (const event of events.slice(first + 1)) {
    const time = event.createdAt.getTime();
    if (
      !Number.isFinite(time) ||
      time < last ||
      time > end.getTime() ||
      event.fromStatus !== state
    )
      fail();
    if (state === Status.IN_PROGRESS) milliseconds += time - last;
    state = event.toStatus;
    last = time;
  }
  if (state !== Status.IN_PROGRESS) fail();
  milliseconds += end.getTime() - last;
  return Number((milliseconds / 3600000).toFixed(2));
}
