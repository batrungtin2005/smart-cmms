# MODULE QUẢN LÝ PHIẾU CÔNG VIỆC (WORK ORDERS)
**Phụ trách code chính:** SV03 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý 2 bảng: `work_orders` và `work_order_parts`.
2. Hiện thực vòng đời State Machine chuẩn mực:
   - `OPEN`: Mới tạo do báo sự cố hoặc do Lịch bảo dưỡng tự động sinh ra.
   - `ASSIGNED`: Quản lý giao cho kỹ thuật viên.
   - `IN_PROGRESS`: Kỹ thuật viên bắt đầu làm.
   - `COMPLETED`: Kỹ thuật viên báo cáo xong, nhập thời gian thực tế và phụ tùng sử dụng.
   - `CLOSED`: Quản lý nghiệm thu và chốt đóng phiếu.
   - `CANCELLED` / `ON_HOLD`: Hủy hoặc tạm hoãn (kèm lý do bắt buộc).
3. Viết API:
   - `GET /api/v1/work-orders`: Danh sách (phân trang, lọc theo trạng thái, mức độ ưu tiên, kỹ thuật viên, thiết bị).
   - `POST /api/v1/work-orders`: Tạo phiếu công việc mới.
   - `PATCH /api/v1/work-orders/:id/assign`: Giao phiếu cho kỹ thuật viên.
   - `PATCH /api/v1/work-orders/:id/status`: Chuyển trạng thái phiếu (kèm kiểm tra quyền).
   - `POST /api/v1/work-orders/:id/parts`: Thêm phụ tùng đã dùng vào phiếu.
   - `GET /api/v1/work-orders/my-tasks`: Lấy việc được giao của kỹ thuật viên đang đăng nhập (Mobile gọi).

## Cấu trúc thư mục:
- `entities/`: `work-order.entity.ts`, `work-order-part.entity.ts`
- `dto/`: `create-work-order.dto.ts`, `assign-work-order.dto.ts`, `change-status.dto.ts`, `use-part.dto.ts`
- `work-orders.controller.ts`
- `work-orders.service.ts`
- `work-orders.module.ts`

## Đã triển khai bước 1–2 — 11/11/2026

Danh sách nhiệm vụ phía trên là mục tiêu toàn module. Các API bước 1–2 dưới đây dùng prefix `/api/v1/work-orders`. API status đã bổ sung ở bước 3 cuối tài liệu; parts, cron và Sync thuộc bước sau.

| API | Quyền | Chức năng |
|---|---|---|
| POST `/` | ADMIN, MAINTENANCE_MANAGER | Tạo phiếu OPEN |
| GET `/` | ADMIN, MAINTENANCE_MANAGER | Danh sách có phân trang/bộ lọc |
| GET `/my-tasks` | TECHNICIAN | Chỉ lấy việc của user trong JWT |
| GET `/:id` | Quản lý/Admin hoặc KTV được giao | Chi tiết và danh sách vật tư đã gắn |
| PATCH `/:id/assign` | ADMIN, MAINTENANCE_MANAGER | Giao/giao lại phiếu OPEN/ASSIGNED |

### Các file mới

- `work-orders.module.ts`: đăng ký WorkOrder, WorkOrderPart, MaintenanceSchedule, Asset, User; cung cấp controller/service. AppModule import module này thay cho forFeature trực tiếp. MaintenanceSchedule phải tiếp tục được đăng ký để giải quyết quan hệ WorkOrder.schedule.
- `work-orders.controller.ts`: URL, Swagger, JwtAuthGuard, RolesGuard. Route my-tasks đứng trước :id.
- `work-orders.service.ts`: kiểm tra quyền, transaction tạo/giao phiếu, query có giới hạn theo người dùng. Service trả dữ liệu thuần, TransformInterceptor bọc response một lần.
- `dto/`: kiểm tra dữ liệu, xem README trong thư mục.
- `work-orders.service.spec.ts`: unit test validation/quy tắc nghiệp vụ.
- `work-orders.integration.spec.ts`: HTTP + PostgreSQL với JWT/guards và module thật; không khởi động AuthService seed.

### Tạo phiếu

```json
{
  "assetId": "UUID-thiet-bi",
  "title": "Máy nén khí quá nhiệt",
  "description": "Máy dừng trong ca vận hành",
  "type": "CORRECTIVE",
  "priority": "HIGH",
  "breakdownTime": "2026-11-11T08:00:00+07:00",
  "scheduledStartDate": "2026-11-11",
  "scheduledEndDate": "2026-11-12",
  "estimatedCost": 150000
}
```

- Thiết bị phải tồn tại, isActive=true, không DECOMMISSIONED. Kiểm tra tài sản và tạo phiếu trong cùng transaction, khóa đọc tài sản tránh vô hiệu hóa giữa kiểm tra và insert.
- CORRECTIVE/EMERGENCY phải có breakdownTime không ở tương lai; INSPECTION/PREVENTIVE có thể không có. Timestamp phải có múi giờ. Ngày kế hoạch dạng YYYY-MM-DD, kết thúc không trước bắt đầu.
- Mặc định type=CORRECTIVE, priority=MEDIUM. Server lấy createdById từ user xác thực, đặt OPEN, chưa giao KTV; không nhận status/createdById/mã phiếu/downtime từ body.
- Mã tự sinh `WO-<năm UTC>-<UUID đầy đủ>` dài 44 ký tự, dùng UUID của phiếu và unique constraint; không dùng COUNT+1. Không cần migration tạo sequence; đây không phải mã số thứ tự ngắn.
- Gửi lại POST vẫn tạo phiếu mới: idempotency cho offline thuộc bước Sync.

### Danh sách và chi tiết

Query: page (1), limit (20, tối đa 100), search (mã/tiêu đề), status, priority, type, assetId, createdFrom/createdTo (timestamp có múi giờ, bao gồm hai đầu). Danh sách quản lý có thêm assignedTechnicianId. my-tasks không nhận trường này, luôn dùng user.id từ JWT.

Sắp xếp createdAt DESC rồi id DESC. Search coi `%`, `_`, dấu gạch chéo ngược là ký tự cần tìm. Response danh sách:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "items": [],
    "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 }
  },
  "timestamp": "..."
}
```

Tạo/chi tiết/phân công trả một phiếu trong data, kèm parts. Quan hệ người tạo/KTV chỉ chọn id, username, fullName, không trả passwordHash/email/phone. Các cột NUMERIC có thể là chuỗi như `"0.00"` theo PostgreSQL driver.

KTV truy cập phiếu của người khác nhận 404 giống phiếu không tồn tại. Sai role nhận 403; thiếu/sai JWT hoặc tài khoản vô hiệu hóa nhận 401. Trường ngoài DTO, UUID/enum/phân trang không hợp lệ nhận 400.

### Phân công

Body: `{ "assignedTechnicianId": "UUID-KTV" }`.

- Chỉ TECHNICIAN đang hoạt động được nhận phiếu.
- Khóa dòng phiếu bằng pessimistic_write trước khi kiểm tra trạng thái và cập nhật trong một transaction.
- OPEN → ASSIGNED; ASSIGNED có thể giao lại. Gửi cùng người nhận trên phiếu ASSIGNED không ghi lại.
- IN_PROGRESS/ON_HOLD/COMPLETED/CLOSED/CANCELLED nhận 409.
- Nhiều quản lý giao lại đồng thời sẽ xử lý tuần tự theo khóa; lần cập nhật hợp lệ sau cùng quyết định người nhận. Chưa có expectedVersion; lịch sử phân công đã bổ sung ở bước 3.
- Tạo/giao phiếu chưa thay đổi trạng thái thiết bị, trừ kho hoặc ghi lịch sử sửa chữa. API trạng thái ở bước 3 bên dưới dùng transaction và kiểm tra trạng thái hiện tại.

### Kiểm tra

Từ thư mục gốc:

```powershell
npm run build:backend
npm run test --workspace=backend -- --runInBand work-orders.service.spec.ts
```

Integration test đọc DB config trong .env/backend/.env (biến môi trường ưu tiên), cần PostgreSQL và quyền tạo schema:

```powershell
$env:RUN_POSTGRES_TESTS = '1'
try {
  npm run test --workspace=backend -- --runInBand work-orders.integration.spec.ts
} finally {
  Remove-Item Env:RUN_POSTGRES_TESTS -ErrorAction SilentlyContinue
}
```

Test tạo schema ngẫu nhiên `cmms_wo_test_<UUID>`, nạp SQL/dữ liệu giả và dùng connection riêng để kiểm tra khóa thật. Cuối test đóng connection, xác nhận tên rồi DROP đúng schema test. Không sửa bảng public, không chạy synchronize, không khởi động lại backend đang chạy. Nếu cưỡng bức dừng test, schema riêng có thể cần dọn thủ công sau khi xác nhận tên.

Kịch bản kiểm thử: quyền/JWT, giả mạo dữ liệu server, thiết bị/KTV không hợp lệ, tạo/đọc/phân công/giao lại, my-tasks, lọc/phân trang, không lộ hash, tạo đồng thời không trùng mã và chờ khóa khi trạng thái đang được cập nhật.

Thử Swagger: build lại, khởi động lại bằng node dist/main từ backend, đăng nhập Admin/quản lý, Authorize accessToken; dùng UUID thiết bị/KTV có thật. Đăng nhập bằng KTV để thử my-tasks và giới hạn xem phiếu.

## Bước 3 — chuyển trạng thái và lịch sử (13/11/2026)

Đã thêm `PATCH /api/v1/work-orders/:id/status`. Body: `{"status":"ON_HOLD","reason":"Chờ vật tư"}`. IN_PROGRESS dùng cho cả bắt đầu và tiếp tục; CANCELLED dùng khi hủy.

| Từ | Sang | Người thực hiện |
| --- | --- | --- |
| ASSIGNED | IN_PROGRESS | KTV được giao |
| IN_PROGRESS | ON_HOLD | KTV được giao |
| ON_HOLD | IN_PROGRESS | KTV được giao |
| OPEN hoặc ASSIGNED | CANCELLED | ADMIN / MAINTENANCE_MANAGER |

Tạm dừng/hủy bắt buộc lý do không rỗng, tối đa 1.000 ký tự. Chuyển sai trạng thái hoặc gửi lặp trả 409; sai quyền 403; KTV truy cập phiếu người khác 404. Thời gian lấy từ server; startTime chỉ ghi lần bắt đầu đầu tiên. Chưa tính giờ sửa chữa, chưa hỗ trợ COMPLETED/CLOSED, chưa thay đổi trạng thái thiết bị hay giao dịch kho trong bước này. Luồng kho hiện có cần được tích hợp quy tắc vòng đời phiếu ở bước tiếp theo.

Chi tiết phiếu trả thêm `statusHistory`, tăng dần theo sequence, gồm trạng thái trước/sau, người thực hiện (chỉ id/username/fullName), KTV được giao tại thời điểm thao tác, lý do và createdAt. Tạo phiếu và phân công/giao lại cũng ghi lịch sử; giao lại cùng KTV khi đã ASSIGNED không ghi trùng. Phiếu cũ chỉ có lịch sử từ lần thao tác sau khi cập nhật.

Service khóa hàng phiếu và ghi trạng thái + lịch sử trong một transaction. Hai yêu cầu chuyển cùng trạng thái chỉ một yêu cầu thành công. Nếu ghi lịch sử lỗi, cập nhật trạng thái/startTime rollback.

**Database cũ phải chạy `src/database/migrations/20261113_work_order_status_history.sql` trước khi dùng backend mới.** Không chạy lại toàn bộ SQL khởi tạo. Entity lịch sử được đăng ký trong WorkOrdersModule; synchronize vẫn tắt.

Integration test bổ sung: phân quyền, ma trận chuyển, bắt buộc lý do, chống giả mạo startTime, giữ startTime khi tiếp tục, hai yêu cầu đồng thời và rollback khi ghi lịch sử lỗi. Test chỉ tác động schema ngẫu nhiên riêng.

## Luồng vật tư được cập nhật

Đã triển khai MaterialRequestsController/Service trong WorkOrdersModule. KTV gửi yêu cầu; thủ kho duyệt và xuất kho nguyên tử. Phiếu lấy vật tư/chi phí từ lần cấp; chưa có API hoàn thành. Xem [MATERIAL_REQUESTS.md](MATERIAL_REQUESTS.md) để biết đầy đủ quy trình, payload, phân quyền, khóa giao dịch, thay đổi giá và giới hạn. Đây là luồng thay cho xuất vật tư trực tiếp theo Work Order trong phần kế hoạch cũ.

## Hoàn thành, nghiệm thu, cập nhật thiết bị

Đã triển khai PATCH :id/complete và :id/verify, helper repair-time.ts, unit/integration tests. Nghiệm thu không đạt dùng trạng thái mới REWORK_REQUIRED (Cần sửa lại), tách khỏi ON_HOLD. Xem [COMPLETION.md](COMPLETION.md) để biết payload, quyền, cách tính giờ, xử lý nhiều phiếu trên cùng thiết bị, lịch sử, dữ liệu cũ và migration. Các ghi chú kế hoạch “chưa có API hoàn thành” ở các phần trước đã được thay thế bằng tính năng này.
