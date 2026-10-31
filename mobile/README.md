# ỨNG DỤNG DI ĐỘNG FLUTTER - SMART CMMS
**Phụ trách chính:** SV05 (Mobile Engineer)  
**Đối tượng sử dụng:** Kỹ thuật viên bảo trì hiện trường (Field Technicians)

---

## 🎯 CÁC TÍNH NĂNG CHÍNH CẦN TRIỂN KHAI
1. **Quét mã QR thiết bị:**
   - Sử dụng Camera quét mã QR dán trên thân máy móc để giải mã chuỗi `AST-xxx`.
   - Nếu có mạng: Gọi API `GET /api/v1/assets/code/AST-xxx` hiển thị tức thì thông tin máy, thông số, lịch sử sửa chữa.
   - Nếu mất mạng: Tra cứu trong bảng SQLite cache đã lưu trước đó.
2. **Quản lý Phiếu công việc (Work Order Execution):**
   - Xem danh sách việc được phân công cho mình (`GET /api/v1/work-orders/my-tasks`).
   - Bấm nút **"Bắt đầu sửa"** $\to$ Chuyển trạng thái sang `IN_PROGRESS`.
   - Chọn vật tư, phụ tùng đã thay thế trong danh mục.
   - Nhập thời gian thực hiện, chụp ảnh đính kèm và ghi chú kết quả.
   - Bấm **"Hoàn thành"** $\to$ Chuyển trạng thái sang `COMPLETED`.
3. **CƠ CHẾ OFFLINE-FIRST (TIÊU CHÍ NGHIỆM THU ĐỒ ÁN):**
   - Lưu trữ cục bộ bằng **SQLite** (`sqflite`).
   - Mỗi khi kỹ thuật viên thực hiện hành động lúc mất mạng:
     - Tạo 1 mã `operation_uuid = Uuid().v4()`.
     - Lưu bản ghi vào bảng SQLite `sync_queue` với trạng thái `PENDING`.
     - Ứng dụng vẫn phản hồi thành công trên giao diện ngay lập tức.
   - Khi có kết nối mạng trở lại (lắng nghe `connectivity_plus`):
     - Tự động đóng gói danh sách operations gửi lên `POST /api/v1/sync/batch`.
     - Nhận phản hồi từ Backend và đổi trạng thái bản ghi sang `SYNCED` hoặc `CONFLICT`.
   - Màn hình Trạng thái đồng bộ: Cho phép Kỹ thuật viên xem danh sách các thao tác đang chờ, đã đồng bộ, hoặc bị lỗi.
