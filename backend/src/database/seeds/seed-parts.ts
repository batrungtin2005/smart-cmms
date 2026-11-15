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

export const ZENTECH_PARTS = [
  // 1. Vòng bi & Bạc đạn (SKF, FAG, NSK, NTN, Timken, Koyo)
  { code: 'PART-001', name: 'Vòng bi cầu đỡ SKF 6205-2RSH', category: 'Vòng bi', unit: 'Cái', price: 125000, stock: 85, min: 15, max: 200, shelf: 'Kệ A1-T1-01', supplier: 'SKF Authorized Distributor VN' },
  { code: 'PART-002', name: 'Vòng bi chặn trục SKF 6309-2Z/C3', category: 'Vòng bi', unit: 'Cái', price: 480000, stock: 42, min: 10, max: 100, shelf: 'Kệ A1-T1-02', supplier: 'SKF Authorized Distributor VN' },
  { code: 'PART-003', name: 'Vòng bi tang trống tự lựa FAG 22218-E1-XL', category: 'Vòng bi', unit: 'Cái', price: 1850000, stock: 18, min: 5, max: 50, shelf: 'Kệ A1-T2-01', supplier: 'Schaeffler FAG Vietnam' },
  { code: 'PART-004', name: 'Vòng bi tiếp xúc góc NSK 7210-B-XL-TVP', category: 'Vòng bi', unit: 'Cái', price: 950000, stock: 26, min: 8, max: 80, shelf: 'Kệ A1-T2-02', supplier: 'NSK Bearings Viet Nam' },
  { code: 'PART-005', name: 'Vòng bi đũa hình trụ NTN NU 214-ET2X', category: 'Vòng bi', unit: 'Cái', price: 1120000, stock: 15, min: 5, max: 40, shelf: 'Kệ A1-T2-03', supplier: 'NTN Industrial Supply' },
  { code: 'PART-006', name: 'Vòng bi côn Timken 32210 (Trục cán)', category: 'Vòng bi', unit: 'Cái', price: 1450000, stock: 20, min: 6, max: 60, shelf: 'Kệ A1-T3-01', supplier: 'Timken Vietnam Company' },
  { code: 'PART-007', name: 'Bạc đạn chà Koyo 51208', category: 'Vòng bi', unit: 'Cái', price: 220000, stock: 35, min: 10, max: 80, shelf: 'Kệ A1-T3-02', supplier: 'JTEKT Koyo Vietnam' },
  { code: 'PART-008', name: 'Cụm gối đỡ bạc đạn Asahi UCP 208', category: 'Gối đỡ', unit: 'Bộ', price: 380000, stock: 30, min: 8, max: 70, shelf: 'Kệ A1-T3-03', supplier: 'Asahi Seiko Japan' },
  { code: 'PART-009', name: 'Vòng bi kim IKO RNA 4905', category: 'Vòng bi', unit: 'Cái', price: 310000, stock: 28, min: 8, max: 60, shelf: 'Kệ A1-T4-01', supplier: 'IKO Nippon Thompson VN' },
  { code: 'PART-010', name: 'Vòng bi gốm chính xác cao NSK 7006CTYNDBLP4', category: 'Vòng bi', unit: 'Cặp', price: 4200000, stock: 6, min: 2, max: 20, shelf: 'Kệ A1-T4-02', supplier: 'NSK Precision Spindle Dept' },

  // 2. Phớt & Gioăng thủy lực (NOK, Parker, Hallite, SKF Seals)
  { code: 'PART-011', name: 'Phớt ben thủy lực Parker PolyPak 80x100x12', category: 'Thủy lực', unit: 'Bộ', price: 650000, stock: 34, min: 10, max: 80, shelf: 'Kệ B2-T1-01', supplier: 'Parker Hannifin Vietnam' },
  { code: 'PART-012', name: 'Phớt chắn dầu trục quay NOK TC 45x65x10 NBR', category: 'Phớt dầu', unit: 'Cái', price: 85000, stock: 110, min: 20, max: 250, shelf: 'Kệ B2-T1-02', supplier: 'NOK Corporation Japan' },
  { code: 'PART-013', name: 'Phớt chịu nhiệt Viton FKM NOK TC 60x85x12', category: 'Phớt dầu', unit: 'Cái', price: 240000, stock: 48, min: 12, max: 120, shelf: 'Kệ B2-T1-03', supplier: 'NOK Corporation Japan' },
  { code: 'PART-014', name: 'Phớt gạt bụi xi lanh thủy lực Hallite 860 70x80', category: 'Thủy lực', unit: 'Cái', price: 180000, stock: 55, min: 15, max: 150, shelf: 'Kệ B2-T2-01', supplier: 'Hallite Seals International' },
  { code: 'PART-015', name: 'Bộ O-ring tiêu chuẩn 382 chi tiết NBR 70', category: 'Gioăng O-ring', unit: 'Hộp', price: 450000, stock: 25, min: 5, max: 60, shelf: 'Kệ B2-T2-02', supplier: 'Parker Hannifin Vietnam' },
  { code: 'PART-016', name: 'Bộ gioăng làm kín đầu nén cao áp Atlas Copco', category: 'Khí nén', unit: 'Bộ', price: 3200000, stock: 12, min: 4, max: 30, shelf: 'Kệ B2-T3-01', supplier: 'Atlas Copco Compressor VN' },
  { code: 'PART-017', name: 'Phớt cơ khí làm kín bơm ly tâm Grundfos HQQE', category: 'Bơm', unit: 'Bộ', price: 1350000, stock: 14, min: 4, max: 30, shelf: 'Kệ B2-T3-02', supplier: 'Grundfos Vietnam' },
  { code: 'PART-018', name: 'Vòng đệm kim loại chịu áp 400 bar phi 22', category: 'Thủy lực', unit: 'Cái', price: 35000, stock: 200, min: 40, max: 500, shelf: 'Kệ B2-T4-01', supplier: 'Parker Hannifin Vietnam' },

  // 3. Truyền động & Dây curoa (Bando, Optibelt, Gates, Tsubaki, Rotex)
  { code: 'PART-019', name: 'Dây curoa Bando Power King V-Belt SPA-1800', category: 'Truyền động', unit: 'Sợi', price: 165000, stock: 75, min: 15, max: 180, shelf: 'Kệ C1-T1-01', supplier: 'Bando Chemical Industries VN' },
  { code: 'PART-020', name: 'Dây curoa răng đồng bộ Optibelt 8M-1200-50', category: 'Truyền động', unit: 'Sợi', price: 850000, stock: 32, min: 8, max: 80, shelf: 'Kệ C1-T1-02', supplier: 'Optibelt GmbH Germany' },
  { code: 'PART-021', name: 'Dây curoa bản đôi Gates Hi-Power II B75', category: 'Truyền động', unit: 'Sợi', price: 280000, stock: 40, min: 10, max: 100, shelf: 'Kệ C1-T1-03', supplier: 'Gates Unitta Corporation' },
  { code: 'PART-022', name: 'Xích tải công nghiệp bước đôi Tsubaki RS60-1', category: 'Truyền động', unit: 'Hộp 3m', price: 1650000, stock: 18, min: 5, max: 45, shelf: 'Kệ C1-T2-01', supplier: 'Tsubakimoto Chain VN' },
  { code: 'PART-023', name: 'Khóa xích công nghiệp Tsubaki CL-60', category: 'Truyền động', unit: 'Cái', price: 45000, stock: 150, min: 30, max: 300, shelf: 'Kệ C1-T2-02', supplier: 'Tsubakimoto Chain VN' },
  { code: 'PART-024', name: 'Cao su giảm giật khớp nối KTR Rotex GS 28', category: 'Khớp nối', unit: 'Cái', price: 320000, stock: 45, min: 10, max: 120, shelf: 'Kệ C1-T3-01', supplier: 'KTR Systems GmbH Germany' },
  { code: 'PART-025', name: 'Khớp nối mềm trục servo NBK XG2-C-34', category: 'Khớp nối', unit: 'Bộ', price: 1250000, stock: 16, min: 4, max: 40, shelf: 'Kệ C1-T3-02', supplier: 'Nabeya Bi-tech Kaisha Japan' },
  { code: 'PART-026', name: 'Bánh răng côn xoắn m=3 z=25 thép SCM440', category: 'Cơ khí', unit: 'Cái', price: 890000, stock: 20, min: 5, max: 50, shelf: 'Kệ C1-T4-01', supplier: 'Zentech Precision Machining' },

  // 4. Khí nén & Thủy lực (Festo, SMC, Rexroth, Yuken, Wika)
  { code: 'PART-027', name: 'Van điện từ khí nén Festo VUVS-L25-M52', category: 'Khí nén', unit: 'Cái', price: 1450000, stock: 28, min: 8, max: 70, shelf: 'Kệ D3-T1-01', supplier: 'Festo AG & Co. KG Vietnam' },
  { code: 'PART-028', name: 'Xi lanh khí nén compact SMC CDQ2B50-30DZ', category: 'Khí nén', unit: 'Cái', price: 1150000, stock: 22, min: 6, max: 60, shelf: 'Kệ D3-T1-02', supplier: 'SMC Corporation Vietnam' },
  { code: 'PART-029', name: 'Cụm van điều áp & lọc tách nước Festo MS6-LFR', category: 'Khí nén', unit: 'Bộ', price: 2650000, stock: 15, min: 4, max: 35, shelf: 'Kệ D3-T2-01', supplier: 'Festo AG & Co. KG Vietnam' },
  { code: 'PART-030', name: 'Van tỷ lệ điều hướng thủy lực Rexroth 4WREE 10', category: 'Thủy lực', unit: 'Cái', price: 9800000, stock: 5, min: 2, max: 12, shelf: 'Kệ D3-T2-02', supplier: 'Bosch Rexroth Vietnam' },
  { code: 'PART-031', name: 'Van xả áp thủy lực Yuken DBW-10-1-30', category: 'Thủy lực', unit: 'Cái', price: 3450000, stock: 9, min: 3, max: 20, shelf: 'Kệ D3-T3-01', supplier: 'Yuken Kogyo Co. Japan' },
  { code: 'PART-032', name: 'Đồng hồ đo áp suất dầu Wika 232.50 (0-400 bar)', category: 'Đo lường', unit: 'Cái', price: 680000, stock: 30, min: 8, max: 80, shelf: 'Kệ D3-T3-02', supplier: 'Wika Instruments Vietnam' },
  { code: 'PART-033', name: 'Ống thủy lực 2 lớp thép Manuli 2SN-DN12 (50m)', category: 'Thủy lực', unit: 'Mét', price: 195000, stock: 150, min: 40, max: 300, shelf: 'Kệ D3-T4-01', supplier: 'Manuli Hydraulics Italy' },
  { code: 'PART-034', name: 'Đầu nối thủy lực ren cái JIC 3/4 inch', category: 'Thủy lực', unit: 'Cái', price: 75000, stock: 180, min: 50, max: 400, shelf: 'Kệ D3-T4-02', supplier: 'Parker Hannifin Vietnam' },

  // 5. Điện - Tự động hóa & Cảm biến (Siemens, Schneider, Mitsubishi, Omron, Phoenix Contact)
  { code: 'PART-035', name: 'Khởi động từ Siemens Sirius 3RT2026-1BB40 (25A)', category: 'Điện tự động', unit: 'Cái', price: 720000, stock: 40, min: 10, max: 100, shelf: 'Kệ E1-T1-01', supplier: 'Siemens Industry Vietnam' },
  { code: 'PART-036', name: 'Aptomat khối MCCB Schneider Compact NSX100F (100A)', category: 'Điện tự động', unit: 'Cái', price: 2450000, stock: 18, min: 5, max: 45, shelf: 'Kệ E1-T1-02', supplier: 'Schneider Electric Vietnam' },
  { code: 'PART-037', name: 'Rơ le nhiệt bảo vệ động cơ Mitsubishi TH-T25', category: 'Điện tự động', unit: 'Cái', price: 320000, stock: 35, min: 10, max: 90, shelf: 'Kệ E1-T1-03', supplier: 'Mitsubishi Electric VN' },
  { code: 'PART-038', name: 'Cảm biến tiệm cận quang học Omron E2E-X5ME1 2M', category: 'Cảm biến', unit: 'Cái', price: 380000, stock: 65, min: 15, max: 150, shelf: 'Kệ E1-T2-01', supplier: 'Omron Electronic VN' },
  { code: 'PART-039', name: 'Encoder xung quay Omron E6B2-CWZ6C 1000P/R', category: 'Cảm biến', unit: 'Cái', price: 1250000, stock: 20, min: 5, max: 50, shelf: 'Kệ E1-T2-02', supplier: 'Omron Electronic VN' },
  { code: 'PART-040', name: 'Bộ nguồn xung công nghiệp Phoenix Contact 24VDC 10A', category: 'Điện tự động', unit: 'Cái', price: 2150000, stock: 22, min: 6, max: 50, shelf: 'Kệ E1-T3-01', supplier: 'Phoenix Contact SEA' },
  { code: 'PART-041', name: 'Biến tần điều khiển động cơ Yaskawa GA700 7.5kW', category: 'Biến tần', unit: 'Cái', price: 14500000, stock: 6, min: 2, max: 15, shelf: 'Kệ E1-T3-02', supplier: 'Yaskawa Electric Vietnam' },
  { code: 'PART-042', name: 'Mô đun I/O Siemens S7-1200 SM 1223 16DI/16DO', category: 'PLC Module', unit: 'Cái', price: 3600000, stock: 10, min: 3, max: 25, shelf: 'Kệ E1-T4-01', supplier: 'Siemens Industry Vietnam' },
  { code: 'PART-043', name: 'Đèn tháp cảnh báo LED 3 tầng Patlite LR6-302WNW', category: 'Thiết bị báo hiệu', unit: 'Cái', price: 1150000, stock: 25, min: 6, max: 60, shelf: 'Kệ E1-T4-02', supplier: 'Patlite Corporation Japan' },
  { code: 'PART-044', name: 'Cảm biến nhiệt độ can nhiệt K Omega 0-800C', category: 'Cảm biến', unit: 'Cái', price: 650000, stock: 30, min: 8, max: 80, shelf: 'Kệ E1-T4-03', supplier: 'Omega Engineering USA' },

  // 6. Dầu nhớt & Lọc công nghiệp (Shell, Mobil, Kluber, Donaldson, Atlas Copco)
  { code: 'PART-045', name: 'Dầu thủy lực Shell Tellus S2 MX 46 (Phuy 209L)', category: 'Dầu mỡ', unit: 'Lít', price: 78000, stock: 1250, min: 400, max: 3000, shelf: 'Bồn dầu kho D', supplier: 'Shell Oil Vietnam Distribution' },
  { code: 'PART-046', name: 'Dầu rãnh trượt máy CNC Mobil Vactra Oil No.2', category: 'Dầu mỡ', unit: 'Lít', price: 115000, stock: 380, min: 100, max: 800, shelf: 'Kệ D1-T1-01', supplier: 'ExxonMobil Lubricants VN' },
  { code: 'PART-047', name: 'Mỡ bôi trơn trục chính Kluber Isoflex NBU 15', category: 'Dầu mỡ', unit: 'Tuýp 1kg', price: 3400000, stock: 18, min: 5, max: 40, shelf: 'Kệ D1-T1-02', supplier: 'Kluber Lubrication Germany' },
  { code: 'PART-048', name: 'Lõi lọc dầu thủy lực Donaldson P171574 (10 micron)', category: 'Lõi lọc', unit: 'Cái', price: 1250000, stock: 36, min: 10, max: 90, shelf: 'Kệ D1-T2-01', supplier: 'Donaldson Filtration Solutions' },
  { code: 'PART-049', name: 'Lõi lọc tách dầu máy nén khí Atlas Copco 1622314000', category: 'Lõi lọc', unit: 'Cái', price: 4850000, stock: 15, min: 4, max: 30, shelf: 'Kệ D1-T2-02', supplier: 'Atlas Copco Compressor VN' },
  { code: 'PART-050', name: 'Lõi lọc gió sơ cấp Mann Filter C 14 200', category: 'Lõi lọc', unit: 'Cái', price: 890000, stock: 24, min: 6, max: 60, shelf: 'Kệ D1-T3-01', supplier: 'Mann+Hummel Filter VN' },
  { code: 'PART-051', name: 'Dầu máy nén khí Roto-Inject Fluid Atlas Copco (20L)', category: 'Dầu mỡ', unit: 'Lít', price: 285000, stock: 240, min: 60, max: 500, shelf: 'Bồn dầu kho D', supplier: 'Atlas Copco Compressor VN' },
  { code: 'PART-052', name: 'Lọc hút dầu bồn thủy lực Ikron HF 705-20', category: 'Lõi lọc', unit: 'Cái', price: 650000, stock: 20, min: 5, max: 50, shelf: 'Kệ D1-T3-02', supplier: 'Ikron Fluid Filtration' },

  // 7. Vật tư tiêu hao gia công, Hàn & Robot
  { code: 'PART-053', name: 'Dao phay ngón hợp kim Carbide Kyocera 4F-12mm', category: 'Dụng cụ cắt', unit: 'Cái', price: 680000, stock: 60, min: 15, max: 150, shelf: 'Kệ F2-T1-01', supplier: 'Kyocera Cutting Tools VN' },
  { code: 'PART-054', name: 'Mảnh tiện hợp kim Sandvik CNMG 12 04 08-PM', category: 'Dụng cụ cắt', unit: 'Hộp 10v', price: 1450000, stock: 45, min: 10, max: 100, shelf: 'Kệ F2-T1-02', supplier: 'Sandvik Coromant Vietnam' },
  { code: 'PART-055', name: 'Đầu kẹp collet kẹp dao CNC BT40-ER32-70', category: 'Đầu kẹp', unit: 'Bộ', price: 1650000, stock: 22, min: 5, max: 50, shelf: 'Kệ F2-T2-01', supplier: 'MST Corporation Japan' },
  { code: 'PART-056', name: 'Bép hàn Robot MIG Abicor Binzel E-Cu 1.2mm M8', category: 'Vật tư hàn', unit: 'Cái', price: 42000, stock: 320, min: 80, max: 800, shelf: 'Kệ F2-T2-02', supplier: 'Abicor Binzel Germany' },
  { code: 'PART-057', name: 'Dây hàn lõi thuốc Kobelco DW-100 1.2mm (15kg)', category: 'Vật tư hàn', unit: 'Cuộn', price: 1350000, stock: 50, min: 15, max: 120, shelf: 'Kệ F2-T3-01', supplier: 'Kobe Steel Welding VN' },
  { code: 'PART-058', name: 'Kính bảo vệ quang học Laser Precitec 37x7mm', category: 'Phụ kiện Laser', unit: 'Cái', price: 1150000, stock: 40, min: 10, max: 90, shelf: 'Kệ F2-T3-02', supplier: 'Precitec Laser Systems' },
  { code: 'PART-059', name: 'Béc cắt đơn Laser Fiber Amada phi 2.0mm', category: 'Phụ kiện Laser', unit: 'Cái', price: 480000, stock: 55, min: 15, max: 120, shelf: 'Kệ F2-T4-01', supplier: 'Amada Laser Technology' },
  { code: 'PART-060', name: 'Pin nuôi nguồn nhớ vị trí Servo Fanuc 3V', category: 'Pin công nghiệp', unit: 'Cái', price: 350000, stock: 70, min: 20, max: 150, shelf: 'Kệ F2-T4-02', supplier: 'Fanuc Robotics Vietnam' }
];

export async function seedParts(client: Client): Promise<number> {
  let count = 0;
  for (const p of ZENTECH_PARTS) {
    await client.query(`
      INSERT INTO parts (part_code, name, category, unit, unit_price, current_stock, minimum_stock, maximum_stock, shelf_location, supplier_info, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE)
      ON CONFLICT (part_code) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        unit = EXCLUDED.unit,
        unit_price = EXCLUDED.unit_price,
        current_stock = EXCLUDED.current_stock,
        minimum_stock = EXCLUDED.minimum_stock,
        maximum_stock = EXCLUDED.maximum_stock,
        shelf_location = EXCLUDED.shelf_location,
        supplier_info = EXCLUDED.supplier_info,
        is_active = TRUE;
    `, [p.code, p.name, p.category, p.unit, p.price, p.stock, p.min, p.max, p.shelf, p.supplier]);
    count++;
  }
  return count;
}

if (require.main === module) {
  (async () => {
    const client = new Client(dbConfig);
    await client.connect();
    console.log('🚀 Đang nạp danh mục 60 phụ tùng công nghiệp Zentech...');
    const inserted = await seedParts(client);
    console.log(`✅ Đã nạp thành công ${inserted} mã phụ tùng công nghiệp (PART-001 -> PART-060)!`);
    await client.end();
  })();
}
