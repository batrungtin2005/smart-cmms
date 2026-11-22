-- ==============================================================================
-- SMART CMMS - SEED 1.000 WORK ORDERS VỚI LỊCH SỬ 6 THÁNG (SV06 - QA & DevOps)
--
-- Phục vụ tiêu chí nghiệm thu TC-02 (1.000 Work Orders) và TC-06 (MTTR & MTBF).
--
-- Điều kiện trước khi chạy:
--   1. Backend đã khởi động ít nhất 1 lần (TypeORM tạo bảng, tự tạo vai trò + admin).
--   2. Đã chạy seed 300 thiết bị + 60 phụ tùng của SV02: cd backend && npm run seed:zentech
--
-- Chạy:
--   docker exec -i smart_cmms_postgres psql -v ON_ERROR_STOP=1 -U postgres -d smart_cmms_db < devops/seed/seed_1000_work_orders.sql
--
-- Script chạy lại nhiều lần được: xóa các phiếu WO-SEED-* cũ rồi sinh lại.
-- Dùng setseed() nên mỗi lần chạy cho cùng một bộ dữ liệu (so sánh được kết quả).
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN;

SELECT setseed(0.2026);

-- ------------------------------------------------------------------------------
-- 1. KỸ THUẬT VIÊN & QUẢN LÝ BẢO TRÌ (mật khẩu test: Test@123)
-- ------------------------------------------------------------------------------
INSERT INTO users (username, email, password_hash, full_name, phone_number, role_id)
SELECT v.username, v.username || '@zentech.test',
       '$2b$10$nyv.DbBKGMLlTJijVeUrQ.DQ3a/pwJRg0qaZ69/0Yt2OCAubnWI.q',
       v.full_name, v.phone, r.id
FROM (VALUES
    ('quanly01', 'Nguyễn Văn Quản', '0901000001', 'MAINTENANCE_MANAGER'),
    ('quanly02', 'Trần Thị Lý', '0901000002', 'MAINTENANCE_MANAGER'),
    ('ktv01', 'Lê Minh Cơ', '0902000001', 'TECHNICIAN'),
    ('ktv02', 'Phạm Văn Điện', '0902000002', 'TECHNICIAN'),
    ('ktv03', 'Hoàng Đức Khí', '0902000003', 'TECHNICIAN'),
    ('ktv04', 'Võ Thành Lực', '0902000004', 'TECHNICIAN'),
    ('ktv05', 'Đặng Quốc Máy', '0902000005', 'TECHNICIAN'),
    ('ktv06', 'Bùi Văn Hàn', '0902000006', 'TECHNICIAN'),
    ('ktv07', 'Đỗ Thị Nhiệt', '0902000007', 'TECHNICIAN'),
    ('ktv08', 'Ngô Văn Tải', '0902000008', 'TECHNICIAN')
) AS v(username, full_name, phone, role_name)
JOIN roles r ON r.name = v.role_name
ON CONFLICT (username) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. XÓA DỮ LIỆU SEED CŨ (chỉ các phiếu WO-SEED-*)
-- ------------------------------------------------------------------------------
DELETE FROM asset_maintenance_history
WHERE work_order_id IN (SELECT id FROM work_orders WHERE work_order_code LIKE 'WO-SEED-%');
DELETE FROM work_order_parts
WHERE work_order_id IN (SELECT id FROM work_orders WHERE work_order_code LIKE 'WO-SEED-%');
DELETE FROM work_orders WHERE work_order_code LIKE 'WO-SEED-%';

-- ------------------------------------------------------------------------------
-- 3. SINH 1.000 WORK ORDERS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_assets      uuid[];
    v_asset_hours numeric[];
    v_asset_crit  text[];
    v_techs       uuid[];
    v_managers    uuid[];
    v_parts       uuid[];
    v_part_prices numeric[];

    v_titles_corrective text[] := ARRAY[
        'Máy dừng đột ngột, báo lỗi quá tải động cơ', 'Rò rỉ dầu thủy lực tại cụm xi lanh',
        'Tiếng ồn bất thường ở hộp số', 'Quá nhiệt ổ trục chính', 'Mất áp suất khí nén',
        'Băng tải bị lệch, kẹt sản phẩm', 'Lỗi cảm biến vị trí, máy không về home',
        'Rung động vượt ngưỡng cho phép', 'Biến tần báo lỗi quá áp', 'Đầu hàn robot không phát hồ quang'];
    v_causes text[] := ARRAY[
        'Vòng bi mòn sau thời gian dài vận hành', 'Gioăng phớt lão hóa gây rò rỉ', 'Thiếu dầu bôi trơn định kỳ',
        'Cảm biến bám bụi, tín hiệu chập chờn', 'Dây đai trùng, trượt puly', 'Quạt làm mát tủ điện hỏng',
        'Lọc khí bị tắc', 'Tiếp điểm contactor bị cháy rỗ', 'Bulong chân đế lỏng gây rung', 'Bo mạch điều khiển ẩm'];
    v_solutions text[] := ARRAY[
        'Thay vòng bi mới, căn chỉnh lại trục', 'Thay bộ gioăng phớt, bổ sung dầu thủy lực',
        'Vệ sinh và hiệu chỉnh cảm biến', 'Thay dây đai, căng lại theo tiêu chuẩn', 'Thay quạt làm mát, vệ sinh tủ điện',
        'Thay lọc khí, kiểm tra rò rỉ đường ống', 'Thay contactor, siết lại đầu cốt', 'Siết lại bulong, cân chỉnh chân máy',
        'Sấy khô và phủ chống ẩm bo mạch', 'Bôi trơn toàn bộ, chạy thử 2 giờ'];
    v_titles_pm text[] := ARRAY[
        'Bảo dưỡng định kỳ 500 giờ máy chạy', 'Thay dầu và lọc dầu định kỳ', 'Bảo dưỡng tháng: vệ sinh, bôi trơn',
        'Kiểm tra, căng chỉnh dây đai định kỳ', 'Bảo dưỡng quý hệ thống thủy lực'];
    v_titles_insp text[] := ARRAY[
        'Kiểm tra an toàn điện định kỳ', 'Đo độ rung và nhiệt độ ổ trục', 'Kiểm tra áp suất và rò rỉ khí nén',
        'Kiểm tra hiệu chuẩn cảm biến', 'Kiểm tra tổng quát đầu ca'];

    i            int;
    v_idx        int;
    v_type       work_order_type_enum;
    v_status     work_order_status_enum;
    v_priority   work_order_priority_enum;
    v_age_days   numeric;
    v_created    timestamptz;
    v_breakdown  timestamptz;
    v_start      timestamptz;
    v_completed  timestamptz;
    v_verified   timestamptz;
    v_repair_h   numeric;
    v_op_hours   numeric;
    v_tech       uuid;
    v_manager    uuid;
    v_wo_id      uuid;
    v_title      text;
    v_cause      text;
    v_solution   text;
    v_labor      numeric;
    v_parts_cost numeric;
    v_n_parts    int;
    v_part_idx   int;
    v_qty        int;
    v_r          float8;
BEGIN
    SELECT array_agg(id ORDER BY asset_code), array_agg(operating_hours ORDER BY asset_code),
           array_agg(criticality::text ORDER BY asset_code)
      INTO v_assets, v_asset_hours, v_asset_crit
      FROM assets WHERE is_active AND status <> 'DECOMMISSIONED';
    SELECT array_agg(u.id ORDER BY u.username) INTO v_techs
      FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'TECHNICIAN' AND u.username LIKE 'ktv%';
    SELECT array_agg(u.id ORDER BY u.username) INTO v_managers
      FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'MAINTENANCE_MANAGER' AND u.username LIKE 'quanly%';
    SELECT array_agg(id ORDER BY part_code), array_agg(unit_price ORDER BY part_code)
      INTO v_parts, v_part_prices FROM parts WHERE is_active;

    IF coalesce(array_length(v_assets, 1), 0) < 300 THEN
        RAISE EXCEPTION 'Cần ít nhất 300 thiết bị (đang có %). Chạy trước: cd backend && npm run seed:zentech',
            coalesce(array_length(v_assets, 1), 0);
    END IF;

    FOR i IN 1..1000 LOOP
        v_idx := 1 + floor(random() * array_length(v_assets, 1))::int;

        -- Loại phiếu: 45% sửa chữa, 30% bảo dưỡng định kỳ, 15% kiểm tra, 10% khẩn cấp
        v_r := random();
        v_type := CASE WHEN v_r < 0.45 THEN 'CORRECTIVE' WHEN v_r < 0.75 THEN 'PREVENTIVE'
                       WHEN v_r < 0.90 THEN 'INSPECTION' ELSE 'EMERGENCY' END;

        -- Phiếu càng cũ càng nhiều: phân bố đều trong 180 ngày qua
        v_age_days := random() * 180;
        v_created := now() - v_age_days * interval '1 day';

        -- Trạng thái: phiếu cũ hơn 14 ngày hầu hết đã đóng; phiếu gần đây có đủ các trạng thái đang xử lý
        v_r := random();
        IF v_age_days > 14 THEN
            v_status := CASE WHEN v_r < 0.06 THEN 'CANCELLED' WHEN v_r < 0.12 THEN 'COMPLETED' ELSE 'CLOSED' END;
        ELSE
            v_status := CASE WHEN v_r < 0.22 THEN 'OPEN' WHEN v_r < 0.40 THEN 'ASSIGNED' WHEN v_r < 0.58 THEN 'IN_PROGRESS'
                             WHEN v_r < 0.66 THEN 'ON_HOLD' WHEN v_r < 0.70 THEN 'REWORK_REQUIRED'
                             WHEN v_r < 0.88 THEN 'COMPLETED' ELSE 'CLOSED' END;
        END IF;

        -- Mức ưu tiên theo loại phiếu và mức độ quan trọng của máy
        v_priority := CASE
            WHEN v_type = 'EMERGENCY' THEN 'CRITICAL'
            WHEN v_type = 'CORRECTIVE' AND v_asset_crit[v_idx] IN ('CRITICAL', 'HIGH') THEN
                 (CASE WHEN random() < 0.6 THEN 'HIGH' ELSE 'CRITICAL' END)::work_order_priority_enum
            WHEN v_type = 'CORRECTIVE' THEN (CASE WHEN random() < 0.7 THEN 'MEDIUM' ELSE 'HIGH' END)::work_order_priority_enum
            ELSE (CASE WHEN random() < 0.6 THEN 'LOW' ELSE 'MEDIUM' END)::work_order_priority_enum
        END;

        v_tech := CASE WHEN v_status = 'OPEN' THEN NULL ELSE v_techs[1 + floor(random() * array_length(v_techs, 1))::int] END;
        v_manager := v_managers[1 + floor(random() * array_length(v_managers, 1))::int];

        -- Giờ máy lúc xảy ra sự kiện: máy chạy ~16 giờ/ngày (2 ca)
        v_op_hours := round(greatest(0, v_asset_hours[v_idx] - v_age_days * 16)::numeric, 2);

        -- Thời gian
        v_breakdown := CASE WHEN v_type IN ('CORRECTIVE', 'EMERGENCY')
                            THEN v_created - random() * interval '45 minutes' END;
        v_start := CASE WHEN v_status IN ('IN_PROGRESS', 'ON_HOLD', 'REWORK_REQUIRED', 'COMPLETED', 'CLOSED') THEN
                        v_created + CASE v_type
                            WHEN 'EMERGENCY' THEN (0.1 + random() * 0.6) * interval '1 hour'
                            WHEN 'CORRECTIVE' THEN (0.5 + random() * 6) * interval '1 hour'
                            ELSE (1 + random() * 20) * interval '1 hour' END
                   END;
        v_repair_h := round((CASE v_type
                            WHEN 'EMERGENCY' THEN 0.5 + random() * 5.5
                            WHEN 'CORRECTIVE' THEN 1 + random() * 7
                            WHEN 'PREVENTIVE' THEN 1 + random() * 3
                            ELSE 0.25 + random() * 1.25 END)::numeric, 2);
        -- Phiếu vừa tạo gần đây: không để thời điểm bắt đầu/hoàn thành rơi vào tương lai
        IF v_start > now() THEN
            v_start := v_created + (now() - v_created) * 0.5;
        END IF;
        v_completed := CASE WHEN v_status IN ('COMPLETED', 'CLOSED', 'REWORK_REQUIRED')
                            THEN v_start + v_repair_h * interval '1 hour' END;
        IF v_completed > now() THEN
            v_completed := now();
            v_repair_h := round((extract(epoch FROM v_completed - v_start) / 3600)::numeric, 2);
        END IF;
        v_verified := CASE WHEN v_status = 'CLOSED'
                           THEN least(now(), v_completed + (2 + random() * 46) * interval '1 hour') END;

        IF v_type IN ('CORRECTIVE', 'EMERGENCY') THEN
            v_title := v_titles_corrective[1 + floor(random() * array_length(v_titles_corrective, 1))::int];
            v_cause := v_causes[1 + floor(random() * array_length(v_causes, 1))::int];
            v_solution := v_solutions[1 + floor(random() * array_length(v_solutions, 1))::int];
        ELSIF v_type = 'PREVENTIVE' THEN
            v_title := v_titles_pm[1 + floor(random() * array_length(v_titles_pm, 1))::int];
            v_cause := NULL;
            v_solution := 'Thực hiện đầy đủ hạng mục bảo dưỡng theo checklist';
        ELSE
            v_title := v_titles_insp[1 + floor(random() * array_length(v_titles_insp, 1))::int];
            v_cause := NULL;
            v_solution := 'Các thông số trong giới hạn cho phép';
        END IF;

        v_labor := CASE WHEN v_completed IS NOT NULL THEN round(v_repair_h * 150000, 0) ELSE 0 END;
        v_wo_id := uuid_generate_v4();

        INSERT INTO work_orders (
            id, created_at, updated_at, work_order_code, title, description, asset_id, created_by_id,
            type, status, priority, assigned_technician_id, scheduled_start_date, scheduled_end_date,
            breakdown_time, start_time, asset_status_at_start, operating_hours_at_failure, completed_time,
            actual_repair_time_hours, root_cause, solution, estimated_cost, actual_cost_labor,
            completion_notes, verification_notes, verified_by_id, verified_at, client_uuid
        ) VALUES (
            v_wo_id, v_created, coalesce(v_verified, v_completed, v_start, v_created),
            'WO-SEED-' || lpad(i::text, 4, '0'), v_title,
            'Phiếu sinh tự động cho kiểm thử tải (SV06)', v_assets[v_idx], v_manager,
            v_type, v_status, v_priority, v_tech,
            CASE WHEN v_type IN ('PREVENTIVE', 'INSPECTION') THEN v_created::date END,
            CASE WHEN v_type IN ('PREVENTIVE', 'INSPECTION') THEN (v_created + (1 + floor(random() * 3)) * interval '1 day')::date END,
            v_breakdown, v_start,
            (CASE WHEN v_start IS NULL THEN NULL WHEN v_type IN ('CORRECTIVE', 'EMERGENCY') THEN 'DOWN'
                  WHEN v_type = 'PREVENTIVE' THEN 'MAINTENANCE' ELSE 'OPERATIONAL' END)::assets_status_enum,
            CASE WHEN v_type IN ('CORRECTIVE', 'EMERGENCY') THEN v_op_hours END,
            v_completed,
            CASE WHEN v_completed IS NOT NULL THEN v_repair_h ELSE 0 END,
            CASE WHEN v_completed IS NOT NULL THEN v_cause END,
            CASE WHEN v_completed IS NOT NULL THEN v_solution END,
            round((v_repair_h * 150000 + random() * 2000000)::numeric, 0), v_labor,
            CASE WHEN v_completed IS NOT NULL THEN 'Đã hoàn thành, máy chạy thử ổn định' END,
            CASE WHEN v_status = 'CLOSED' THEN 'Nghiệm thu đạt yêu cầu' END,
            CASE WHEN v_status = 'CLOSED' THEN v_manager END,
            v_verified,
            -- ~15% phiếu được tạo từ app mobile offline (có client_uuid)
            CASE WHEN random() < 0.15 THEN uuid_generate_v4() END
        );

        -- Phụ tùng sử dụng: 60% phiếu sửa chữa/bảo dưỡng đã làm có dùng 1-3 loại phụ tùng
        v_parts_cost := 0;
        IF v_start IS NOT NULL AND v_type <> 'INSPECTION' AND random() < 0.6 THEN
            v_n_parts := 1 + floor(random() * 3)::int;
            FOR k IN 1..v_n_parts LOOP
                v_part_idx := 1 + floor(random() * array_length(v_parts, 1))::int;
                v_qty := 1 + floor(random() * 4)::int;
                INSERT INTO work_order_parts (work_order_id, part_id, quantity_used, unit_price, notes, created_at)
                VALUES (v_wo_id, v_parts[v_part_idx], v_qty, v_part_prices[v_part_idx], 'Seed SV06', v_start)
                ON CONFLICT ON CONSTRAINT uq_wo_part_price
                DO UPDATE SET quantity_used = work_order_parts.quantity_used + EXCLUDED.quantity_used;
                v_parts_cost := v_parts_cost + v_qty * v_part_prices[v_part_idx];
            END LOOP;
        END IF;

        UPDATE work_orders
           SET actual_cost_parts = v_parts_cost, total_actual_cost = v_parts_cost + v_labor
         WHERE id = v_wo_id;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 4. LỊCH SỬ BẢO TRÌ CHO CÁC PHIẾU ĐÃ HOÀN THÀNH (nguồn tính MTTR / MTBF)
-- ------------------------------------------------------------------------------
INSERT INTO asset_maintenance_history (
    created_at, updated_at, asset_id, work_order_id, event_type, title, description,
    breakdown_time, repair_start_time, repair_end_time, downtime_hours, actual_repair_time_hours,
    operating_hours_at_failure, is_failure_counted, failure_cause, action_taken,
    status_before, status_after, parts_replaced, cost_parts, cost_labor, total_cost, performed_by_id
)
SELECT
    wo.completed_time, wo.completed_time, wo.asset_id, wo.id,
    (CASE wo.type WHEN 'PREVENTIVE' THEN 'PREVENTIVE_MAINTENANCE' WHEN 'INSPECTION' THEN 'INSPECTION'
                  ELSE 'BREAKDOWN' END)::maintenance_event_type_enum,
    wo.title, wo.work_order_code || ' - ' || coalesce(wo.solution, ''),
    wo.breakdown_time, wo.start_time, wo.completed_time,
    round(coalesce(wo.downtime_hours, 0), 2), wo.actual_repair_time_hours,
    wo.operating_hours_at_failure, wo.type IN ('CORRECTIVE', 'EMERGENCY'),
    wo.root_cause, wo.solution,
    wo.asset_status_at_start, 'OPERATIONAL',
    coalesce((SELECT jsonb_agg(jsonb_build_object(
                  'partId', p.id, 'partCode', p.part_code, 'partName', p.name,
                  'quantity', wop.quantity_used, 'unitPrice', wop.unit_price, 'totalPrice', wop.subtotal))
              FROM work_order_parts wop JOIN parts p ON p.id = wop.part_id
              WHERE wop.work_order_id = wo.id), '[]'::jsonb),
    wo.actual_cost_parts, wo.actual_cost_labor, wo.total_actual_cost, wo.assigned_technician_id
FROM work_orders wo
WHERE wo.work_order_code LIKE 'WO-SEED-%' AND wo.status IN ('COMPLETED', 'CLOSED');

-- Thời gian giữa 2 lần hỏng (MTBF từng khoảng) theo giờ máy, giống cách history.service tính
UPDATE asset_maintenance_history h
   SET time_between_failures_hours = sub.tbf
  FROM (
      SELECT id, round(greatest(0, operating_hours_at_failure
                 - coalesce(lag(operating_hours_at_failure) OVER (PARTITION BY asset_id ORDER BY breakdown_time), 0)), 2) AS tbf
        FROM asset_maintenance_history
       WHERE is_failure_counted
  ) sub
 WHERE h.id = sub.id;

-- ------------------------------------------------------------------------------
-- 5. TÍNH LẠI CHỈ SỐ CỦA TỪNG THIẾT BỊ TỪ LỊCH SỬ THỰC TẾ
--    MTTR = tổng giờ sửa / số lần hỏng ; MTBF = giờ máy chạy / số lần hỏng (giống history.service)
-- ------------------------------------------------------------------------------
UPDATE assets a
   SET total_failures = coalesce(f.cnt, 0),
       total_repair_time_hours = coalesce(f.repair, 0),
       last_failure_date = f.last_failure,
       cached_mttr_hours = CASE WHEN f.cnt > 0 THEN round(f.repair / f.cnt, 2) ELSE 0 END,
       cached_mtbf_hours = CASE WHEN f.cnt > 0 THEN round(a.operating_hours / f.cnt, 2) ELSE a.operating_hours END,
       metrics_last_updated_at = now()
  FROM assets a2
  LEFT JOIN (
      SELECT asset_id, count(*) AS cnt, sum(actual_repair_time_hours) AS repair, max(breakdown_time) AS last_failure
        FROM asset_maintenance_history WHERE is_failure_counted GROUP BY asset_id
  ) f ON f.asset_id = a2.id
 WHERE a.id = a2.id;

COMMIT;

-- ------------------------------------------------------------------------------
-- 6. KẾT QUẢ
-- ------------------------------------------------------------------------------
SELECT count(*) AS tong_work_orders,
       min(created_at)::date AS tu_ngay, max(created_at)::date AS den_ngay
  FROM work_orders WHERE work_order_code LIKE 'WO-SEED-%';

SELECT status, count(*) AS so_phieu FROM work_orders
 WHERE work_order_code LIKE 'WO-SEED-%' GROUP BY status ORDER BY so_phieu DESC;

SELECT type, count(*) AS so_phieu FROM work_orders
 WHERE work_order_code LIKE 'WO-SEED-%' GROUP BY type ORDER BY so_phieu DESC;

SELECT count(*) FILTER (WHERE is_failure_counted) AS so_lan_hong,
       round(sum(actual_repair_time_hours) FILTER (WHERE is_failure_counted)
             / nullif(count(*) FILTER (WHERE is_failure_counted), 0), 2) AS mttr_toan_he_thong_gio,
       (SELECT round(avg(cached_mtbf_hours), 2) FROM assets WHERE total_failures > 0) AS mtbf_tb_thiet_bi_gio
  FROM asset_maintenance_history;
