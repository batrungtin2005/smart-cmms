# BỘ KỊCH BẢN KIỂM THỬ & NGHIỆM THU (TEST PLAN & TEST CASES)
**Phụ trách chính:** SV06 (QA / DevOps Engineer)

Tài liệu này dùng để theo dõi, chứng minh với Giảng viên từng tiêu chí trong tài liệu tổng quan đồ án DT05.

---

## 1. MA TRẬN 7 TIÊU CHÍ NGHIỆM THU BẮT BUỘC

| Mã TC | Tiêu chí yêu cầu | Kịch bản kiểm thử (Test Scenario) | Kết quả mong đợi | Bằng chứng cần chụp |
|---|---|---|---|---|
| **TC-01** | **300 Thiết bị** | Chạy script seed 300 thiết bị vào PostgreSQL. Trên Web (SV04), vào trang Danh sách tài sản kiểm tra phân trang (30 trang x 10 máy hoặc 15 trang x 20 máy), tìm kiếm mã `AST-150`, bấm xem chi tiết và in QR. | Tìm kiếm phản hồi < 500ms; mã QR sinh chính xác chuỗi `AST-150`; thông tin model/vị trí đầy đủ. | Ảnh chụp giao diện Web hiển thị 300 bản ghi, modal QR code, kết quả câu lệnh SQL `SELECT COUNT(*) FROM assets;` |
| **TC-02** | **1.000 Work Orders** | Chạy script seed 1.000 phiếu công việc trong 6 tháng. Thử lọc theo trạng thái `COMPLETED` và lọc theo kỹ thuật viên. | Truy vấn trả về mượt mà, phân trang không đơ lag; bảng Kanban hiển thị đúng cột. | Ảnh chụp bảng Work Order đủ 1.000 bản ghi, câu lệnh SQL đếm tổng phiếu. |
| **TC-03** | **3 Kiểu Lịch Bảo Dưỡng** | 1. **Theo thời gian:** Tạo lịch kiểm tra mỗi 30 ngày $\to$ kiểm tra ngày đến hạn `next_due_at`.<br>2. **Theo mức sử dụng:** Tạo quy tắc bảo dưỡng sau 500 giờ $\to$ nhập giờ máy đạt 505 giờ $\to$ hệ thống tự động sinh Work Order.<br>3. **Theo ngưỡng:** Nhập nhiệt độ đo được 88°C (ngưỡng 85°C) $\to$ hệ thống tự động kích hoạt cảnh báo & tạo phiếu sửa chữa khẩn. | Cả 3 tình huống đều tự động sinh phiếu công việc tương ứng ở trạng thái `OPEN`. | Ảnh chụp 3 quy tắc trong màn hình Schedule và các phiếu công việc tự động được tạo ra. |
| **TC-04** | **Đồng bộ Offline/Online** | Mở ứng dụng Flutter (SV05) trên điện thoại $\to$ Bật chế độ máy bay (ngắt Wi-Fi/4G) $\to$ Quét QR hoặc nhận 1 Work Order $\to$ Bấm bắt đầu sửa $\to$ Tắt chế độ máy bay (có mạng lại). | Lúc mất mạng ứng dụng báo đã lưu cục bộ (PENDING); khi có mạng, hệ thống tự động gửi sync lên server và chuyển sang `SYNCED`. | Video/Ảnh chụp màn hình điện thoại khi mất mạng và lúc có mạng, ảnh DB server cập nhật. |
| **TC-05** | **Xử lý Xung Đột (Conflict)** | Cài đặt số lượng phụ tùng `PART-FILTER-01` trong kho còn đúng **1 cái**. 2 kỹ thuật viên (hoặc 1 kỹ thuật viên offline và 1 quản lý trên Web) cùng xuất phụ tùng này. | Người gửi trước thành công, tồn kho về 0. Người gửi sau nhận thông báo lỗi xung đột `CONFLICT: Phụ tùng trong kho không đủ`, không để tồn kho bị âm. | Ảnh chụp màn hình thông báo lỗi xung đột và log giao dịch kho. |
| **TC-06** | **Chỉ số MTTR & MTBF** | Chọn 1 máy nén khí `AST-001` có 3 lần sửa chữa mất 2h, 3h, 4h $\to$ MTTR = 3h. Tổng giờ chạy máy 900h với 3 sự cố $\to$ MTBF = 300h. | Dashboard hiển thị đúng giá trị MTTR và MTBF được tính từ các bản ghi sửa chữa thực tế. | Ảnh chụp thẻ KPI và đồ thị xu hướng trên Dashboard so khớp với dữ liệu trong database. |
| **TC-07** | **CI/CD Tự Động** | Tạo 1 Pull Request sửa code đẩy lên GitHub nhánh `develop`. | GitHub Actions tự động kích hoạt workflow `ci.yml`, chạy lint, test và build thành công (màu xanh lá). | Ảnh chụp màn hình tab Actions trên GitHub với kết quả "Passed". |
