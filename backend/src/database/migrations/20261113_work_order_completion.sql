-- Apply after the material requests and status history migrations.
BEGIN;
ALTER TYPE work_order_status_enum ADD VALUE IF NOT EXISTS 'REWORK_REQUIRED';
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS asset_status_at_start asset_status_enum NULL;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS operating_hours_at_failure NUMERIC(10, 2) NULL;
-- Unknown legacy snapshots stay NULL; do not fabricate historical state/counter values.
ALTER TABLE asset_maintenance_history ALTER COLUMN operating_hours_at_failure DROP NOT NULL;
ALTER TABLE asset_maintenance_history ALTER COLUMN status_before DROP NOT NULL;
COMMIT;
