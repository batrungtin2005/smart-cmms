// Applies only the existing SV03 migrations to the isolated local mobile DB.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = fileURLToPath(new URL('../../', import.meta.url));
if (existsSync(`${root}/.env`)) loadEnvFile(`${root}/.env`);
const output = `${root}/mobile/build/verification`;
async function main() {
  assert.equal(process.env.DB_NAME, 'smart_cmms_mobile_dev', 'Only the isolated mobile development database is supported.');
  assert.ok(['localhost', '127.0.0.1'].includes(process.env.DB_HOST || 'localhost'), 'Only the local development DB is supported.');
  mkdirSync(output, {recursive: true});
  const name = `sv05-before-work-orders-${Date.now()}.dump`;
  const backup = spawnSync('docker', ['exec', 'smart_cmms_postgres', 'pg_dump',
    '-U', process.env.DB_USERNAME || 'postgres', '-d', process.env.DB_NAME,
    '--format=custom', `--file=/tmp/${name}`], {encoding:'utf8', windowsHide:true, timeout:60000});
  assert.equal(backup.status, 0, 'Database backup failed; no migration applied.');
  const copy = spawnSync('docker', ['cp', `smart_cmms_postgres:/tmp/${name}`, `${output}/${name}`],
    {encoding:'utf8', windowsHide:true, timeout:60000});
  assert.equal(copy.status, 0, 'Could not retain backup; no migration applied.');
  assert.ok(statSync(`${output}/${name}`).size > 0);
  const db = new pg.Client({host:process.env.DB_HOST || 'localhost', port:Number(process.env.DB_PORT || 5432),
    database:process.env.DB_NAME, user:process.env.DB_USERNAME || 'postgres', password:process.env.DB_PASSWORD});
  const applied = [];
  try {
    await db.connect();
    assert.equal((await db.query('SELECT current_database() AS name')).rows[0].name, 'smart_cmms_mobile_dev');
    for (const file of ['20261113_work_order_status_history.sql','20261113_material_requests.sql','20261113_work_order_completion.sql']) {
      await db.query(readFileSync(`${root}/backend/src/database/migrations/${file}`, 'utf8'));
      applied.push(file);
    }
    writeFileSync(`${output}/work-orders-migration-report.json`, JSON.stringify({checkedAt:new Date().toISOString(),
      database:process.env.DB_NAME, backup:name, applied}, null, 2));
    console.log(`Applied ${applied.length} existing SV03 migrations to the local mobile development DB. Backup: ${name}`);
  } finally { await db.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
