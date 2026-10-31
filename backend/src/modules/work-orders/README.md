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
