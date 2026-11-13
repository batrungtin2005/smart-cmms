# 🗄️ THƯ MỤC DATABASE
**Phụ trách chính:** SV06 (QA/DevOps) phối hợp cùng SV01, SV02, SV03, SV05

---

## 📁 File Schema

| File | Mô tả |
|------|-------|
| **`smart_cmms_db.sql`** | Schema khởi tạo chính: 15 bảng, 10 enum, index, trigger, constraint và seed 4 vai trò. Không phải migration nâng cấp database đã có bảng. |
| **`verify-schema.cjs`** | Kiểm tra SQL với entity đã build và các quy tắc dữ liệu trong schema riêng, luôn rollback. |

### Chạy schema:
```bash
psql -d smart_cmms_db -f smart_cmms_db.sql
```

---

## 📊 Tổng Quan 14 Bảng (theo thứ tự tạo)

| # | Bảng | Nhóm | Tác dụng |
|---|------|------|----------|
| 1 | `roles` | Auth | 4 vai trò: ADMIN, MAINTENANCE_MANAGER, TECHNICIAN, WAREHOUSE_KEEPER |
| 2 | `users` | Auth | Tài khoản đăng nhập, JWT, bcrypt |
| 3 | `locations` | Asset | Cây vị trí nhà xưởng đệ quy (Nhà máy → Phân xưởng → Khu vực) |
| 4 | `assets` | Asset | 300+ thiết bị, cache MTTR/MTBF, QR code cho Mobile |
| 5 | `parts` | Parts | 50+ phụ tùng, kiểm soát tồn kho & cảnh báo hết hàng |
| 6 | `maintenance_schedules` | Maintenance | Lịch bảo dưỡng 3 kiểu (Time/Usage/Condition-based), tự động sinh WO |
| 7 | `work_orders` | Work Order | Phiếu công việc — State Machine 7 trạng thái |
| 8 | `work_order_parts` | Work Order | Phụ tùng sử dụng trong từng phiếu (subtotal GENERATED) |
| 9 | `asset_part_boms` | Parts | Định mức BOM — máy nào cần phụ tùng nào, chu kỳ thay |
| 10 | `part_transactions` | Parts | Sổ cái kho: nhập/xuất/điều chỉnh, audit trail đầy đủ |
| 11 | `asset_maintenance_history` | Maintenance | Nhật ký bảo trì — bảng cốt lõi tính MTTR & MTBF |
| 12 | `sync_operations` | System | Đồng bộ offline Mobile, Idempotency Key chống trùng |
| 13 | `notifications` | System | 6 loại cảnh báo hệ thống |
| 14 | `kpi_snapshots` | System | Cache KPI tháng: MTTR, MTBF, Availability % |

---

## 📄 Tài Liệu Bổ Sung

| File | Mô tả |
|------|-------|
| `Smart_CMMS_Database_Schema.docx` | Tài liệu Word mô tả chi tiết tác dụng từng bảng, từng cột, ràng buộc và enum |

---

## 🌱 Seeds (Dữ liệu mẫu)

Thư mục `seeds/` chứa các script sinh dữ liệu lớn phục vụ kiểm thử và nghiệm thu:

| File | Nội dung |
|------|----------|
| `seed-users.ts` | 3 tài khoản mẫu (Admin, Manager, Technician) |
| `seed-assets.ts` | **300 thiết bị** (AST-001 → AST-300) phân bổ khắp các phân xưởng |
| `seed-parts.ts` | 50+ loại phụ tùng công nghiệp và tồn kho thực tế |
| `seed-work-orders.ts` | **1.000 phiếu Work Order** trong vòng 6 tháng để tính MTTR/MTBF |

---

## ⚙️ Tính Năng Schema Nổi Bật

- **Auto `updated_at` trigger** — 9 bảng tự cập nhật timestamp khi UPDATE; bảng roles không có updated_at
- **Constraint chống tồn kho âm** — `parts.current_stock >= 0` ở tầng DB
- **Cache KPI** — `assets.cached_mttr_hours / cached_mtbf_hours` tránh query nặng
- **Idempotency** — `sync_operations.client_operation_uuid` chống duplicate từ offline
- **GENERATED column** — `work_order_parts.subtotal` tự tính `qty × price`
- **Query mẫu MTTR/MTBF** — có sẵn ở cuối file SQL (comment block)

## Đồng bộ SQL và entity ngày 07/11/2026

### User và Role

- `roles.id SERIAL`, `users.role_id INTEGER`; giữ `users.id UUID`.
- `username VARCHAR(50) NOT NULL UNIQUE` thay cho `employee_code`.
- User dùng `full_name VARCHAR(100)`, `email VARCHAR(100)`, `phone_number`, `is_active BOOLEAN DEFAULT TRUE` để khớp backend.
- Giữ `avatar_url VARCHAR(500) NULL` và bổ sung vào User entity; bỏ `last_login_at`.
- Bỏ `users.status` và `user_status_enum`; trạng thái tài khoản hiện chỉ gồm bật/tắt, không còn trạng thái SUSPENDED riêng.
- Role bỏ `permissions`, `updated_at`; loại roles khỏi danh sách trigger. Các mốc thời gian Auth dùng TIMESTAMPTZ.
- Tên vai trò quản lý thống nhất `MAINTENANCE_MANAGER` trong seed SQL và AuthController.

### Work Order

- Đổi `assigned_to_id` → `assigned_technician_id`, `actual_start_time` → `start_time`, `actual_end_time` → `completed_time`, `actual_duration_hours` → `actual_repair_time_hours` (mặc định 0, NOT NULL).
- Thêm `breakdown_time`, `root_cause`, `solution`. Backend dùng thuộc tính `rootCause`, ánh xạ cột `root_cause`.
- `downtime_hours` là NUMERIC(10,2) GENERATED ALWAYS STORED: `(completed_time - breakdown_time)` tính theo giờ. Thiếu một mốc trả 0. Constraint từ chối hoàn thành trước thời điểm hỏng.
- Giữ các trường người tạo, lịch nguồn, kế hoạch, chi phí, nghiệm thu, UUID client trong SQL và bổ sung đầy đủ vào WorkOrder entity.
- Thêm entity MaintenanceSchedule và WorkOrderPart cho các bảng liên quan. Các entity được đăng ký tại AppModule.
- Đây là đồng bộ tầng dữ liệu; chưa thêm API chuyển trạng thái, chọn nguyên nhân, nhập giải pháp hoặc cron.

### Enum và quan hệ

- Entity đang có enum đều khai báo `enumName` khớp tên PostgreSQL; bổ sung `schedule_type_enum` cho entity lịch. Enum notification/sync vẫn ở SQL vì chưa triển khai entity/module tương ứng.
- `AssetHistory.partsReplaced` ánh xạ `parts_replaced`.
- PartTransaction có quan hệ tới WorkOrder, `ON DELETE SET NULL`, khớp SQL.

### Kiểm tra không giữ lại dữ liệu test

Chạy từ thư mục gốc dự án:

```powershell
npm run build:backend
node backend/src/database/verify-schema.cjs
```

Script đọc cấu hình DB giống AppModule, không in mật khẩu, không khởi động ứng dụng hoặc chạy TypeORM synchronize. Script tạo schema có tên ngẫu nhiên trong một transaction, nạp SQL vào schema đó, so sánh tên cột/kiểu/nullable/enum/độ dài/precision với toàn bộ entity đã build. Sau đó kiểm tra tạo User có role MAINTENANCE_MANAGER, cập nhật Role không cần updated_at, downtime theo múi giờ, từ chối thời gian âm, subtotal và khóa ngoại giao dịch kho. Khối finally rollback toàn bộ schema và dữ liệu test; không tạo bảng ứng dụng trong public.

File SQL dùng để khởi tạo mới. `CREATE TABLE IF NOT EXISTS` không đổi cột của bảng cũ; các ADD CONSTRAINT cuối file chưa có cơ chế bỏ qua khi chạy lại. Database đã có schema cũ cần migration riêng, không chỉ chạy lại file này.

Seed thực sự trong SQL hiện chỉ gồm 4 vai trò. Các mục seed 300 thiết bị/1.000 phiếu ở trên là kế hoạch, chưa được file SQL này thực hiện.

## Chốt tên vai trò ngày 11/11/2026

- Seed trong `smart_cmms_db.sql` dùng `MAINTENANCE_MANAGER`, khớp AuthService và quyền trong AuthController.
- `verify-schema.cjs` tra vai trò theo tên mới khi tạo user kiểm thử và kiểm tra cập nhật Role.
- Không đổi ID vai trò, không tự chuyển tài khoản đang dùng vai trò cũ trong database. Không chạy lại toàn bộ schema để đổi tên role trên database đã có dữ liệu; cần xử lý dữ liệu riêng sau khi kiểm tra các role/tài khoản hiện có.

## Lịch sử Work Order (13/11/2026)

SQL khởi tạo bổ sung bảng thứ 15: work_order_status_history, khớp entity cùng tên. Database cũ dùng migration riêng `migrations/20261113_work_order_status_history.sql`; xem `migrations/README.md` để chạy bằng pgAdmin trước khi khởi động backend mới. Không thay đổi dữ liệu cũ và không backfill lịch sử chưa biết. Migration chưa tự động chạy trên database ứng dụng.
