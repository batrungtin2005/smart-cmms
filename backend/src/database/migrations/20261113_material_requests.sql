-- Existing CMMS database: apply after the status-history migration.
BEGIN;
DO $$ BEGIN
    CREATE TYPE material_request_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS material_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE RESTRICT,
    requested_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status material_request_status_enum NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    resolved_by_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    resolved_at TIMESTAMPTZ,
    resolution_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((status = 'PENDING' AND resolved_by_id IS NULL AND resolved_at IS NULL)
        OR (status <> 'PENDING' AND resolved_by_id IS NOT NULL AND resolved_at IS NOT NULL)),
    CHECK (status NOT IN ('REJECTED', 'CANCELLED') OR
        (resolution_reason IS NOT NULL AND length(trim(resolution_reason)) > 0))
);
CREATE INDEX IF NOT EXISTS idx_material_requests_work_order ON material_requests(work_order_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
CREATE TABLE IF NOT EXISTS material_request_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES material_requests(id) ON DELETE RESTRICT,
    part_id UUID NOT NULL REFERENCES parts(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2),
    transaction_id UUID UNIQUE REFERENCES part_transactions(id) ON DELETE RESTRICT,
    CONSTRAINT uq_material_request_part UNIQUE (request_id, part_id),
    CHECK ((unit_price IS NULL AND transaction_id IS NULL) OR
           (unit_price IS NOT NULL AND unit_price >= 0 AND transaction_id IS NOT NULL))
);

ALTER TABLE work_order_parts DROP CONSTRAINT IF EXISTS uq_wo_part;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid = 'work_order_parts'::regclass AND conname = 'uq_wo_part_price') THEN
        ALTER TABLE work_order_parts ADD CONSTRAINT uq_wo_part_price UNIQUE (work_order_id, part_id, unit_price);
    END IF;
END $$;
COMMIT;
