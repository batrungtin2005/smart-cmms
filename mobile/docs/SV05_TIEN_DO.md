# SV05 — Ghi chú bàn giao mobile tuần 1–3

**Cập nhật:** 13/11/2026. **Nhánh:** `feat/sv05-mobile-app`.

## Đã hoàn thành trong mobile

- Tổ chức Flutter theo các lớp `presentation`, `domain`, `data`.
- Đăng nhập kỹ thuật viên bằng API thật; lưu token an toàn, khôi phục phiên, đăng xuất và xử lý lỗi/hết phiên.
- Quét QR bằng camera, xin quyền camera, nhập mã thủ công; tra cứu thông tin và lịch sử thiết bị bằng API thật.
- Danh sách Work Order, lọc 4 mức ưu tiên, phân trang và tải lại.
- Chi tiết công việc; bắt đầu → `IN_PROGRESS`; nhập ghi chú, giờ làm, chọn phụ tùng/số lượng; xem lại và xác nhận → `COMPLETED`.
- Kiểm tra dữ liệu nhập, giữ bản nháp khi chọn phụ tùng, hỏi trước khi bỏ thay đổi; chống gửi lặp và yêu cầu đọc lại trạng thái khi chưa rõ kết quả gửi.
- Tách adapter API và dữ liệu mẫu có nhãn; không tự chuyển sang mẫu khi API lỗi.
- Cấu hình quyền camera, bảo vệ token và build Android; chuẩn bị cấu hình iOS.
- Bổ sung unit/widget test, công cụ kiểm tra API/Android, hướng dẫn chạy và hợp đồng API đề xuất với SV03.

## Kết quả đã kiểm tra

- `flutter analyze`: không có vấn đề; `flutter test`: **75 kiểm thử đạt**.
- Build/cài APK debug trên giả lập Android API 36.
- Đăng nhập bằng backend thật, khôi phục phiên, đăng xuất; camera quét QR thử và tra cứu đúng thiết bị.
- **6 bước Work Order mẫu đạt trên Android**: danh sách có nhãn, lọc, bắt đầu, giữ báo cáo/phụ tùng, hoàn thành, mở lại kết quả chỉ đọc.
- API `work-orders/my-tasks` hiện trả **404**; danh mục `parts` trả **200**. Chưa nghiệm thu cập nhật Work Order/tồn kho thật.

## Còn chờ / chưa thuộc phần hoàn thành

- SV03 xác nhận và triển khai [hợp đồng API Work Order đề xuất](work_order_api_contract.md), sau đó kiểm tra tích hợp thật và xử lý đồng thời/trừ kho nguyên tử.
- SQLite, hàng đợi UUID, đồng bộ và conflict offline: **chưa triển khai**, thuộc tuần 4–5. Bản nháp/công việc mẫu hiện chỉ nằm trong bộ nhớ.
- iOS mới có cấu hình; **chưa build/kiểm thử trên macOS**. Chưa kiểm thử trên điện thoại thật.
- Không thay đổi mã nguồn backend/database trong đợt bàn giao này.

## Chạy và kiểm tra lại

- Hướng dẫn ngắn cho máy hiện tại: [HUONG_DAN_DEMO.md](../HUONG_DAN_DEMO.md).
- Cài đặt, lệnh build hai APK và các script kiểm tra: [README.md](../README.md).
- `.env`, mật khẩu/token, APK, ảnh và báo cáo trong `build/` không đưa vào Git. Máy khác cần cấu hình backend/tài khoản riêng, rồi build và chạy lại các công cụ để tạo minh chứng.
