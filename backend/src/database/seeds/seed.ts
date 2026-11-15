import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Đọc cấu hình từ file .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smart_cmms_db',
};

async function runSeed() {
  console.log('🔄 Đang kết nối đến PostgreSQL database:', dbConfig.database, `ở ${dbConfig.host}:${dbConfig.port}...`);
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Kết nối database thành công!');

    // 1. CHẠY MIGRATION CẤU TRÚC BẢNG NẾU CHƯA CÓ
    const migrationFile = path.resolve(__dirname, '../migrations/20261115_asset_history_and_zentech_schema.sql');
    if (fs.existsSync(migrationFile)) {
      console.log(`\n📦 Đang thực thi Migration cấu trúc bảng: ${path.basename(migrationFile)}...`);
      const migrationSql = fs.readFileSync(migrationFile, 'utf8');
      await client.query(migrationSql);
      console.log('✅ Migration cấu trúc bảng thành công!');
    }

    // 2. CHẠY SEED DỮ LIỆU CÔNG NGHIỆP ZENTECH (300+ ASSETS & 60+ PARTS)
    const seedFile = path.resolve(__dirname, 'zentech_industrial_seed.sql');
    console.log(`\n🚀 Bắt đầu nạp dữ liệu công nghiệp Zentech từ: ${path.basename(seedFile)}...`);
    const startTime = Date.now();

    const seedSql = fs.readFileSync(seedFile, 'utf8');
    await client.query(seedSql);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Nạp dữ liệu hoàn tất sau ${duration}s!`);

    // 3. THỐNG KÊ CHI TIẾT DỮ LIỆU ĐÃ NẠP
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
    console.log('📊 KẾT QUẢ TỔNG QUAN HỆ THỐNG CÔNG NGHIỆP ZENTECH:');
    console.log('================================================================');
    console.log(`🏭 Phân xưởng & Trạm tiện ích: ${stats.total_locations} phân xưởng`);
    console.log(`⚙️  Thiết bị công nghiệp (Assets): ${stats.total_assets} máy (AST-001 -> AST-${stats.total_assets})`);
    console.log(`🔩 Phụ tùng / Linh kiện (Parts): ${stats.total_parts} danh mục (PART-001 -> PART-${stats.total_parts})`);
    console.log(`🔗 Định mức linh kiện máy (BOM): ${stats.total_boms} liên kết thiết bị - phụ tùng`);
    console.log(`📋 Nhật ký lịch sử bảo trì (History Logs): ${stats.total_history_logs} bản ghi audit log`);
    console.log(`💥 Tổng số lần sự cố hỏng hóc: ${stats.total_failures} lần`);
    console.log(`⏱️  MTTR trung bình toàn hệ thống: ${stats.avg_mttr} giờ / lần sửa`);
    console.log(`🔄 MTBF trung bình toàn hệ thống: ${stats.avg_mtbf} giờ máy chạy`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Lỗi khi chạy migration / seed dữ liệu:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
