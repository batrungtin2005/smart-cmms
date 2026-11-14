import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import pg from 'pg';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) loadEnvFile(envFile);
const baseUrl = process.env.MOBILE_API_BASE_URL || 'http://127.0.0.1:3000/api/v1';
const output = fileURLToPath(new URL('../build/verification/', import.meta.url));
const code = 'AST-MOBILE-QR-001';
const checks = [];
function record(name) { checks.push(name); console.log(`PASS: ${name}`); }
async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${baseUrl}/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}

async function seedDemo() {
  // Guard all writes: only the isolated mobile development database is allowed.
  assert.equal(process.env.DB_NAME, 'smart_cmms_mobile_dev', 'Demo setup only supports the isolated mobile development database.');
  const client = new pg.Client({ host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME,
    user: process.env.DB_USERNAME || 'postgres', password: process.env.DB_PASSWORD });
  await client.connect();
  try {
    const current = await client.query('SELECT current_database() AS name');
    assert.equal(current.rows[0].name, 'smart_cmms_mobile_dev');
    await client.query('BEGIN');
    await client.query(`INSERT INTO locations (code, name) VALUES ($1,$2) ON CONFLICT(code) DO NOTHING`,
      ['LOC-MOBILE-QR-FACTORY', 'Xưởng thử nghiệm Mobile']);
    await client.query(`INSERT INTO locations (code, name, parent_id)
      SELECT $1,$2,id FROM locations WHERE code=$3 ON CONFLICT(code) DO NOTHING`,
      ['LOC-MOBILE-QR-LINE', 'Dây chuyền thử nghiệm 01', 'LOC-MOBILE-QR-FACTORY']);
    await client.query(`INSERT INTO assets
      (asset_code,name,category,manufacturer,model,serial_number,location_id,operating_hours,specifications,criticality)
      SELECT $1,$2,$3,$4,$5,$6,id,$7,$8::jsonb,'HIGH' FROM locations WHERE code=$9
      ON CONFLICT(asset_code) DO NOTHING`, [code, 'Máy bơm thử nghiệm Mobile', 'Thủy lực', 'Zentech',
      'MOBILE-PUMP-01', 'MOBILE-QR-DEMO-001', 1250.5,
      JSON.stringify({ 'Công suất': '7,5 kW', 'Điện áp': '380 V', 'Áp suất': '10 bar' }), 'LOC-MOBILE-QR-LINE']);
    const result = await client.query('SELECT id,name FROM assets WHERE asset_code=$1 AND is_active=true', [code]);
    assert.equal(result.rowCount, 1, 'The demo asset must be active; existing records are not overwritten.');
    const asset = result.rows[0];
    await client.query(`INSERT INTO asset_maintenance_history
      (asset_id,event_type,title,description,action_taken,status_before,status_after,performed_by_id)
      SELECT $1::uuid,'INSPECTION',$2::varchar(255),$3::text,$4::text,'OPERATIONAL','OPERATIONAL',id FROM users WHERE username=$5::varchar(50)
      AND NOT EXISTS (SELECT 1 FROM asset_maintenance_history WHERE asset_id=$1::uuid AND title=$2::varchar(255))`,
      [asset.id, 'Kiểm tra định kỳ — dữ liệu thử mobile', 'Bản ghi dùng để kiểm thử QR, không phải công việc sản xuất.',
        'Vệ sinh lọc và kiểm tra áp suất.', process.env.MOBILE_TECH_USERNAME || 'mobile_tech']);
    await client.query('COMMIT');
    return asset;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}

async function main() {
  const demo = await seedDemo();
  record('Demo asset and history exist only in the isolated mobile database');
  const login = await request('auth/login', { method: 'POST', body: {
    username: process.env.MOBILE_TECH_USERNAME || 'mobile_tech', password: process.env.MOBILE_TECH_PASSWORD,
  } });
  assert.equal(login.status, 200);
  const token = login.body.data.accessToken;
  const inspection = await request(`assets/inspect/${code}`, { token });
  assert.equal(inspection.status, 200);
  assert.equal(inspection.body.success, true);
  const data = inspection.body.data;
  assert.equal(data.success, true);
  assert.equal(data.asset.id, demo.id);
  assert.equal(data.asset.assetCode, code);
  assert.equal(data.asset.name, demo.name);
  assert.ok(Array.isArray(data.recentMaintenanceHistory));
  assert.ok(data.recentMaintenanceHistory.length > 0);
  record('Real inspection endpoint returns device details and maintenance history');
  const missing = await request('assets/inspect/AST-MOBILE-NOT-FOUND', { token });
  assert.equal(missing.status, 404);
  record('Unknown asset code returns 404');
  const qr = await request(`assets/code/${code}/qr-code`, { token });
  assert.equal(qr.status, 200);
  const payload = JSON.parse(qr.body.data.qrRawContent);
  assert.equal(payload.app, 'SMART_CMMS');
  assert.equal(payload.v, '1.0');
  assert.equal(payload.assetCode, code);
  assert.equal(payload.assetId, demo.id);
  record('Backend QR JSON identifies the same asset as the inspection endpoint');
  mkdirSync(output, { recursive: true });
  await QRCode.toFile(`${output}/asset-qr-json.png`, qr.body.data.qrRawContent,
    { width: 1024, margin: 4, errorCorrectionLevel: 'H' });
  await QRCode.toFile(`${output}/asset-qr-code.png`, code, { width: 1024, margin: 4 });
  // The emulator imagefile camera center-crops its input to a video aspect ratio.
  // Extra surrounding space keeps all finder patterns inside the camera frame.
  const matrix = QRCode.create(qr.body.data.qrRawContent, { errorCorrectionLevel: 'H' }).modules;
  const cameraImage = new PNG({ width: 512, height: 512 });
  cameraImage.data.fill(255);
  const scale = 2;
  const left = Math.floor(512 * 0.35 - matrix.size * scale / 2);
  const top = Math.floor(256 - matrix.size * scale / 2);
  for (let row = 0; row < matrix.size; row++) {
    for (let column = 0; column < matrix.size; column++) {
      if (!matrix.get(row, column)) continue;
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const pixel = ((top + row * scale + dy) * 512 + left + column * scale + dx) * 4;
        cameraImage.data[pixel] = cameraImage.data[pixel + 1] = cameraImage.data[pixel + 2] = 0;
      }
    }
  }
  writeFileSync(`${output}/asset-qr-camera.png`, PNG.sync.write(cameraImage));
  writeFileSync(`${output}/asset-qr-payload.json`, JSON.stringify(payload, null, 2));
  writeFileSync(`${output}/assets-api-report.json`, JSON.stringify({ checkedAt: new Date().toISOString(),
    baseUrl, code, name: demo.name, assetId: demo.id, checks }, null, 2));
  console.log('Saved public QR demo images. Credentials and tokens were not included.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Asset verification failed.');
  process.exitCode = 1;
});
