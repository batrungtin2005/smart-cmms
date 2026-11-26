BEGIN;
-- PM engine and readings. Requires all 20261113 Work Order migrations.
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS max_reading_age_minutes INTEGER NULL;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS cooldown_minutes INTEGER NULL;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS measurement_location VARCHAR(255) NULL;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS not_before TIMESTAMPTZ NULL;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMPTZ NULL;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS cycle INTEGER NOT NULL DEFAULT 1;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS last_error TEXT NULL;
ALTER TABLE maintenance_schedules ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS reading_import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    filename VARCHAR(255) NOT NULL, checksum VARCHAR(64) NOT NULL,
    template_version VARCHAR(10) NOT NULL DEFAULT '1',
    status VARCHAR(20) NOT NULL DEFAULT 'PREVIEW' CHECK (status IN ('PREVIEW','CONFIRMED')),
    rows JSONB NOT NULL DEFAULT '[]', errors JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMPTZ NOT NULL, confirmed_at TIMESTAMPTZ NULL,
    evaluation_status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED'
      CHECK (evaluation_status IN ('NOT_STARTED','PENDING','SUCCEEDED','FAILED')),
    evaluation_error TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_reading_import_checksum UNIQUE (created_by_id, checksum)
);
CREATE TABLE IF NOT EXISTS asset_reading_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    import_id UUID NULL REFERENCES reading_import_batches(id) ON DELETE RESTRICT,
    row_number INTEGER NULL, measured_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(20) NOT NULL CHECK (source IN ('EXCEL','MANUAL','CORRECTION','IOT','SIMULATED')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS asset_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID NOT NULL REFERENCES asset_reading_submissions(id) ON DELETE RESTRICT,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    parameter VARCHAR(30) NOT NULL CHECK (parameter IN ('OPERATING_HOURS','TEMPERATURE','VIBRATION')),
    value NUMERIC(14,4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL, is_current_version BOOLEAN NOT NULL DEFAULT true,
    supersedes_id UUID NULL UNIQUE REFERENCES asset_readings(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((parameter = 'OPERATING_HOURS' AND unit = 'h' AND value >= 0 AND value <= 99999999.99 AND value = round(value, 2))
        OR (parameter = 'TEMPERATURE' AND unit = '°C' AND value BETWEEN -999999.9999 AND 999999.9999)
        OR (parameter = 'VIBRATION' AND unit = 'mm/s RMS' AND value BETWEEN 0 AND 999999.9999))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_current_asset_reading ON asset_readings(asset_id, parameter, measured_at) WHERE is_current_version = true;
CREATE INDEX IF NOT EXISTS idx_asset_readings_latest ON asset_readings(asset_id, parameter, measured_at DESC) WHERE is_current_version = true;
CREATE TABLE IF NOT EXISTS schedule_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID NOT NULL REFERENCES maintenance_schedules(id) ON DELETE RESTRICT,
    cycle INTEGER NOT NULL CHECK (cycle > 0),
    work_order_id UUID NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE RESTRICT,
    reading_id UUID NULL REFERENCES asset_readings(id) ON DELETE RESTRICT,
    assigned_technician_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    snapshot JSONB NOT NULL,
    outcome VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (outcome IN ('OPEN','ACCEPTED','CANCELLED')),
    accepted_reading_id UUID NULL REFERENCES asset_readings(id) ON DELETE RESTRICT,
    resolution_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_schedule_cycle UNIQUE (schedule_id, cycle)
);
-- Fails safely if legacy data already has conflicting open work orders; reconcile first.
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_work_order_schedule ON work_orders(schedule_id)
    WHERE schedule_id IS NOT NULL AND status NOT IN ('CLOSED','CANCELLED');
INSERT INTO users (id, username, email, password_hash, full_name, role_id, is_active)
SELECT uuid_generate_v4(), '__pm_scheduler__', 'pm-scheduler@system.invalid',
       '!' || uuid_generate_v4()::text, 'PM Scheduler (system)', id, false
FROM roles WHERE name = 'ADMIN'
ON CONFLICT (username) DO NOTHING;
COMMIT;
