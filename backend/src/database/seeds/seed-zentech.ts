import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { seedParts } from './seed-parts';
import { seedAssets } from './seed-assets';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smart_cmms_db',
};

async function runZentechMasterSeed() {
  console.log('🔄 Đang kết nối tới PostgreSQL database:', dbConfig.database, `tại ${dbConfig.host}:${dbConfig.port}...`);
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Kết nối database thành công!');

    // BƯỚC 1: CHẠY MIGRATION CẤU TRÚC BẢNG NẾU CẦN
    const migrationPath = path.resolve(__dirname, '../migrations/20261115_asset_history_and_zentech_schema.sql');
    if (fs.existsSync(migrationPath)) {
      console.log(`\n📦 Đang thực thi Migration cấu trúc bảng: ${path.basename(migrationPath)}...`);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(migrationSql);
      console.log('✅ Cấu trúc bảng và Enums đã sẵn sàng!');
    }

    // BƯỚC 2: SEED 7 PHÂN XƯỞNG & VỊ TRÍ ZENTECH
    console.log('\n🏭 Đang khởi tạo 7 vị trí phân xưởng & trạm tiện ích Zentech...');
    await client.query(`
      INSERT INTO locations (id, code, name, description, is_active)
      VALUES
        ('a0000000-0000-0000-0000-000000000001', 'LOC-FAC-01', 'Tổ hợp Nhà máy Cơ điện tử Zentech', 'Khu liên hợp sản xuất công nghiệp kỹ thuật cao', TRUE),
        ('a0000000-0000-0000-0000-000000000002', 'LOC-WS-A', 'Phân xưởng Gia công Cơ khí Chính xác CNC', 'Gia công phay, tiện, mài CNC chính xác micro', TRUE),
        ('a0000000-0000-0000-0000-000000000003', 'LOC-WS-B', 'Phân xưởng Dập Thủy lực & Kim loại tấm', 'Cắt laser fiber, chấn tôn CNC và dập vuốt thủy lực', TRUE),
        ('a0000000-0000-0000-0000-000000000004', 'LOC-WS-C', 'Phân xưởng Đúc Áp lực & Nhiệt luyện', 'Đúc nhôm áp lực cao và lò tôi ram chân không', TRUE),
        ('a0000000-0000-0000-0000-000000000005', 'LOC-LINE-01', 'Dây chuyền Robot Hàn & Lắp ráp Tự động', 'Cụm Robot 6 trục hàn MIG/MAG và ghép nối khung vỏ', TRUE),
        ('a0000000-0000-0000-0000-000000000006', 'LOC-LINE-02', 'Dây chuyền Đóng gói & Xếp Pallet Tự động', 'Hệ thống băng tải thông minh và robot palletizer', TRUE),
        ('a0000000-0000-0000-0000-000000000007', 'LOC-UTIL', 'Trạm Tiện ích Khí nén & Biến áp Trạm', 'Hệ thống máy nén khí trục vít, sấy khí và biến áp trạm', TRUE)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = TRUE;
    `);
    console.log('✅ Đã nạp thành công 7 phân xưởng & trạm tiện ích Zentech!');

    // BƯỚC 3: SEED 60 MÃ PHỤ TÙNG CÔNG NGHIỆP
    console.log('\n🔩 Đang nạp danh mục 60 phụ tùng công nghiệp thực tế Zentech...');
    const partsCount = await seedParts(client);
    console.log(`✅ Đã nạp thành công ${partsCount} mã phụ tùng công nghiệp (PART-001 -> PART-060)!`);

    // BƯỚC 4: SEED 300 THIẾT BỊ CÔNG NGHIỆP
    console.log('\n⚙️  Đang nạp 300 thiết bị công nghiệp công nghệ cao Zentech...');
    const assetsCount = await seedAssets(client, 300);
    console.log(`✅ Đã nạp thành công ${assetsCount} thiết bị công nghiệp (AST-001 -> AST-300)!`);

    // BƯỚC 5: TẠO ĐỊNH MỨC BOM
    console.log('\n🔗 Đang thiết lập định mức linh kiện (BOM) gắn với thiết bị...');
    await client.query(`
      INSERT INTO asset_part_boms (asset_id, part_id, standard_quantity, replacement_interval_hours, replacement_interval_days, is_critical, installation_position, notes)
      SELECT 
          a.id AS asset_id,
          p.id AS part_id,
          CASE 
              WHEN p.category = 'Vòng bi' THEN 2.00
              WHEN p.category = 'Phớt dầu' THEN 1.00
              WHEN p.category = 'Lõi lọc' THEN 1.00
              WHEN p.category = 'Dầu mỡ' THEN 50.00
              ELSE 1.00
          END AS standard_quantity,
          CASE 
              WHEN p.category = 'Lõi lọc' THEN 2000.00
              WHEN p.category = 'Dầu mỡ' THEN 4000.00
              WHEN p.category = 'Vòng bi' THEN 8000.00
              ELSE 6000.00
          END AS replacement_interval_hours,
          180 AS replacement_interval_days,
          (a.criticality IN ('HIGH', 'CRITICAL')) AS is_critical,
          'Cụm truyền động chính & Trục công tác' AS installation_position,
          'Phụ tùng định kỳ bắt buộc theo khuyến nghị của nhà sản xuất Zentech' AS notes
      FROM (SELECT id, criticality FROM assets WHERE asset_code IN ('AST-001', 'AST-002', 'AST-003', 'AST-004', 'AST-005', 'AST-010', 'AST-020', 'AST-050', 'AST-100', 'AST-150', 'AST-200', 'AST-300')) a
      CROSS JOIN (SELECT id, category FROM parts WHERE part_code IN ('PART-001', 'PART-002', 'PART-011', 'PART-019', 'PART-027', 'PART-035', 'PART-045', 'PART-048')) p
      ON CONFLICT (asset_id, part_id) DO UPDATE SET
          standard_quantity = EXCLUDED.standard_quantity,
          replacement_interval_hours = EXCLUDED.replacement_interval_hours,
          is_critical = EXCLUDED.is_critical;
    `);
    console.log('✅ Đã thiết lập xong định mức linh kiện (BOM)!');

    // BƯỚC 6: TẠO MẪU NHẬT KÝ LỊCH SỬ BẢO TRÌ BAN ĐẦU
    console.log('\n📋 Đang nạp mẫu nhật ký lịch sử bảo trì (Audit Logs)...');
    await client.query(`
      INSERT INTO asset_maintenance_history (
          id, asset_id, event_type, title, description,
          breakdown_time, repair_start_time, repair_end_time,
          downtime_hours, actual_repair_time_hours, operating_hours_at_failure,
          time_between_failures_hours, is_failure_counted, failure_cause, action_taken,
          status_before, status_after, parts_replaced, cost_parts, cost_labor, total_cost,
          created_at
      )
      SELECT
          uuid_generate_v4(),
          a.id,
          'PREVENTIVE_MAINTENANCE'::maintenance_event_type_enum,
          'Bảo dưỡng định kỳ 2000 giờ máy - Phân xưởng Zentech',
          'Thực hiện kiểm tra bôi trơn, siết lực bu-lông gá đặt và kiểm tra rơ lắc trục chính',
          NULL,
          NOW() - INTERVAL '15 days',
          NOW() - INTERVAL '15 days' + INTERVAL '3 hours',
          0.00,
          3.00,
          a.operating_hours - 200,
          a.operating_hours - 200,
          FALSE,
          'Bảo trì phòng ngừa theo kế hoạch',
          'Thay mỡ bôi trơn trục chính, vệ sinh lọc gió tủ điện điều khiển',
          a.status,
          a.status,
          jsonb_build_array(
              jsonb_build_object('partCode', 'PART-047', 'partName', 'Mỡ bôi trơn trục chính Kluber Isoflex', 'quantity', 1, 'unitPrice', 3400000, 'totalPrice', 3400000)
          ),
          3400000.00,
          450000.00,
          3850000.00,
          NOW() - INTERVAL '15 days'
      FROM assets a
      WHERE a.asset_code IN ('AST-001', 'AST-002', 'AST-005', 'AST-010')
      LIMIT 4;
    `);
    console.log('✅ Đã nạp thành công mẫu nhật ký lịch sử!');

    // TỔNG KẾT HỆ THỐNG
    const statsQuery = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM locations) AS total_locations,
        (SELECT COUNT(*) FROM assets) AS total_assets,
        (SELECT COUNT(*) FROM parts) AS total_parts,
        (SELECT COUNT(*) FROM asset_part_boms) AS total_boms,
        (SELECT COUNT(*) FROM asset_maintenance_history) AS total_history_logs,
        (SELECT COALESCE(SUM(total_failures), 0) FROM assets) AS total_failures,
        (SELECT ROUND(AVG(cached_mttr_hours)::numeric, 2) FROM assets) AS avg_mttr,
        (SELECT ROUND(AVG(cached_mtbf_hours)::numeric, 2) FROM assets) AS avg_mtbf
    `);

    const stats = statsQuery.rows[0];
    console.log('\n================================================================');
    console.log('🎉 TỔNG KẾT NẠP DỮ LIỆU CÔNG NGHIỆP ZENTECH THÀNH CÔNG:');
    console.log('================================================================');
    console.log(`🏭 Vị trí phân xưởng: ${stats.total_locations} phân xưởng`);
    console.log(`⚙️  Thiết bị công nghiệp: ${stats.total_assets} máy (AST-001 -> AST-${stats.total_assets})`);
    console.log(`🔩 Phụ tùng / Linh kiện: ${stats.total_parts} danh mục (PART-001 -> PART-${stats.total_parts})`);
    console.log(`🔗 Định mức BOM máy: ${stats.total_boms} liên kết thiết bị - phụ tùng`);
    console.log(`📋 Nhật ký lịch sử bảo trì: ${stats.total_history_logs} bản ghi audit log`);
    console.log(`💥 Tổng số lần hỏng hóc máy: ${stats.total_failures} lần`);
    console.log(`⏱️  MTTR trung bình hệ thống: ${stats.avg_mttr} giờ / lần sửa`);
    console.log(`🔄 MTBF trung bình hệ thống: ${stats.avg_mtbf} giờ máy chạy`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Lỗi khi thực thi seed dữ liệu Zentech:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runZentechMasterSeed();
}

export { runZentechMasterSeed };
