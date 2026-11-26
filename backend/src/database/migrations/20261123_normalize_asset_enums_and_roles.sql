-- Apply after the Work Order and PM migrations. Atomic and safe to replay.
BEGIN;
SET LOCAL lock_timeout = '10s';
DO $$
DECLARE
    pair text[];
    old_type oid;
    col record;
BEGIN
    FOREACH pair SLICE 1 IN ARRAY ARRAY[
        ARRAY['asset_status_enum', 'assets_status_enum'],
        ARRAY['asset_criticality_enum', 'assets_criticality_enum']
    ] LOOP
        old_type := to_regtype(format('%I.%I', current_schema(), pair[1]));
        IF old_type IS NULL THEN CONTINUE; END IF;
        IF to_regtype(format('%I.%I', current_schema(), pair[2])) IS NULL THEN
            EXECUTE format('ALTER TYPE %I.%I RENAME TO %I', current_schema(), pair[1], pair[2]);
            CONTINUE;
        END IF;
        -- Preserve column defaults while converting via text, without an implicit cast.
        FOR col IN
            SELECT n.nspname, c.relname, a.attname, pg_get_expr(d.adbin, d.adrelid) AS default_expr
            FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE a.atttypid = old_type AND a.attnum > 0 AND NOT a.attisdropped
              AND n.nspname = current_schema() AND c.relkind IN ('r', 'p')
        LOOP
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I DROP DEFAULT', col.nspname, col.relname, col.attname);
            EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I TYPE %I.%I USING %I::text::%I.%I',
                col.nspname, col.relname, col.attname, current_schema(), pair[2], col.attname, current_schema(), pair[2]);
            IF col.default_expr IS NOT NULL THEN
                EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN %I SET DEFAULT %s', col.nspname, col.relname,
                    col.attname, replace(col.default_expr, pair[1], pair[2]));
            END IF;
        END LOOP;
        EXECUTE format('DROP CAST IF EXISTS (%I.%I AS %I.%I)', current_schema(), pair[1], current_schema(), pair[2]);
        EXECUTE format('DROP CAST IF EXISTS (%I.%I AS %I.%I)', current_schema(), pair[2], current_schema(), pair[1]);
        -- No CASCADE: unexpected dependencies abort the transaction instead of being deleted.
        EXECUTE format('DROP TYPE %I.%I', current_schema(), pair[1]);
    END LOOP;
END $$;

INSERT INTO roles (name, description) VALUES ('MAINTENANCE_MANAGER', 'Quản lý bảo trì')
ON CONFLICT (name) DO NOTHING;
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'MAINTENANCE_MANAGER')
WHERE role_id IN (SELECT id FROM roles WHERE name = 'MANAGER');
DELETE FROM roles WHERE name = 'MANAGER';
COMMIT;
