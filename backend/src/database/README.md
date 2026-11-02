# 🗄️ THƯ MỤC DATABASE
**Phụ trách chính:** SV06 (QA/DevOps) phối hợp cùng SV01, SV02, SV03, SV05

---

## 📁 File Schema

| File | Mô tả |
|------|-------|
| **`smart_cmms_db.sql`** | ✅ **File schema chính duy nhất** — gộp toàn bộ 14 bảng, 12 enum, index, trigger, constraint và seed data. Chạy 1 lần là xong. |

### Chạy schema:
```bash
psql -d smart_cmms_db -f smart_cmms_db.sql
```

---

## 📊 Tổng Quan 14 Bảng (theo thứ tự tạo)

| # | Bảng | Nhóm | Tác dụng |
|---|------|------|----------|
| 1 | `roles` | Auth | 4 vai trò: ADMIN, MANAGER, TECHNICIAN, WAREHOUSE_KEEPER |
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

- **Auto `updated_at` trigger** — 10 bảng tự cập nhật timestamp khi UPDATE
- **Constraint chống tồn kho âm** — `parts.current_stock >= 0` ở tầng DB
- **Cache KPI** — `assets.cached_mttr_hours / cached_mtbf_hours` tránh query nặng
- **Idempotency** — `sync_operations.client_operation_uuid` chống duplicate từ offline
- **GENERATED column** — `work_order_parts.subtotal` tự tính `qty × price`
- **Query mẫu MTTR/MTBF** — có sẵn ở cuối file SQL (comment block)
