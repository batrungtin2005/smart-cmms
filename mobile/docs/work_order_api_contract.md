# SV05 ↔ SV03: hợp đồng Work Order đề xuất

**Trạng thái: chờ SV03 xác nhận và triển khai.** Khi kiểm tra `origin/develop` và `origin/feat/sv03-work-order-engine`, module mới có entity; chưa có controller/service. Tài liệu này mô tả adapter mobile đã chuẩn bị, không xác nhận backend hiện có các API bên dưới. Phạm vi thay đổi lần này chỉ là mobile, không sửa backend/database.

## Xác thực và phân trang

Mọi yêu cầu gửi `Authorization: Bearer <accessToken>`. Backend phải kiểm tra tài khoản TECHNICIAN đang hoạt động và lấy người được giao từ JWT; không tin mã kỹ thuật viên do client gửi. Mobile không gửi `technicianId` trong query/body để tự chọn người khác.

Response đi qua TransformInterceptor đang có:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "success": true,
    "data": [],
    "meta": {"page": 1, "limit": 20, "total": 0, "totalPages": 0}
  },
  "timestamp": "2026-11-13T00:00:00.000Z"
}
```

Lớp `ApiClient` đã gỡ envelope ngoài. Dữ liệu phân trang bên trong theo kiểu `PartsService` hiện tại. Trang bắt đầu từ 1, mỗi trang 20 phần tử; `totalPages=0` khi rỗng.

## Danh sách và chi tiết

- `GET /api/v1/work-orders/my-tasks?page=1&limit=20&priority=CRITICAL`
- `GET /api/v1/work-orders/:id`
- `GET /api/v1/parts?page=1&limit=20&search=...` — endpoint danh mục phụ tùng đã có.

`priority` bỏ qua khi chọn Tất cả. Giá trị đúng theo database là `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`. Giao diện lần lượt hiển thị Khẩn cấp, Cao, Trung bình, Thấp. API danh sách chỉ trả công việc thuộc kỹ thuật viên đăng nhập; đề xuất sắp ưu tiên trước, rồi mã công việc để phân trang ổn định.

Ví dụ một đối tượng chi tiết, đặt trực tiếp trong `data` của envelope ngoài:

```json
{
  "id": "11111111-2222-4333-8444-555555555555",
  "workOrderCode": "WO-2026-0001",
  "title": "Kiểm tra máy bơm",
  "description": "Kiểm tra áp suất và hiện tượng rò dầu",
  "assetId": "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  "asset": {"assetCode": "AST-001", "name": "Máy bơm số 1"},
  "assignedTechnicianId": "99999999-2222-4333-8444-555555555555",
  "priority": "CRITICAL",
  "status": "ASSIGNED",
  "scheduledEndDate": "2026-11-20",
  "startTime": null,
  "completedTime": null,
  "actualRepairTimeHours": "0.00",
  "completionNotes": null,
  "parts": []
}
```

Danh sách cần các trường định danh, tiêu đề, asset, người được giao, priority/status; có thể bỏ các trường báo cáo chi tiết `parts` và `actualRepairTimeHours`. Chi tiết và kết quả mutation cần trả đủ `parts` (kể cả mảng rỗng) và `actualRepairTimeHours` (number hoặc chuỗi decimal).

Các trạng thái đọc được: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CLOSED`, `CANCELLED`, `ON_HOLD`. Mobile tuần 3 chỉ cung cấp hai thao tác `ASSIGNED → IN_PROGRESS → COMPLETED`; nghiệm thu `CLOSED` thuộc quản lý.

Mỗi phần tử `parts` của chi tiết có cấu trúc:

```json
{
  "partId": "bbbbbbbb-2222-4333-8444-555555555555",
  "quantityUsed": 2,
  "part": {"partCode": "PART-001", "name": "Vòng bi", "unit": "Cái"}
}
```

Danh mục `/parts` sử dụng các trường đã có: `id`, `partCode`, `name`, `unit`, `currentStock` nguyên không âm.

## Bắt đầu và hoàn thành

`PATCH /api/v1/work-orders/:id/status`

```json
{"status": "IN_PROGRESS", "expectedStatus": "ASSIGNED"}
```

Hoàn thành được đề xuất gửi **một yêu cầu nguyên tử**:

```json
{
  "status": "COMPLETED",
  "expectedStatus": "IN_PROGRESS",
  "actualRepairTimeHours": 0.5,
  "completionNotes": "Đã thay vòng bi và kiểm tra áp suất.",
  "parts": [
    {"partId": "bbbbbbbb-2222-4333-8444-555555555555", "quantityUsed": 2}
  ]
}
```

Ghi chú 1–5000 ký tự sau trim; giờ thực hiện >0; số lượng nguyên dương, không trùng partId. Cho phép `parts: []`. Client không gửi đơn giá/chi phí: backend lấy đơn giá từ kho.

**Cần thống nhất với SV03:** README backend có endpoint thêm phụ tùng riêng, nhưng mobile hiện đề xuất gộp báo cáo, vật tư và hoàn thành trong cùng transaction để tránh gửi thành công vật tư rồi thất bại khi đổi trạng thái. Nếu SV03 chọn một endpoint hoàn thành nguyên tử khác, cập nhật adapter và kiểm thử tương ứng trước tích hợp thật.

Backend cần khóa/kiểm tra lại Work Order và tồn kho trong transaction: đúng người được giao, đúng `expectedStatus`, phụ tùng còn hoạt động, đủ stock; sau đó ghi vật tư sử dụng, xuất kho, thời gian và trạng thái cùng nhau. Không cập nhật một phần khi có lỗi. Kiểm tra trạng thái dưới khóa phải ngăn yêu cầu lặp trừ kho hai lần. Ghi lịch sử bảo trì/KPI cần tuân theo quy tắc backend của nhóm.

Trả đối tượng chi tiết đã cập nhật trong envelope ngoài. Trạng thái bắt đầu phải là `IN_PROGRESS`, hoàn thành phải là `COMPLETED`.

## Lỗi và kết quả chưa rõ ràng

| HTTP | Hành vi mobile |
| --- | --- |
| 401 | Xóa phiên trên máy, về đăng nhập |
| 403 / detail 404 | Ngừng hiển thị chi tiết công việc không còn quyền truy cập |
| list 404 | Báo máy chủ chưa hỗ trợ; không tự chuyển sang dữ liệu mẫu |
| 409 | Khóa gửi tiếp, yêu cầu tải lại trạng thái |
| 400 / 422 | Giữ bản nháp để sửa; backend phải rollback toàn bộ |
| Timeout / mất kết nối / 5xx khi ghi | Không báo thành công, không tự retry mutation; yêu cầu GET lại trạng thái |

Nếu GET sau timeout cho thấy đã COMPLETED, hiển thị báo cáo đã lưu. Nếu còn IN_PROGRESS, người dùng xem lại và xác nhận gửi; backend vẫn phải kiểm tra trạng thái dưới khóa để xử lý cuộc đua với yêu cầu trước đó.

## Điều kiện nghiệm thu tích hợp thật

1. Endpoint nhận đúng JWT/role/ownership, không đọc hoặc sửa việc người khác.
2. Lọc đủ bốn ưu tiên, phân trang, chi tiết và danh mục phụ tùng đúng cấu trúc.
3. Bắt đầu/hoàn thành trả trạng thái chính xác và lưu được ghi chú, giờ thực hiện, vật tư.
4. Hết kho hoặc đổi phân công/trạng thái giữa chừng không tạo cập nhật dở dang.
5. Gửi trùng/timeout không xuất kho hoặc tạo lịch sử hai lần.

Chưa triển khai SQLite, hàng đợi UUID, tự đồng bộ hoặc xử lý conflict offline ở tuần 3. Bản nháp hiện giữ trong bộ nhớ khi ở màn hình; đóng tiến trình app sẽ mất bản nháp. Những phần lưu bền/đồng bộ thuộc tuần 4–5.
