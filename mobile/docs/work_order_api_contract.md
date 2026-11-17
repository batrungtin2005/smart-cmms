# SV05 — API Work Order đã tích hợp

Cập nhật 15/11/2026 theo backend SV03 từ `63665f2`; nhánh mobile đã gộp develop `96fb8bd`. Tài liệu này thay hợp đồng đề xuất trước đó. Mobile dùng API hiện có, không sửa quy trình backend.

## Xác thực và dữ liệu trả về

Mọi yêu cầu có `Authorization: Bearer <token>`. Backend xác định kỹ thuật viên từ JWT; mobile không gửi `technicianId` để chọn người khác. Chỉ đọc/sửa công việc được giao.

Envelope chung:

```json
{"success":true,"statusCode":200,"data":{},"timestamp":"..."}
```

ApiClient gỡ envelope ngoài. Danh sách Work Order và yêu cầu vật tư trả `{items, meta}`. Danh mục phụ tùng vẫn trả `{success:true, data:[], meta}` bên trong. Trang từ 1, limit mobile 20; `meta` gồm page/limit/total/totalPages.

## API mobile sử dụng (prefix /api/v1)

| Thao tác | Endpoint / body |
| --- | --- |
| Việc được giao | GET `/work-orders/my-tasks?page=1&limit=20&priority=CRITICAL` |
| Chi tiết | GET `/work-orders/:id` |
| Bắt đầu / tiếp tục / sửa lại | PATCH `/work-orders/:id/status`, `{"status":"IN_PROGRESS"}` |
| Tạm dừng | PATCH `/work-orders/:id/status`, `{"status":"ON_HOLD","reason":"Chờ vật tư"}` |
| Danh mục phụ tùng | GET `/parts?page=1&limit=20&search=...` |
| Gửi yêu cầu vật tư | POST `/work-orders/:id/material-requests` |
| Danh sách yêu cầu | GET `/material-requests?workOrderId=<id>&page=1&limit=20`; có thể lọc status |
| Chi tiết yêu cầu | GET `/material-requests/:id` |
| Hủy yêu cầu đang chờ | PATCH `/material-requests/:id/cancel`, `{"reason":"Không còn cần"}` |
| Hoàn thành | PATCH `/work-orders/:id/complete` |

Không gửi `expectedStatus`: DTO backend không nhận và sẽ trả 400. Backend kiểm tra trạng thái dưới khóa giao dịch.

## Vật tư

```json
{"items":[{"partId":"UUID","quantity":2}],"notes":"Thay vòng bi"}
```

1–50 loại, không trùng, số lượng nguyên 1–1000000, ghi chú tối đa 1000 ký tự. Tồn hiển thị chỉ để tham khảo, không phải giữ chỗ; có thể yêu cầu khi kho đang thiếu. Backend kiểm tra tồn lại lúc duyệt.

Gửi khi IN_PROGRESS/ON_HOLD → PENDING, chưa trừ kho. WAREHOUSE_KEEPER/Admin duyệt qua `/material-requests/:id/approve` → APPROVED, xuất kho nguyên tử. Mobile kỹ thuật viên không gọi API duyệt. REJECTED/CANCELLED không trừ kho. APPROVED nghĩa là đã cấp vật tư, không cần nhập lại khi hoàn thành.

Danh sách yêu cầu chỉ trả tóm tắt; nút Xem vật tư yêu cầu gọi chi tiết để lấy items/part/quantity. Cần cộng các dòng vật tư cùng loại nếu backend cấp nhiều lần ở các đơn giá khác nhau; báo cáo hiện hiển thị từng dòng cấp.

## Hoàn thành và sửa lại

```json
{"rootCause":"Vòng bi mòn","solution":"Thay vòng bi và chạy thử","completionNotes":"Áp suất ổn định"}
```

Nguyên nhân bắt buộc 1–255 ký tự, cách xử lý bắt buộc 1–10000 ký tự; ghi chú tùy chọn tối đa 10000. Không gửi giờ sửa, vật tư, đơn giá, timestamp hoặc người thực hiện. Máy chủ tính actualRepairTimeHours từ lịch sử, loại khoảng tạm dừng/chờ nghiệm thu/chờ làm lại.

IN_PROGRESS → COMPLETED. Còn yêu cầu vật tư PENDING thì bị chặn. Quản lý nghiệm thu ACCEPT → CLOSED; REJECT → REWORK_REQUIRED. Mobile hiển thị Cần sửa lại, ghi chú nghiệm thu và nút Bắt đầu sửa lại. ON_HOLD có nút Tiếp tục làm. Không cung cấp thao tác nghiệm thu của quản lý trong app kỹ thuật viên.

## Lỗi và gửi trùng

- 401: kết thúc phiên trên máy.
- 403/404 công việc: ngừng hiển thị dữ liệu không còn quyền truy cập.
- 400/422: giữ báo cáo để sửa; không tự retry.
- 409 hoặc timeout/5xx khi ghi: chưa báo thành công; khóa gửi tiếp tới khi đọc lại trạng thái.
- POST vật tư chưa có idempotency key: nếu mất phản hồi, sau khi tải lại vẫn phải kiểm tra danh sách và xác nhận bắt đầu bản nháp mới. Không tự gửi lại bản nháp cũ.
- Không đọc được trạng thái vật tư: khóa hoàn thành. Nếu danh sách nhiều trang, mobile kiểm tra riêng tổng PENDING để không bỏ sót yêu cầu chờ ở trang sau.

## Database và kiểm thử

Máy hiện tại dùng smart_cmms_mobile_dev; đã sao lưu và áp dụng 3 migration SV03 theo thứ tự: status_history → material_requests → work_order_completion. Script `prepare_week3_backend.mjs` chỉ hỗ trợ database mobile riêng trên localhost; không chạy lại toàn bộ SQL khởi tạo trên database cũ.

`verify_work_orders_api.mjs` kiểm tra API thật bằng dữ liệu SV05, tạo fixture cho Android. `verify_android_work_orders_live.mjs` kiểm tra APK mặc định, có thao tác Admin riêng để mô phỏng duyệt kho. Các kết quả nằm trong `mobile/build/verification/`, không chứa mật khẩu/token.

SQLite, hàng đợi UUID và đồng bộ offline chưa triển khai (tuần 4–5); iOS và điện thoại thật còn cần kiểm thử.
