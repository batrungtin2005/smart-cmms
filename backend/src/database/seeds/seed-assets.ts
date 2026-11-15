import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smart_cmms_db',
};

const CATEGORIES = ['Gia công CNC', 'Dập vuốt kim loại', 'Hàn & Lắp ráp tự động', 'Đúc & Nhiệt luyện', 'Đóng gói & Phân loại', 'Hệ thống Tiện ích'];
const MANUFACTURERS = ['Makino', 'Mazak', 'Doosan', 'Komatsu', 'Bystronic', 'Amada', 'ABB', 'Yaskawa', 'Buhler', 'Ipsen', 'Atlas Copco', 'Siemens'];
const MODELS = ['D500-5X', 'VTC-800', 'Puma-2600', 'H1F-500T', 'ByStar-12kW', 'HFE-160T', 'IRB-2600', 'MA1440', 'Evo-840T', 'TT-3000', 'GA-75VSD', 'S7-1500'];
const MACHINE_TYPES = [
  'Máy Phay CNC 5 Trục Chính Xác', 'Máy Tiện CNC Đa Trục', 'Máy Ép Thủy Lực Khung H 500T', 'Máy Dập Trục Khuỷu 250T',
  'Máy Cắt Laser Fiber 12kW Tốc Độ Cao', 'Máy Chấn Tôn CNC 160T Đa Điểm', 'Robot Hàn Công Nghiệp 6 Trục', 'Lò Tôi Chân Không Áp Suất Cao',
  'Máy Đúc Áp Lực Nhôm Buồng Lạnh 840T', 'Máy Nén Khí Trục Vít Biến Tần 75kW', 'Hệ Thống Sấy Khí Hấp Thụ Công Nghiệp', 'Trạm Biến Áp & Phân Phối 1500kVA'
];
const STATUSES = ['OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL', 'OPERATIONAL', 'MAINTENANCE', 'DOWN'];
const CRITICALITIES = ['MEDIUM', 'HIGH', 'HIGH', 'CRITICAL', 'LOW'];

export async function seedAssets(client: Client, count = 300): Promise<number> {
  // Lấy danh sách location_id
  const locRes = await client.query('SELECT id, code FROM locations ORDER BY code ASC');
  const locIds = locRes.rows.map((r: any) => r.id);

  if (locIds.length === 0) {
    throw new Error('Chưa có vị trí locations trong database. Vui lòng chạy seed locations trước.');
  }

  for (let i = 1; i <= count; i++) {
    const code = `AST-${String(i).padStart(3, '0')}`;
    const name = `${MACHINE_TYPES[(i - 1) % MACHINE_TYPES.length]} (Line ${String(((i - 1) % 6) + 1).padStart(2, '0')})`;
    const cat = CATEGORIES[(i - 1) % CATEGORIES.length];
    const man = MANUFACTURERS[(i - 1) % MANUFACTURERS.length];
    const mod = `${MODELS[(i - 1) % MODELS.length]}-Z${String((i % 5) + 1).padStart(2, '0')}`;
    const sn = `SN-${man.substring(0, 3).toUpperCase()}-202${(i % 4) + 1}-${String(i).padStart(4, '0')}`;
    const stat = STATUSES[(i * 7 + 3) % STATUSES.length];
    const crit = CRITICALITIES[(i * 11 + 2) % CRITICALITIES.length];
    const locId = locIds[(i - 1) % locIds.length];

    const opHours = 800 + ((i * 173) % 17200);
    const installDaysAgo = (i * 13) % 1200;
    const installDate = new Date(Date.now() - installDaysAgo * 24 * 3600 * 1000);
    const warrantyDate = new Date(installDate.getTime() + 2 * 365 * 24 * 3600 * 1000);

    const failures = (i * 3 + 1) % 7;
    let repTime = 0;
    let mttr = 0;
    let mtbf = opHours;

    if (failures > 0) {
      repTime = Number((failures * (1.5 + (i % 4) * 0.8)).toFixed(2));
      mttr = Number((repTime / failures).toFixed(2));
      mtbf = Number((opHours / failures).toFixed(2));
    }

    const specs = {
      power_kw: 15 + ((i * 7) % 75),
      voltage_v: 380,
      frequency_hz: 50,
      weight_ton: Number((3.5 + (i % 12) * 1.2).toFixed(1)),
      coolant_type: 'Semi-Synthetic Castrol Hysol',
      cnc_controller: 'Fanuc 31i-Model B5'
    };

    await client.query(`
      INSERT INTO assets (
        asset_code, name, category, manufacturer, model, serial_number,
        location_id, status, criticality, install_date, warranty_expiry_date,
        operating_hours, qr_code_url, specifications,
        total_failures, total_repair_time_hours, cached_mttr_hours, cached_mtbf_hours,
        metrics_last_updated_at, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), TRUE)
      ON CONFLICT (asset_code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        manufacturer = EXCLUDED.manufacturer,
        model = EXCLUDED.model,
        serial_number = EXCLUDED.serial_number,
        location_id = EXCLUDED.location_id,
        criticality = EXCLUDED.criticality,
        operating_hours = EXCLUDED.operating_hours,
        specifications = EXCLUDED.specifications,
        cached_mttr_hours = EXCLUDED.cached_mttr_hours,
        cached_mtbf_hours = EXCLUDED.cached_mtbf_hours,
        metrics_last_updated_at = NOW();
    `, [
      code, name, cat, man, mod, sn,
      locId, stat, crit, installDate, warrantyDate,
      opHours, `https://cmms.zentech.vn/qr/${code}`, JSON.stringify(specs),
      failures, repTime, mttr, mtbf
    ]);
  }

  return count;
}

if (require.main === module) {
  (async () => {
    const client = new Client(dbConfig);
    await client.connect();
    console.log('🚀 Đang nạp dữ liệu 300 thiết bị công nghiệp Zentech...');
    const inserted = await seedAssets(client, 300);
    console.log(`✅ Đã nạp thành công ${inserted} thiết bị công nghiệp (AST-001 -> AST-300)!`);
    await client.end();
  })();
}
