-- ================================================================================
-- SMART CMMS — FULL DATABASE SCHEMA (UNIFIED)
-- Version  : 1.0
-- Database : PostgreSQL 14+
-- Encoding : UTF-8
-- Created  : 2026-11-01
-- Mô tả    : File schema duy nhất, gộp toàn bộ 14 bảng, enum, index, trigger,
--            constraint và seed data mặc định. Chạy một lần là xong.
--
-- BẢNG ĐƯỢC TẠO (theo thứ tự dependency):
--   1.  roles
--   2.  users
--   3.  locations
--   4.  assets
--   5.  parts
--   6.  maintenance_schedules
--   7.  work_orders
--   8.  work_order_parts
--   9.  asset_part_boms
--   10. part_transactions
--   11. asset_maintenance_history
--   12. sync_operations
--   13. notifications
--   14. kpi_snapshots
--   + FK bổ sung (maintenance_schedules.last_work_order_id)
--   + Trigger auto updated_at
--   + Constraint chống tồn kho âm
-- ================================================================================

-- ================================================================================
-- BƯỚC 0: BẬT EXTENSION
-- ================================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================================
-- BƯỚC 1: TẠO CÁC KIỂU DỮ LIỆU ENUM
-- ================================================================================

-- Trạng thái người dùng
DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Trạng thái tài sản / thiết bị
DO $$ BEGIN
    CREATE TYPE asset_status_enum AS ENUM (
        'OPERATIONAL',     -- Đang hoạt động bình thường
        'DOWN',            -- Hỏng hóc, ngừng hoạt động
        'MAINTENANCE',     -- Đang trong quá trình bảo dưỡng / sửa chữa
        'DECOMMISSIONED'   -- Đã thanh lý, ngừng sử dụng
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Mức độ quan trọng của tài sản
DO $$ BEGIN
    CREATE TYPE asset_criticality_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Loại giao dịch kho phụ tùng
DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM (
        'IMPORT',      -- Nhập kho
        'EXPORT',      -- Xuất kho
        'ADJUSTMENT'   -- Điều chỉnh tồn kho
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Loại sự kiện trong lịch sử bảo trì
DO $$ BEGIN
    CREATE TYPE maintenance_event_type_enum AS ENUM (
        'BREAKDOWN',               -- Máy hỏng / dừng đột xuất
        'CORRECTIVE_REPAIR',       -- Sửa chữa khắc phục
        'PREVENTIVE_MAINTENANCE',  -- Bảo dưỡng định kỳ
        'INSPECTION',              -- Kiểm tra / giám sát
        'PART_REPLACEMENT',        -- Thay thế phụ tùng
        'CALIBRATION'              -- Hiệu chỉnh / cân chỉnh
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Trạng thái phiếu công việc (Work Order state machine)
DO $$ BEGIN
    CREATE TYPE work_order_status_enum AS ENUM (
        'OPEN',         -- Mới tạo, chờ giao việc
        'ASSIGNED',     -- Đã giao cho kỹ thuật viên
        'IN_PROGRESS',  -- Đang thực hiện
        'COMPLETED',    -- Kỹ thuật viên báo hoàn thành
        'CLOSED',       -- Quản lý nghiệm thu, đóng phiếu
        'CANCELLED',    -- Huỷ bỏ
        'ON_HOLD'       -- Tạm hoãn
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Mức độ ưu tiên phiếu công việc
DO $$ BEGIN
    CREATE TYPE work_order_priority_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Loại phiếu công việc (nguồn gốc tạo ra)
DO $$ BEGIN
    CREATE TYPE work_order_type_enum AS ENUM (
        'CORRECTIVE',   -- Sửa chữa khắc phục sự cố (schedule_id = NULL)
        'PREVENTIVE',   -- Bảo dưỡng định kỳ (sinh từ maintenance_schedules)
        'INSPECTION',   -- Kiểm tra định kỳ  (sinh từ maintenance_schedules)
        'EMERGENCY'     -- Khẩn cấp          (schedule_id = NULL)
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Kiểu lịch bảo dưỡng định kỳ
DO $$ BEGIN
    CREATE TYPE schedule_type_enum AS ENUM (
        'TIME_BASED',       -- Theo thời gian (ngày / tháng)
        'USAGE_BASED',      -- Theo giờ vận hành máy
        'CONDITION_BASED'   -- Theo ngưỡng cảm biến / đo đạc
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Loại thông báo hệ thống
DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM (
        'LOW_STOCK',            -- Phụ tùng sắp hết tồn kho
        'SCHEDULE_DUE',         -- Lịch bảo dưỡng đến hạn
        'SCHEDULE_OVERDUE',     -- Lịch bảo dưỡng quá hạn
        'WORK_ORDER_ASSIGNED',  -- Được giao phiếu công việc
        'WORK_ORDER_OVERDUE',   -- Work Order quá hạn xử lý
        'ASSET_DOWN'            -- Thiết bị báo hỏng
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Trạng thái đồng bộ offline
DO $$ BEGIN
    CREATE TYPE sync_status_enum AS ENUM ('SYNCED', 'CONFLICT', 'FAILED', 'PENDING');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ================================================================================
-- BẢNG 1: roles — Vai trò / nhóm quyền
-- ================================================================================
CREATE TABLE IF NOT EXISTS roles (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    permissions JSONB        NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dữ liệu mặc định (4 vai trò)
INSERT INTO roles (name, description) VALUES
    ('ADMIN',            'Quản trị viên hệ thống — toàn quyền')
  , ('MANAGER',          'Quản lý xưởng — tạo/duyệt Work Order, xem báo cáo')
  , ('TECHNICIAN',       'Kỹ thuật viên — nhận và thực hiện phiếu công việc')
  , ('WAREHOUSE_KEEPER', 'Thủ kho — quản lý nhập xuất phụ tùng, kiểm soát tồn kho')
ON CONFLICT (name) DO NOTHING;

-- ================================================================================
-- BẢNG 2: users — Tài khoản người dùng
-- ================================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id       UUID         NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50)  NULL UNIQUE,
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,           -- bcrypt hash
    phone         VARCHAR(20)  NULL,
    avatar_url    VARCHAR(500) NULL,
    status        user_status_enum NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ  NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_status  ON users(status);

-- ================================================================================
-- BẢNG 3: locations — Vị trí nhà xưởng (cấu trúc cây)
-- Nhà máy → Phân xưởng → Khu vực / Dây chuyền
-- ================================================================================
CREATE TABLE IF NOT EXISTS locations (
    id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    parent_id   UUID         NULL REFERENCES locations(id) ON DELETE SET NULL,
    description VARCHAR(255) NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);

-- ================================================================================
-- BẢNG 4: assets — Tài sản / Thiết bị
-- Quản lý 300+ thiết bị, lưu giờ chạy và cache KPI MTTR/MTBF
-- ================================================================================
CREATE TABLE IF NOT EXISTS assets (
    id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code              VARCHAR(50)  NOT NULL UNIQUE,
    name                    VARCHAR(200) NOT NULL,
    category                VARCHAR(100) NOT NULL,
    manufacturer            VARCHAR(100) NULL,
    model                   VARCHAR(100) NULL,
    serial_number           VARCHAR(100) NULL,
    location_id             UUID         NULL REFERENCES locations(id) ON DELETE SET NULL,
    status                  asset_status_enum       NOT NULL DEFAULT 'OPERATIONAL',
    criticality             asset_criticality_enum  NOT NULL DEFAULT 'MEDIUM',
    install_date            DATE         NULL,
    warranty_expiry_date    DATE         NULL,

    -- Tổng giờ máy chạy tích lũy (mẫu số tính MTBF)
    operating_hours         NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    qr_code_url             VARCHAR(500) NULL,
    image_url               VARCHAR(500) NULL,
    specifications          JSONB        NULL DEFAULT '{}'::jsonb,

    -- Thống kê nhanh cho Dashboard
    total_failures          INT          NOT NULL DEFAULT 0,
    total_repair_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    last_failure_date       TIMESTAMPTZ  NULL,

    -- Cache KPI tránh query nặng mỗi lần mở Dashboard
    cached_mttr_hours       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    cached_mtbf_hours       NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    metrics_last_updated_at TIMESTAMPTZ  NULL,

    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_code     ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_status   ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);

-- ================================================================================
-- BẢNG 5: parts — Phụ tùng & Vật tư
-- ================================================================================
CREATE TABLE IF NOT EXISTS parts (
    id             UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_code      VARCHAR(50)  NOT NULL UNIQUE,
    name           VARCHAR(200) NOT NULL,
    category       VARCHAR(100) NOT NULL,
    unit           VARCHAR(50)  NOT NULL DEFAULT 'Cái',
    unit_price     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_stock  INT          NOT NULL DEFAULT 0,
    minimum_stock  INT          NOT NULL DEFAULT 5,
    maximum_stock  INT          NULL,
    shelf_location VARCHAR(100) NULL,
    supplier_info  VARCHAR(255) NULL,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_parts_code  ON parts(part_code);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(current_stock, minimum_stock);

-- ================================================================================
-- BẢNG 6: maintenance_schedules — Lịch bảo dưỡng định kỳ
-- 3 kiểu: Time-based / Usage-based / Condition-based
-- Cron job quét hàng ngày → tự động sinh Work Order
-- ================================================================================
CREATE TABLE IF NOT EXISTS maintenance_schedules (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_code   VARCHAR(50) NOT NULL UNIQUE,
    asset_id        UUID        NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    created_by_id   UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    title           VARCHAR(255) NOT NULL,
    description     TEXT         NULL,
    schedule_type   schedule_type_enum NOT NULL,

    -- Kiểu 1 - TIME_BASED
    interval_days   INT NULL,

    -- Kiểu 2 - USAGE_BASED
    interval_hours                  NUMERIC(10, 2) NULL,
    operating_hours_at_last_trigger NUMERIC(10, 2) NULL,

    -- Kiểu 3 - CONDITION_BASED
    condition_parameter VARCHAR(100) NULL,
    condition_threshold NUMERIC(10, 4) NULL,
    condition_operator  VARCHAR(10)  NULL,

    priority                 work_order_priority_enum NOT NULL DEFAULT 'MEDIUM',
    assigned_to_id           UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    estimated_duration_hours NUMERIC(10, 2) NULL,

    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    last_triggered_at   TIMESTAMPTZ  NULL,
    next_due_date       DATE         NULL,
    next_due_hours      NUMERIC(10, 2) NULL,
    advance_notice_days INT          NOT NULL DEFAULT 3,

    -- FK ngược: WO gần nhất sinh ra từ lịch này (thêm sau khi work_orders tạo xong)
    last_work_order_id  UUID NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_asset    ON maintenance_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_schedules_type     ON maintenance_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_schedules_next_due ON maintenance_schedules(next_due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_active   ON maintenance_schedules(is_active);

-- ================================================================================
-- BẢNG 7: work_orders — Phiếu công việc (State Machine)
-- Nguồn tạo:
--   a) Thủ công khi có sự cố  → type=CORRECTIVE/EMERGENCY, schedule_id=NULL
--   b) Tự động từ lịch định kỳ → type=PREVENTIVE/INSPECTION, schedule_id=<id>
-- ================================================================================
CREATE TABLE IF NOT EXISTS work_orders (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_code  VARCHAR(50) NOT NULL UNIQUE,
    asset_id         UUID        NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    schedule_id      UUID        NULL REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    created_by_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_to_id   UUID        NULL REFERENCES users(id) ON DELETE SET NULL,

    title            VARCHAR(255) NOT NULL,
    description      TEXT         NULL,
    type             work_order_type_enum     NOT NULL DEFAULT 'CORRECTIVE',
    status           work_order_status_enum   NOT NULL DEFAULT 'OPEN',
    priority         work_order_priority_enum NOT NULL DEFAULT 'MEDIUM',

    -- Thời gian kế hoạch
    scheduled_start_date  DATE NULL,
    scheduled_end_date    DATE NULL,

    -- Thời gian thực tế (kỹ thuật viên điền khi COMPLETED)
    actual_start_time     TIMESTAMPTZ    NULL,
    actual_end_time       TIMESTAMPTZ    NULL,
    actual_duration_hours NUMERIC(10, 2) NULL,

    -- Chi phí
    estimated_cost    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    actual_cost_parts NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    actual_cost_labor NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,

    -- Ghi chú & nghiệm thu
    completion_notes    TEXT NULL,
    verification_notes  TEXT NULL,
    verified_by_id      UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ NULL,

    -- Idempotency key cho offline Mobile
    client_uuid UUID NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wo_code       ON work_orders(work_order_code);
CREATE INDEX IF NOT EXISTS idx_wo_asset      ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_wo_status     ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_wo_priority   ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_wo_assigned   ON work_orders(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_wo_schedule   ON work_orders(schedule_id);
CREATE INDEX IF NOT EXISTS idx_wo_created_at ON work_orders(created_at);

-- ================================================================================
-- BẢNG 8: work_order_parts — Phụ tùng sử dụng trong phiếu
-- ================================================================================
CREATE TABLE IF NOT EXISTS work_order_parts (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    part_id       UUID NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
    quantity_used INT  NOT NULL CHECK (quantity_used > 0),
    unit_price    NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    subtotal      NUMERIC(12, 2) GENERATED ALWAYS AS (quantity_used * unit_price) STORED,
    notes         VARCHAR(255) NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_wo_part UNIQUE (work_order_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_wop_work_order ON work_order_parts(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wop_part       ON work_order_parts(part_id);

-- ================================================================================
-- BẢNG 9: asset_part_boms — Định mức phụ tùng theo thiết bị (Bill of Materials)
-- ================================================================================
CREATE TABLE IF NOT EXISTS asset_part_boms (
    id                         UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id                   UUID           NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    part_id                    UUID           NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    standard_quantity          NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    replacement_interval_hours NUMERIC(10, 2) NULL,
    replacement_interval_days  INT            NULL,
    is_critical                BOOLEAN        NOT NULL DEFAULT FALSE,
    installation_position      VARCHAR(255)   NULL,
    notes                      VARCHAR(255)   NULL,
    created_at                 TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_part UNIQUE (asset_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_boms_asset_id ON asset_part_boms(asset_id);
CREATE INDEX IF NOT EXISTS idx_boms_part_id  ON asset_part_boms(part_id);

-- ================================================================================
-- BẢNG 10: part_transactions — Lịch sử xuất nhập kho phụ tùng
-- ================================================================================
CREATE TABLE IF NOT EXISTS part_transactions (
    id               UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_id          UUID     NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    work_order_id    UUID     NULL REFERENCES work_orders(id) ON DELETE SET NULL,
    transaction_type transaction_type_enum NOT NULL,
    quantity         INT      NOT NULL,
    stock_before     INT      NOT NULL DEFAULT 0,
    stock_after      INT      NOT NULL DEFAULT 0,
    unit_price       NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    reference_code   VARCHAR(100) NULL,
    performed_by_id  UUID     NULL REFERENCES users(id) ON DELETE SET NULL,
    notes            VARCHAR(255) NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_part_tx_part_id ON part_transactions(part_id);
CREATE INDEX IF NOT EXISTS idx_part_tx_wo      ON part_transactions(work_order_id);

-- ================================================================================
-- BẢNG 11: asset_maintenance_history — Nhật ký bảo trì / sửa chữa
-- Bảng cốt lõi để tính MTTR và MTBF
-- ================================================================================
CREATE TABLE IF NOT EXISTS asset_maintenance_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id      UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    work_order_id UUID NULL REFERENCES work_orders(id) ON DELETE SET NULL,
    event_type    maintenance_event_type_enum NOT NULL DEFAULT 'CORRECTIVE_REPAIR',
    title         VARCHAR(255) NOT NULL,
    description   TEXT NULL,

    -- Dữ liệu tính MTTR
    breakdown_time          TIMESTAMPTZ    NULL,
    repair_start_time       TIMESTAMPTZ    NULL,
    repair_end_time         TIMESTAMPTZ    NULL,
    downtime_hours          NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_repair_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

    -- Dữ liệu tính MTBF
    operating_hours_at_failure    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    time_between_failures_hours   NUMERIC(10, 2) NULL,
    is_failure_counted            BOOLEAN        NOT NULL DEFAULT FALSE,

    -- Thông tin kỹ thuật & chi phí
    failure_cause  VARCHAR(255)          NULL,
    action_taken   TEXT                  NULL,
    status_before  asset_status_enum     NOT NULL DEFAULT 'DOWN',
    status_after   asset_status_enum     NOT NULL DEFAULT 'OPERATIONAL',
    parts_replaced JSONB                 NULL DEFAULT '[]'::jsonb,
    cost_parts     NUMERIC(12, 2)        NOT NULL DEFAULT 0.00,
    cost_labor     NUMERIC(12, 2)        NOT NULL DEFAULT 0.00,
    total_cost     NUMERIC(12, 2)        NOT NULL DEFAULT 0.00,

    performed_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_history_asset_id   ON asset_maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON asset_maintenance_history(event_type);
CREATE INDEX IF NOT EXISTS idx_history_failure    ON asset_maintenance_history(asset_id, is_failure_counted);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON asset_maintenance_history(created_at);

-- ================================================================================
-- BẢNG 12: sync_operations — Đồng bộ offline từ Mobile
-- ================================================================================
CREATE TABLE IF NOT EXISTS sync_operations (
    id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_operation_uuid UUID        NOT NULL UNIQUE,
    user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    operation_type        VARCHAR(100) NOT NULL,
    target_table          VARCHAR(100) NULL,
    target_id             UUID         NULL,
    payload               JSONB        NOT NULL DEFAULT '{}'::jsonb,
    status                sync_status_enum NOT NULL DEFAULT 'PENDING',
    result                JSONB        NULL DEFAULT '{}'::jsonb,
    error_message         TEXT         NULL,
    conflict_detail       JSONB        NULL,
    client_created_at     TIMESTAMPTZ  NOT NULL,
    processed_at          TIMESTAMPTZ  NULL,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_user_id     ON sync_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status      ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_op_type     ON sync_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_sync_client_uuid ON sync_operations(client_operation_uuid);

-- ================================================================================
-- BẢNG 13: notifications — Thông báo hệ thống
-- ================================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       notification_type_enum NOT NULL,
    title      VARCHAR(255) NOT NULL,
    body       TEXT         NULL,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    ref_table  VARCHAR(100) NULL,
    ref_id     UUID         NULL,
    metadata   JSONB        NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at    TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_type       ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notif_created_at ON notifications(created_at);

-- ================================================================================
-- BẢNG 14: kpi_snapshots — Cache KPI theo tháng (MTTR, MTBF, Availability)
-- ================================================================================
CREATE TABLE IF NOT EXISTS kpi_snapshots (
    id                    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id              UUID    NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    snapshot_year         INT     NOT NULL,
    snapshot_month        INT     NOT NULL,
    total_failures        INT     NOT NULL DEFAULT 0,
    total_downtime_hours  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_repair_hours    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_pm_count        INT     NOT NULL DEFAULT 0,
    total_maintenance_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mttr_hours            NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    mtbf_hours            NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    availability_pct      NUMERIC(6, 4)  NOT NULL DEFAULT 0.00,
    calculated_at         TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_kpi_asset_month UNIQUE (asset_id, snapshot_year, snapshot_month)
);

CREATE INDEX IF NOT EXISTS idx_kpi_asset_id ON kpi_snapshots(asset_id);
CREATE INDEX IF NOT EXISTS idx_kpi_period   ON kpi_snapshots(snapshot_year, snapshot_month);

-- ================================================================================
-- BƯỚC CUỐI: FK BỔ SUNG + TRIGGER + CONSTRAINT
-- ================================================================================

-- FK ngược: maintenance_schedules → work_orders (tránh circular dependency khi tạo bảng)
ALTER TABLE maintenance_schedules
    ADD CONSTRAINT fk_schedule_last_wo
    FOREIGN KEY (last_work_order_id)
    REFERENCES work_orders(id)
    ON DELETE SET NULL;

-- Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'roles', 'users', 'locations', 'assets', 'parts',
        'asset_part_boms', 'part_transactions', 'work_orders',
        'maintenance_schedules', 'asset_maintenance_history'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_updated_at_%s ON %s;
             CREATE TRIGGER trg_updated_at_%s
             BEFORE UPDATE ON %s
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END $$;

-- Constraint chống tồn kho âm
ALTER TABLE parts
    ADD CONSTRAINT chk_stock_non_negative CHECK (current_stock >= 0);
ALTER TABLE parts
    ADD CONSTRAINT chk_min_stock_positive CHECK (minimum_stock >= 0);

-- ================================================================================
-- QUERY MẪU: TÍNH MTTR & MTBF REALTIME
-- ================================================================================
/*
-- A. MTTR = SUM(actual_repair_time_hours) / COUNT(failures)
SELECT
    a.asset_code, a.name,
    COUNT(h.id)                                                   AS total_failures,
    ROUND(SUM(h.actual_repair_time_hours)::numeric / NULLIF(COUNT(h.id),0), 2) AS mttr_hours
FROM assets a
LEFT JOIN asset_maintenance_history h ON a.id = h.asset_id AND h.is_failure_counted = TRUE
WHERE a.is_active = TRUE
GROUP BY a.id, a.asset_code, a.name;

-- B. MTBF = operating_hours / COUNT(failures)
SELECT
    a.asset_code, a.name, a.operating_hours,
    COUNT(h.id)                                                       AS total_failures,
    ROUND(a.operating_hours::numeric / NULLIF(COUNT(h.id),0), 2)     AS mtbf_hours
FROM assets a
LEFT JOIN asset_maintenance_history h ON a.id = h.asset_id AND h.is_failure_counted = TRUE
WHERE a.is_active = TRUE
GROUP BY a.id, a.asset_code, a.name, a.operating_hours;
*/
-- ================================================================================
-- END OF SCHEMA
-- ================================================================================

