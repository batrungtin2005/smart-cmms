-- ==============================================================================
-- SMART CMMS MIGRATION: ASSET HISTORY & ZENTECH INDUSTRIAL SCHEMA
-- Timestamp: 2026-11-15
-- Target: PostgreSQL 14+ / 16
-- Mục đích: Đảm bảo toàn vẹn cấu trúc bảng cho AssetHistoryModule và Zentech Seed Data
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TẠO CÁC KIỂU ENUM NẾU CHƯA CÓ
DO $$ BEGIN
    CREATE TYPE asset_status_enum AS ENUM ('OPERATIONAL', 'DOWN', 'MAINTENANCE', 'DECOMMISSIONED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE asset_criticality_enum AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE maintenance_event_type_enum AS ENUM (
        'BREAKDOWN',
        'CORRECTIVE_REPAIR',
        'PREVENTIVE_MAINTENANCE',
        'INSPECTION',
        'PART_REPLACEMENT',
        'CALIBRATION'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('IMPORT', 'EXPORT', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. ĐẢM BẢO BẢNG LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code        VARCHAR(50)  NOT NULL UNIQUE,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    parent_id   UUID         REFERENCES locations(id) ON DELETE SET NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parent_id);

-- 3. ĐẢM BẢO BẢNG ASSETS
CREATE TABLE IF NOT EXISTS assets (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_code           VARCHAR(50)  NOT NULL UNIQUE,
    name                 VARCHAR(200) NOT NULL,
    category             VARCHAR(100) NOT NULL,
    manufacturer         VARCHAR(100),
    model                VARCHAR(100),
    serial_number        VARCHAR(100),
    location_id          UUID REFERENCES locations(id) ON DELETE SET NULL,
    status               asset_status_enum NOT NULL DEFAULT 'OPERATIONAL',
    criticality          asset_criticality_enum NOT NULL DEFAULT 'MEDIUM',
    install_date         DATE,
    warranty_expiry_date DATE,
    operating_hours      NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    qr_code_url          VARCHAR(500),
    image_url            VARCHAR(500),
    specifications       JSONB DEFAULT '{}'::jsonb,
    total_failures       INT NOT NULL DEFAULT 0,
    total_repair_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    last_failure_date    TIMESTAMPTZ,
    cached_mttr_hours    NUMERIC(10, 2),
    cached_mtbf_hours    NUMERIC(10, 2),
    metrics_last_updated_at TIMESTAMPTZ,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assets_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(location_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);

-- 4. ĐẢM BẢO BẢNG PARTS (50+ LINH KIỆN CÔNG NGHIỆP)
CREATE TABLE IF NOT EXISTS parts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    part_code      VARCHAR(50)  NOT NULL UNIQUE,
    name           VARCHAR(200) NOT NULL,
    category       VARCHAR(100) NOT NULL,
    unit           VARCHAR(50)  NOT NULL DEFAULT 'Cái',
    unit_price     NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_stock  INT          NOT NULL DEFAULT 0,
    minimum_stock  INT          NOT NULL DEFAULT 5,
    maximum_stock  INT,
    shelf_location VARCHAR(100),
    supplier_info  VARCHAR(255),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(part_code);
CREATE INDEX IF NOT EXISTS idx_parts_stock ON parts(current_stock, minimum_stock);

-- 5. ĐẢM BẢO BẢNG ASSET_PART_BOMS (ĐỊNH MỨC LINH KIỆN MÁY)
CREATE TABLE IF NOT EXISTS asset_part_boms (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id                   UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    part_id                    UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    standard_quantity          NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    replacement_interval_hours NUMERIC(10, 2),
    replacement_interval_days  INT,
    is_critical                BOOLEAN NOT NULL DEFAULT FALSE,
    installation_position      VARCHAR(150),
    notes                      TEXT,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asset_part UNIQUE (asset_id, part_id)
);
CREATE INDEX IF NOT EXISTS idx_bom_asset ON asset_part_boms(asset_id);
CREATE INDEX IF NOT EXISTS idx_bom_part  ON asset_part_boms(part_id);

-- 6. ĐẢM BẢO BẢNG ASSET_MAINTENANCE_HISTORY (AUDIT LOG LỊCH SỬ BẢO TRÌ/SỬA CHỮA/THAY THẾ)
CREATE TABLE IF NOT EXISTS asset_maintenance_history (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id                    UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    work_order_id               UUID,
    event_type                  maintenance_event_type_enum NOT NULL DEFAULT 'CORRECTIVE_REPAIR',
    title                       VARCHAR(255) NOT NULL,
    description                 TEXT,
    breakdown_time              TIMESTAMPTZ,
    repair_start_time           TIMESTAMPTZ,
    repair_end_time             TIMESTAMPTZ,
    downtime_hours              NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    actual_repair_time_hours    NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    operating_hours_at_failure  NUMERIC(10, 2) DEFAULT 0.00,
    time_between_failures_hours NUMERIC(10, 2),
    is_failure_counted          BOOLEAN NOT NULL DEFAULT FALSE,
    failure_cause               VARCHAR(255),
    action_taken                TEXT,
    status_before               asset_status_enum DEFAULT 'DOWN',
    status_after                asset_status_enum NOT NULL DEFAULT 'OPERATIONAL',
    parts_replaced              JSONB DEFAULT '[]'::jsonb,
    cost_parts                  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_labor                  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cost                  NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    performed_by_id             UUID,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_amh_asset_id ON asset_maintenance_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_amh_created_at ON asset_maintenance_history(created_at);
CREATE INDEX IF NOT EXISTS idx_amh_event_type ON asset_maintenance_history(event_type);

COMMIT;

