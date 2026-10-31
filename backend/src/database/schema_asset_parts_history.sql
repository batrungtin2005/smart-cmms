-- ==============================================================================
-- SMART CMMS DATABASE SCHEMA: ASSET, PARTS, BOM & MAINTENANCE HISTORY
-- Phụ trách: SV02 (Backend Engineer - Asset, Parts & Maintenance History)
-- Database: PostgreSQL 14+ / 16
-- Mục đích: Quản lý thiết bị, tồn kho phụ tùng, định mức BOM, và nhật ký bảo trì
--           tối ưu hóa để tính toán các chỉ số MTTR (Mean Time To Repair) & MTBF (Mean Time Between Failures).
-- ==============================================================================

-- 1. Bật extension UUID cho PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TẠO CÁC KIỂU DỮ LIỆU ENUM
DO $$ BEGIN
    CREATE TYPE asset_status_enum AS ENUM ('OPERATIONAL', 'DOWN', 'MAINTENANCE', 'DECOMMISSIONED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE asset_criticality_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('IMPORT', 'EXPORT', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_event_type_enum AS ENUM (
        'BREAKDOWN',
        'CORRECTIVE_REPAIR',
        'PREVENTIVE_MAINTENANCE',
        'INSPECTION',
        'PART_REPLACEMENT',
        'CALIBRATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. BẢNG VỊ TRÍ NHÀ XƯỞNG (locations)
-- Cấu trúc cây: Nhà máy -> Phân xưởng -> Khu vực / Dây chuyền
-- ==============================================================================
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,                -- VD: 'LOC-FAC1', 'LOC-WS-A'
    name VARCHAR(150) NOT NULL,                      -- VD: 'Phân Xưởng Đúc Áp Lực A'
    parent_id UUID NULL REFERENCES locations(id) ON DELETE SET NULL,
    description VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);

-- ==============================================================================
-- 4. BẢNG TÀI SẢN / THIẾT BỊ (assets)
-- Quản lý 300+ thiết bị, lưu vết giờ chạy máy và chỉ số MTTR/MTBF
-- ==============================================================================
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code VARCHAR(50) NOT NULL UNIQUE,          -- VD: 'AST-001', 'AST-300'
    name VARCHAR(200) NOT NULL,                      -- VD: 'Máy Ép Thủy Lực 500T'
    category VARCHAR(100) NOT NULL,                  -- VD: 'Cơ khí', 'Thủy lực', 'Điện tự động'
    manufacturer VARCHAR(100) NULL,                  -- VD: 'Mitsubishi', 'Komatsu'
    model VARCHAR(100) NULL,
    serial_number VARCHAR(100) NULL,
    location_id UUID NULL REFERENCES locations(id) ON DELETE SET NULL,
    status asset_status_enum NOT NULL DEFAULT 'OPERATIONAL',
    criticality asset_criticality_enum NOT NULL DEFAULT 'MEDIUM',
    install_date DATE NULL,
    warranty_expiry_date DATE NULL,

    -- [CỐT LÕI TÍNH MTBF]: Tổng số giờ máy chạy tích lũy (Operating Hours)
    operating_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    qr_code_url VARCHAR(500) NULL,                   -- Đường dẫn hoặc mã định danh quét QR
    image_url VARCHAR(500) NULL,
    specifications JSONB NULL DEFAULT '{}'::jsonb,   -- Lưu thông số kỹ thuật (kW, bar, RPM...)

    -- [THỐNG KÊ NHANH CHO DASHBOARD]:
    total_failures INT NOT NULL DEFAULT 0,           -- Tổng số lần hỏng hóc (dừng máy)
    total_repair_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Tổng giờ sửa chữa tích lũy
    last_failure_date TIMESTAMPTZ NULL,

    -- [CACHE CHỈ SỐ MTTR / MTBF]: Tránh quét hàng nghìn dòng mỗi lần mở Dashboard
    cached_mttr_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cached_mtbf_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    metrics_last_updated_at TIMESTAMPTZ NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);

-- ==============================================================================
-- 5. BẢNG PHỤ TÙNG & VẬT TƯ (parts)
-- Kiểm soát 50+ loại phụ tùng công nghiệp và ngưỡng tồn kho an toàn
-- ==============================================================================
CREATE TABLE IF NOT EXISTS parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_code VARCHAR(50) NOT NULL UNIQUE,           -- VD: 'PART-001', 'PART-050'
    name VARCHAR(200) NOT NULL,                      -- VD: 'Vòng bi SKF 6205-2RSH'
    category VARCHAR(100) NOT NULL,                  -- VD: 'Bạc đạn', 'Phớt thủy lực'
    unit VARCHAR(50) NOT NULL DEFAULT 'Cái',         -- 'Cái', 'Bộ', 'Lít', 'Mét'
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Giá vốn nhập kho (VNĐ)
    current_stock INT NOT NULL DEFAULT 0,            -- Tồn kho thực tế
    minimum_stock INT NOT NULL DEFAULT 5,            -- Ngưỡng tối thiểu cảnh báo hết hàng
    maximum_stock INT NULL,
    shelf_location VARCHAR(100) NULL,                -- Vị trí kho: 'Kệ A - Tầng 2 - Ngăn 3'
    supplier_info VARCHAR(255) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(part_code);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(current_stock, minimum_stock);

-- ==============================================================================
-- 6. BẢNG ĐỊNH MỨC PHỤ TÙNG THEO THIẾT BỊ (asset_part_boms - Bill of Materials)
-- Quy định 1 máy tiêu chuẩn lắp những phụ tùng nào và chu kỳ thay thế là bao lâu
-- ==============================================================================
CREATE TABLE IF NOT EXISTS asset_part_boms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    standard_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00, -- Số lượng gắn trên 1 máy
    replacement_interval_hours NUMERIC(10, 2) NULL,        -- Định mức chu kỳ thay theo giờ chạy (VD: 2000 giờ)
    replacement_interval_days INT NULL,                    -- Định mức chu kỳ thay theo ngày (VD: 180 ngày)
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,            -- Phụ tùng sống còn của máy?
    installation_position VARCHAR(255) NULL,               -- VD: 'Trục truyền động chính'
    notes VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_part UNIQUE (asset_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_boms_asset_id ON asset_part_boms(asset_id);
CREATE INDEX IF NOT EXISTS idx_boms_part_id ON asset_part_boms(part_id);

-- ==============================================================================
-- 7. BẢNG LỊCH SỬ XUẤT NHẬP PHỤ TÙNG (part_transactions)
-- Ghi vết tồn kho, khóa chống tồn kho âm khi nhiều kỹ thuật viên xuất vật tư
-- ==============================================================================
CREATE TABLE IF NOT EXISTS part_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    work_order_id UUID NULL,                         -- Liên kết tới Work Order sử dụng phụ tùng
    transaction_type transaction_type_enum NOT NULL, -- 'IMPORT', 'EXPORT', 'ADJUSTMENT'
    quantity INT NOT NULL,                           -- Số lượng biến động
    stock_before INT NOT NULL DEFAULT 0,             -- Tồn kho trước giao dịch
    stock_after INT NOT NULL DEFAULT 0,              -- Tồn kho sau giao dịch
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reference_code VARCHAR(100) NULL,                -- Mã phiếu WO, số hóa đơn
    performed_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part_transactions_part_id ON part_transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_part_transactions_wo ON part_transactions(work_order_id);

-- ==============================================================================
-- 8. BẢNG NHẬT KÝ SỬA CHỮA / BẢO TRÌ THIẾT BỊ (asset_maintenance_history)
-- BẢNG CỐT LÕI ĐỂ TÍNH TOÁN CHỈ SỐ MTTR VÀ MTBF CHUẨN XÁC
-- ==============================================================================
CREATE TABLE IF NOT EXISTS asset_maintenance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    work_order_id UUID NULL,                         -- Liên kết Work Order nếu có
    event_type maintenance_event_type_enum NOT NULL DEFAULT 'CORRECTIVE_REPAIR',
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,

    -- [CÁC TRƯỜNG TÍNH MTTR]:
    breakdown_time TIMESTAMPTZ NULL,                 -- Thời điểm máy phát sinh sự cố hỏng
    repair_start_time TIMESTAMPTZ NULL,              -- Thời điểm kỹ thuật viên bắt đầu sửa
    repair_end_time TIMESTAMPTZ NULL,                -- Thời điểm hoàn tất sửa chữa
    downtime_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,      -- Tổng thời gian máy dừng (Breakdown -> Sửa xong)
    actual_repair_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Thời gian sửa thực tế (DÙNG ĐỂ TÍNH MTTR)

    -- [CÁC TRƯỜNG TÍNH MTBF]:
    operating_hours_at_failure NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Số giờ máy đã chạy tại thời điểm hỏng
    time_between_failures_hours NUMERIC(10, 2) NULL, -- Khoảng thời gian chạy giữa lần hỏng này và lần trước (TBF)
    is_failure_counted BOOLEAN NOT NULL DEFAULT FALSE, -- Cờ đếm số lần hỏng (N) dùng cho mẫu số MTBF và MTTR

    -- THÔNG TIN KỸ THUẬT & CHI PHÍ:
    failure_cause VARCHAR(255) NULL,                 -- Nguyên nhân hư hỏng
    action_taken TEXT NULL,                          -- Biện pháp xử lý
    status_before asset_status_enum NOT NULL DEFAULT 'DOWN',
    status_after asset_status_enum NOT NULL DEFAULT 'OPERATIONAL',
    parts_replaced JSONB NULL DEFAULT '[]'::jsonb,   -- Mảng phụ tùng đã thay thế
    cost_parts NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_labor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    performed_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_asset_id ON asset_maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON asset_maintenance_history(event_type);
CREATE INDEX IF NOT EXISTS idx_history_failure ON asset_maintenance_history(asset_id, is_failure_counted);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON asset_maintenance_history(created_at);

-- ==============================================================================
-- 9. CÂU LỆNH SQL MẪU TÍNH TOÁN MTTR & MTBF THEO THỜI GIAN THỰC (REALTIME QUERY)
-- ==============================================================================
/*
-- A. TÍNH CHỈ SỐ MTTR (Mean Time To Repair) CHO TỪNG THIẾT BỊ:
-- Công thức: MTTR = SUM(actual_repair_time_hours) / COUNT(failures)
SELECT 
    a.id AS asset_id,
    a.asset_code,
    a.name AS asset_name,
    COUNT(h.id) AS total_failures,
    COALESCE(SUM(h.actual_repair_time_hours), 0) AS sum_repair_hours,
    CASE 
        WHEN COUNT(h.id) > 0 
        THEN ROUND(SUM(h.actual_repair_time_hours)::numeric / COUNT(h.id), 2)
        ELSE 0 
    END AS mttr_hours
FROM assets a
LEFT JOIN asset_maintenance_history h 
    ON a.id = h.asset_id 
    AND h.is_failure_counted = TRUE
WHERE a.is_active = TRUE
GROUP BY a.id, a.asset_code, a.name;

-- B. TÍNH CHỈ SỐ MTBF (Mean Time Between Failures) CHO TỪNG THIẾT BỊ:
-- Công thức: MTBF = operating_hours / COUNT(failures)
SELECT 
    a.id AS asset_id,
    a.asset_code,
    a.name AS asset_name,
    a.operating_hours,
    COUNT(h.id) AS total_failures,
    CASE 
        WHEN COUNT(h.id) > 0 
        THEN ROUND(a.operating_hours::numeric / COUNT(h.id), 2)
        ELSE a.operating_hours 
    END AS mtbf_hours
FROM assets a
LEFT JOIN asset_maintenance_history h 
    ON a.id = h.asset_id 
    AND h.is_failure_counted = TRUE
WHERE a.is_active = TRUE
GROUP BY a.id, a.asset_code, a.name, a.operating_hours;
*/
