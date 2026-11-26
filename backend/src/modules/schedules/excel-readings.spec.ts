import { Workbook } from "exceljs";
import { HEADERS, parseReadingsExcel, readingTemplate } from "./excel-readings";

describe("Excel reading import", () => {
  async function file(rows: unknown[][]) {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet("Readings");
    sheet.addRow(HEADERS);
    rows.forEach(row => sheet.addRow(row));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
  const now = new Date("2026-11-23T03:00:00Z");
  it("produces the supported downloadable template", async () => {
    const workbook = new Workbook();
    await workbook.xlsx.load(await readingTemplate() as any);
    expect(workbook.worksheets[0].name).toBe("Readings");
    expect(workbook.worksheets[0].getRow(1).values).toEqual([undefined, ...HEADERS]);
  });
  it("parses multiple assets, distinguishes blanks from zero, and converts local time", async () => {
    const parsed = await parseReadingsExcel(await file([
      ["A-1", "23/11/2026 08:00", 1501, 82, 0, "test"],
      ["A-2", "23/11/2026 08:05", null, 72, null],
    ]), "readings.xlsx", now);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.rows[0]).toMatchObject({ measuredAt: "2026-11-23T01:00:00.000Z", vibration: 0, operatingHours: 1501 });
    expect(parsed.rows[1].operatingHours).toBeUndefined();
  });
  it("reports invalid dates, nonnumeric cells, absent values and formulas by row", async () => {
    const parsed = await parseReadingsExcel(await file([
      ["A-1", "31/02/2026 08:00", 10],
      ["A-2", "23/11/2026 08:00", null, "82°C"],
      ["A-3", "23/11/2026 08:00"],
      ["A-4", "23/11/2026 08:00", { formula: "1+2", result: 3 }],
    ]), "test.xlsx", now);
    expect(new Set(parsed.errors.map(e => e.row))).toEqual(new Set([2,3,4,5]));
  });
  it("rejects wrong formats, headers and oversized row counts", async () => {
    await expect(parseReadingsExcel(Buffer.from("not a zip"), "bad.xlsx", now)).rejects.toMatchObject({ status: 400 });
    await expect(parseReadingsExcel(await file([["A", "23/11/2026 08:00", 1]]), "bad.xlsm", now)).rejects.toMatchObject({ status: 400 });
    await expect(parseReadingsExcel(await file(Array.from({ length: 501 }, () => ["A", "23/11/2026 08:00", 1])), "big.xlsx", now)).rejects.toMatchObject({ status: 400 });
  });
});
