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

    const sqlFilePath = path.resolve(__dirname, '../seed_300_assets_and_history.sql');
    console.log(`📄 Đang đọc file SQL seed từ: ${sqlFilePath}`);
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('🚀 Bắt đầu thực thi chèn 300 Assets và Lịch sử sửa chữa (MTTR/MTBF)...');
    const startTime = Date.now();

    await client.query(sqlContent);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Chèn dữ liệu hoàn tất sau ${duration}s!`);

    // Kiểm tra kết quả
    const checkRes = await client.query(`
      SELECT 
        COUNT(*) AS total_assets,
        COALESCE(SUM(total_failures), 0) AS total_failures,
        ROUND(AVG(cached_mttr_hours)::numeric, 2) AS avg_mttr,
        ROUND(AVG(cached_mtbf_hours)::numeric, 2) AS avg_mtbf
      FROM assets;
    `);

    const stats = checkRes.rows[0];
    console.log('\n📊 KẾT QUẢ TỔNG QUAN HỆ THỐNG:');
    console.log(`- Tổng số thiết bị (Assets): ${stats.total_assets} máy (AST-001 -> AST-300)`);
    console.log(`- Tổng số sự cố dừng máy (Failures): ${stats.total_failures} lần`);
    console.log(`- MTTR trung bình toàn hệ thống: ${stats.avg_mttr} giờ / lần sửa`);
    console.log(`- MTBF trung bình toàn hệ thống: ${stats.avg_mtbf} giờ máy chạy\n`);

  } catch (error) {
    console.error('❌ Lỗi khi chạy seed dữ liệu:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
