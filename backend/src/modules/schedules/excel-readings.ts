import { BadRequestException } from "@nestjs/common";
import { Workbook, CellValue } from "exceljs";
import { unzipSync, zipSync } from "fflate";
import { ImportError, ImportRow } from "./pm.types";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 500;
export const HEADERS = ["Mã thiết bị", "Thời điểm đo", "Tổng giờ vận hành (h)", "Nhiệt độ (°C)", "Độ rung (mm/s RMS)", "Ghi chú"];

function measuredDate(value: CellValue): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? new Date(value.getTime() - 7 * 3600000) : null;
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, d, m, y, h, min, sec = "00"] = match;
  const wall = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec));
  if (wall.getUTCFullYear() !== +y || wall.getUTCMonth() !== +m - 1 || wall.getUTCDate() !== +d || wall.getUTCHours() !== +h || wall.getUTCMinutes() !== +min || wall.getUTCSeconds() !== +sec) return null;
  return new Date(wall.getTime() - 7 * 3600000);
}
export function validReadingValue(parameter: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const scale = parameter === "OPERATING_HOURS" ? 100 : 10000;
  if (Math.abs(value * scale - Math.round(value * scale)) > 0.00001) return false;
  return parameter === "OPERATING_HOURS" ? value >= 0 && value <= 99999999.99
    : parameter === "VIBRATION" ? value >= 0 && value <= 999999.9999 : value >= -999999.9999 && value <= 999999.9999;
}
export async function readingTemplate() {
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Readings");
  sheet.addRow(HEADERS);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column, index) => { column.width = [20, 25, 28, 22, 28, 45][index]; });
  sheet.getColumn(2).numFmt = "dd/mm/yyyy hh:mm";
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function parseReadingsExcel(buffer: Buffer, filename: string, now = new Date()): Promise<{ rows: ImportRow[]; errors: ImportError[] }> {
  if (!filename.toLowerCase().endsWith(".xlsx") || buffer.length > MAX_UPLOAD_BYTES || buffer.length < 4) throw new BadRequestException("Upload an .xlsx file up to 5 MiB");
  let entries: ReturnType<typeof unzipSync>;
  try {
    let total = 0; let count = 0;
    entries = unzipSync(buffer, { filter: file => {
      total += file.originalSize;
      if (++count > 100 || total > 20 * 1024 * 1024 || file.originalSize > 10 * 1024 * 1024) throw new Error("Expanded workbook exceeds limits");
      if (/vba|externalLinks|\.bin$|\.\./i.test(file.name)) throw new Error("Macros and external links are not supported");
      return true;
    } });
    if (!entries["xl/workbook.xml"] || !entries["[Content_Types].xml"]) throw new Error("Invalid workbook");
    for (const [name, bytes] of Object.entries(entries)) {
      if (name.endsWith(".rels") && /TargetMode\s*=\s*["']External["']/i.test(Buffer.from(bytes).toString("utf8"))) throw new Error("External relationships are not supported");
    }
  } catch { throw new BadRequestException("Invalid workbook, expanded size too large, macros or external links detected"); }
  const workbook = new Workbook();
  try { await workbook.xlsx.load(Buffer.from(zipSync(entries)) as any); }
  catch { throw new BadRequestException("Cannot read this workbook"); }
  if (workbook.worksheets.length !== 1 || workbook.worksheets[0].name !== "Readings") throw new BadRequestException("Use the template with exactly one Readings sheet");
  const sheet = workbook.worksheets[0];
  if (sheet.rowCount > MAX_IMPORT_ROWS + 1 || sheet.columnCount > HEADERS.length) throw new BadRequestException("Maximum 500 data rows and the six template columns");
  if (HEADERS.some((header, i) => sheet.getRow(1).getCell(i + 1).value !== header)) throw new BadRequestException("Headers do not match template version 1");
  const errors: ImportError[] = [];
  const rows: ImportRow[] = [];
  for (let index = 2; index <= sheet.rowCount; index++) {
    const cells = HEADERS.map((_, i) => sheet.getRow(index).getCell(i + 1).value);
    if (cells.every(v => v === null || v === "")) continue;
    const error = (column: number, message: string) => errors.push({ row: index, column: HEADERS[column], message });
    let complex = false;
    cells.forEach((v, i) => { if (v && typeof v === "object" && !(v instanceof Date)) { error(i, "Use literal values only; formulas, hyperlinks and rich text are not accepted"); complex = true; } });
    if (complex) continue;
    const assetCode = typeof cells[0] === "string" ? cells[0].trim() : "";
    if (!assetCode || assetCode.length > 50) error(0, "Asset code is required (max 50 characters)");
    const measuredAt = measuredDate(cells[1]);
    if (!measuredAt || measuredAt > now) error(1, "Use dd/MM/yyyy HH:mm in Asia/Ho_Chi_Minh, not a future time");
    const row: ImportRow = { row: index, assetCode, measuredAt: measuredAt?.toISOString() ?? "" };
    const fields = ["operatingHours", "temperature", "vibration"] as const;
    const parameters = ["OPERATING_HOURS", "TEMPERATURE", "VIBRATION"];
    let present = 0;
    fields.forEach((field, i) => {
      const value = cells[i + 2];
      if (value === null || value === "") return;
      present++;
      if (typeof value !== "number" || !validReadingValue(parameters[i], value)) error(i + 2, "Invalid numeric reading or precision (hours: 2 decimals; temperature/vibration: 4)");
      else row[field] = value;
    });
    if (!present) error(2, "Enter at least one reading; blanks do not mean zero");
    if (cells[5] !== null && cells[5] !== "") {
      if (typeof cells[5] !== "string" || cells[5].length > 1000) error(5, "Notes must be text up to 1000 characters");
      else row.notes = cells[5];
    }
    rows.push(row);
  }
  if (!rows.length && !errors.length) throw new BadRequestException("Workbook contains no readings");
  return { rows, errors };
}
