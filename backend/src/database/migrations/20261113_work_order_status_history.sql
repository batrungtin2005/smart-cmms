-- Run against the existing CMMS schema before starting the updated backend.
BEGIN;
CREATE TABLE IF NOT EXISTS work_order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL CHECK (sequence > 0),
    from_status work_order_status_enum,
    to_status work_order_status_enum NOT NULL,
    performed_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_wo_history_sequence UNIQUE (work_order_id, sequence),
    CHECK (to_status NOT IN ('ON_HOLD', 'CANCELLED') OR
           (reason IS NOT NULL AND length(trim(reason)) > 0))
);
COMMIT;
