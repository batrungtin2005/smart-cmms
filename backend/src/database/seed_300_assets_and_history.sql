-- ==============================================================================
-- SMART CMMS - SEED SCRIPT: 300 THIẾT BỊ (ASSETS) VÀ LỊCH SỬ SỬA CHỮA / BẢO TRÌ
-- Database: PostgreSQL 14+ / 16
-- Mục đích: Chèn nhanh dữ liệu giả lập chuẩn xác cho 300 máy và lịch sử bảo dưỡng
--           Tự động đồng bộ các chỉ số MTTR (Mean Time To Repair) và MTBF (Mean Time Between Failures)
-- ==============================================================================

BEGIN;

-- 1. ĐẢM BẢO EXTENSION UUID ĐƯỢC KÍCH HOẠT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TẠO CÁC KIỂU ENUM NẾU CHƯA CÓ
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

-- 3. CHÈN VỊ TRÍ NHÀ XƯỞNG MẪU (locations) NẾU BẢNG ĐANG TRỐNG
INSERT INTO locations (id, code, name, description, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'LOC-FAC-01', 'Nhà máy Sản xuất Zentech', 'Khu liên hợp sản xuất chính', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'LOC-WS-A', 'Phân xưởng Gia công CNC', 'Gia công phay, tiện chính xác', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'LOC-WS-B', 'Phân xưởng Dập & Thủy lực', 'Dập vuốt và ép định hình kim loại', TRUE),
    ('a0000000-0000-0000-0000-000000000004', 'LOC-WS-C', 'Phân xưởng Đúc & Nhiệt luyện', 'Đúc áp lực và lò tôi ram chân không', TRUE),
    ('a0000000-0000-0000-0000-000000000005', 'LOC-LINE-01', 'Dây chuyền Hàn & Lắp ráp 01', 'Cụm Robot hàn tự động', TRUE),
    ('a0000000-0000-0000-0000-000000000006', 'LOC-LINE-02', 'Dây chuyền Đóng gói & Phân loại', 'Hệ thống băng tải và robot palletizer', TRUE),
    ('a0000000-0000-0000-0000-000000000007', 'LOC-UTIL', 'Trạm Tiện ích Khí nén & Điện', 'Cung cấp máy nén khí và biến áp trạm', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. TẠO 300 THIẾT BỊ (AST-001 ĐẾN AST-300)
DO $$
DECLARE
    v_categories TEXT[] := ARRAY['Cơ khí', 'Thủy lực', 'Điện tự động', 'Khí nén', 'Nhiệt luyện', 'Đúc áp lực'];
    v_manufacturers TEXT[] := ARRAY['Komatsu', 'Mitsubishi Electric', 'Siemens', 'Fanuc', 'Atlas Copco', 'ABB', 'Yaskawa', 'Hitachi', 'Mazak', 'Festo'];
    v_models TEXT[] := ARRAY['VMC-850', 'FX-3000', 'GA-75VSD', 'IRB-2600', 'E500-HD', 'CL-6000', 'M80-CNC', 'HA-250', 'ZX-200', 'NC-400'];
    v_mach_types TEXT[] := ARRAY[
        'Máy Phay CNC 5 Trục', 'Máy Tiện Tự Động', 'Máy Ép Thủy Lực 500T', 'Máy Nén Khí Trục Vít',
        'Robot Hàn Công Nghiệp', 'Lò Tôi Chân Không', 'Máy Cắt Laser Fiber 6kW', 'Máy Chấn Tôn CNC',
        'Máy Ép Nhựa 350T', 'Bơm Thủy Lực Cao Áp', 'Hệ Thống Sấy Khí Hấp Thụ', 'Máy Mài Phẳng CNC'
    ];
    v_statuses asset_status_enum[] := ARRAY[
        'OPERATIONAL'::asset_status_enum, 'OPERATIONAL'::asset_status_enum, 'OPERATIONAL'::asset_status_enum,
        'OPERATIONAL'::asset_status_enum, 'MAINTENANCE'::asset_status_enum, 'DOWN'::asset_status_enum
    ];
    v_criticalities asset_criticality_enum[] := ARRAY[
        'MEDIUM'::asset_criticality_enum, 'HIGH'::asset_criticality_enum, 'CRITICAL'::asset_criticality_enum, 'LOW'::asset_criticality_enum
    ];
    v_loc_ids UUID[];
    v_asset_code VARCHAR(50);
    v_name VARCHAR(200);
    v_cat VARCHAR(100);
    v_manuf VARCHAR(100);
    v_model VARCHAR(100);
    v_serial VARCHAR(100);
    v_loc_id UUID;
    v_status asset_status_enum;
    v_crit asset_criticality_enum;
    v_install_date DATE;
    v_warranty_date DATE;
    v_op_hours NUMERIC(10,2);
    v_specs JSONB;
    v_i INT;
BEGIN
    -- Lấy danh sách ID vị trí thực tế
    SELECT array_agg(id) INTO v_loc_ids FROM locations;

    FOR v_i IN 1..300 LOOP
        v_asset_code := 'AST-' || LPAD(v_i::text, 3, '0');
        v_cat := v_categories[1 + (v_i % array_length(v_categories, 1))];
        v_manuf := v_manufacturers[1 + (v_i % array_length(v_manufacturers, 1))];
        v_model := v_models[1 + (v_i % array_length(v_models, 1))];
        v_name := v_mach_types[1 + (v_i % array_length(v_mach_types, 1))] || ' #' || LPAD(v_i::text, 3, '0');
        v_serial := 'SN-2023-' || LPAD((1000 + v_i)::text, 5, '0');
        v_loc_id := v_loc_ids[1 + (v_i % array_length(v_loc_ids, 1))];
        
        -- Phân bố trạng thái: ~80% OPERATIONAL, 10% MAINTENANCE, 10% DOWN
        v_status := v_statuses[1 + (v_i % array_length(v_statuses, 1))];
        v_crit := v_criticalities[1 + (v_i % array_length(v_criticalities, 1))];
        
        v_install_date := CURRENT_DATE - (180 + (v_i * 3)) * INTERVAL '1 day';
        v_warranty_date := v_install_date + INTERVAL '2 years';
        v_op_hours := ROUND((1200 + (v_i * 38.5) + (RANDOM() * 500))::numeric, 2);

        v_specs := jsonb_build_object(
            'power_kw', ROUND((15 + (v_i % 7) * 11)::numeric, 1),
            'voltage', '380V / 3 Phase / 50Hz',
            'pressure_bar', ROUND((6 + (v_i % 5) * 50)::numeric, 1),
            'rpm', 1450 + ((v_i % 3) * 1450),
            'weight_kg', 850 + (v_i * 15)
        );

        INSERT INTO assets (
            asset_code,
            name,
            category,
            manufacturer,
            model,
            serial_number,
            location_id,
            status,
            criticality,
            install_date,
            warranty_expiry_date,
            operating_hours,
            qr_code_url,
            image_url,
            specifications,
            is_active
        )
        VALUES (
            v_asset_code,
            v_name,
            v_cat,
            v_manuf,
            v_model,
            v_serial,
            v_loc_id,
            v_status,
            v_crit,
            v_install_date,
            v_warranty_date,
            v_op_hours,
            'https://cmms.local/qr/' || v_asset_code,
            'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500',
            v_specs,
            TRUE
        )
        ON CONFLICT (asset_code) DO UPDATE
        SET 
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            manufacturer = EXCLUDED.manufacturer,
            model = EXCLUDED.model,
            serial_number = EXCLUDED.serial_number,
            location_id = EXCLUDED.location_id,
            status = EXCLUDED.status,
            criticality = EXCLUDED.criticality,
            operating_hours = EXCLUDED.operating_hours,
            specifications = EXCLUDED.specifications;
    END LOOP;
END $$;

-- 5. TẠO LỊCH SỬ SỬA CHỮA / BẢO DƯỠNG (asset_maintenance_history)
-- Mỗi thiết bị được tạo ngẫu nhiên từ 1 đến 4 sự kiện bảo trì trong 12 tháng qua
DO $$
DECLARE
    r_asset RECORD;
    v_event_count INT;
    v_event_idx INT;
    v_event_type maintenance_event_type_enum;
    v_title VARCHAR(255);
    v_desc TEXT;
    v_cause VARCHAR(255);
    v_action TEXT;
    v_breakdown TIMESTAMPTZ;
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_repair_hours NUMERIC(10,2);
    v_downtime_hours NUMERIC(10,2);
    v_cost_parts NUMERIC(12,2);
    v_cost_labor NUMERIC(12,2);
    v_total_cost NUMERIC(12,2);
    v_parts_json JSONB;
    v_is_failure BOOLEAN;
    v_op_at_failure NUMERIC(10,2);

    v_titles_breakdown TEXT[] := ARRAY[
        'Sửa chữa kẹt pít-tông xi lanh thủy lực chính',
        'Khắc phục sự cố quá nhiệt dầu bôi trơn cụm trục',
        'Thay thế vòng bi bị rơ lắc và phát tiếng kêu lớn',
        'Xử lý chập cháy contactor nguồn tủ điều khiển',
        'Sửa chữa rò rỉ đường ống dầu cao áp 250 bar',
        'Xử lý lỗi lệch tâm bàn kẹp phôi tự động',
        'Khắc phục lỗi ngắt biến tần do quá tải đột ngột',
        'Sửa chữa van đảo chiều khí nén không tác động'
    ];
    v_titles_pm TEXT[] := ARRAY[
        'Bảo dưỡng định kỳ 2000 giờ máy chạy',
        'Kiểm tra và siết lại toàn bộ bu-lông chân đế',
        'Hiệu chuẩn cảm biến áp suất và rơ-le nhiệt',
        'Vệ sinh lọc gió, lọc dầu và tra mỡ bạc đạn',
        'Kiểm tra độ chùng xích tải và căn chỉnh ray'
    ];
    v_causes TEXT[] := ARRAY[
        'Mòn cơ học tự nhiên sau thời gian dài chịu tải cao',
        'Bụi kim loại xâm nhập làm tắc khe hở bôi trơn',
        'Dầu thủy lực biến chất do nhiệt độ làm việc cao',
        'Lỏng ốc hãm do chấn động rung trong lúc gia công',
        'Điện áp nguồn dao động bất thường làm nhảy bảo vệ'
    ];
    v_actions TEXT[] := ARRAY[
        'Tháo cụm chấp hành, vệ sinh buồng dầu và thay phớt mới',
        'Thay thế bạc đạn SKF chính hãng, tra mỡ chịu nhiệt cao',
        'Súc rửa đường ống, châm dầu thủy lực ISO VG 46 đạt mức',
        'Căn chỉnh lại độ đồng tâm trục bằng thiết bị laser',
        'Vệ sinh tủ điện, siết lại đầu cosse và test tải thành công'
    ];
BEGIN
    FOR r_asset IN SELECT id, asset_code, operating_hours FROM assets WHERE is_active = TRUE LOOP
        -- Tạo 1 đến 4 sự kiện cho mỗi máy
        v_event_count := 1 + (RANDOM() * 3)::INT;

        FOR v_event_idx IN 1..v_event_count LOOP
            -- Sự kiện 1 và 2 ưu tiên là hỏng đột xuất để tính MTTR/MTBF
            IF (v_event_idx % 2 = 1) THEN
                v_event_type := 'CORRECTIVE_REPAIR'::maintenance_event_type_enum;
                v_is_failure := TRUE;
                v_title := v_titles_breakdown[1 + ((r_asset.operating_hours::int + v_event_idx) % array_length(v_titles_breakdown, 1))];
                v_cause := v_causes[1 + ((r_asset.operating_hours::int + v_event_idx) % array_length(v_causes, 1))];
                v_action := v_actions[1 + ((r_asset.operating_hours::int + v_event_idx) % array_length(v_actions, 1))];
            ELSE
                v_event_type := 'PREVENTIVE_MAINTENANCE'::maintenance_event_type_enum;
                v_is_failure := FALSE;
                v_title := v_titles_pm[1 + ((r_asset.operating_hours::int + v_event_idx) % array_length(v_titles_pm, 1))];
                v_cause := 'Bảo dưỡng định kỳ theo khuyến cáo nhà sản xuất';
                v_action := 'Thực hiện checklist kiểm tra định kỳ 15 hạng mục đạt chuẩn';
            END IF;

            -- Thời điểm xảy ra sự kiện trong vòng 300 ngày qua
            v_breakdown := NOW() - ((v_event_idx * 60) + (RANDOM() * 30)) * INTERVAL '1 day' - (RANDOM() * 12) * INTERVAL '1 hour';
            v_start := v_breakdown + (15 + (RANDOM() * 45)) * INTERVAL '1 minute';
            
            -- Thời gian sửa chữa thực tế từ 0.8 đến 6.5 giờ
            v_repair_hours := ROUND((0.8 + (RANDOM() * 4.5))::numeric, 2);
            v_end := v_start + (v_repair_hours * INTERVAL '1 hour');
            v_downtime_hours := ROUND((EXTRACT(EPOCH FROM (v_end - v_breakdown)) / 3600.0)::numeric, 2);

            v_op_at_failure := GREATEST(100.0, ROUND((r_asset.operating_hours - ((v_event_count - v_event_idx + 1) * 350.0))::numeric, 2));
            
            v_cost_parts := ROUND((300000 + (RANDOM() * 2500000))::numeric, -3);
            v_cost_labor := ROUND((200000 + (v_repair_hours * 150000))::numeric, -3);
            v_total_cost := v_cost_parts + v_cost_labor;

            v_parts_json := jsonb_build_array(
                jsonb_build_object(
                    'partCode', 'PART-' || LPAD((1 + (v_event_idx % 25))::text, 3, '0'),
                    'partName', 'Phụ tùng thay thế định kỳ ' || (1 + (v_event_idx % 25)),
                    'quantity', 1 + (v_event_idx % 3),
                    'unitPrice', ROUND((v_cost_parts / (1 + (v_event_idx % 3)))::numeric, 0),
                    'totalPrice', v_cost_parts
                )
            );

            INSERT INTO asset_maintenance_history (
                asset_id,
                event_type,
                title,
                description,
                breakdown_time,
                repair_start_time,
                repair_end_time,
                downtime_hours,
                actual_repair_time_hours,
                operating_hours_at_failure,
                is_failure_counted,
                failure_cause,
                action_taken,
                status_before,
                status_after,
                parts_replaced,
                cost_parts,
                cost_labor,
                total_cost,
                created_at,
                updated_at
            )
            VALUES (
                r_asset.id,
                v_event_type,
                v_title,
                'Nhật ký ghi nhận tự động phục vụ tính toán độ tin cậy MTTR/MTBF.',
                v_breakdown,
                v_start,
                v_end,
                v_downtime_hours,
                v_repair_hours,
                v_op_at_failure,
                v_is_failure,
                v_cause,
                v_action,
                CASE WHEN v_is_failure THEN 'DOWN'::asset_status_enum ELSE 'MAINTENANCE'::asset_status_enum END,
                'OPERATIONAL'::asset_status_enum,
                v_parts_json,
                v_cost_parts,
                v_cost_labor,
                v_total_cost,
                v_end,
                v_end
            );
        END LOOP;
    END LOOP;
END $$;

-- 6. ĐỒNG BỘ DỮ LIỆU TÍNH TOÁN MTTR & MTBF NGAY VÀO BẢNG ASSETS
-- Giúp Dashboard và Mobile hiển thị tức thì mà không cần quét lại nghìn dòng
UPDATE assets a
SET 
    total_failures = COALESCE(sub.fail_count, 0),
    total_repair_time_hours = COALESCE(sub.sum_repair, 0.00),
    last_failure_date = sub.max_breakdown,
    cached_mttr_hours = CASE 
        WHEN COALESCE(sub.fail_count, 0) > 0 
        THEN ROUND((sub.sum_repair / sub.fail_count)::numeric, 2)
        ELSE 0.00 
    END,
    cached_mtbf_hours = CASE 
        WHEN COALESCE(sub.fail_count, 0) > 0 
        THEN ROUND((a.operating_hours / sub.fail_count)::numeric, 2)
        ELSE a.operating_hours 
    END,
    metrics_last_updated_at = NOW()
FROM (
    SELECT 
        asset_id,
        COUNT(id) AS fail_count,
        SUM(actual_repair_time_hours) AS sum_repair,
        MAX(breakdown_time) AS max_breakdown
    FROM asset_maintenance_history
    WHERE is_failure_counted = TRUE
    GROUP BY asset_id
) sub
WHERE a.id = sub.asset_id;

COMMIT;

-- 7. TRUY VẤN KIỂM TRA KẾT QUẢ SAU KHI SEED
SELECT 
    COUNT(*) AS total_assets,
    SUM(total_failures) AS total_failure_events,
    ROUND(AVG(cached_mttr_hours)::numeric, 2) AS avg_system_mttr_hours,
    ROUND(AVG(cached_mtbf_hours)::numeric, 2) AS avg_system_mtbf_hours
FROM assets;
