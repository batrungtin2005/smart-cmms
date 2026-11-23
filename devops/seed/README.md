# Seed dữ liệu tải lớn (SV06)

Sinh dữ liệu phục vụ nghiệm thu **TC-01 (300 thiết bị)**, **TC-02 (1.000 Work Orders)** và **TC-06 (MTTR & MTBF)**.

| File | Nội dung |
|---|---|
| `seed_1000_work_orders.sql` | 10 tài khoản (2 quản lý `quanly01-02`, 8 kỹ thuật viên `ktv01-08`, mật khẩu `Test@123`), 1.000 Work Orders trong 180 ngày qua, phụ tùng đã dùng, lịch sử bảo trì và chỉ số MTTR/MTBF của từng thiết bị |

300 thiết bị và 60 phụ tùng dùng seed có sẵn của SV02 (`npm run seed:zentech`).

## Cách chạy

```bash
docker compose up -d
npm ci
npm run dev:backend               # khởi động 1 lần để TypeORM tạo bảng và tài khoản admin, rồi có thể tắt
cd backend && npm run seed:zentech && cd ..
docker exec -i smart_cmms_postgres psql -v ON_ERROR_STOP=1 -U postgres -d smart_cmms_db < devops/seed/seed_1000_work_orders.sql
```

Chạy xong trong khoảng 0,3 giây. Script **chạy lại được**: mỗi lần chạy xóa các phiếu `WO-SEED-*` cũ rồi sinh lại, và dùng `setseed()` nên lần nào cũng ra cùng một bộ dữ liệu.

## Dữ liệu sinh ra

Kết quả trên database mới (22/11/2026):

| Nhóm | Phân bố |
|---|---|
| Thời gian | 26/05 → 22/11/2026, ~160–190 phiếu mỗi tháng |
| Loại | CORRECTIVE 465 · PREVENTIVE 300 · INSPECTION 139 · EMERGENCY 96 |
| Trạng thái | CLOSED 806 · CANCELLED 65 · COMPLETED 61 · OPEN 27 · IN_PROGRESS 16 · ASSIGNED 12 · ON_HOLD 12 · REWORK_REQUIRED 1 |
| Kỹ thuật viên | 104–135 phiếu mỗi người |
| Lịch sử bảo trì | 867 bản ghi (485 lần hỏng được tính MTTR/MTBF) |
| Chỉ số | MTTR toàn hệ thống 4,30 giờ · 240/300 thiết bị có ít nhất 1 lần hỏng |

Quy tắc sinh dữ liệu:
- Phiếu cũ hơn 14 ngày hầu hết đã `CLOSED`; phiếu 14 ngày gần đây có đủ trạng thái đang xử lý để demo bảng Kanban.
- Phiếu sửa chữa/khẩn cấp có `breakdown_time` → `start_time` → `completed_time`; thời gian sửa khẩn cấp 0,5–6 giờ, sửa chữa thường 1–8 giờ.
- Phiếu `EMERGENCY` luôn ưu tiên `CRITICAL`; phiếu sửa chữa trên máy `HIGH`/`CRITICAL` có ưu tiên cao hơn.
- ~60% phiếu đã làm có dùng 1–3 loại phụ tùng; `actual_cost_parts` khớp tổng `work_order_parts.subtotal`. Tồn kho phụ tùng **không** bị trừ.
- ~15% phiếu có `client_uuid` (giả lập tạo từ app mobile offline).
- Chỉ số `total_failures`, `cached_mttr_hours`, `cached_mtbf_hours` của **toàn bộ** thiết bị được tính lại từ `asset_maintenance_history` theo đúng công thức của `history.service` (MTTR = tổng giờ sửa / số lần hỏng, MTBF = giờ máy chạy / số lần hỏng), thay cho số liệu mẫu của seed SV02.

## Kiểm tra sau khi seed

```sql
SELECT count(*) FROM work_orders WHERE work_order_code LIKE 'WO-SEED-%';  -- 1000
SELECT count(*) FROM assets;                                              -- 300
```

Trên API (đăng nhập `admin`), `GET /api/v1/work-orders?status=CLOSED&limit=50` trả `meta.total = 806` trong khoảng 20 ms; chỉ số `GET /api/v1/history/asset/:id/metrics` khớp với dữ liệu trong database.
