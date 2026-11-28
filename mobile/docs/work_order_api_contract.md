# SV05 — API Work Order đã tích hợp

Cập nhật 28/11/2026 sau khi lấy develop `8957711` (có commit mobile tuần 4 `37245c8`). API Work Order cũ vẫn giữ các trường bắt buộc đang dùng; các trường điều khiển lịch PM bổ sung là tùy chọn. Mobile giữ phạm vi SV05, không sửa logic backend.

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

Database thử `smart_cmms_mobile_dev` đã được sao lưu và áp dụng 3 migration Work Order trong đợt tuần 3: status_history → material_requests → work_order_completion. Lượt cập nhật 28/11 chưa nâng cấp database. Backend mới cần thêm migration lịch sử/schema và PM, rồi chuẩn hóa enum/role sau cùng theo [hướng dẫn demo](../HUONG_DAN_DEMO.md). Script `prepare_week3_backend.mjs` chỉ hỗ trợ ba migration cũ, không phải công cụ nâng cấp đầy đủ cho backend mới; không chạy lại sau bước chuẩn hóa.

`verify_work_orders_api.mjs` kiểm tra API thật bằng dữ liệu SV05, tạo fixture cho Android. `verify_android_work_orders_live.mjs` kiểm tra APK mặc định, có thao tác Admin riêng để mô phỏng duyệt kho. Các kết quả nằm trong `mobile/build/verification/`, không chứa mật khẩu/token.

## Tuần 4: hàng đợi cục bộ và phần cần chốt với SV03

Kiểm tra ngày 28/11/2026: cả develop `8957711` và nhánh SV03 `b27e2af` vẫn chỉ có README Sync. Bảng SQL và Swagger tag không phải API thực thi. Chưa có endpoint batch để xác minh gửi thật, chống xử lý lặp UUID hoặc phản hồi xung đột. Cần SV03 cung cấp implementation và ví dụ request/response trước khi chốt phần tuần 4–5.

SQLite và hàng đợi cục bộ đã có. Đây là định dạng nội bộ, chưa phải DTO chính thức của `POST /sync/batch`: UUID, loại thao tác, công việc, payload, thời điểm UTC, thứ tự lưu và UUID phụ thuộc trước đó. Các loại hiện có: START_WORK_ORDER, RESUME_WORK_ORDER, PAUSE_WORK_ORDER, REQUEST_MATERIALS, CANCEL_MATERIAL_REQUEST, COMPLETE_WORK_ORDER.

- PENDING chỉ xác nhận đã lưu trên điện thoại. Chưa có đường gửi thật, không tự đổi sang SYNCED và không phát lại qua API cũ. Hoàn thành cục bộ vẫn ghi Chờ đồng bộ.
- Bản ghi giữ trạng thái nền và thời điểm tải về để đối chiếu. `baseFetchedAt` là giờ nhận dữ liệu trên máy, không phải version của server.
- Cần chốt tên trường UUID/payload, giới hạn batch, kết quả từng thao tác, chống xử lý UUID lặp, thứ tự/phụ thuộc, lỗi/xung đột và quy tắc retry.
- Cần chốt ánh xạ UUID yêu cầu vật tư offline sang ID server để hủy/tham chiếu. Giữ quy trình thủ kho duyệt và xuất kho nguyên tử; không dùng USE_PART để bỏ qua duyệt.
- Cần chốt cách dùng thời điểm offline khi tính giờ sửa, thay đổi phân công/trạng thái trong lúc mất mạng và JWT hết hạn khi gửi.
- POST online chưa rõ kết quả không tự chuyển thành thao tác hàng đợi mới. Bản nháp được đánh dấu cần kiểm tra trước khi gửi HTTP; đọc cache không mở khóa gửi tiếp. Yêu cầu offline được ghi cùng việc xóa vật tư đang soạn trong một transaction, tránh khôi phục lại bản nháp đã gửi khi app đóng giữa chừng.

iOS và điện thoại thật vẫn cần kiểm thử. Bản web và Work Order mẫu không dùng lớp lưu trữ Work Order SQLite này.
