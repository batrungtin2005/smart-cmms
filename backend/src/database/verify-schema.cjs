// Integration check: isolated schema inside one transaction, always rolled back.
require('reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const { DataSource } = require('typeorm');

const backend = path.resolve(__dirname, '../..');
const settings = {};
// Same file precedence as AppModule; process environment takes priority.
for (const file of [path.join(backend, '.env'), path.join(backend, '../.env')]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(DB_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) settings[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
Object.assign(settings, process.env);

function entityFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? entityFiles(file) : file.endsWith('.entity.js') ? [file] : [];
  });
}

async function main() {
  const entities = entityFiles(path.join(backend, 'dist/modules')).flatMap((file) =>
    Object.values(require(file)).filter((value) => typeof value === 'function'),
  );
  const metadata = new DataSource({ type: 'postgres', entities, synchronize: false });
  // Build only metadata: never connect TypeORM or run synchronize on the actual DB.
  await metadata.buildMetadatas();
  const client = new Client({
    host: settings.DB_HOST || 'localhost',
    port: Number(settings.DB_PORT || 5432),
    user: settings.DB_USERNAME || 'postgres',
    password: settings.DB_PASSWORD,
    database: settings.DB_NAME || 'smart_cmms_db',
    connectionTimeoutMillis: 5000,
  });
  const schema = `cmms_verify_${randomUUID().replaceAll('-', '')}`;
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}", public`);
    await client.query(fs.readFileSync(path.join(__dirname, 'smart_cmms_db.sql'), 'utf8'));

    for (const table of metadata.entityMetadatas) {
      const { rows } = await client.query(
        'SELECT * FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        [schema, table.tableName],
      );
      assert.deepEqual(rows.map((c) => c.column_name).sort(), table.columns.map((c) => c.databaseName).sort(), `${table.tableName}: columns`);
      for (const column of table.columns) {
        const sql = rows.find((c) => c.column_name === column.databaseName);
        const label = `${table.tableName}.${column.databaseName}`;
        if (column.type === 'enum') {
          assert.equal(sql.udt_name, column.enumName, `${label}: enum name`);
          const values = await client.query(
            'SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = $1 AND t.typname = $2 ORDER BY e.enumsortorder',
            [schema, column.enumName],
          );
          assert.deepEqual(values.rows.map((v) => v.enumlabel), column.enum, `${label}: enum values`);
        } else {
          assert.equal(sql.data_type, metadata.driver.normalizeType(column), `${label}: type`);
        }
        assert.equal(sql.is_nullable === 'YES', column.isNullable, `${label}: nullable`);
        if (column.length) assert.equal(sql.character_maximum_length, Number(column.length), `${label}: length`);
        if (column.precision) assert.equal(sql.numeric_precision, column.precision, `${label}: precision`);
        if (column.scale !== undefined) assert.equal(sql.numeric_scale, column.scale, `${label}: scale`);
        if (column.asExpression) assert.equal(sql.is_generated, 'ALWAYS', `${label}: generated`);
      }
    }
    console.log(`PASS: SQL columns/types/nullability/enums match ${metadata.entityMetadatas.length} entities.`);

    const userId = randomUUID();
    const assetId = randomUUID();
    const woId = randomUUID();
    const partId = randomUUID();
    await client.query("INSERT INTO users (id, role_id, username, full_name, email, password_hash, avatar_url) SELECT $1, id, 'schema_test', 'Schema Test', 'schema@test.invalid', 'test-only', '/avatar.png' FROM roles WHERE name = 'MAINTENANCE_MANAGER'", [userId]);
    await client.query("UPDATE roles SET description = 'test update without updated_at trigger' WHERE name = 'MAINTENANCE_MANAGER'");
    await client.query("INSERT INTO assets (id, asset_code, name, category) VALUES ($1, 'TEST-ASSET', 'Test', 'Test')", [assetId]);
    await client.query("INSERT INTO work_orders (id, work_order_code, title, asset_id, created_by_id, assigned_technician_id, breakdown_time, start_time) VALUES ($1, 'TEST-WO', 'Test repair', $2, $3, $3, '2026-11-07 08:00:00+07', '2026-11-07 10:00:00+07')", [woId, assetId, userId]);
    assert.equal(Number((await client.query('SELECT downtime_hours FROM work_orders WHERE id = $1', [woId])).rows[0].downtime_hours), 0);
    await client.query("UPDATE work_orders SET completed_time = '2026-11-07 12:00:00+07', actual_repair_time_hours = 2, root_cause = 'Bearing wear', solution = 'Replaced bearing' WHERE id = $1", [woId]);
    assert.equal(Number((await client.query('SELECT downtime_hours FROM work_orders WHERE id = $1', [woId])).rows[0].downtime_hours), 4);
    await client.query("UPDATE work_orders SET completed_time = '2026-11-07 06:30:00+00' WHERE id = $1", [woId]);
    assert.equal(Number((await client.query('SELECT downtime_hours FROM work_orders WHERE id = $1', [woId])).rows[0].downtime_hours), 5.5);
    await client.query('SAVEPOINT invalid_completion');
    await assert.rejects(client.query("UPDATE work_orders SET completed_time = '2026-11-07 07:00:00+07' WHERE id = $1", [woId]), { code: '23514' });
    await client.query('ROLLBACK TO SAVEPOINT invalid_completion');
    await client.query("INSERT INTO parts (id, part_code, name, category) VALUES ($1, 'TEST-PART', 'Test', 'Test')", [partId]);
    await client.query('INSERT INTO work_order_parts (work_order_id, part_id, quantity_used, unit_price) VALUES ($1, $2, 2, 125.50)', [woId, partId]);
    assert.equal(Number((await client.query('SELECT subtotal FROM work_order_parts WHERE work_order_id = $1', [woId])).rows[0].subtotal), 251);
    await client.query("INSERT INTO part_transactions (part_id, work_order_id, transaction_type, quantity) VALUES ($1, $2, 'EXPORT', 2)", [partId, woId]);
    await client.query('SAVEPOINT invalid_work_order');
    await assert.rejects(client.query('UPDATE part_transactions SET work_order_id = $1', [randomUUID()]), { code: '23503' });
    await client.query('ROLLBACK TO SAVEPOINT invalid_work_order');
    await client.query('DELETE FROM work_orders WHERE id = $1', [woId]);
    assert.equal((await client.query('SELECT work_order_id FROM part_transactions')).rows[0].work_order_id, null);
    assert.equal(Number((await client.query('SELECT COUNT(*) FROM work_order_parts')).rows[0].count), 0);
    console.log('PASS: MAINTENANCE_MANAGER/user insert, role update, downtime calculation/timezones/invalid dates, subtotal, WorkOrder foreign keys and deletion behavior.');
  } finally {
    await client.query('ROLLBACK');
    await client.end();
    console.log('Rolled back verification schema and all test data.');
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
