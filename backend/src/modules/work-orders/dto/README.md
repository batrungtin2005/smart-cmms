# DTO Work Order — bước 1–2, ngày 11/11/2026

## File mới

- `create-work-order.dto.ts`: assetId UUID, tiêu đề trim/không rỗng/tối đa 255, mô tả tối đa 10.000 ký tự, enum type/priority, breakdownTime có múi giờ, ngày kế hoạch YYYY-MM-DD, chi phí dự kiến không âm/tối đa 2 chữ số thập phân.
- `assign-work-order.dto.ts`: chỉ nhận assignedTechnicianId UUID.
- `query-work-orders.dto.ts`: pagination chuyển chuỗi query sang số; page 1–1.000.000, limit 1–100; bộ lọc enum/UUID, search tối đa 200 ký tự, createdFrom/createdTo có múi giờ.
- `MyWorkOrdersQueryDto` không có assignedTechnicianId; `QueryWorkOrdersDto` kế thừa bộ lọc và thêm assignedTechnicianId cho quản lý.

Global ValidationPipe dùng transform, whitelist, forbidNonWhitelisted. Không cho người gọi chèn createdById/status/mã phiếu/downtime vào body tạo phiếu. type/priority truyền null sẽ bị từ chối thay vì bỏ qua enum/default.

Service xử lý quy tắc cần ngữ cảnh: breakdownTime bắt buộc với CORRECTIVE/EMERGENCY và không ở tương lai, thứ tự ngày kế hoạch/khoảng lọc, tài sản tồn tại, người nhận là TECHNICIAN hoạt động.

DTO hoàn thành và dùng vật tư thuộc bước sau; DTO chuyển trạng thái/hủy được bổ sung ở bước 3 bên dưới. Chi tiết API và kiểm thử xem README ở thư mục work-orders.

## ChangeWorkOrderStatusDto — bước 3

Chấp nhận status IN_PROGRESS / ON_HOLD / CANCELLED. reason được trim, tối đa 1000 ký tự; bắt buộc khi ON_HOLD hoặc CANCELLED, không nhận null/rỗng nếu có gửi. Các trường timestamp/actor không được nhận từ client. ValidationPipe từ chối trường ngoài DTO. Service kiểm tra quyền, người được giao và trạng thái hiện tại dưới khóa database.
