import { Workbook } from "exceljs";
import { HEADERS } from "./excel-readings";
import { SchedulesModule } from "./schedules.module";
import { ScheduleEngine } from "./schedule-engine.service";
import { SchedulesScheduler } from "./schedules.scheduler";
import { AssetReading } from "./entities/asset-reading.entity";
import { localDate, addDays } from "./pm.types";
import { Asset } from "../assets/entities/asset.entity";
import { AssetsService } from "../assets/assets.service";
import { HistoryService } from "../history/history.service";
import { RedisService } from "../../common/redis/redis.service";
import { PartsModule } from "../parts/parts.module";
import "reflect-metadata";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { Client } from "pg";
import request = require("supertest");
import { DataSource } from "typeorm";
import { HttpExceptionFilter } from "../../common/filters/http-exception.filter";
import { TransformInterceptor } from "../../common/interceptors/transform.interceptor";
import { Role } from "../auth/entities/role.entity";
import { User } from "../auth/entities/user.entity";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { AssetHistory } from "../history/entities/asset-history.entity";
import { Location } from "../locations/entities/location.entity";
import { AssetPartBom } from "../parts/entities/asset-part-bom.entity";
import { PartTransaction } from "../parts/entities/part-transaction.entity";
import { Part } from "../parts/entities/part.entity";
import { WorkOrdersModule } from "../work-orders/work-orders.module";

// Explicit opt-in: creates a uniquely named test schema and drops only that schema.
const postgresDescribe =
  process.env.RUN_POSTGRES_TESTS === "1" ? describe : describe.skip;
postgresDescribe("PM schedules and Excel HTTP + PostgreSQL", () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let adminClient: Client;
  let database: DataSource;
  const schema = `cmms_pm_test_${randomUUID().replace(/-/g, "")}`;
  const jwtSecret = randomUUID();
  const ids = {
    admin: randomUUID(),
    manager: randomUUID(),
    tech: randomUUID(),
    otherTech: randomUUID(),
    inactive: randomUUID(),
    warehouse: randomUUID(),
    asset: randomUUID(),
    inactiveAsset: randomUUID(),
  };
  const tokens: Record<string, string> = {};
  let workOrderId: string;

  beforeAll(async () => {
    const backend = resolve(__dirname, "../../..");
    const env: Record<string, string> = {};
    for (const file of [
      resolve(backend, ".env"),
      resolve(backend, "../.env"),
    ]) {
      if (!existsSync(file)) continue;
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*(DB_[A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
      }
    }
    Object.assign(env, process.env);
    const connection = {
      host: env.DB_HOST || "localhost",
      port: Number(env.DB_PORT || 5432),
      user: env.DB_USERNAME || "postgres",
      password: env.DB_PASSWORD,
      database: env.DB_NAME || "smart_cmms_db",
      connectionTimeoutMillis: 5000,
    };
    adminClient = new Client(connection);
    await adminClient.connect();
    await adminClient.query("BEGIN");
    await adminClient.query(`CREATE SCHEMA "${schema}"`);
    await adminClient.query(`SET LOCAL search_path TO "${schema}", public`);
    await adminClient.query(readFileSync(resolve(backend, "src/database/smart_cmms_db.sql"), "utf8")
      .split("-- PM engine and readings additions (2026-11-23).")[0]);
    const migration = readFileSync(resolve(backend, "src/database/migrations/20261123_maintenance_schedules.sql"), "utf8")
      .replace(/^BEGIN;$/m, "").replace(/^COMMIT;$/m, "");
    await adminClient.query(migration);
    await adminClient.query(migration);
    await adminClient.query("COMMIT");

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          ignoreEnvVars: true,
          load: [() => ({ JWT_SECRET: jwtSecret })],
        }),
        TypeOrmModule.forRoot({
          type: "postgres",
          host: connection.host,
          port: connection.port,
          username: connection.user,
          password: connection.password,
          database: connection.database,
          schema,
          extra: {
            options: `-c search_path=${schema},public`,
            application_name: schema,
          },
          synchronize: false,
          autoLoadEntities: true,
          retryAttempts: 1,
          // WorkOrder/WorkOrderPart/MaintenanceSchedule must come from the real module registration.
          entities: [
            Role,
            Location,
            Part,
            PartTransaction,
            AssetHistory,
            AssetPartBom,
          ],
        }),
        TypeOrmModule.forFeature([User, AssetHistory, Asset]),
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.register({ secret: jwtSecret }),
        WorkOrdersModule,
        SchedulesModule,
        PartsModule,
      ],
      providers: [
        JwtStrategy,
        AssetsService,
        HistoryService,
        {
          provide: RedisService,
          useValue: { delByPattern: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    database = app.get(DataSource);
    const jwt = app.get(JwtService);
    for (const [key, role] of Object.entries({
      admin: "ADMIN",
      manager: "MAINTENANCE_MANAGER",
      tech: "TECHNICIAN",
      otherTech: "TECHNICIAN",
      inactive: "TECHNICIAN",
      warehouse: "WAREHOUSE_KEEPER",
    })) {
      await database.query(
        "INSERT INTO users (id, role_id, username, email, full_name, password_hash, is_active) SELECT $1, id, $2, $3, $2, $4, $5 FROM roles WHERE name = $6",
        [
          ids[key],
          key,
          `${key}@test.invalid`,
          "SECRET_HASH_MUST_NOT_LEAK",
          key !== "inactive",
          role,
        ],
      );
      tokens[key] = jwt.sign({ sub: ids[key], username: key, role });
    }
    await database.query(
      "INSERT INTO assets (id, asset_code, name, category, is_active) VALUES ($1, 'WO-TEST-A', 'Test asset', 'test', true), ($2, 'WO-TEST-INACTIVE', 'Inactive', 'test', false)",
      [ids.asset, ids.inactiveAsset],
    );
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
    } finally {
      if (adminClient) {
        await adminClient.query("ROLLBACK");
        // Generated identifier is validated before destructive cleanup; never target public.
        if (!/^cmms_pm_test_[a-f0-9]{32}$/.test(schema))
          throw new Error("Unsafe test schema");
        await adminClient.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await adminClient.end();
      }
    }
  });

  const api = () => request(app.getHttpServer());
  const base = "/api/v1/work-orders";
  const creation = () => ({
    assetId: ids.asset,
    title: "Repair compressor",
    breakdownTime: "2026-01-01T08:00:00+07:00",
  });
  const auth = (key: string) => `Bearer ${tokens[key]}`;

  const pm = "/api/v1/schedules";
  const imports = "/api/v1/reading-imports";
  const today = () => localDate(new Date());
  const engine = () => app.get(ScheduleEngine);
  const createAsset = async () => {
    const id = randomUUID();
    const code = `PM-${id}`;
    await database.query("INSERT INTO assets (id, asset_code, name, category) VALUES ($1, $2, 'PM asset', 'test')", [id, code]);
    return { id, code };
  };
  const timeSchedule = async (assetId: string, day = today()) => (await api().post(pm)
    .set("Authorization", auth("manager")).send({ assetId, title: "Monthly check", scheduleType: "TIME_BASED", intervalDays: 30, nextDueDate: day }).expect(201)).body.data;
  const reading = (assetId: string, parameter: string, value: number, measuredAt = new Date().toISOString(), actor = "manager") => api()
    .post("/api/v1/readings").set("Authorization", auth(actor)).send({ assetId, parameter, value, measuredAt });
  const woDetail = async (id: string) => (await api().get(`${base}/${id}`).set("Authorization", auth("manager")).expect(200)).body.data;
  const technicianFor = (wo: any) => wo.assignedTechnicianId === ids.tech ? "tech" : "otherTech";
  const completePm = async (id: string) => {
    const wo = await woDetail(id);
    const tech = technicianFor(wo);
    await api().patch(`${base}/${id}/status`).set("Authorization", auth(tech)).send({ status: "IN_PROGRESS" }).expect(200);
    await api().patch(`${base}/${id}/complete`).set("Authorization", auth(tech)).send({ rootCause: "Scheduled maintenance", solution: "Checked and serviced" }).expect(200);
    return tech;
  };
  const accept = (id: string, extra: object = {}) => api().patch(`${base}/${id}/verify`).set("Authorization", auth("manager"))
    .send({ decision: "ACCEPT", verificationNotes: "Passed", ...extra });
  const formatDate = (date: Date) => {
    const shifted = new Date(date.getTime() + 7 * 3600000);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(shifted.getUTCDate())}/${pad(shifted.getUTCMonth() + 1)}/${shifted.getUTCFullYear()} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
  };
  const excel = async (rows: unknown[][]) => {
    const workbook = new Workbook(); const sheet = workbook.addWorksheet("Readings"); sheet.addRow(HEADERS);
    rows.forEach(row => sheet.addRow(row));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  };
  const preview = (buffer: Buffer, actor = "manager") => api().post(`${imports}/preview`).set("Authorization", auth(actor))
    .attach("file", buffer, { filename: "readings.xlsx", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const confirm = (id: string) => api().post(`${imports}/${id}/confirm`).set("Authorization", auth("manager"));

  it("validates permissions, type-specific configuration, full updates and revisions", async () => {
    const asset = await createAsset();
    await api().get(pm).expect(401);
    await api().get(pm).set("Authorization", auth("tech")).expect(403);
    const body = { assetId: asset.id, title: "PM", scheduleType: "TIME_BASED", intervalDays: 30, nextDueDate: today() };
    await api().post(pm).set("Authorization", auth("manager")).send({ ...body, intervalDays: 0 }).expect(400);
    await api().post(pm).set("Authorization", auth("manager")).send({ ...body, conditionThreshold: 20 }).expect(400);
    const schedule = await timeSchedule(asset.id, addDays(today(), 10));
    await api().patch(`${pm}/${schedule.id}`).set("Authorization", auth("manager"))
      .send({ ...body, nextDueDate: addDays(today(), 20), expectedRevision: 99 }).expect(409);
    const updated = await api().patch(`${pm}/${schedule.id}`).set("Authorization", auth("manager"))
      .send({ ...body, nextDueDate: addDays(today(), 20), expectedRevision: 1 }).expect(200);
    expect(updated.body.data.revision).toBe(2);
    await api().patch(`${pm}/${schedule.id}/activation`).set("Authorization", auth("manager"))
      .send({ isActive: false, expectedRevision: 2 }).expect(200);
    expect((await engine().evaluate(schedule.id)).state).toBe("DISABLED");
  });

  it("creates each due cycle once across concurrent workers and balances active workloads", async () => {
    const asset = await createAsset();
    const first = await timeSchedule(asset.id);
    const second = await timeSchedule(asset.id);
    const results = await Promise.all([engine().evaluate(first.id), engine().evaluate(first.id), engine().evaluate(second.id)]);
    expect(results.filter(result => result.state === "TRIGGERED")).toHaveLength(2);
    const orders = await database.query("SELECT * FROM work_orders WHERE schedule_id IN ($1, $2)", [first.id, second.id]);
    expect(orders).toHaveLength(2);
    expect(new Set(orders.map(wo => wo.assigned_technician_id)).size).toBe(2);
    expect(orders.every(wo => wo.status === "ASSIGNED" && wo.type === "PREVENTIVE")).toBe(true);
    const system = (await database.query("SELECT id, is_active FROM users WHERE username = '__pm_scheduler__'"))[0];
    expect(system.is_active).toBe(false);
    expect(orders.every(wo => wo.created_by_id === system.id)).toBe(true);
    const history = await api().get(`${pm}/${first.id}/work-orders`).set("Authorization", auth("manager")).expect(200);
    expect(history.body.data.items).toHaveLength(1);
    expect(history.body.data.items[0].snapshot.reason).toBe("DUE");
    const listing = await api().get(`${pm}/due`).query({ assetId: asset.id }).set("Authorization", auth("manager")).expect(200);
    expect(listing.body.data.meta.total).toBe(0);
  });

  it("advances the day cycle only on acceptance, keeps rework in the same cycle", async () => {
    const asset = await createAsset();
    const schedule = await timeSchedule(asset.id, addDays(today(), -10));
    const generated = await engine().evaluate(schedule.id);
    const tech = await completePm(generated.workOrderId);
    await api().patch(`${base}/${generated.workOrderId}/verify`).set("Authorization", auth("manager"))
      .send({ decision: "REJECT", verificationNotes: "Repeat the inspection" }).expect(200);
    expect((await engine().evaluate(schedule.id)).state).toBe("WORK_ORDER_OPEN");
    await api().patch(`${base}/${generated.workOrderId}/status`).set("Authorization", auth(tech)).send({ status: "IN_PROGRESS" }).expect(200);
    await api().patch(`${base}/${generated.workOrderId}/complete`).set("Authorization", auth(tech)).send({ rootCause: "PM", solution: "Rechecked" }).expect(200);
    await accept(generated.workOrderId).expect(200);
    const current = (await api().get(`${pm}/${schedule.id}`).set("Authorization", auth("manager")).expect(200)).body.data;
    expect(current.nextDueDate).toBe(addDays(today(), 30));
    expect(current.cycle).toBe(2);
    expect((await engine().evaluate(schedule.id)).due).toBe(false);
    await accept(generated.workOrderId).expect(409);
  });

  it("requires a cancellation decision and atomically defers or disables PM", async () => {
    const asset = await createAsset(); const schedule = await timeSchedule(asset.id);
    const generated = await engine().evaluate(schedule.id);
    const cancel = (body: object) => api().patch(`${base}/${generated.workOrderId}/status`).set("Authorization", auth("manager"))
      .send({ status: "CANCELLED", reason: "Production cannot stop", ...body });
    await cancel({}).expect(400);
    expect((await woDetail(generated.workOrderId)).status).toBe("ASSIGNED");
    await cancel({ scheduleAction: "DEFER", deferDate: addDays(today(), 3) }).expect(200);
    expect((await engine().evaluate(schedule.id)).due).toBe(false);
    const other = await timeSchedule(asset.id);
    const next = await engine().evaluate(other.id);
    await api().patch(`${base}/${next.workOrderId}/status`).set("Authorization", auth("manager"))
      .send({ status: "CANCELLED", reason: "Paused plan", scheduleAction: "DISABLE" }).expect(200);
    expect((await engine().evaluate(other.id)).state).toBe("DISABLED");
  });

  it("stores nothing at preview, confirms an Excel file once and rejects duplicates across files", async () => {
    const a = await createAsset(); const b = await createAsset();
    const time = formatDate(new Date(Date.now() - 10000));
    const file = await excel([[a.code, time, 1501, 82, 0], [b.code, time, null, 72]]);
    const p = (await preview(file).expect(201)).body.data;
    expect(p.errors).toEqual([]);
    expect(await database.query("SELECT id FROM asset_readings WHERE asset_id IN ($1, $2)", [a.id, b.id])).toHaveLength(0);
    const responses = await Promise.all([confirm(p.id).expect(201), confirm(p.id).expect(201)]);
    expect(responses.every(r => r.body.data.status === "CONFIRMED")).toBe(true);
    expect(await database.query("SELECT id FROM asset_readings WHERE asset_id IN ($1, $2)", [a.id, b.id])).toHaveLength(4);
    const repeated = (await preview(file).expect(201)).body.data;
    expect(repeated.id).toBe(p.id);
    expect(repeated.status).toBe("CONFIRMED");
    const duplicate = (await preview(await excel([[a.code, time, 1501, 82, 0, "another file"]])).expect(201)).body.data;
    expect(duplicate.errors.length).toBeGreaterThan(0);
    await confirm(duplicate.id).expect(400);
    const history = await api().get(`/api/v1/assets/${a.id}/readings`).set("Authorization", auth("manager")).expect(200);
    expect(history.body.data.meta.total).toBe(3);
    expect(history.body.data.items.some(r => r.parameter === "VIBRATION" && Number(r.value) === 0)).toBe(true);
    await preview(file, "tech").expect(403);
  });

  it("rejects an entire invalid file and revalidates a valid preview against changed database state", async () => {
    const asset = await createAsset(); const time = formatDate(new Date(Date.now() - 10000));
    const invalid = (await preview(await excel([[asset.code, time, 100], ["MISSING", time, 200]])).expect(201)).body.data;
    expect(invalid.errors.some(e => e.row === 3)).toBe(true);
    await confirm(invalid.id).expect(400);
    expect(await database.query("SELECT id FROM asset_readings WHERE asset_id = $1", [asset.id])).toHaveLength(0);
    const valid = (await preview(await excel([[asset.code, time, 100]])).expect(201)).body.data;
    await reading(asset.id, "OPERATING_HOURS", 120, new Date(Date.now() - 20000).toISOString()).expect(201);
    const rejected = await confirm(valid.id).expect(409);
    expect(rejected.body.errors.length).toBeGreaterThan(0);
    expect(await database.query("SELECT id FROM asset_readings WHERE asset_id = $1", [asset.id])).toHaveLength(1);
  });

  it("triggers usage at 1501 and advances to 3010 using the meter at acceptance", async () => {
    const asset = await createAsset();
    const schedule = (await api().post(pm).set("Authorization", auth("manager")).send({ assetId: asset.id, title: "Oil change", scheduleType: "USAGE_BASED", intervalHours: 1500, nextDueHours: 1500 }).expect(201)).body.data;
    await reading(asset.id, "OPERATING_HOURS", 1501).expect(201);
    const id = (await database.query("SELECT id FROM work_orders WHERE schedule_id = $1", [schedule.id]))[0].id;
    const tech = await completePm(id);
    await accept(id).expect(400);
    const measured = (await reading(asset.id, "OPERATING_HOURS", 1510, new Date().toISOString(), tech).expect(201)).body.data.reading;
    await accept(id, { meterReadingId: measured.id }).expect(200);
    const current = (await api().get(`${pm}/${schedule.id}`).set("Authorization", auth("manager")).expect(200)).body.data;
    expect(Number(current.nextDueHours)).toBe(3010);
    await reading(asset.id, "OPERATING_HOURS", 1509).expect(400);
    expect((await engine().evaluate(schedule.id)).due).toBe(false);
  });

  it("re-triggers temperature only after acceptance, a new reading and cooldown", async () => {
    const asset = await createAsset();
    const body = { assetId: asset.id, title: "Temperature", scheduleType: "CONDITION_BASED", conditionParameter: "TEMPERATURE",
      conditionOperator: ">", conditionThreshold: 85, measurementLocation: "Bearing", maxReadingAgeMinutes: 60, cooldownMinutes: 10 };
    await api().post(pm).set("Authorization", auth("manager")).send({ ...body, cooldownMinutes: null }).expect(400);
    const schedule = (await api().post(pm).set("Authorization", auth("manager")).send(body).expect(201)).body.data;
    await reading(asset.id, "TEMPERATURE", 90).expect(201);
    const first = (await database.query("SELECT id FROM work_orders WHERE schedule_id = $1", [schedule.id]))[0].id;
    await completePm(first); await accept(first).expect(200);
    expect((await engine().evaluate(schedule.id)).state).toBe("AWAITING_NEW_READING");
    await reading(asset.id, "TEMPERATURE", 92).expect(201);
    expect((await engine().evaluate(schedule.id)).state).toBe("COOLDOWN");
    await database.query("UPDATE maintenance_schedules SET last_completed_at = now() - interval '11 minutes' WHERE id = $1", [schedule.id]);
    const second = await engine().evaluate(schedule.id);
    expect(second.state).toBe("TRIGGERED");
    expect(second.workOrderId).not.toBe(first);
    expect(await database.query("SELECT id FROM work_orders WHERE schedule_id = $1", [schedule.id])).toHaveLength(2);
  });

  it("keeps corrections and source evidence without changing previously generated work orders", async () => {
    const asset = await createAsset();
    const old = (await reading(asset.id, "TEMPERATURE", 90).expect(201)).body.data.reading;
    const corrected = await api().post(`/api/v1/readings/${old.id}/corrections`).set("Authorization", auth("manager"))
      .send({ value: 80, reason: "Transcription mistake" }).expect(201);
    expect(corrected.body.data.reading.supersedesId).toBe(old.id);
    const rows = await database.query("SELECT value, is_current_version FROM asset_readings WHERE asset_id = $1 ORDER BY value", [asset.id]);
    expect(rows).toEqual([{ value: "80.0000", is_current_version: true }, { value: "90.0000", is_current_version: false }]);
    await api().post(`/api/v1/readings/${old.id}/corrections`).set("Authorization", auth("manager"))
      .send({ value: 70, reason: "Again" }).expect(409);
  });

  it("rolls back failed generation and retries without creating duplicates", async () => {
    const asset = await createAsset(); const schedule = await timeSchedule(asset.id);
    await database.query("ALTER TABLE schedule_triggers ADD CONSTRAINT test_reject_pm CHECK (false) NOT VALID");
    try {
      await expect(engine().evaluate(schedule.id)).rejects.toBeDefined();
      expect(await database.query("SELECT id FROM work_orders WHERE schedule_id = $1", [schedule.id])).toHaveLength(0);
    } finally { await database.query("ALTER TABLE schedule_triggers DROP CONSTRAINT test_reject_pm"); }
    expect((await engine().evaluate(schedule.id)).state).toBe("TRIGGERED");
    expect((await engine().evaluate(schedule.id)).state).toBe("WORK_ORDER_OPEN");
  });

  it("matches SQL columns and types for all PM entities", async () => {
    const names = ["maintenance_schedules", "reading_import_batches", "asset_reading_submissions", "asset_readings", "schedule_triggers"];
    for (const table of database.entityMetadatas.filter(t => names.includes(t.tableName))) {
      const rows = await database.query("SELECT * FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2", [schema, table.tableName]);
      expect(rows.map(r => r.column_name).sort()).toEqual(table.columns.map(c => c.databaseName).sort());
      for (const column of table.columns) {
        const sql = rows.find(r => r.column_name === column.databaseName);
        expect(sql.is_nullable === "YES").toBe(column.isNullable);
        if (column.type === "enum") expect(sql.udt_name).toBe(column.enumName);
        else expect(sql.data_type).toBe(database.driver.normalizeType(column));
        if (column.length) expect(sql.character_maximum_length).toBe(Number(column.length));
        if (column.precision) expect(sql.numeric_precision).toBe(column.precision);
        if (column.scale !== undefined) expect(sql.numeric_scale).toBe(column.scale);
      }
    }
  });

  it("retains imported readings when generation fails and retries without reimport", async () => {
    const asset = await createAsset();
    const schedule = await timeSchedule(asset.id);
    const batch = (await preview(await excel([[asset.code, formatDate(new Date(Date.now() - 10000)), null, 75]])).expect(201)).body.data;
    await database.query("ALTER TABLE schedule_triggers ADD CONSTRAINT test_import_failure CHECK (false) NOT VALID");
    try {
      const result = (await confirm(batch.id).expect(201)).body.data;
      expect(result.status).toBe("CONFIRMED");
      expect(result.evaluationStatus).toBe("FAILED");
      expect(await database.query("SELECT id FROM asset_readings WHERE asset_id = $1", [asset.id])).toHaveLength(1);
      expect(await database.query("SELECT id FROM work_orders WHERE schedule_id = $1", [schedule.id])).toHaveLength(0);
    } finally { await database.query("ALTER TABLE schedule_triggers DROP CONSTRAINT test_import_failure"); }
    const result = (await confirm(batch.id).expect(201)).body.data;
    expect(result.evaluationStatus).toBe("SUCCEEDED");
    expect(await database.query("SELECT id FROM asset_readings WHERE asset_id = $1", [asset.id])).toHaveLength(1);
    expect(await database.query("SELECT id FROM work_orders WHERE schedule_id = $1", [schedule.id])).toHaveLength(1);
  });

  it("falls back to OPEN without an active technician and never runs disabled cron", async () => {
    const asset = await createAsset(); const schedule = await timeSchedule(asset.id);
    await database.query("UPDATE users SET is_active = false WHERE id IN ($1, $2)", [ids.tech, ids.otherTech]);
    try {
      const generated = await engine().evaluate(schedule.id);
      const wo = await woDetail(generated.workOrderId);
      expect(wo.status).toBe("OPEN"); expect(wo.assignedTechnicianId).toBeNull();
    } finally { await database.query("UPDATE users SET is_active = true WHERE id IN ($1, $2)", [ids.tech, ids.otherTech]); }
    const spy = jest.spyOn(engine(), "sweep"); const before = process.env.PM_CRON_ENABLED;
    process.env.PM_CRON_ENABLED = "false";
    try { await app.get(SchedulesScheduler).tick(); expect(spy).not.toHaveBeenCalled(); }
    finally { if (before === undefined) delete process.env.PM_CRON_ENABLED; else process.env.PM_CRON_ENABLED = before; spy.mockRestore(); }
  });
});
