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
import { WorkOrdersModule } from "./work-orders.module";

// Explicit opt-in: creates a uniquely named test schema and drops only that schema.
const postgresDescribe =
  process.env.RUN_POSTGRES_TESTS === "1" ? describe : describe.skip;
postgresDescribe("WorkOrdersModule HTTP + PostgreSQL", () => {
  jest.setTimeout(60000);
  let app: INestApplication;
  let adminClient: Client;
  let database: DataSource;
  const schema = `cmms_wo_test_${randomUUID().replace(/-/g, "")}`;
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
    await adminClient.query(
      // Start from the previous schema, then exercise the upgrade (including replay).
      readFileSync(resolve(backend, "src/database/smart_cmms_db.sql"), "utf8")
        .split("-- Material requests and warehouse issue workflow.")[0]
        .replace("    asset_status_at_start    asset_status_enum NULL,\n", "")
        .replace("    operating_hours_at_failure NUMERIC(10, 2) NULL,\n", "")
        .replace(
          "        'ON_HOLD',      -- Tạm hoãn\n        'REWORK_REQUIRED' -- Nghiệm thu không đạt, cần sửa lại",
          "        'ON_HOLD'",
        )
        .replace(
          "CONSTRAINT uq_wo_part_price UNIQUE (work_order_id, part_id, unit_price)",
          "CONSTRAINT uq_wo_part UNIQUE (work_order_id, part_id)",
        ),
    );
    const migration = readFileSync(
      resolve(
        backend,
        "src/database/migrations/20261113_material_requests.sql",
      ),
      "utf8",
    )
      .replace(/^BEGIN;$/m, "")
      .replace(/^COMMIT;$/m, "");
    await adminClient.query(migration);
    await adminClient.query(migration);
    const completionMigration = readFileSync(
      resolve(
        backend,
        "src/database/migrations/20261113_work_order_completion.sql",
      ),
      "utf8",
    )
      .replace(/^BEGIN;$/m, "")
      .replace(/^COMMIT;$/m, "");
    await adminClient.query(completionMigration);
    await adminClient.query(completionMigration);
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
        if (!/^cmms_wo_test_[a-f0-9]{32}$/.test(schema))
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

  it("requires JWT, rejects KTV writes and forged fields", async () => {
    await api().get(base).expect(401);
    await api()
      .post(base)
      .set("Authorization", auth("tech"))
      .send(creation())
      .expect(403);
    await api().get(base).set("Authorization", auth("warehouse")).expect(403);
    await api()
      .get(`${base}/my-tasks`)
      .set("Authorization", auth("inactive"))
      .expect(401);
    await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send({ ...creation(), createdById: ids.admin })
      .expect(400);
    await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send({ ...creation(), assetId: ids.inactiveAsset })
      .expect(404);
    await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send({ assetId: ids.asset, title: "Missing failure time" })
      .expect(400);
  });

  it("creates OPEN order, persists creator and returns safe detail", async () => {
    const response = await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send(creation())
      .expect(201);
    workOrderId = response.body.data.id;
    expect(response.body.data).toMatchObject({
      status: "OPEN",
      createdById: ids.manager,
      assignedTechnicianId: null,
      parts: [],
    });
    expect(response.body.data.workOrderCode).toMatch(
      /^WO-\d{4}-[a-f0-9-]{36}$/,
    );
    expect(Number(response.body.data.downtimeHours)).toBe(0);
    expect(JSON.stringify(response.body)).not.toMatch(/password|SECRET_HASH/);
    const row = (
      await database.query(
        "SELECT created_by_id, status FROM work_orders WHERE id = $1",
        [workOrderId],
      )
    )[0];
    expect(row).toMatchObject({ created_by_id: ids.manager, status: "OPEN" });
    await api()
      .get(`${base}/${workOrderId}`)
      .set("Authorization", auth("otherTech"))
      .expect(404);
  });

  it("rejects invalid assignees, assigns technician, scopes my-tasks and supports reassignment", async () => {
    for (const assignedTechnicianId of [
      ids.inactive,
      ids.manager,
      randomUUID(),
    ]) {
      await api()
        .patch(`${base}/${workOrderId}/assign`)
        .set("Authorization", auth("manager"))
        .send({ assignedTechnicianId })
        .expect(400);
    }
    const assignment = await api()
      .patch(`${base}/${workOrderId}/assign`)
      .set("Authorization", auth("manager"))
      .send({ assignedTechnicianId: ids.tech })
      .expect(200);
    expect(assignment.body.data).toMatchObject({
      status: "ASSIGNED",
      assignedTechnicianId: ids.tech,
    });
    expect(JSON.stringify(assignment.body)).not.toMatch(/password|SECRET_HASH/);
    await api()
      .get(`${base}/${workOrderId}`)
      .set("Authorization", auth("tech"))
      .expect(200);
    const own = await api()
      .get(`${base}/my-tasks`)
      .set("Authorization", auth("tech"))
      .expect(200);
    expect(own.body.data.items.map((item) => item.id)).toEqual([workOrderId]);
    const other = await api()
      .get(`${base}/my-tasks`)
      .set("Authorization", auth("otherTech"))
      .expect(200);
    expect(other.body.data.meta.total).toBe(0);
    await api()
      .get(`${base}/my-tasks?assignedTechnicianId=${ids.tech}`)
      .set("Authorization", auth("otherTech"))
      .expect(400);
    await api()
      .patch(`${base}/${workOrderId}/assign`)
      .set("Authorization", auth("tech"))
      .send({ assignedTechnicianId: ids.otherTech })
      .expect(403);
    await api()
      .patch(`${base}/${workOrderId}/assign`)
      .set("Authorization", auth("admin"))
      .send({ assignedTechnicianId: ids.otherTech })
      .expect(200);
    await api()
      .get(`${base}/${workOrderId}`)
      .set("Authorization", auth("tech"))
      .expect(404);
    await api()
      .get(`${base}/${workOrderId}`)
      .set("Authorization", auth("otherTech"))
      .expect(200);
  });

  it("creates concurrently without duplicate codes and validates filters/pagination", async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        api()
          .post(base)
          .set("Authorization", auth("admin"))
          .send({
            assetId: ids.asset,
            title: `Inspect ${i}`,
            type: "INSPECTION",
            priority: "LOW",
          })
          .expect(201),
      ),
    );
    expect(new Set(results.map((r) => r.body.data.workOrderCode)).size).toBe(6);
    const response = await api()
      .get(base)
      .query({
        type: "INSPECTION",
        priority: "LOW",
        assetId: ids.asset,
        search: "Inspect",
        page: 2,
        limit: 2,
      })
      .set("Authorization", auth("manager"))
      .expect(200);
    expect(response.body.data.meta).toEqual({
      total: 6,
      page: 2,
      limit: 2,
      totalPages: 3,
    });
    expect(response.body.data.items).toHaveLength(2);
    const filtered = await api()
      .get(base)
      .query({ assignedTechnicianId: ids.otherTech, status: "ASSIGNED" })
      .set("Authorization", auth("manager"))
      .expect(200);
    expect(filtered.body.data.items.map((item) => item.id)).toEqual([
      workOrderId,
    ]);
    const literal = await api()
      .get(base)
      .query({ search: "%" })
      .set("Authorization", auth("manager"))
      .expect(200);
    expect(literal.body.data.meta.total).toBe(0);
    await api()
      .get(base)
      .query({ limit: 101 })
      .set("Authorization", auth("manager"))
      .expect(400);
    await api()
      .get(base)
      .query({
        createdFrom: "2026-02-02T00:00:00Z",
        createdTo: "2026-02-01T00:00:00Z",
      })
      .set("Authorization", auth("manager"))
      .expect(400);
    await api()
      .get(`${base}/not-a-uuid`)
      .set("Authorization", auth("manager"))
      .expect(400);
  });

  it("locks assignment against an in-flight status change and leaves assignee unchanged", async () => {
    const runner = database.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(
        "UPDATE work_orders SET status = 'IN_PROGRESS' WHERE id = $1",
        [workOrderId],
      );
      const pending = api()
        .patch(`${base}/${workOrderId}/assign`)
        .set("Authorization", auth("manager"))
        .send({ assignedTechnicianId: ids.tech })
        .then((response) => response);
      let waitingForLock = false;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const locks = await database.query(
          "SELECT pid FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'",
          [schema],
        );
        if (locks.length) {
          waitingForLock = true;
          break;
        }
        await new Promise((done) => setTimeout(done, 20));
      }
      expect(waitingForLock).toBe(true);
      await runner.commitTransaction();
      expect((await pending).status).toBe(409);
      const row = (
        await database.query(
          "SELECT status, assigned_technician_id FROM work_orders WHERE id = $1",
          [workOrderId],
        )
      )[0];
      expect(row).toMatchObject({
        status: "IN_PROGRESS",
        assigned_technician_id: ids.otherTech,
      });
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });
  it("enforces transitions, preserves first start, and serializes duplicate requests", async () => {
    const created = await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send(creation())
      .expect(201);
    const id = created.body.data.id;
    const status = (actor: string, body: object) =>
      api()
        .patch(`${base}/${id}/status`)
        .set("Authorization", auth(actor))
        .send(body);
    await status("tech", { status: "IN_PROGRESS" }).expect(404);
    await api()
      .patch(`${base}/${id}/assign`)
      .set("Authorization", auth("manager"))
      .send({ assignedTechnicianId: ids.tech })
      .expect(200);
    await status("otherTech", { status: "IN_PROGRESS" }).expect(404);
    await status("manager", { status: "IN_PROGRESS" }).expect(403);
    await status("tech", { status: "ON_HOLD", reason: "Waiting" }).expect(409);
    await status("tech", { status: "COMPLETED" }).expect(400);
    await status("tech", {
      status: "IN_PROGRESS",
      startTime: "2020-01-01",
    }).expect(400);
    const attempts = await Promise.all([
      status("tech", { status: "IN_PROGRESS" }),
      status("tech", { status: "IN_PROGRESS" }),
    ]);
    expect(attempts.map((r) => r.status).sort()).toEqual([200, 409]);
    const started = attempts.find((r) => r.status === 200).body.data;
    expect(started.startTime).toBeTruthy();
    expect(started.statusHistory).toHaveLength(3);
    for (const reason of [undefined, null, "   "]) {
      await status("tech", { status: "ON_HOLD", reason }).expect(400);
    }
    const held = await status("tech", {
      status: "ON_HOLD",
      reason: "  Waiting for parts  ",
    }).expect(200);
    expect(held.body.data.statusHistory[3].reason).toBe("Waiting for parts");
    const resumed = await status("tech", { status: "IN_PROGRESS" }).expect(200);
    expect(resumed.body.data.startTime).toBe(started.startTime);
    expect(resumed.body.data.statusHistory.map((h) => h.sequence)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(JSON.stringify(resumed.body)).not.toContain(
      "SECRET_HASH_MUST_NOT_LEAK",
    );
    await status("manager", {
      status: "CANCELLED",
      reason: "Duplicate",
    }).expect(409);
    await status("tech", { status: "CANCELLED", reason: "Duplicate" }).expect(
      403,
    );
  });

  it("requires cancellation reasons and keeps cancelled orders terminal", async () => {
    const created = await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send(creation())
      .expect(201);
    const id = created.body.data.id;
    await api()
      .patch(`${base}/${id}/status`)
      .set("Authorization", auth("manager"))
      .send({ status: "CANCELLED" })
      .expect(400);
    const cancelled = await api()
      .patch(`${base}/${id}/status`)
      .set("Authorization", auth("admin"))
      .send({ status: "CANCELLED", reason: "Duplicate request" })
      .expect(200);
    expect(cancelled.body.data.statusHistory[1]).toMatchObject({
      fromStatus: "OPEN",
      toStatus: "CANCELLED",
      performedById: ids.admin,
      reason: "Duplicate request",
    });
    expect(cancelled.body.data.startTime).toBeNull();
    await api()
      .patch(`${base}/${id}/assign`)
      .set("Authorization", auth("manager"))
      .send({ assignedTechnicianId: ids.tech })
      .expect(409);
  });

  it("rolls back status when recording history fails", async () => {
    const created = await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send(creation())
      .expect(201);
    const id = created.body.data.id;
    await api()
      .patch(`${base}/${id}/assign`)
      .set("Authorization", auth("manager"))
      .send({ assignedTechnicianId: ids.tech })
      .expect(200);
    // Constraint is installed only in the isolated test schema.
    await database.query(
      "ALTER TABLE work_order_status_history ADD CONSTRAINT test_reject_start CHECK (to_status <> 'IN_PROGRESS') NOT VALID",
    );
    try {
      await api()
        .patch(`${base}/${id}/status`)
        .set("Authorization", auth("tech"))
        .send({ status: "IN_PROGRESS" })
        .expect(500);
      const row = (
        await database.query(
          "SELECT status, start_time FROM work_orders WHERE id = $1",
          [id],
        )
      )[0];
      expect(row).toEqual({ status: "ASSIGNED", start_time: null });
      const history = await database.query(
        "SELECT id FROM work_order_status_history WHERE work_order_id = $1",
        [id],
      );
      expect(history).toHaveLength(2);
    } finally {
      await database.query(
        "ALTER TABLE work_order_status_history DROP CONSTRAINT test_reject_start",
      );
    }
  });
  const materialsBase = "/api/v1/material-requests";
  const startedOrder = async (assetId = ids.asset) => {
    const created = await api()
      .post(base)
      .set("Authorization", auth("manager"))
      .send({ ...creation(), assetId })
      .expect(201);
    const id = created.body.data.id;
    await api()
      .patch(`${base}/${id}/assign`)
      .set("Authorization", auth("manager"))
      .send({ assignedTechnicianId: ids.tech })
      .expect(200);
    await api()
      .patch(`${base}/${id}/status`)
      .set("Authorization", auth("tech"))
      .send({ status: "IN_PROGRESS" })
      .expect(200);
    return id;
  };
  const seedPart = async (stock = 10, price = "12.35", id = randomUUID()) => {
    await database.query(
      "INSERT INTO parts (id, part_code, name, category, current_stock, unit_price) VALUES ($1, $2, 'Test part', 'test', $3, $4)",
      [id, `P-${id}`, stock, price],
    );
    return id;
  };
  const sendMaterials = (wo: string, items: object[], actor = "tech") =>
    api()
      .post(`${base}/${wo}/material-requests`)
      .set("Authorization", auth(actor))
      .send({ items });
  const approveMaterials = (id: string, actor = "warehouse") =>
    api()
      .patch(`${materialsBase}/${id}/approve`)
      .set("Authorization", auth(actor));
  const stockOf = async (id: string) =>
    (
      await database.query("SELECT current_stock FROM parts WHERE id = $1", [
        id,
      ])
    )[0].current_stock;

  it("validates material requests, scopes technician access and never deducts on submit", async () => {
    const wo = await startedOrder();
    const partId = await seedPart();
    await api()
      .post(`${base}/${wo}/material-requests`)
      .send({ items: [{ partId, quantity: 1 }] })
      .expect(401);
    await sendMaterials(wo, [{ partId, quantity: 1 }], "manager").expect(403);
    await sendMaterials(wo, [{ partId, quantity: 1 }], "otherTech").expect(404);
    for (const items of [
      [],
      [null],
      [{ partId: 123, quantity: 1 }],
      [{ partId, quantity: 0 }],
      [{ partId, quantity: 1.5 }],
      [
        { partId, quantity: 1 },
        { partId, quantity: 2 },
      ],
      [{ partId, quantity: 1, unitPrice: 0 }],
    ]) {
      await sendMaterials(wo, items).expect(400);
    }
    await sendMaterials(wo, [{ partId: randomUUID(), quantity: 1 }]).expect(
      400,
    );
    const pending = (
      await sendMaterials(wo, [{ partId, quantity: 2 }]).expect(201)
    ).body.data;
    expect(pending.status).toBe("PENDING");
    expect(pending.items[0].unitPrice).toBeNull();
    expect(await stockOf(partId)).toBe(10);
    await api()
      .get(`${materialsBase}/${pending.id}`)
      .set("Authorization", auth("otherTech"))
      .expect(404);
    const list = await api()
      .get(materialsBase)
      .query({ workOrderId: wo, status: "PENDING" })
      .set("Authorization", auth("warehouse"))
      .expect(200);
    expect(list.body.data.items.map((item) => item.id)).toEqual([pending.id]);
    const otherList = await api()
      .get(materialsBase)
      .query({ workOrderId: wo })
      .set("Authorization", auth("otherTech"))
      .expect(200);
    expect(otherList.body.data.meta.total).toBe(0);
    await approveMaterials(pending.id, "tech").expect(403);
    await approveMaterials(pending.id, "manager").expect(403);
    await api()
      .patch(`${materialsBase}/${pending.id}/reject`)
      .set("Authorization", auth("warehouse"))
      .send({ reason: "   " })
      .expect(400);
    await api()
      .patch(`${materialsBase}/${pending.id}/reject`)
      .set("Authorization", auth("warehouse"))
      .send({ reason: "Incorrect specification" })
      .expect(200);
    await approveMaterials(pending.id).expect(409);
    const second = (
      await sendMaterials(wo, [{ partId, quantity: 2 }]).expect(201)
    ).body.data;
    await api()
      .patch(`${materialsBase}/${second.id}/cancel`)
      .set("Authorization", auth("otherTech"))
      .send({ reason: "Not needed" })
      .expect(404);
    await api()
      .patch(`${materialsBase}/${second.id}/cancel`)
      .set("Authorization", auth("tech"))
      .send({ reason: "Not needed" })
      .expect(200);
    await approveMaterials(second.id).expect(409);
    expect(await stockOf(partId)).toBe(10);
  });

  it("issues once under concurrent approval, snapshots prices and accumulates exact costs", async () => {
    const wo = await startedOrder();
    const partId = await seedPart();
    const pending = (
      await sendMaterials(wo, [{ partId, quantity: 2 }]).expect(201)
    ).body.data;
    const results = await Promise.all([
      approveMaterials(pending.id),
      approveMaterials(pending.id),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const approved = results.find((r) => r.status === 200).body.data;
    expect(approved).toMatchObject({
      status: "APPROVED",
      resolvedById: ids.warehouse,
    });
    expect(approved.items[0]).toMatchObject({
      unitPrice: "12.35",
      quantity: 2,
    });
    expect(approved.items[0].transactionId).toBeTruthy();
    expect(await stockOf(partId)).toBe(8);
    const transactions = await database.query(
      "SELECT quantity, performed_by_id FROM part_transactions WHERE work_order_id = $1",
      [wo],
    );
    expect(transactions).toEqual([
      { quantity: 2, performed_by_id: ids.warehouse },
    ]);
    await database.query("UPDATE parts SET unit_price = 13.11 WHERE id = $1", [
      partId,
    ]);
    const second = (
      await sendMaterials(wo, [{ partId, quantity: 3 }]).expect(201)
    ).body.data;
    await api()
      .patch(`${base}/${wo}/status`)
      .set("Authorization", auth("tech"))
      .send({ status: "ON_HOLD", reason: "Waiting for parts" })
      .expect(200);
    await approveMaterials(second.id).expect(200);
    const third = (
      await sendMaterials(wo, [{ partId, quantity: 1 }]).expect(201)
    ).body.data;
    await approveMaterials(third.id).expect(200);
    const detail = (
      await api()
        .get(`${base}/${wo}`)
        .set("Authorization", auth("tech"))
        .expect(200)
    ).body.data;
    expect(detail.status).toBe("ON_HOLD");
    expect(detail.parts).toHaveLength(2);
    expect(detail.actualCostParts).toBe("77.14");
    expect(detail.totalActualCost).toBe("77.14");
    expect(await stockOf(partId)).toBe(4);
    const txList = await api()
      .get(`/api/v1/parts/${partId}/transactions`)
      .set("Authorization", auth("warehouse"))
      .expect(200);
    expect(JSON.stringify(txList.body)).not.toContain(
      "SECRET_HASH_MUST_NOT_LEAK",
    );
  });

  it("rolls back the entire multi-part issue when a later line lacks stock", async () => {
    const wo = await startedOrder();
    const sorted = [randomUUID(), randomUUID()].sort();
    await seedPart(10, "1.00", sorted[0]);
    await seedPart(0, "2.00", sorted[1]);
    const pending = (
      await sendMaterials(
        wo,
        sorted.map((partId) => ({ partId, quantity: 2 })),
      ).expect(201)
    ).body.data;
    await approveMaterials(pending.id).expect(409);
    expect(await stockOf(sorted[0])).toBe(10);
    const request = (
      await api()
        .get(`${materialsBase}/${pending.id}`)
        .set("Authorization", auth("warehouse"))
        .expect(200)
    ).body.data;
    expect(request.status).toBe("PENDING");
    expect(request.items.every((item) => item.transactionId === null)).toBe(
      true,
    );
    expect(
      await database.query(
        "SELECT id FROM part_transactions WHERE work_order_id = $1",
        [wo],
      ),
    ).toHaveLength(0);
    expect(
      await database.query(
        "SELECT id FROM work_order_parts WHERE work_order_id = $1",
        [wo],
      ),
    ).toHaveLength(0);
  });

  it("prevents two different requests from over-consuming shared stock", async () => {
    const partId = await seedPart(3);
    const orders = await Promise.all([startedOrder(), startedOrder()]);
    const requests = await Promise.all(
      orders.map((wo) =>
        sendMaterials(wo, [{ partId, quantity: 2 }]).expect(201),
      ),
    );
    const approvals = await Promise.all(
      requests.map((r) => approveMaterials(r.body.data.id)),
    );
    expect(approvals.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await stockOf(partId)).toBe(1);
  });

  it("blocks material creation/approval on completed orders and legacy WO stock writes", async () => {
    const wo = await startedOrder();
    const partId = await seedPart();
    const pending = (
      await sendMaterials(wo, [{ partId, quantity: 1 }]).expect(201)
    ).body.data;
    await database.query(
      "UPDATE work_orders SET status = 'COMPLETED' WHERE id = $1",
      [wo],
    );
    await sendMaterials(wo, [{ partId, quantity: 1 }]).expect(409);
    await approveMaterials(pending.id).expect(409);
    await api()
      .post(`/api/v1/parts/${partId}/adjust`)
      .send({ transactionType: "EXPORT", quantity: 1 })
      .expect(401);
    await api()
      .post(`/api/v1/parts/${partId}/adjust`)
      .set("Authorization", auth("tech"))
      .send({ transactionType: "EXPORT", quantity: 1 })
      .expect(403);
    await api()
      .post(`/api/v1/parts/${partId}/adjust`)
      .set("Authorization", auth("warehouse"))
      .send({ transactionType: "EXPORT", quantity: 1, workOrderId: wo })
      .expect(400);
    await api()
      .post("/api/v1/parts/issue-to-asset")
      .set("Authorization", auth("warehouse"))
      .send({ partId, assetId: ids.asset, workOrderId: wo, quantity: 1 })
      .expect(400);
    expect(await stockOf(partId)).toBe(10);
  });

  it("serializes warehouse approval against technician cancellation", async () => {
    const wo = await startedOrder();
    const partId = await seedPart(5);
    const pending = (
      await sendMaterials(wo, [{ partId, quantity: 2 }]).expect(201)
    ).body.data;
    const results = await Promise.all([
      approveMaterials(pending.id),
      api()
        .patch(`${materialsBase}/${pending.id}/cancel`)
        .set("Authorization", auth("tech"))
        .send({ reason: "No longer needed" }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const final = (
      await api()
        .get(`${materialsBase}/${pending.id}`)
        .set("Authorization", auth("warehouse"))
        .expect(200)
    ).body.data;
    expect(await stockOf(partId)).toBe(final.status === "APPROVED" ? 3 : 5);
    const txs = await database.query(
      "SELECT id FROM part_transactions WHERE work_order_id = $1",
      [wo],
    );
    expect(txs).toHaveLength(final.status === "APPROVED" ? 1 : 0);
  });
  const freshAsset = async () => {
    const id = randomUUID();
    await database.query(
      "INSERT INTO assets (id, asset_code, name, category, operating_hours) VALUES ($1, $2, 'Lifecycle asset', 'test', 100)",
      [id, `A-${id}`],
    );
    return id;
  };
  const finish = (
    id: string,
    body: object = { rootCause: "Worn bearing", solution: "Replaced bearing" },
    actor = "tech",
  ) =>
    api()
      .patch(`${base}/${id}/complete`)
      .set("Authorization", auth(actor))
      .send(body);
  const verify = (id: string, decision = "ACCEPT", actor = "manager") =>
    api()
      .patch(`${base}/${id}/verify`)
      .set("Authorization", auth(actor))
      .send({
        decision,
        verificationNotes:
          decision === "ACCEPT" ? "Test run passed" : "Still vibrating",
      });
  const assetState = async (id: string) =>
    (await database.query("SELECT status FROM assets WHERE id = $1", [id]))[0]
      .status;

  it("completes and verifies with pause-adjusted time, issued parts and one maintenance history", async () => {
    const assetId = await freshAsset();
    const wo = await startedOrder(assetId);
    expect(await assetState(assetId)).toBe("MAINTENANCE");
    const partId = await seedPart();
    const pending = (
      await sendMaterials(wo, [{ partId, quantity: 2 }]).expect(201)
    ).body.data;
    await finish(wo).expect(409);
    await approveMaterials(pending.id).expect(200);
    await finish(wo, { rootCause: " ", solution: "Fixed" }).expect(400);
    await finish(wo, {
      rootCause: "Bearing",
      solution: "Fixed",
      completedTime: new Date().toISOString(),
    }).expect(400);
    await finish(wo, undefined, "otherTech").expect(404);
    await finish(wo, undefined, "manager").expect(403);
    await verify(wo).expect(409);
    await api()
      .patch(`${base}/${wo}/status`)
      .set("Authorization", auth("tech"))
      .send({ status: "ON_HOLD", reason: "Waiting" })
      .expect(200);
    await finish(wo).expect(409);
    await api()
      .patch(`${base}/${wo}/status`)
      .set("Authorization", auth("tech"))
      .send({ status: "IN_PROGRESS" })
      .expect(200);
    const now = Date.now();
    const hoursAgo = (hours: number) => new Date(now - hours * 3600000);
    await database.query(
      "UPDATE work_orders SET start_time = $2, breakdown_time = $3 WHERE id = $1",
      [wo, hoursAgo(4), hoursAgo(5)],
    );
    await database.query(
      "UPDATE work_order_status_history SET created_at = CASE sequence WHEN 1 THEN $2::timestamptz WHEN 2 THEN $2::timestamptz WHEN 3 THEN $3::timestamptz WHEN 4 THEN $4::timestamptz WHEN 5 THEN $5::timestamptz END WHERE work_order_id = $1",
      [wo, hoursAgo(5), hoursAgo(4), hoursAgo(3), hoursAgo(1)],
    );
    const finished = (await finish(wo).expect(200)).body.data;
    expect(finished.status).toBe("COMPLETED");
    expect(Number(finished.actualRepairTimeHours)).toBe(2);
    expect(Number(finished.downtimeHours)).toBe(5);
    expect(finished.actualCostParts).toBe("24.70");
    expect(await assetState(assetId)).toBe("MAINTENANCE");
    expect(
      await database.query(
        "SELECT id FROM asset_maintenance_history WHERE work_order_id = $1",
        [wo],
      ),
    ).toHaveLength(0);
    await finish(wo).expect(409);
    await verify(wo, "ACCEPT", "tech").expect(403);
    const responses = await Promise.all([verify(wo), verify(wo)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 409]);
    const closed = responses.find((r) => r.status === 200).body.data;
    expect(closed).toMatchObject({
      status: "CLOSED",
      verifiedById: ids.manager,
      verificationNotes: "Test run passed",
    });
    expect(await assetState(assetId)).toBe("OPERATIONAL");
    const history = await database.query(
      "SELECT * FROM asset_maintenance_history WHERE work_order_id = $1",
      [wo],
    );
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      actual_repair_time_hours: "2.00",
      downtime_hours: "5.00",
      operating_hours_at_failure: "100.00",
      failure_cause: "Worn bearing",
      cost_parts: "24.70",
      performed_by_id: ids.tech,
      status_before: "DOWN",
      status_after: "OPERATIONAL",
    });
    expect(history[0].parts_replaced[0].quantity).toBe(2);
    const counters = (
      await database.query(
        "SELECT total_failures, total_repair_time_hours FROM assets WHERE id = $1",
        [assetId],
      )
    )[0];
    expect(counters).toEqual({
      total_failures: 1,
      total_repair_time_hours: "2.00",
    });
    await sendMaterials(wo, [{ partId, quantity: 1 }]).expect(409);
  });

  it("returns rejected work to REWORK_REQUIRED, preserves the first start and excludes inspection wait on rework", async () => {
    const assetId = await freshAsset();
    const wo = await startedOrder(assetId);
    const initial = (await finish(wo).expect(200)).body.data;
    const rejected = (await verify(wo, "REJECT").expect(200)).body.data;
    expect(rejected.status).toBe("REWORK_REQUIRED");
    expect(rejected.completedTime).toBeNull();
    expect(rejected.verifiedById).toBeNull();
    expect(rejected.startTime).toBe(initial.startTime);
    expect(rejected.statusHistory.slice(-1)[0]).toMatchObject({
      performedById: ids.manager,
      reason: "Still vibrating",
    });
    await finish(wo).expect(409);
    await api()
      .patch(`${base}/${wo}/status`)
      .set("Authorization", auth("tech"))
      .send({ status: "IN_PROGRESS" })
      .expect(200);
    const now = Date.now();
    const ago = (h: number) => new Date(now - h * 3600000);
    await database.query(
      "UPDATE work_orders SET start_time = $2 WHERE id = $1",
      [wo, ago(8)],
    );
    await database.query(
      "UPDATE work_order_status_history SET created_at = CASE sequence WHEN 1 THEN $2::timestamptz WHEN 2 THEN $2::timestamptz WHEN 3 THEN $2::timestamptz WHEN 4 THEN $3::timestamptz WHEN 5 THEN $4::timestamptz WHEN 6 THEN $5::timestamptz END WHERE work_order_id = $1",
      [wo, ago(8), ago(4), ago(3), ago(2)],
    );
    const finished = (
      await finish(wo, {
        rootCause: "Alignment",
        solution: "Realigned shaft",
      }).expect(200)
    ).body.data;
    expect(finished.actualRepairTimeHours).toBe("6.00");
    await verify(wo).expect(200);
    const history = await database.query(
      "SELECT failure_cause, actual_repair_time_hours FROM asset_maintenance_history WHERE work_order_id = $1",
      [wo],
    );
    expect(history).toEqual([
      { failure_cause: "Alignment", actual_repair_time_hours: "6.00" },
    ]);
  });

  it("keeps shared assets under maintenance until the last parallel order is accepted", async () => {
    const assetId = await freshAsset();
    const orders = await Promise.all([
      startedOrder(assetId),
      startedOrder(assetId),
    ]);
    await Promise.all(orders.map((id) => finish(id).expect(200)));
    await verify(orders[0]).expect(200);
    expect(await assetState(assetId)).toBe("MAINTENANCE");
    await verify(orders[1]).expect(200);
    expect(await assetState(assetId)).toBe("OPERATIONAL");
    const rows = await database.query(
      "SELECT status_after FROM asset_maintenance_history WHERE asset_id = $1 ORDER BY created_at",
      [assetId],
    );
    expect(rows.map((row) => row.status_after)).toEqual([
      "MAINTENANCE",
      "OPERATIONAL",
    ]);
  });

  it("rolls back close, asset restoration and history when history insertion fails", async () => {
    const assetId = await freshAsset();
    const wo = await startedOrder(assetId);
    await finish(wo).expect(200);
    await database.query(
      "ALTER TABLE asset_maintenance_history ADD CONSTRAINT test_reject_history CHECK (false) NOT VALID",
    );
    try {
      await verify(wo).expect(500);
      const row = (
        await database.query(
          "SELECT status, verified_by_id FROM work_orders WHERE id = $1",
          [wo],
        )
      )[0];
      expect(row).toEqual({ status: "COMPLETED", verified_by_id: null });
      expect(await assetState(assetId)).toBe("MAINTENANCE");
      expect(
        await database.query(
          "SELECT id FROM asset_maintenance_history WHERE work_order_id = $1",
          [wo],
        ),
      ).toHaveLength(0);
    } finally {
      await database.query(
        "ALTER TABLE asset_maintenance_history DROP CONSTRAINT test_reject_history",
      );
    }
    await verify(wo).expect(200);
  });

  it("preserves decommissioned assets and rejects completion with missing timeline", async () => {
    const assetId = await freshAsset();
    const wo = await startedOrder(assetId);
    await database.query(
      "DELETE FROM work_order_status_history WHERE work_order_id = $1 AND to_status = 'IN_PROGRESS'",
      [wo],
    );
    await finish(wo).expect(409);
    const other = await startedOrder(assetId);
    await database.query(
      "UPDATE assets SET status = 'DECOMMISSIONED' WHERE id = $1",
      [assetId],
    );
    await finish(other).expect(200);
    await verify(other).expect(200);
    expect(await assetState(assetId)).toBe("DECOMMISSIONED");
  });

  it("prevents old APIs from restoring an asset or adding a duplicate WO history", async () => {
    const assetId = await freshAsset();
    const wo = await startedOrder(assetId);
    const assets = app.get(AssetsService);
    await expect(
      assets.updateStatus(assetId, { status: "OPERATIONAL" } as any),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      assets.update(assetId, { status: "OPERATIONAL" } as any),
    ).rejects.toMatchObject({ status: 409 });
    await assets.update(assetId, { name: "Renamed asset" });
    expect(await assetState(assetId)).toBe("MAINTENANCE");
    const history = app.get(HistoryService);
    await expect(
      history.createHistoryLog({ assetId, workOrderId: wo } as any),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      history.createHistoryLog({ assetId } as any),
    ).rejects.toMatchObject({ status: 409 });
    const partId = await seedPart();
    await api()
      .post("/api/v1/parts/issue-to-asset")
      .set("Authorization", auth("warehouse"))
      .send({ assetId, partId, quantity: 1 })
      .expect(409);
    expect(await stockOf(partId)).toBe(10);
  });
});
