import { ForbiddenException } from "@nestjs/common";
import { EntityManager } from "typeorm";

export type PmActor = { id: string; role: { name: string } };
export const PARAMETERS = ["OPERATING_HOURS", "TEMPERATURE", "VIBRATION"] as const;
export type ReadingParameter = typeof PARAMETERS[number];
export const UNITS = { OPERATING_HOURS: "h", TEMPERATURE: "°C", VIBRATION: "mm/s RMS" };
export const OPEN_STATUSES = ["OPEN", "ASSIGNED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "REWORK_REQUIRED"];
export function requirePmManager(actor: PmActor) {
  if (!actor?.id || !["ADMIN", "MAINTENANCE_MANAGER"].includes(actor.role?.name)) throw new ForbiddenException();
}
// Shared across PM import, assignment and Work Order lifecycle transactions.
// Conservative serialization avoids stale least-loaded counts and opposite row-lock orders.
export async function lockPm(manager: EntityManager) {
  await manager.query("SELECT pg_advisory_xact_lock(712031, 1)");
}
export function localDate(now: Date): string {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export interface ImportRow {
  row: number;
  assetCode: string;
  measuredAt: string;
  operatingHours?: number;
  temperature?: number;
  vibration?: number;
  notes?: string;
}
export interface ImportError { row: number; column: string; message: string }
export const READING_FIELDS = { operatingHours: "OPERATING_HOURS", temperature: "TEMPERATURE", vibration: "VIBRATION" } as const;
