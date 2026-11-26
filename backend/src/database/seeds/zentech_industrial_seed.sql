-- ==============================================================================
-- SMART CMMS - SEED DATA CÔNG NGHIỆP ZENTECH (300+ ASSETS & 60+ PARTS & BOM)
-- Target: PostgreSQL 14+ / 16
-- Đảm bảo tính IDEMPOTENT: Có thể chạy lại nhiều lần mà không bị lỗi trùng lặp
-- ==============================================================================

BEGIN;

-- Requires the current schema and enum/role normalization migration.

-- 1. TẠO VỊ TRÍ NHÀ XƯỞNG CỦA TẬP ĐOÀN ZENTECH (LOCATIONS)
INSERT INTO locations (id, code, name, description, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'LOC-FAC-01', 'Tổ hợp Nhà máy Cơ điện tử Zentech', 'Khu phức hợp sản xuất công nghiệp kỹ thuật cao', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'LOC-WS-A', 'Phân xưởng Gia công Cơ khí Chính xác CNC', 'Gia công phay, tiện, mài CNC chính xác micro', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'LOC-WS-B', 'Phân xưởng Dập Thủy lực & Kim loại tấm', 'Cắt laser fiber, chấn tôn CNC và dập vuốt thủy lực', TRUE),
    ('a0000000-0000-0000-0000-000000000004', 'LOC-WS-C', 'Phân xưởng Đúc Áp lực & Nhiệt luyện', 'Đúc nhôm áp lực cao và lò tôi ram chân không', TRUE),
    ('a0000000-0000-0000-0000-000000000005', 'LOC-LINE-01', 'Dây chuyền Robot Hàn & Lắp ráp Tự động', 'Cụm Robot 6 trục hàn MIG/MAG và ghép nối khung vỏ', TRUE),
    ('a0000000-0000-0000-0000-000000000006', 'LOC-LINE-02', 'Dây chuyền Đóng gói & Xếp Pallet Tự động', 'Hệ thống băng tải thông minh và robot palletizer', TRUE),
    ('a0000000-0000-0000-0000-000000000007', 'LOC-UTIL', 'Trạm Tiện ích Khí nén & Biến áp Trạm', 'Hệ thống máy nén khí trục vít, sấy khí và biến áp trạm', TRUE)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active;

-- 2. TẠO 60 DANH MỤC PHỤ TÙNG / LINH KIỆN CÔNG NGHIỆP (50+ PARTS)
INSERT INTO parts (id, part_code, name, category, unit, unit_price, current_stock, minimum_stock, maximum_stock, shelf_location, supplier_info, is_active)
VALUES
    -- Nhóm 1: Vòng bi - Bạc đạn công nghiệp (SKF, NSK, FAG, NTN, Timken, Koyo)
    ('b0000000-0000-0000-0000-000000000001', 'PART-001', 'Vòng bi cầu đỡ SKF 6205-2RSH', 'Vòng bi', 'Cái', 125000.00, 85, 15, 200, 'Kệ A1-T1-01', 'SKF Authorized Distributor VN', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'PART-002', 'Vòng bi chặn trục SKF 6309-2Z/C3', 'Vòng bi', 'Cái', 480000.00, 42, 10, 100, 'Kệ A1-T1-02', 'SKF Authorized Distributor VN', TRUE),
    ('b0000000-0000-0000-0000-000000000003', 'PART-003', 'Vòng bi tang trống tự lựa FAG 22218-E1-XL', 'Vòng bi', 'Cái', 1850000.00, 18, 5, 50, 'Kệ A1-T2-01', 'Schaeffler FAG Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000004', 'PART-004', 'Vòng bi tiếp xúc góc NSK 7210-B-XL-TVP', 'Vòng bi', 'Cái', 950000.00, 26, 8, 80, 'Kệ A1-T2-02', 'NSK Bearings Viet Nam', TRUE),
    ('b0000000-0000-0000-0000-000000000005', 'PART-005', 'Vòng bi đũa hình trụ NTN NU 214-ET2X', 'Vòng bi', 'Cái', 1120000.00, 15, 5, 40, 'Kệ A1-T2-03', 'NTN Industrial Supply', TRUE),
    ('b0000000-0000-0000-0000-000000000006', 'PART-006', 'Vòng bi côn Timken 32210 (Trục cán)', 'Vòng bi', 'Cái', 1450000.00, 20, 6, 60, 'Kệ A1-T3-01', 'Timken Vietnam Company', TRUE),
    ('b0000000-0000-0000-0000-000000000007', 'PART-007', 'Bạc đạn chà Koyo 51208', 'Vòng bi', 'Cái', 220000.00, 35, 10, 80, 'Kệ A1-T3-02', 'JTEKT Koyo Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000008', 'PART-008', 'Cụm gối đỡ bạc đạn Asahi UCP 208', 'Gối đỡ', 'Bộ', 380000.00, 30, 8, 70, 'Kệ A1-T3-03', 'Asahi Seiko Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000009', 'PART-009', 'Vòng bi kim IKO RNA 4905', 'Vòng bi', 'Cái', 310000.00, 28, 8, 60, 'Kệ A1-T4-01', 'IKO Nippon Thompson VN', TRUE),
    ('b0000000-0000-0000-0000-000000000010', 'PART-010', 'Vòng bi gốm chính xác cao NSK 7006CTYNDBLP4', 'Vòng bi', 'Cặp', 4200000.00, 6, 2, 20, 'Kệ A1-T4-02', 'NSK Precision Spindle Dept', TRUE),

    -- Nhóm 2: Phớt dầu & Gioăng thủy lực (NOK, Parker, Hallite, SKF Seals)
    ('b0000000-0000-0000-0000-000000000011', 'PART-011', 'Phớt ben thủy lực Parker PolyPak 80x100x12', 'Thủy lực', 'Bộ', 650000.00, 34, 10, 80, 'Kệ B2-T1-01', 'Parker Hannifin Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000012', 'PART-012', 'Phớt chắn dầu trục quay NOK TC 45x65x10 NBR', 'Phớt dầu', 'Cái', 85000.00, 110, 20, 250, 'Kệ B2-T1-02', 'NOK Corporation Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000013', 'PART-013', 'Phớt chịu nhiệt Viton FKM NOK TC 60x85x12', 'Phớt dầu', 'Cái', 240000.00, 48, 12, 120, 'Kệ B2-T1-03', 'NOK Corporation Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000014', 'PART-014', 'Phớt gạt bụi xi lanh thủy lực Hallite 860 70x80', 'Thủy lực', 'Cái', 180000.00, 55, 15, 150, 'Kệ B2-T2-01', 'Hallite Seals International', TRUE),
    ('b0000000-0000-0000-0000-000000000015', 'PART-015', 'Bộ O-ring tiêu chuẩn 382 chi tiết NBR 70', 'Gioăng O-ring', 'Hộp', 450000.00, 25, 5, 60, 'Kệ B2-T2-02', 'Parker Hannifin Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000016', 'PART-016', 'Bộ gioăng làm kín đầu nén cao áp Atlas Copco', 'Khí nén', 'Bộ', 3200000.00, 12, 4, 30, 'Kệ B2-T3-01', 'Atlas Copco Compressor VN', TRUE),
    ('b0000000-0000-0000-0000-000000000017', 'PART-017', 'Phớt cơ khí làm kín bơm ly tâm Grundfos HQQE', 'Bơm', 'Bộ', 1350000.00, 14, 4, 30, 'Kệ B2-T3-02', 'Grundfos Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000018', 'PART-018', 'Vòng đệm kim loại chịu áp 400 bar phi 22', 'Thủy lực', 'Cái', 35000.00, 200, 40, 500, 'Kệ B2-T4-01', 'Parker Hannifin Vietnam', TRUE),

    -- Nhóm 3: Truyền động cơ khí & Dây curoa (Bando, Optibelt, Gates, Tsubaki, Rotex)
    ('b0000000-0000-0000-0000-000000000019', 'PART-019', 'Dây curoa Bando Power King V-Belt SPA-1800', 'Truyền động', 'Sợi', 165000.00, 75, 15, 180, 'Kệ C1-T1-01', 'Bando Chemical Industries VN', TRUE),
    ('b0000000-0000-0000-0000-000000000020', 'PART-020', 'Dây curoa răng đồng bộ Optibelt 8M-1200-50', 'Truyền động', 'Sợi', 850000.00, 32, 8, 80, 'Kệ C1-T1-02', 'Optibelt GmbH Germany', TRUE),
    ('b0000000-0000-0000-0000-000000000021', 'PART-021', 'Dây curoa bản đôi Gates Hi-Power II B75', 'Truyền động', 'Sợi', 280000.00, 40, 10, 100, 'Kệ C1-T1-03', 'Gates Unitta Corporation', TRUE),
    ('b0000000-0000-0000-0000-000000000022', 'PART-022', 'Xích tải công nghiệp bước đôi Tsubaki RS60-1', 'Truyền động', 'Hộp 3m', 1650000.00, 18, 5, 45, 'Kệ C1-T2-01', 'Tsubakimoto Chain VN', TRUE),
    ('b0000000-0000-0000-0000-000000000023', 'PART-023', 'Khóa xích công nghiệp Tsubaki CL-60', 'Truyền động', 'Cái', 45000.00, 150, 30, 300, 'Kệ C1-T2-02', 'Tsubakimoto Chain VN', TRUE),
    ('b0000000-0000-0000-0000-000000000024', 'PART-024', 'Cao su giảm giật khớp nối KTR Rotex GS 28 (98 Sh-A)', 'Khớp nối', 'Cái', 320000.00, 45, 10, 120, 'Kệ C1-T3-01', 'KTR Systems GmbH Germany', TRUE),
    ('b0000000-0000-0000-0000-000000000025', 'PART-025', 'Khớp nối mềm trục servo NBK XG2-C-34', 'Khớp nối', 'Bộ', 1250000.00, 16, 4, 40, 'Kệ C1-T3-02', 'Nabeya Bi-tech Kaisha Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000026', 'PART-026', 'Bánh răng côn xoắn m=3 z=25 thép SCM440', 'Cơ khí', 'Cái', 890000.00, 20, 5, 50, 'Kệ C1-T4-01', 'Zentech Precision Machining', TRUE),

    -- Nhóm 4: Khí nén & Thủy lực (Festo, SMC, Rexroth, Yuken, Wika)
    ('b0000000-0000-0000-0000-000000000027', 'PART-027', 'Van điện từ khí nén Festo VUVS-L25-M52-MD-G14-F8', 'Khí nén', 'Cái', 1450000.00, 28, 8, 70, 'Kệ D3-T1-01', 'Festo AG & Co. KG Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000028', 'PART-028', 'Xi lanh khí nén compact SMC CDQ2B50-30DZ', 'Khí nén', 'Cái', 1150000.00, 22, 6, 60, 'Kệ D3-T1-02', 'SMC Corporation Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000029', 'PART-029', 'Cụm van điều áp & lọc tách nước Festo MS6-LFR', 'Khí nén', 'Bộ', 2650000.00, 15, 4, 35, 'Kệ D3-T2-01', 'Festo AG & Co. KG Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000030', 'PART-030', 'Van tỷ lệ điều hướng thủy lực Rexroth 4WREE 10', 'Thủy lực', 'Cái', 9800000.00, 5, 2, 12, 'Kệ D3-T2-02', 'Bosch Rexroth Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000031', 'PART-031', 'Van xả áp thủy lực Yuken DBW-10-1-30', 'Thủy lực', 'Cái', 3450000.00, 9, 3, 20, 'Kệ D3-T3-01', 'Yuken Kogyo Co. Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000032', 'PART-032', 'Đồng hồ đo áp suất dầu Wika 232.50 (0-400 bar)', 'Đo lường', 'Cái', 680000.00, 30, 8, 80, 'Kệ D3-T3-02', 'Wika Instruments Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000033', 'PART-033', 'Ống thủy lực 2 lớp thép Manuli 2SN-DN12 (Cuộn 50m)', 'Thủy lực', 'Mét', 195000.00, 150, 40, 300, 'Kệ D3-T4-01', 'Manuli Hydraulics Italy', TRUE),
    ('b0000000-0000-0000-0000-000000000034', 'PART-034', 'Đầu nối thủy lực ren cái JIC 3/4 inch', 'Thủy lực', 'Cái', 75000.00, 180, 50, 400, 'Kệ D3-T4-02', 'Parker Hannifin Vietnam', TRUE),

    -- Nhóm 5: Thiết bị Điện - Tự động hóa & Cảm biến (Siemens, Schneider, Mitsubishi, Omron)
    ('b0000000-0000-0000-0000-000000000035', 'PART-035', 'Khởi động từ Contactor Siemens Sirius 3RT2026-1BB40 (25A)', 'Điện tự động', 'Cái', 720000.00, 40, 10, 100, 'Kệ E1-T1-01', 'Siemens Industry Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000036', 'PART-036', 'Aptomat khối MCCB Schneider Compact NSX100F 3P 100A', 'Điện tự động', 'Cái', 2450000.00, 18, 5, 45, 'Kệ E1-T1-02', 'Schneider Electric Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000037', 'PART-037', 'Rơ le nhiệt bảo vệ động cơ Mitsubishi TH-T25 (15-22A)', 'Điện tự động', 'Cái', 320000.00, 35, 10, 90, 'Kệ E1-T1-03', 'Mitsubishi Electric VN', TRUE),
    ('b0000000-0000-0000-0000-000000000038', 'PART-038', 'Cảm biến tiệm cận quang học Omron E2E-X5ME1 2M', 'Cảm biến', 'Cái', 380000.00, 65, 15, 150, 'Kệ E1-T2-01', 'Omron Electronic VN', TRUE),
    ('b0000000-0000-0000-0000-000000000039', 'PART-039', 'Encoder xung quang học quay Omron E6B2-CWZ6C 1000P/R', 'Cảm biến', 'Cái', 1250000.00, 20, 5, 50, 'Kệ E1-T2-02', 'Omron Electronic VN', TRUE),
    ('b0000000-0000-0000-0000-000000000040', 'PART-040', 'Bộ nguồn xung công nghiệp Phoenix Contact 24VDC 10A', 'Điện tự động', 'Cái', 2150000.00, 22, 6, 50, 'Kệ E1-T3-01', 'Phoenix Contact SEA', TRUE),
    ('b0000000-0000-0000-0000-000000000041', 'PART-041', 'Biến tần điều khiển động cơ Yaskawa GA700 7.5kW', 'Biến tần', 'Cái', 14500000.00, 6, 2, 15, 'Kệ E1-T3-02', 'Yaskawa Electric Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000042', 'PART-042', 'Mô đun mở rộng I/O Siemens S7-1200 SM 1223 16DI/16DO', 'PLC Module', 'Cái', 3600000.00, 10, 3, 25, 'Kệ E1-T4-01', 'Siemens Industry Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000043', 'PART-043', 'Đèn tháp cảnh báo LED 3 tầng Patlite LR6-302WNW', 'Thiết bị báo hiệu', 'Cái', 1150000.00, 25, 6, 60, 'Kệ E1-T4-02', 'Patlite Corporation Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000044', 'PART-044', 'Cảm biến nhiệt độ can nhiệt K Omega Engineering 0-800C', 'Cảm biến', 'Cái', 650000.00, 30, 8, 80, 'Kệ E1-T4-03', 'Omega Engineering USA', TRUE),

    -- Nhóm 6: Dầu nhớt bôi trơn & Lọc công nghiệp (Shell, Mobil, Kluber, Donaldson, Atlas Copco)
    ('b0000000-0000-0000-0000-000000000045', 'PART-045', 'Dầu thủy lực chống mài mòn Shell Tellus S2 MX 46 (Phuy 209L)', 'Dầu mỡ', 'Lít', 78000.00, 1250, 400, 3000, 'Bồn dầu kho D', 'Shell Oil Vietnam Distribution', TRUE),
    ('b0000000-0000-0000-0000-000000000046', 'PART-046', 'Dầu rãnh trượt máy CNC Mobil Vactra Oil No.2 (Thùng 20L)', 'Dầu mỡ', 'Lít', 115000.00, 380, 100, 800, 'Kệ D1-T1-01', 'ExxonMobil Lubricants VN', TRUE),
    ('b0000000-0000-0000-0000-000000000047', 'PART-047', 'Mỡ bôi trơn tốc độ cao cho trục chính Kluber Isoflex NBU 15', 'Dầu mỡ', 'Tuýp 1kg', 3400000.00, 18, 5, 40, 'Kệ D1-T1-02', 'Kluber Lubrication Germany', TRUE),
    ('b0000000-0000-0000-0000-000000000048', 'PART-048', 'Lõi lọc dầu thủy lực áp suất cao Donaldson P171574 (10 micron)', 'Lõi lọc', 'Cái', 1250000.00, 36, 10, 90, 'Kệ D1-T2-01', 'Donaldson Filtration Solutions', TRUE),
    ('b0000000-0000-0000-0000-000000000049', 'PART-049', 'Lõi lọc tách dầu máy nén khí Atlas Copco 1622314000', 'Lõi lọc', 'Cái', 4850000.00, 15, 4, 30, 'Kệ D1-T2-02', 'Atlas Copco Compressor VN', TRUE),
    ('b0000000-0000-0000-0000-000000000050', 'PART-050', 'Lõi lọc gió sơ cấp máy nén khí Mann Filter C 14 200', 'Lõi lọc', 'Cái', 890000.00, 24, 6, 60, 'Kệ D1-T3-01', 'Mann+Hummel Filter VN', TRUE),
    ('b0000000-0000-0000-0000-000000000051', 'PART-051', 'Dầu bôi trơn máy nén khí Roto-Inject Fluid Atlas Copco (20L)', 'Dầu mỡ', 'Lít', 285000.00, 240, 60, 500, 'Bồn dầu kho D', 'Atlas Copco Compressor VN', TRUE),
    ('b0000000-0000-0000-0000-000000000052', 'PART-052', 'Lọc hút dầu bồn thủy lực Ikron HF 705-20.125', 'Lõi lọc', 'Cái', 650000.00, 20, 5, 50, 'Kệ D1-T3-02', 'Ikron Fluid Filtration', TRUE),

    -- Nhóm 7: Vật tư tiêu hao gia công, Hàn & Robot (Kyocera, Sandvik, Fanuc, ABB, Binzel)
    ('b0000000-0000-0000-0000-000000000053', 'PART-053', 'Dao phay ngón hợp kim Carbide Kyocera 4F-12mm phủ TiAlN', 'Dụng cụ cắt', 'Cái', 680000.00, 60, 15, 150, 'Kệ F2-T1-01', 'Kyocera Cutting Tools VN', TRUE),
    ('b0000000-0000-0000-0000-000000000054', 'PART-054', 'Mảnh tiện hợp kim Sandvik Coromant CNMG 12 04 08-PM 4325', 'Dụng cụ cắt', 'Hộp 10 viên', 1450000.00, 45, 10, 100, 'Kệ F2-T1-02', 'Sandvik Coromant Vietnam', TRUE),
    ('b0000000-0000-0000-0000-000000000055', 'PART-055', 'Đầu kẹp collet kẹp dao máy CNC BT40-ER32-70', 'Đầu kẹp', 'Bộ', 1650000.00, 22, 5, 50, 'Kệ F2-T2-01', 'MST Corporation Japan', TRUE),
    ('b0000000-0000-0000-0000-000000000056', 'PART-056', 'Bép hàn Robot MIG Abicor Binzel E-Cu 1.2mm M8', 'Vật tư hàn', 'Cái', 42000.00, 320, 80, 800, 'Kệ F2-T2-02', 'Abicor Binzel Germany', TRUE),
    ('b0000000-0000-0000-0000-000000000057', 'PART-057', 'Dây hàn lõi thuốc chống xỉ Kobelco DW-100 phi 1.2mm (Cuộn 15kg)', 'Vật tư hàn', 'Cuộn', 1350000.00, 50, 15, 120, 'Kệ F2-T3-01', 'Kobe Steel Welding VN', TRUE),
    ('b0000000-0000-0000-0000-000000000058', 'PART-058', 'Kính bảo vệ quang học đầu cắt Laser Fiber Precitec 37x7mm', 'Phụ kiện Laser', 'Cái', 1150000.00, 40, 10, 90, 'Kệ F2-T3-02', 'Precitec Laser Systems', TRUE),
    ('b0000000-0000-0000-0000-000000000059', 'PART-059', 'Béc cắt đơn Laser Fiber Amada phi 2.0mm', 'Phụ kiện Laser', 'Cái', 480000.00, 55, 15, 120, 'Kệ F2-T4-01', 'Amada Laser Technology', TRUE),
    ('b0000000-0000-0000-0000-000000000060', 'PART-060', 'Pin nuôi nguồn nhớ vị trí Servo Fanuc A98L-0031-0012 3V', 'Pin công nghiệp', 'Cái', 350000.00, 70, 20, 150, 'Kệ F2-T4-02', 'Fanuc Robotics Vietnam', TRUE)
ON CONFLICT (part_code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    unit = EXCLUDED.unit,
    unit_price = EXCLUDED.unit_price,
    current_stock = EXCLUDED.current_stock,
    minimum_stock = EXCLUDED.minimum_stock,
    maximum_stock = EXCLUDED.maximum_stock,
    shelf_location = EXCLUDED.shelf_location,
    supplier_info = EXCLUDED.supplier_info,
    is_active = EXCLUDED.is_active;

-- 3. TẠO 300 THIẾT BỊ CÔNG NGHIỆP THỰC TẾ CHO TẬP ĐOÀN ZENTECH (AST-001 ĐẾN AST-300)
DO $$
DECLARE
    v_categories TEXT[] := ARRAY['Gia công CNC', 'Dập vuốt kim loại', 'Hàn & Lắp ráp tự động', 'Đúc & Nhiệt luyện', 'Đóng gói & Phân loại', 'Hệ thống Tiện ích'];
    v_manufacturers TEXT[] := ARRAY['Makino', 'Mazak', 'Doosan', 'Komatsu', 'Bystronic', 'Amada', 'ABB', 'Yaskawa', 'Buhler', 'Ipsen', 'Atlas Copco', 'Siemens'];
    v_models TEXT[] := ARRAY['D500-5X', 'VTC-800', 'Puma-2600', 'H1F-500T', 'ByStar-12kW', 'HFE-160T', 'IRB-2600', 'MA1440', 'Evo-840T', 'TT-3000', 'GA-75VSD', 'S7-1500'];
    v_mach_types TEXT[] := ARRAY[
        'Máy Phay CNC 5 Trục Chính Xác', 'Máy Tiện CNC Đa Trục', 'Máy Ép Thủy Lực Khung H 500T', 'Máy Dập Trục Khuỷu 250T',
        'Máy Cắt Laser Fiber 12kW Tốc Độ Cao', 'Máy Chấn Tôn CNC 160T Đa Điểm', 'Robot Hàn Công Nghiệp 6 Trục', 'Lò Tôi Chân Không Áp Suất Cao',
        'Máy Đúc Áp Lực Nhôm Buồng Lạnh 840T', 'Máy Nén Khí Trục Vít Biến Tần 75kW', 'Hệ Thống Sấy Khí Hấp Thụ Công Nghiệp', 'Trạm Biến Áp & Phân Phối 1500kVA'
    ];
    v_statuses assets_status_enum[] := ARRAY[
        'OPERATIONAL'::assets_status_enum, 'OPERATIONAL'::assets_status_enum, 'OPERATIONAL'::assets_status_enum,
        'OPERATIONAL'::assets_status_enum, 'MAINTENANCE'::assets_status_enum, 'DOWN'::assets_status_enum
    ];
    v_criticalities assets_criticality_enum[] := ARRAY[
        'MEDIUM'::assets_criticality_enum, 'HIGH'::assets_criticality_enum, 'HIGH'::assets_criticality_enum,
        'CRITICAL'::assets_criticality_enum, 'LOW'::assets_criticality_enum
    ];
    v_loc_ids UUID[] := ARRAY[
        'a0000000-0000-0000-0000-000000000002'::UUID, -- Phân xưởng CNC
        'a0000000-0000-0000-0000-000000000003'::UUID, -- Phân xưởng Dập
        'a0000000-0000-0000-0000-000000000004'::UUID, -- Phân xưởng Đúc & Nhiệt luyện
        'a0000000-0000-0000-0000-000000000005'::UUID, -- Robot Hàn
        'a0000000-0000-0000-0000-000000000006'::UUID, -- Đóng gói
        'a0000000-0000-0000-0000-000000000007'::UUID  -- Tiện ích
    ];
    
    i INT;
    v_code VARCHAR(50);
    v_name VARCHAR(200);
    v_cat VARCHAR(100);
    v_man VARCHAR(100);
    v_mod VARCHAR(100);
    v_sn VARCHAR(100);
    v_stat assets_status_enum;
    v_crit assets_criticality_enum;
    v_loc UUID;
    v_op_hours NUMERIC(10,2);
    v_install DATE;
    v_warranty DATE;
    v_failures INT;
    v_rep_time NUMERIC(10,2);
    v_mttr NUMERIC(10,2);
    v_mtbf NUMERIC(10,2);
BEGIN
    FOR i IN 1..300 LOOP
        v_code := 'AST-' || LPAD(i::TEXT, 3, '0');
        v_name := v_mach_types[((i - 1) % 12) + 1] || ' (Line ' || LPAD((((i - 1) % 6) + 1)::TEXT, 2, '0') || ')';
        v_cat := v_categories[((i - 1) % 6) + 1];
        v_man := v_manufacturers[((i - 1) % 12) + 1];
        v_mod := v_models[((i - 1) % 12) + 1] || '-Z' || LPAD(((i % 5) + 1)::TEXT, 2, '0');
        v_sn := 'SN-' || UPPER(SUBSTRING(v_man FROM 1 FOR 3)) || '-202' || ((i % 4) + 1)::TEXT || '-' || LPAD(i::TEXT, 4, '0');
        v_stat := v_statuses[((i * 7 + 3) % 6) + 1];
        v_crit := v_criticalities[((i * 11 + 2) % 5) + 1];
        v_loc := v_loc_ids[((i - 1) % 6) + 1];

        -- Giờ chạy thực tế lũy kế từ 800h đến 18000h
        v_op_hours := 800 + ((i * 173) % 17200);
        v_install := DATE '2021-01-15' + (((i * 13) % 1200) || ' days')::INTERVAL;
        v_warranty := v_install + INTERVAL '2 years';

        -- Giả lập số lần hỏng hóc và giờ sửa chữa để tính MTTR/MTBF
        v_failures := ((i * 3 + 1) % 7);
        IF v_failures > 0 THEN
            v_rep_time := ROUND((v_failures * (1.5 + ((i % 4) * 0.8)))::numeric, 2);
            v_mttr := ROUND((v_rep_time / v_failures)::numeric, 2);
            v_mtbf := ROUND((v_op_hours / v_failures)::numeric, 2);
        ELSE
            v_rep_time := 0.00;
            v_mttr := 0.00;
            v_mtbf := v_op_hours;
        END IF;

        INSERT INTO assets (
            asset_code, name, category, manufacturer, model, serial_number,
            location_id, status, criticality, install_date, warranty_expiry_date,
            operating_hours, qr_code_url, specifications,
            total_failures, total_repair_time_hours, cached_mttr_hours, cached_mtbf_hours,
            metrics_last_updated_at, is_active
        )
        VALUES (
            v_code, v_name, v_cat, v_man, v_mod, v_sn,
            v_loc, v_stat, v_crit, v_install, v_warranty,
            v_op_hours, 'https://cmms.zentech.vn/qr/' || v_code,
            jsonb_build_object(
                'power_kw', 15 + ((i * 7) % 75),
                'voltage_v', 380,
                'frequency_hz', 50,
                'weight_ton', 3.5 + ((i % 12) * 1.2),
                'coolant_type', 'Semi-Synthetic Castrol Hysol',
                'cnc_controller', 'Fanuc 31i-Model B5'
            ),
            v_failures, v_rep_time, v_mttr, v_mtbf,
            NOW(), TRUE
        )
        ON CONFLICT (asset_code) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            manufacturer = EXCLUDED.manufacturer,
            model = EXCLUDED.model,
            serial_number = EXCLUDED.serial_number,
            location_id = EXCLUDED.location_id,
            criticality = EXCLUDED.criticality,
            operating_hours = EXCLUDED.operating_hours,
            specifications = EXCLUDED.specifications,
            cached_mttr_hours = EXCLUDED.cached_mttr_hours,
            cached_mtbf_hours = EXCLUDED.cached_mtbf_hours,
            metrics_last_updated_at = NOW();
    END LOOP;
END $$;

-- 4. TẠO LIÊN KẾT ĐỊNH MỨC PHỤ TÙNG CHO THIẾT BỊ (ASSET_PART_BOMS)
-- Gắn định mức linh kiện thực tế cho các máy mẫu đầu tiên
INSERT INTO asset_part_boms (asset_id, part_id, standard_quantity, replacement_interval_hours, replacement_interval_days, is_critical, installation_position, notes)
SELECT 
    a.id AS asset_id,
    p.id AS part_id,
    CASE 
        WHEN p.category = 'Vòng bi' THEN 2.00
        WHEN p.category = 'Phớt dầu' THEN 1.00
        WHEN p.category = 'Lõi lọc' THEN 1.00
        WHEN p.category = 'Dầu mỡ' THEN 50.00
        ELSE 1.00
    END AS standard_quantity,
    CASE 
        WHEN p.category = 'Lõi lọc' THEN 2000.00
        WHEN p.category = 'Dầu mỡ' THEN 4000.00
        WHEN p.category = 'Vòng bi' THEN 8000.00
        ELSE 6000.00
    END AS replacement_interval_hours,
    180 AS replacement_interval_days,
    (a.criticality IN ('HIGH', 'CRITICAL')) AS is_critical,
    'Cụm truyền động chính & Trục công tác' AS installation_position,
    'Phụ tùng định kỳ bắt buộc theo khuyến nghị của nhà sản xuất Zentech' AS notes
FROM (SELECT id, criticality FROM assets WHERE asset_code IN ('AST-001', 'AST-002', 'AST-003', 'AST-004', 'AST-005', 'AST-010', 'AST-020', 'AST-050', 'AST-100', 'AST-150', 'AST-200', 'AST-300')) a
CROSS JOIN (SELECT id, category FROM parts WHERE part_code IN ('PART-001', 'PART-002', 'PART-011', 'PART-019', 'PART-027', 'PART-035', 'PART-045', 'PART-048')) p
ON CONFLICT (asset_id, part_id) DO UPDATE SET
    standard_quantity = EXCLUDED.standard_quantity,
    replacement_interval_hours = EXCLUDED.replacement_interval_hours,
    is_critical = EXCLUDED.is_critical;

-- 5. TẠO MẪU NHẬT KÝ LỊCH SỬ BẢO TRÌ BAN ĐẦU (ASSET_MAINTENANCE_HISTORY AUDIT LOGS)
-- Ghi nhận các đợt bảo trì, sửa chữa, thay thế linh kiện mà KHÔNG thay đổi status của Asset
INSERT INTO asset_maintenance_history (
    id, asset_id, event_type, title, description,
    breakdown_time, repair_start_time, repair_end_time,
    downtime_hours, actual_repair_time_hours, operating_hours_at_failure,
    time_between_failures_hours, is_failure_counted, failure_cause, action_taken,
    status_before, status_after, parts_replaced, cost_parts, cost_labor, total_cost,
    created_at
)
SELECT
    uuid_generate_v4(),
    a.id,
    'PREVENTIVE_MAINTENANCE'::maintenance_event_type_enum,
    'Bảo dưỡng định kỳ 2000 giờ máy - Phân xưởng Zentech',
    'Thực hiện kiểm tra bôi trơn, siết lực bu-lông gá đặt và kiểm tra rơ lắc trục chính',
    NULL,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days' + INTERVAL '3 hours',
    0.00,
    3.00,
    a.operating_hours - 200,
    a.operating_hours - 200,
    FALSE,
    'Bảo trì phòng ngừa theo kế hoạch',
    'Thay mỡ bôi trơn trục chính, vệ sinh lọc gió tủ điện điều khiển',
    a.status,
    a.status, -- KHÔNG THAY ĐỔI STATUS CỦA ASSET
    jsonb_build_array(
        jsonb_build_object('partCode', 'PART-047', 'partName', 'Mỡ bôi trơn trục chính Kluber Isoflex', 'quantity', 1, 'unitPrice', 3400000, 'totalPrice', 3400000)
    ),
    3400000.00,
    450000.00,
    3850000.00,
    NOW() - INTERVAL '15 days'
FROM assets a
WHERE a.asset_code IN ('AST-001', 'AST-002', 'AST-005', 'AST-010')
LIMIT 4;

COMMIT;

