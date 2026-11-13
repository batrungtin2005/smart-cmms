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
      readFileSync(resolve(backend, "src/database/smart_cmms_db.sql"), "utf8"),
    );
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
        TypeOrmModule.forFeature([User]),
        PassportModule.register({ defaultStrategy: "jwt" }),
        JwtModule.register({ secret: jwtSecret }),
        WorkOrdersModule,
      ],
      providers: [JwtStrategy],
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
});
