# TEST CASES CHI TIẾT - KIỂM THỬ API TỰ ĐỘNG (POSTMAN / NEWMAN)
**Phụ trách:** SV06 (QA & DevOps) · **Tuần 3** · Bổ sung cho [test_matrix.md](test_matrix.md)

Tài liệu được sinh từ collection [`devops/postman/smart-cmms.postman_collection.json`](../postman/smart-cmms.postman_collection.json) và kết quả chạy Newman. Cách chạy lại: xem [`devops/postman/README.md`](../postman/README.md).

## 1. Phạm vi & môi trường

| Mục | Giá trị |
|---|---|
| Ngày chạy | 09/11/2026 |
| Nhánh | `develop` (commit `530b7b6`) |
| Môi trường | Docker Compose: PostgreSQL 16, Redis 7 · Backend NestJS chạy local · Node 26 |
| Dữ liệu test | `devops/postman/seed-test-users.sql` (3 vai trò, 3 tài khoản) + dữ liệu do chính collection tạo và dọn dẹp |
| Trong phạm vi | Auth & Users (SV01) · Locations, Assets & QR, Parts & Inventory, History & KPI (SV02) |
| Ngoài phạm vi | Work Orders, Schedules, Reports, Sync (SV03) — chưa có API trên `develop` |

## 2. Tổng kết

| Chỉ số | Kết quả |
|---|---|
| Số request | 81 |
| Số kiểm tra (assertion) | 285 — **đạt 279**, trượt 6 |
| Thời gian phản hồi trung bình | 7 ms |
| Kết luận | Toàn bộ chức năng nghiệp vụ SV01/SV02 chạy đúng. 6 case trượt đều thuộc nhóm bảo mật (BUG-01). |

Mỗi request còn được kiểm tra chung: phản hồi JSON đúng định dạng `{ success, statusCode, timestamp }` và thời gian phản hồi < 2000 ms.

## 3. Lỗi phát hiện (Defects)

| Mã | Mức độ | Mô tả | Ảnh hưởng | Phụ trách |
|---|---|---|---|---|
| BUG-01 | Cao | Controller `assets`, `locations`, `parts`, `part-transactions`, `history` không gắn `JwtAuthGuard`: gọi được (kể cả xóa) mà không cần đăng nhập. | Vi phạm yêu cầu bảo mật RBAC; folder `05. Security` trượt 6/6. | SV02 |
| BUG-02 | Cao | Backend trên `develop` không khởi động được: entity `WorkOrder` chưa được đăng ký với TypeORM (`Entity metadata for User#assignedWorkOrders was not found`). | Không ai chạy được backend từ `develop`; chặn SV04/SV05 gọi API thật. | SV03 (tạo `WorkOrderModule`) |
| BUG-03 | Cao | `npm run seed` lỗi: script SQL dùng kiểu `asset_status_enum` nhưng TypeORM tạo `assets_status_enum`. Không chèn được thiết bị nào. | Chặn tiêu chí nghiệm thu TC-01 (300 thiết bị). | SV02 |
| BUG-04 | Trung bình | Chưa có seed cho bảng `roles`/`users`; `POST /auth/users` lại yêu cầu ADMIN nên hệ thống mới không thể đăng nhập. | Tạm dùng `seed-test-users.sql` của SV06. | SV01 |
| OBS-01 | Thấp | `ADJUSTMENT` đặt lại tồn kho **bằng** `quantity` (không cộng/trừ) và yêu cầu `quantity ≥ 1`, nên không thể kiểm kê về 0. | Cần thống nhất nghiệp vụ kiểm kê. | SV02 |
| OBS-02 | Thấp | Các API danh sách/tổng quan bọc dữ liệu 2 lớp: `data.success`, `data.data`, `data.meta`. | Web/Mobile phải đọc `response.data.data`. | SV02 |

Lỗi vòng import `asset.entity` ↔ `asset-history.entity` (issue #13) **đã được sửa** trên `develop` — xác nhận ngày chạy.

## 4. Test cases

### 00. Auth & Users (SV01)

Đăng nhập JWT, thông tin cá nhân, phân quyền RBAC. Chạy đầu tiên: lưu adminToken / techToken.

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| AUTH-01 | Đăng nhập ADMIN thành công | `{"username":"{{adminUsername}}","password":"{{testPassword}}"}` | Không token → `POST /auth/login` | HTTP 200; Trả về accessToken kiểu Bearer; Không lộ passwordHash | HTTP 200 · 76 ms | ✅ Đạt |
| AUTH-02 | Đăng nhập sai mật khẩu → 401 | `{"username":"{{adminUsername}}","password":"sai_mat_khau"}` | Không token → `POST /auth/login` | HTTP 401; success = false | HTTP 401 · 48 ms | ✅ Đạt |
| AUTH-03 | Đăng nhập thiếu mật khẩu → 400 | `{"username":"{{adminUsername}}"}` | Không token → `POST /auth/login` | HTTP 400 | HTTP 400 · 2 ms | ✅ Đạt |
| AUTH-04 | Đăng nhập KTV (TECHNICIAN) | `{"username":"{{techUsername}}","password":"{{testPassword}}"}` | Không token → `POST /auth/login` | HTTP 200 | HTTP 200 · 52 ms | ✅ Đạt |
| AUTH-05 | Xem thông tin cá nhân /me | — | Token ADMIN → `GET /auth/me` | HTTP 200; Đúng tài khoản đang đăng nhập | HTTP 200 · 5 ms | ✅ Đạt |
| AUTH-06 | Gọi /me không có token → 401 | — | Không token → `GET /auth/me` | HTTP 401 | HTTP 401 · 1 ms | ✅ Đạt |
| AUTH-07 | Gọi /me với token sai → 401 | — | Token giả → `GET /auth/me` | HTTP 401 | HTTP 401 · 1 ms | ✅ Đạt |
| AUTH-08 | Danh sách vai trò | — | Token ADMIN → `GET /auth/roles` | HTTP 200; Có đủ 3 vai trò | HTTP 200 · 5 ms | ✅ Đạt |
| AUTH-09 | Danh sách người dùng (ADMIN) | — | Token ADMIN → `GET /auth/users` | HTTP 200; Trả về mảng | HTTP 200 · 11 ms | ✅ Đạt |
| AUTH-10 | Tạo tài khoản KTV mới (ADMIN) | `{"username":"qa_new_{{runId}}","email":"qa_new_{{runId}}@smartcmms.test","password":"{{…` | Token ADMIN → `POST /auth/users` | HTTP 201; Không lộ passwordHash | HTTP 201 · 55 ms | ✅ Đạt |
| AUTH-11 | Tạo tài khoản trùng username → 409 | `{"username":"qa_new_{{runId}}","email":"khac_{{runId}}@smartcmms.test","password":"{{te…` | Token ADMIN → `POST /auth/users` | HTTP 409 | HTTP 409 · 8 ms | ✅ Đạt |
| AUTH-12 | KTV tạo tài khoản → 403 | `{"username":"hacker_{{runId}}","email":"hacker_{{runId}}@smartcmms.test","password":"{{…` | Token TECHNICIAN → `POST /auth/users` | HTTP 403 | HTTP 403 · 3 ms | ✅ Đạt |
| AUTH-13 | KTV xem danh sách người dùng → 403 | — | Token TECHNICIAN → `GET /auth/users` | HTTP 403 | HTTP 403 · 4 ms | ✅ Đạt |

### 01. Locations (SV02)

Cây vị trí nhà xưởng / khu vực / dây chuyền.

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| LOC-01 | Tạo vị trí cấp cao nhất | `{"code":"LOC-QA-{{runId}}","name":"Nhà xưởng QA {{runId}}","description":"Tạo bởi Postm…` | Token ADMIN → `POST /locations` | HTTP 201; Có id UUID | HTTP 201 · 6 ms | ✅ Đạt |
| LOC-02 | Tạo vị trí con (parentId) | `{"code":"LOC-QA-{{runId}}-L1","name":"Dây chuyền QA {{runId}}","parentId":"{{locationId…` | Token ADMIN → `POST /locations` | HTTP 201; parentId đúng vị trí cha | HTTP 201 · 5 ms | ✅ Đạt |
| LOC-03 | Tạo vị trí trùng mã → 409 | `{"code":"LOC-QA-{{runId}}","name":"Trùng mã"}` | Token ADMIN → `POST /locations` | HTTP 409 | HTTP 409 · 2 ms | ✅ Đạt |
| LOC-04 | Tạo vị trí với parentId sai định dạng → 400 | `{"code":"LOC-QA-{{runId}}-BAD","name":"Sai parent","parentId":"khong-phai-uuid"}` | Token ADMIN → `POST /locations` | HTTP 400 | HTTP 400 · 1 ms | ✅ Đạt |
| LOC-05 | Cây vị trí | — | Token ADMIN → `GET /locations/tree` | HTTP 200 | HTTP 200 · 6 ms | ✅ Đạt |
| LOC-06 | Danh sách vị trí | — | Token ADMIN → `GET /locations` | HTTP 200; Có vị trí vừa tạo | HTTP 200 · 5 ms | ✅ Đạt |
| LOC-07 | Chi tiết vị trí | — | Token ADMIN → `GET /locations/{{locationId}}` | HTTP 200 | HTTP 200 · 5 ms | ✅ Đạt |
| LOC-08 | Cập nhật vị trí | `{"description":"Đã cập nhật bởi Postman"}` | Token ADMIN → `PATCH /locations/{{locationId}}` | HTTP 200; Mô tả đã đổi | HTTP 200 · 12 ms | ✅ Đạt |
| LOC-09 | Vị trí không tồn tại → 404 | — | Token ADMIN → `GET /locations/00000000-0000-4000-8000-000000000000` | HTTP 404 | HTTP 404 · 3 ms | ✅ Đạt |

### 02. Assets & QR (SV02)

CRUD thiết bị, tìm kiếm, phân trang, trạng thái, mã QR.

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| AST-01 | Tạo thiết bị | `{"assetCode":"AST-QA-{{runId}}","name":"Máy nén khí QA {{runId}}","category":"Khí nén",…` | Token ADMIN → `POST /assets` | HTTP 201; Mặc định OPERATIONAL; Có qrCodeUrl | HTTP 201 · 9 ms | ✅ Đạt |
| AST-02 | Tạo thiết bị thiếu tên & danh mục → 400 | `{"assetCode":"AST-QA-{{runId}}-X"}` | Token ADMIN → `POST /assets` | HTTP 400; Có thông báo lỗi tiếng Việt | HTTP 400 · 1 ms | ✅ Đạt |
| AST-03 | Tạo thiết bị trùng mã → 409 | `{"assetCode":"AST-QA-{{runId}}","name":"Trùng","category":"Khí nén"}` | Token ADMIN → `POST /assets` | HTTP 409 | HTTP 409 · 2 ms | ✅ Đạt |
| AST-04 | Tạo thiết bị với trạng thái sai → 400 | `{"assetCode":"AST-QA-{{runId}}-Y","name":"Sai trạng thái","category":"Khí nén","status"…` | Token ADMIN → `POST /assets` | HTTP 400 | HTTP 400 · 0 ms | ✅ Đạt |
| AST-05 | Danh sách có phân trang | — | Token ADMIN → `GET /assets?page=1&limit=5` | HTTP 200; Đúng meta phân trang; Không vượt quá limit | HTTP 200 · 10 ms | ✅ Đạt |
| AST-06 | Tìm kiếm theo mã AST | — | Token ADMIN → `GET /assets?search={{assetCode}}` | HTTP 200; Tìm thấy thiết bị vừa tạo | HTTP 200 · 7 ms | ✅ Đạt |
| AST-07 | Lọc theo trạng thái OPERATIONAL | — | Token ADMIN → `GET /assets?status=OPERATIONAL&limit=50` | HTTP 200; Mọi kết quả đều OPERATIONAL | HTTP 200 · 6 ms | ✅ Đạt |
| AST-08 | Phân trang với limit=0 → 400 | — | Token ADMIN → `GET /assets?limit=0` | HTTP 400 | HTTP 400 · 0 ms | ✅ Đạt |
| AST-09 | Tổng quan thiết bị | — | Token ADMIN → `GET /assets/overview` | HTTP 200; Có statusBreakdown | HTTP 200 · 2 ms | ✅ Đạt |
| AST-10 | Chi tiết thiết bị theo ID | — | Token ADMIN → `GET /assets/{{assetId}}` | HTTP 200 | HTTP 200 · 7 ms | ✅ Đạt |
| AST-11 | Thiết bị không tồn tại → 404 | — | Token ADMIN → `GET /assets/00000000-0000-4000-8000-000000000000` | HTTP 404 | HTTP 404 · 4 ms | ✅ Đạt |
| AST-12 | ID sai định dạng UUID → 400 | — | Token ADMIN → `GET /assets/abc` | HTTP 400 | HTTP 400 · 0 ms | ✅ Đạt |
| AST-13 | Tra cứu theo mã AST | — | Token ADMIN → `GET /assets/code/{{assetCode}}` | HTTP 200; Đúng thiết bị | HTTP 200 · 5 ms | ✅ Đạt |
| AST-14 | Lấy mã QR (data URL) | — | Token ADMIN → `GET /assets/{{assetId}}/qr-code` | HTTP 200; qrDataUrl là ảnh PNG base64 | HTTP 200 · 10 ms | ✅ Đạt |
| AST-15 | Tải ảnh QR (PNG) | — | Token ADMIN → `GET /assets/{{assetId}}/qr-image` | HTTP 200; Content-Type image/png | HTTP 200 · 11 ms | ✅ Đạt |
| AST-16 | Lấy mã QR theo mã AST | — | Token ADMIN → `GET /assets/code/{{assetCode}}/qr-code` | HTTP 200 | HTTP 200 · 8 ms | ✅ Đạt |
| AST-17 | Quét QR (mobile) | — | Token ADMIN → `GET /assets/scan-qr?code={{assetCode}}` | HTTP 200; Trả đúng thiết bị | HTTP 200 · 7 ms | ✅ Đạt |
| AST-18 | Kiểm tra nhanh theo mã | — | Token ADMIN → `GET /assets/inspect/{{assetCode}}` | HTTP 200 | HTTP 200 · 5 ms | ✅ Đạt |
| AST-19 | Cập nhật thông tin thiết bị | `{"manufacturer":"Atlas Copco Việt Nam","operatingHours":1500}` | Token ADMIN → `PATCH /assets/{{assetId}}` | HTTP 200; Nhà sản xuất đã đổi | HTTP 200 · 5 ms | ✅ Đạt |
| AST-20 | Chuyển trạng thái sang MAINTENANCE | `{"status":"MAINTENANCE","reason":"Bảo dưỡng định kỳ 1500 giờ (Postman)"}` | Token ADMIN → `PATCH /assets/{{assetId}}/status` | HTTP 200; Trạng thái MAINTENANCE | HTTP 200 · 5 ms | ✅ Đạt |
| AST-21 | Chuyển trạng thái không hợp lệ → 400 | `{"status":"BROKEN"}` | Token ADMIN → `PATCH /assets/{{assetId}}/status` | HTTP 400 | HTTP 400 · 0 ms | ✅ Đạt |
| AST-22 | Thiết bị thuộc vị trí | — | Token ADMIN → `GET /locations/{{childLocationId}}/assets` | HTTP 200; Có thiết bị vừa tạo | HTTP 200 · 3 ms | ✅ Đạt |
| AST-23 | Lịch sử của thiết bị | — | Token ADMIN → `GET /assets/{{assetId}}/history` | HTTP 200 | HTTP 200 · 4 ms | ✅ Đạt |

### 03. Parts & Inventory (SV02)

Phụ tùng, cảnh báo tồn kho, nhập/xuất kho, BOM. Kiểm tra quy tắc KHÔNG cho tồn kho âm.

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| PRT-01 | Tạo phụ tùng (tồn 3 < tối thiểu 5) | `{"partCode":"PRT-QA-{{runId}}","name":"Vòng bi SKF 6205 QA","category":"Vòng bi","unit"…` | Token ADMIN → `POST /parts` | HTTP 201; Tồn kho ban đầu = 3 | HTTP 201 · 4 ms | ✅ Đạt |
| PRT-02 | Tạo phụ tùng trùng mã → 409 | `{"partCode":"PRT-QA-{{runId}}","name":"Trùng","category":"Vòng bi"}` | Token ADMIN → `POST /parts` | HTTP 409 | HTTP 409 · 2 ms | ✅ Đạt |
| PRT-03 | Tạo phụ tùng tồn kho âm → 400 | `{"partCode":"PRT-QA-{{runId}}-NEG","name":"Âm","category":"Vòng bi","currentStock":-1}` | Token ADMIN → `POST /parts` | HTTP 400 | HTTP 400 · 1 ms | ✅ Đạt |
| PRT-04 | Danh sách phụ tùng | — | Token ADMIN → `GET /parts?search=PRT-QA-{{runId}}` | HTTP 200; Có phụ tùng vừa tạo | HTTP 200 · 1 ms | ✅ Đạt |
| PRT-05 | Chi tiết phụ tùng | — | Token ADMIN → `GET /parts/{{partId}}` | HTTP 200 | HTTP 200 · 3 ms | ✅ Đạt |
| PRT-06 | Cập nhật phụ tùng | `{"shelfLocation":"Kệ B2"}` | Token ADMIN → `PATCH /parts/{{partId}}` | HTTP 200; Kệ đã đổi | HTTP 200 · 3 ms | ✅ Đạt |
| PRT-07 | Cảnh báo sắp hết hàng | — | Token ADMIN → `GET /parts/alerts/low-stock` | HTTP 200; Phụ tùng tồn 3 < 5 nằm trong cảnh báo | HTTP 200 · 2 ms | ✅ Đạt |
| PRT-08 | Tổng quan kho | — | Token ADMIN → `GET /parts/overview` | HTTP 200; Có lowStockCount | HTTP 200 · 4 ms | ✅ Đạt |
| PRT-09 | Nhập kho 10 → tồn 13 | `{"partId":"{{partId}}","quantity":10,"unitPrice":120000,"referenceCode":"PNK-QA-{{runId…` | Token ADMIN → `POST /part-transactions/import` | HTTP 201; IMPORT 3 → 13 | HTTP 201 · 6 ms | ✅ Đạt |
| PRT-10 | Xuất kho 4 cho thiết bị → tồn 9 | `{"partId":"{{partId}}","quantity":4,"assetId":"{{assetId}}","referenceCode":"PXK-QA-{{r…` | Token ADMIN → `POST /part-transactions/export` | HTTP 200; EXPORT 13 → 9 | HTTP 200 · 4 ms | ✅ Đạt |
| PRT-11 | Xuất vượt tồn kho → 400 (chặn tồn âm) | `{"partId":"{{partId}}","quantity":999}` | Token ADMIN → `POST /part-transactions/export` | HTTP 400; Thông báo không đủ tồn kho | HTTP 400 · 4 ms | ✅ Đạt |
| PRT-12 | Tồn kho không đổi sau lần xuất bị từ chối | — | Token ADMIN → `GET /parts/{{partId}}` | HTTP 200; Tồn kho vẫn = 9 | HTTP 200 · 4 ms | ✅ Đạt |
| PRT-13 | Xuất số lượng 0 → 400 | `{"partId":"{{partId}}","quantity":0}` | Token ADMIN → `POST /part-transactions/export` | HTTP 400 | HTTP 400 · 1 ms | ✅ Đạt |
| PRT-14 | Lịch sử giao dịch theo phụ tùng | — | Token ADMIN → `GET /part-transactions?partId={{partId}}` | HTTP 200; Có 2 giao dịch (IMPORT, EXPORT) | HTTP 200 · 3 ms | ✅ Đạt |
| PRT-15 | Chi tiết giao dịch | — | Token ADMIN → `GET /part-transactions/{{importTxId}}` | HTTP 200 | HTTP 200 · 3 ms | ✅ Đạt |
| PRT-16 | Điều chỉnh kiểm kê: đặt tồn = 9 | `{"transactionType":"ADJUSTMENT","quantity":9,"notes":"Kiểm kê cuối ca (Postman)"}` | Token ADMIN → `POST /parts/{{partId}}/adjust` | HTTP 201; stockAfter = 9 | HTTP 201 · 4 ms | ✅ Đạt |
| PRT-17 | Giao dịch của phụ tùng | — | Token ADMIN → `GET /parts/{{partId}}/transactions` | HTTP 200; Có ít nhất 3 giao dịch | HTTP 200 · 2 ms | ✅ Đạt |
| PRT-18 | Gắn phụ tùng vào BOM thiết bị | `{"assetId":"{{assetId}}","partId":"{{partId}}","standardQuantity":2,"replacementInterva…` | Token ADMIN → `POST /parts/bom` | HTTP 201 | HTTP 201 · 3 ms | ✅ Đạt |
| PRT-19 | BOM theo thiết bị | — | Token ADMIN → `GET /parts/bom/asset/{{assetId}}` | HTTP 200; BOM có phụ tùng vừa gắn | HTTP 200 · 2 ms | ✅ Đạt |
| PRT-20 | Xuất phụ tùng cho thiết bị + ghi lịch sử → tồn 8 | `{"partId":"{{partId}}","assetId":"{{assetId}}","quantity":1,"eventType":"PART_REPLACEME…` | Token ADMIN → `POST /parts/issue-to-asset` | HTTP 200; stockAfter = 8 | HTTP 200 · 7 ms | ✅ Đạt |

### 04. History & KPI MTTR/MTBF (SV02)

Ghi nhật ký sự cố/bảo trì và tính MTTR, MTBF.

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| HIS-01 | Ghi sự cố hỏng máy (tính MTTR/MTBF) | `{"assetId":"{{assetId}}","eventType":"BREAKDOWN","title":"Máy nén dừng đột ngột (Postma…` | Token ADMIN → `POST /history` | HTTP 201 | HTTP 201 · 7 ms | ✅ Đạt |
| HIS-02 | Ghi lịch sử với loại sự kiện sai → 400 | `{"assetId":"{{assetId}}","eventType":"EXPLOSION","title":"Sai loại"}` | Token ADMIN → `POST /history` | HTTP 400 | HTTP 400 · 0 ms | ✅ Đạt |
| HIS-03 | Lịch sử theo thiết bị | — | Token ADMIN → `GET /history/asset/{{assetId}}` | HTTP 200; Có ít nhất 2 sự kiện (thay phụ tùng + hỏng) | HTTP 200 · 3 ms | ✅ Đạt |
| HIS-04 | Chỉ số MTTR/MTBF của thiết bị | — | Token ADMIN → `GET /history/asset/{{assetId}}/metrics` | HTTP 200; Đếm 1 lần hỏng; MTTR = 3 giờ | HTTP 200 · 2 ms | ✅ Đạt |
| HIS-05 | Tổng quan chỉ số toàn hệ thống | — | Token ADMIN → `GET /history/metrics/overview` | HTTP 200 | HTTP 200 · 2 ms | ✅ Đạt |

### 05. Security - API SV02 phải yêu cầu đăng nhập

Theo SRS, mọi API nghiệp vụ phải có JwtAuthGuard. Các request dưới đây gọi KHÔNG có token và mong đợi 401. Hiện tại (09/11/2026) các controller SV02 chưa gắn guard nên folder này FAIL — đây là lỗi cần SV02 sửa. Request được thiết kế không làm thay đổi dữ liệu (dùng ID không tồn tại / body sai).

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| SEC-01 | Danh sách thiết bị không token → 401 | — | Không token → `GET /assets` | HTTP 401 | HTTP 200 · 3 ms — expected response to have status code 401 but got 200 | ❌ Trượt |
| SEC-02 | Xóa thiết bị không token → 401 | — | Không token → `DELETE /assets/00000000-0000-4000-8000-000000000000` | HTTP 401 | HTTP 404 · 2 ms — expected response to have status code 401 but got 404 | ❌ Trượt |
| SEC-03 | Tạo phụ tùng không token → 401 | `{}` | Không token → `POST /parts` | HTTP 401 | HTTP 400 · 1 ms — expected response to have status code 401 but got 400 | ❌ Trượt |
| SEC-04 | Xuất kho không token → 401 | `{}` | Không token → `POST /part-transactions/export` | HTTP 401 | HTTP 400 · 1 ms — expected response to have status code 401 but got 400 | ❌ Trượt |
| SEC-05 | Ghi lịch sử không token → 401 | `{}` | Không token → `POST /history` | HTTP 401 | HTTP 400 · 1 ms — expected response to have status code 401 but got 400 | ❌ Trượt |
| SEC-06 | Xóa vị trí không token → 401 | — | Không token → `DELETE /locations/00000000-0000-4000-8000-000000000000` | HTTP 401 | HTTP 404 · 1 ms — expected response to have status code 401 but got 404 | ❌ Trượt |

### 06. Work Orders, Schedules, Sync (SV03) - CHỜ API

SV03 chưa có controller Work Order / Maintenance Schedule / Report / Sync trên develop (09/11/2026). Bổ sung request khi API được merge.

_Chưa có test case — chờ API._

### 99. Cleanup

Vô hiệu hóa (xóa mềm) dữ liệu vừa tạo.

| Mã test | Tên | Đầu vào | Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| CLN-01 | Xóa thiết bị | — | Token ADMIN → `DELETE /assets/{{assetId}}` | HTTP 200 | HTTP 200 · 5 ms | ✅ Đạt |
| CLN-02 | Thiết bị đã xóa không còn truy cập được → 404 | — | Token ADMIN → `GET /assets/{{assetId}}` | HTTP 404 | HTTP 404 · 2 ms | ✅ Đạt |
| CLN-03 | Xóa phụ tùng | — | Token ADMIN → `DELETE /parts/{{partId}}` | HTTP 200 | HTTP 200 · 3 ms | ✅ Đạt |
| CLN-04 | Xóa vị trí con | — | Token ADMIN → `DELETE /locations/{{childLocationId}}` | HTTP 200 | HTTP 200 · 5 ms | ✅ Đạt |
| CLN-05 | Xóa vị trí cha | — | Token ADMIN → `DELETE /locations/{{locationId}}` | HTTP 200 | HTTP 200 · 6 ms | ✅ Đạt |
