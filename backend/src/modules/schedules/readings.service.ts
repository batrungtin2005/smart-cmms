import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { createHash } from "crypto";
import { DataSource, EntityManager, In } from "typeorm";
import { Asset } from "../assets/entities/asset.entity";
import { WorkOrder } from "../work-orders/entities/work-order.entity";
import { RedisService } from "../../common/redis/redis.service";
import { AssetReading, AssetReadingSubmission } from "./entities/asset-reading.entity";
import { ReadingImport } from "./entities/reading-import.entity";
import { ScheduleTrigger } from "./entities/schedule-trigger.entity";
import { ScheduleEngine } from "./schedule-engine.service";
import { CorrectReadingDto, ManualReadingDto, PmPageDto, QueryReadingsDto } from "./dto/schedule.dto";
import { ImportError, ImportRow, lockPm, OPEN_STATUSES, PmActor, READING_FIELDS, requirePmManager, UNITS } from "./pm.types";
import { parseReadingsExcel, validReadingValue } from "./excel-readings";

@Injectable()
export class ReadingsService {
  constructor(private readonly db: DataSource, private readonly engine: ScheduleEngine, @Optional() private readonly redis?: RedisService) {}

  private async accessAsset(id: string, actor: PmActor, manager = this.db.manager) {
    if (actor.role?.name !== "TECHNICIAN") { requirePmManager(actor); return; }
    if (!await manager.existsBy(WorkOrder, { assetId: id, assignedTechnicianId: actor.id })) throw new ForbiddenException();
  }

  private async validateRows(manager: EntityManager, rows: ImportRow[], excludeReadingId?: string, correcting = false) {
    const errors: ImportError[] = [];
    const codes = [...new Set(rows.map(r => r.assetCode))].sort();
    const assets = codes.length ? await manager.find(Asset, { where: { assetCode: In(codes) } }) : [];
    const assetByCode = new Map(assets.map(asset => [asset.assetCode, asset]));
    const ids = assets.map(a => a.id);
    const stored = ids.length ? await manager.find(AssetReading, { where: { assetId: In(ids), isCurrentVersion: true }, order: { measuredAt: "ASC" } }) : [];
    const existing = stored.filter(r => r.id !== excludeReadingId);
    const seen = new Set(existing.map(r => `${r.assetId}|${r.parameter}|${r.measuredAt.toISOString()}`));
    const additions: { assetId: string; parameter: string; value: number; measuredAt: Date; row: number }[] = [];
    for (const row of rows) {
      const asset = assetByCode.get(row.assetCode);
      if (!asset?.isActive || asset.status === "DECOMMISSIONED") { errors.push({ row: row.row, column: "Mã thiết bị", message: "Asset is missing, inactive or decommissioned" }); continue; }
      const time = new Date(row.measuredAt);
      if (!Number.isFinite(time.getTime()) || time > new Date()) { errors.push({ row: row.row, column: "Thời điểm đo", message: "Invalid or future measurement time" }); continue; }
      for (const [field, parameter] of Object.entries(READING_FIELDS)) {
        const value = row[field];
        if (value === undefined) continue;
        if (!validReadingValue(parameter, value)) { errors.push({ row: row.row, column: field, message: "Invalid reading value" }); continue; }
        const key = `${asset.id}|${parameter}|${time.toISOString()}`;
        if (seen.has(key)) errors.push({ row: row.row, column: field, message: "Duplicate reading; use correction for a changed value" });
        seen.add(key);
        additions.push({ assetId: asset.id, parameter, value, measuredAt: time, row: row.row });
      }
    }
    for (const asset of assets) {
      const timeline = [
        ...existing.filter(r => r.assetId === asset.id && r.parameter === "OPERATING_HOURS").map(r => ({ value: Number(r.value), measuredAt: r.measuredAt, row: 0 })),
        ...additions.filter(r => r.assetId === asset.id && r.parameter === "OPERATING_HOURS"),
      ].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
      for (let i = 1; i < timeline.length; i++) {
        if (timeline[i].value < timeline[i - 1].value) errors.push({ row: timeline[i].row || timeline[i - 1].row, column: "operatingHours", message: "Cumulative operating hours conflict with the previous/next reading" });
      }
      const latestStored = stored.filter(r => r.assetId === asset.id && r.parameter === "OPERATING_HOURS").pop();
      if (!correcting) for (const reading of additions.filter(r => r.assetId === asset.id && r.parameter === "OPERATING_HOURS")) {
        if ((!latestStored || reading.measuredAt > latestStored.measuredAt) && reading.value < Number(asset.operatingHours)) {
          errors.push({ row: reading.row, column: "operatingHours", message: "Meter cannot decrease below the asset's current counter" });
        }
      }
    }
    return { errors, assets, assetByCode };
  }

  async preview(buffer: Buffer, filename: string, actor: PmActor) {
    requirePmManager(actor);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    const parsed = await parseReadingsExcel(buffer, filename);
    return this.db.transaction(async manager => {
      await lockPm(manager);
      const previous = await manager.findOneBy(ReadingImport, { checksum, createdById: actor.id });
      if (previous?.status === "CONFIRMED") return previous;
      const validation = parsed.errors.length ? { errors: [] } : await this.validateRows(manager, parsed.rows);
      const data = {
        filename: filename.slice(0, 255), checksum, createdById: actor.id,
        rows: parsed.rows, errors: [...parsed.errors, ...validation.errors],
        status: "PREVIEW", expiresAt: new Date(Date.now() + 24 * 3600000),
      };
      return manager.save(ReadingImport, manager.create(ReadingImport, { ...previous, ...data }));
    });
  }

  private batchAccess(batch: ReadingImport | null, actor: PmActor) {
    requirePmManager(actor);
    if (!batch || (batch.createdById !== actor.id && actor.role.name !== "ADMIN")) throw new NotFoundException();
  }
  async detail(id: string, actor: PmActor) {
    const batch = await this.db.manager.findOneBy(ReadingImport, { id });
    this.batchAccess(batch, actor);
    return batch;
  }
  async list(query: PmPageDto, actor: PmActor) {
    requirePmManager(actor);
    const [items, total] = await this.db.getRepository(ReadingImport).findAndCount({
      where: actor.role.name === "ADMIN" ? {} : { createdById: actor.id },
      select: { id: true, filename: true, status: true, createdAt: true, confirmedAt: true, evaluationStatus: true, evaluationError: true, createdById: true },
      order: { createdAt: "DESC", id: "ASC" }, skip: (query.page - 1) * query.limit, take: query.limit,
    });
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  private async saveRows(manager: EntityManager, rows: ImportRow[], assets: Map<string, Asset>, actor: PmActor, batchId: string | null) {
    for (const row of rows) {
      const asset = assets.get(row.assetCode);
      const submission = await manager.save(AssetReadingSubmission, manager.create(AssetReadingSubmission, {
        assetId: asset.id, createdById: actor.id, importId: batchId, rowNumber: batchId ? row.row : null,
        measuredAt: new Date(row.measuredAt), source: batchId ? "EXCEL" : "MANUAL", notes: row.notes ?? null,
      }));
      for (const [field, parameter] of Object.entries(READING_FIELDS)) {
        if (row[field] === undefined) continue;
        await manager.save(AssetReading, manager.create(AssetReading, { assetId: asset.id, submissionId: submission.id,
          measuredAt: new Date(row.measuredAt), parameter, value: row[field], unit: UNITS[parameter] }));
      }
    }
    await this.refreshMeters(manager, [...assets.values()].map(a => a.id));
  }
  private async refreshMeters(manager: EntityManager, ids: string[]) {
    for (const id of ids) {
      const latest = await manager.findOne(AssetReading, { where: { assetId: id, parameter: "OPERATING_HOURS", isCurrentVersion: true }, order: { measuredAt: "DESC" } });
      if (latest) await manager.update(Asset, id, { operatingHours: Number(latest.value) });
    }
  }
  async confirm(id: string, actor: PmActor) {
    requirePmManager(actor);
    await this.db.transaction(async manager => {
      await lockPm(manager);
      const batch = await manager.findOne(ReadingImport, { where: { id }, lock: { mode: "pessimistic_write" } });
      this.batchAccess(batch, actor);
      if (batch.status === "CONFIRMED") return;
      if (batch.expiresAt <= new Date()) throw new ConflictException("Preview expired; upload the file again");
      if (batch.errors.length) throw new BadRequestException({ message: "Correct all rows before confirmation", errors: batch.errors });
      const assets = await manager.getRepository(Asset).createQueryBuilder("a").where("a.assetCode IN (:...codes)", { codes: [...new Set(batch.rows.map(r => r.assetCode))] }).orderBy("a.id", "ASC").setLock("pessimistic_write").getMany();
      const validated = await this.validateRows(manager, batch.rows);
      if (validated.errors.length) throw new ConflictException({ message: "Database changed since preview", errors: validated.errors });
      await this.saveRows(manager, batch.rows, new Map(assets.map(a => [a.assetCode, a])), actor, batch.id);
      batch.status = "CONFIRMED";
      batch.confirmedAt = new Date();
      batch.evaluationStatus = "PENDING";
      await manager.save(ReadingImport, batch);
    });
    await this.redis?.delByPattern("assets:*");
    await this.evaluateBatch(id);
    return this.detail(id, actor);
  }
  async evaluateBatch(id: string) {
    const batch = await this.db.manager.findOneBy(ReadingImport, { id, status: "CONFIRMED" });
    if (!batch || batch.evaluationStatus === "SUCCEEDED") return;
    const assets = await this.db.manager.find(Asset, { where: { assetCode: In([...new Set(batch.rows.map(r => r.assetCode))]) } });
    try {
      await this.engine.evaluateAssets(assets.map(a => a.id));
      await this.db.manager.update(ReadingImport, id, { evaluationStatus: "SUCCEEDED", evaluationError: null });
    } catch {
      await this.db.manager.update(ReadingImport, id, { evaluationStatus: "FAILED", evaluationError: "Readings saved. Schedule evaluation failed; automatic retry is pending." });
    }
  }
  async retryEvaluations() {
    const batches = await this.db.getRepository(ReadingImport).find({ where: { status: "CONFIRMED", evaluationStatus: In(["PENDING", "FAILED"]) }, order: { updatedAt: "ASC" }, take: 100 });
    for (const batch of batches) await this.evaluateBatch(batch.id);
  }

  async readings(assetId: string, query: QueryReadingsDto, actor: PmActor) {
    await this.accessAsset(assetId, actor);
    const [items, total] = await this.db.getRepository(AssetReading).findAndCount({
      where: { assetId, ...(query.parameter ? { parameter: query.parameter } : {}) }, relations: { submission: true },
      order: { measuredAt: "DESC", createdAt: "DESC", id: "ASC" }, skip: (query.page - 1) * query.limit, take: query.limit,
    });
    return { items, meta: { total, page: query.page, limit: query.limit } };
  }

  async manual(dto: ManualReadingDto, actor: PmActor) {
    const result = await this.db.transaction(async manager => {
      await lockPm(manager);
      await this.accessAsset(dto.assetId, actor, manager);
      if (actor.role.name === "TECHNICIAN" && !await manager.getRepository(WorkOrder).createQueryBuilder("wo").where("wo.assetId = :id AND wo.assignedTechnicianId = :actor AND wo.status IN (:...states)", { id: dto.assetId, actor: actor.id, states: OPEN_STATUSES }).getExists()) throw new ForbiddenException();
      const asset = await manager.findOne(Asset, { where: { id: dto.assetId }, lock: { mode: "pessimistic_write" } });
      if (!asset) throw new NotFoundException();
      const field = Object.keys(READING_FIELDS).find(key => READING_FIELDS[key] === dto.parameter);
      const row: ImportRow = { row: 1, assetCode: asset.assetCode, measuredAt: dto.measuredAt, notes: dto.notes, [field]: dto.value };
      // A repeated identical manual reading is an idempotent no-op.
      const existing = await manager.findOneBy(AssetReading, { assetId: asset.id, parameter: dto.parameter, measuredAt: new Date(dto.measuredAt), isCurrentVersion: true });
      if (existing && Number(existing.value) === dto.value) return existing;
      const validated = await this.validateRows(manager, [row]);
      if (validated.errors.length) throw new BadRequestException({ message: "Invalid reading", errors: validated.errors });
      await this.saveRows(manager, [row], validated.assetByCode, actor, null);
      return manager.findOneByOrFail(AssetReading, { assetId: asset.id, parameter: dto.parameter, measuredAt: new Date(dto.measuredAt), isCurrentVersion: true });
    });
    await this.redis?.delByPattern("assets:*");
    let evaluationStatus = "SUCCEEDED";
    try { await this.engine.evaluateAssets([dto.assetId]); } catch { evaluationStatus = "FAILED_RETRY_BY_CRON"; }
    return { reading: result, evaluationStatus };
  }

  async correct(id: string, dto: CorrectReadingDto, actor: PmActor) {
    requirePmManager(actor);
    const result = await this.db.transaction(async manager => {
      await lockPm(manager);
      const original = await manager.findOneBy(AssetReading, { id });
      if (!original) throw new NotFoundException();
      if (!original.isCurrentVersion) throw new ConflictException("Reading was already corrected");
      const asset = await manager.findOne(Asset, { where: { id: original.assetId }, lock: { mode: "pessimistic_write" } });
      const field = Object.keys(READING_FIELDS).find(key => READING_FIELDS[key] === original.parameter);
      const row: ImportRow = { row: 1, assetCode: asset.assetCode, measuredAt: original.measuredAt.toISOString(), [field]: dto.value };
      const validated = await this.validateRows(manager, [row], id, true);
      if (validated.errors.length) throw new BadRequestException({ message: "Invalid correction", errors: validated.errors });
      const submission = await manager.save(AssetReadingSubmission, manager.create(AssetReadingSubmission, {
        assetId: asset.id, createdById: actor.id, measuredAt: original.measuredAt, source: "CORRECTION", notes: dto.reason.trim(),
      }));
      await manager.update(AssetReading, original.id, { isCurrentVersion: false });
      const reading = await manager.save(AssetReading, manager.create(AssetReading, {
        assetId: asset.id, submissionId: submission.id, parameter: original.parameter, measuredAt: original.measuredAt,
        unit: original.unit, value: dto.value, supersedesId: original.id,
      }));
      await this.refreshMeters(manager, [asset.id]);
      const affected = await manager.getRepository(ScheduleTrigger).createQueryBuilder("t")
        .where("t.readingId = :id OR t.acceptedReadingId = :id", { id }).getMany();
      return { reading, affectedWorkOrderIds: affected.map(t => t.workOrderId), message: "Original evidence retained; existing work orders and accepted thresholds are not rewritten" };
    });
    await this.redis?.delByPattern("assets:*");
    let evaluationStatus = "SUCCEEDED";
    try { await this.engine.evaluateAssets([result.reading.assetId]); } catch { evaluationStatus = "FAILED_RETRY_BY_CRON"; }
    return { ...result, evaluationStatus };
  }
}
