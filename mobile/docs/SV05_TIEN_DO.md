# SV05 — Bàn giao mobile tuần 1–3

**Cập nhật:** 15/11/2026. **Nhánh:** `feat/sv05-mobile-app`.

## Đã hoàn thành

- Đã lấy và gộp develop `96fb8bd` vào nhánh SV05 ở máy, dùng backend Work Order của SV03 từ `63665f2`. Không tự sửa mã backend.
- Flutter chia presentation/domain/data; đăng nhập TECHNICIAN, lưu token an toàn, khôi phục phiên và đăng xuất.
- Camera QR/nhập mã thủ công; tra cứu thông tin và lịch sử thiết bị bằng API thật.
- Work Order thật: danh sách/lọc 4 ưu tiên/phân trang, chi tiết, bắt đầu, tạm dừng có lý do, tiếp tục và nhận công việc Cần sửa lại.
- Yêu cầu vật tư: tìm/chọn/số lượng, gửi PENDING, xem trạng thái/chi tiết/lý do, hủy yêu cầu. Thủ kho/Admin duyệt ngoài app kỹ thuật viên; Flutter chỉ đọc vật tư đã cấp.
- Hoàn thành qua endpoint riêng: nguyên nhân, cách xử lý, ghi chú; giờ sửa do server tính. Không gửi lại vật tư hoặc trừ kho thêm lúc hoàn thành. Kết quả COMPLETED/CLOSED chỉ đọc.
- Giữ bản nháp khi chọn vật tư/tải lại; hỏi trước khi bỏ thay đổi, chống bấm lặp. Mất phản hồi khi tạo yêu cầu phải tải lại, kiểm tra danh sách và xác nhận bản nháp mới.
- Chặn hoàn thành nếu còn PENDING (kể cả trang sau) hoặc chưa đọc được trạng thái vật tư.
- Cập nhật hướng dẫn demo, tài liệu API thực tế và công cụ tạo fixture/duyệt vật tư thử.

## Kết quả kiểm tra

- `flutter analyze`: không có vấn đề; **81 Flutter tests đạt**.
- **45 backend tests có sẵn của SV03 đạt**, gồm PostgreSQL trong schema ngẫu nhiên riêng và kiểm tra khóa/rollback/phân quyền.
- **6 nhóm kiểm tra Work Order qua API thật đạt**: danh sách, bắt đầu/tạm dừng/tiếp tục, chặn PENDING, duyệt đúng quyền/chống xuất lặp, hoàn thành và vòng sửa lại/nghiệm thu.
- **4 kiểm tra API tài sản/QR thật đạt** sau cập nhật backend.
- Hai APK debug đã build thành công: bản API thật và bản mẫu trong bộ nhớ.
- **7 bước Android API thật đạt** trên AOSP Android 11/API 30: danh sách/lọc ưu tiên → bắt đầu → gửi PENDING không trừ kho → chặn hoàn thành khi chờ duyệt → cập nhật vật tư đã cấp và giữ báo cáo → hoàn thành, lưu báo cáo/vật tư không trừ kho lần nữa → đóng tiến trình và mở lại vẫn xem kết quả chỉ đọc.
- Báo cáo `build/verification/work-orders-android-report.json` có `mode: live-api`, `status: passed`, `liveWorkOrderIntegrationAccepted: true` và SHA-256 khớp APK đã cài. Lần kiểm tra này không có cảnh báo System UI; tồn phụ tùng thử từ 18 xuống 16 đúng một lần cấp 2 đơn vị. Ảnh minh chứng có tiền tố `work-order-live-` trong cùng thư mục.
- my-tasks và parts trả **200**. Kết quả 404 ngày 13/11 là của backend cũ, đã được thay bằng báo cáo mới.

## Database và giới hạn

- Đã sao lưu `smart_cmms_mobile_dev` trước khi áp dụng 3 migration SV03: status history → material requests → completion. Backup/báo cáo nằm trong `mobile/build/verification/`, được Git bỏ qua.
- Các thử nghiệm ghi dữ liệu có nhãn SV05 vào database riêng; có giao dịch xuất kho thử qua API. Không chạy trên database dùng chung/sản xuất.
- SQLite, hàng đợi UUID và đồng bộ/conflict offline **chưa triển khai** (tuần 4–5). Bản nháp chưa lưu bền khi đóng tiến trình app.
- iOS mới có cấu hình, **chưa build/kiểm thử trên macOS**; chưa kiểm thử điện thoại thật.
- `.env`, mật khẩu/token, APK, ảnh, backup và báo cáo build không đưa vào Git.

**Kết luận tuần 3:** đã hoàn thành luồng mobile trực tuyến bằng API thật hiện có của SV03; chưa cần bổ sung endpoint cho các chức năng tuần 3 đã nêu. Lead có thể kiểm tra thay đổi mobile trên nhánh SV05 trước khi gộp vào develop.

Chạy lại theo [HUONG_DAN_DEMO.md](../HUONG_DAN_DEMO.md), xem [API hiện tại](work_order_api_contract.md) và [README.md](../README.md).
