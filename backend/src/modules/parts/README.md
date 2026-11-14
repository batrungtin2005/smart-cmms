# MODULE QUẢN LÝ PHỤ TÙNG & KHO (PARTS & INVENTORY)
**Phụ trách code chính:** SV02 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý 2 bảng: `parts` và `part_transactions`.
2. Kiểm soát chặt chẽ tồn kho:
   - Ngưỡng tối thiểu `minimum_stock` để cảnh báo sắp hết vật tư.
   - Khi kỹ thuật viên dùng phụ tùng trong Work Order: Tự động trừ tồn kho và ghi log vào `part_transactions` (sử dụng Database Transaction & Pessimistic Lock để không bao giờ bị tồn kho âm).
3. Viết API:
   - `GET /api/v1/parts`: Danh sách phụ tùng, số lượng tồn, lọc cảnh báo sắp hết hàng.
   - `POST /api/v1/parts`: Tạo mã phụ tùng mới (`PART-xxx`).
   - `POST /api/v1/parts/:id/adjust`: Nhập thêm kho hoặc điều chỉnh kiểm kê.
   - `GET /api/v1/parts/:id/transactions`: Lịch sử xuất/nhập của một phụ tùng.

## Cấu trúc thư mục:
- `entities/`: `part.entity.ts`, `part-transaction.entity.ts`
- `dto/`: `create-part.dto.ts`, `stock-transaction.dto.ts`
- `parts.controller.ts`
- `parts.service.ts`
- `parts.module.ts`

## Tích hợp yêu cầu vật tư SV03

PartsController áp dụng JwtAuthGuard/RolesGuard: đọc cho TECHNICIAN/MAINTENANCE_MANAGER/WAREHOUSE_KEEPER/ADMIN; tạo/sửa/vô hiệu hóa danh mục, BOM, điều chỉnh và xuất kho chỉ WAREHOUSE_KEEPER/ADMIN. Client cần gửi Bearer token. API adjust/issue-to-asset không nhận Work Order để xuất thẳng nữa: service từ chối workOrderId, hướng sang material-requests/:id/approve. Xuất độc lập không gắn phiếu vẫn tồn tại. performedById của hai API lấy từ JWT; quantity phải nguyên dương trong giới hạn 1.000.000, phụ tùng phải hoạt động.

update/remove dùng UPDATE các trường thay đổi, tránh save toàn entity làm ghi đè currentStock trong lúc duyệt cấp kho. getTransactions chỉ chọn id/username/fullName của người thực hiện, không trả passwordHash. Luồng cấp theo phiếu mới nằm ở work-orders/material-requests.service.ts, ghi EXPORT và chi phí trong một transaction, chưa kết luận thiết bị đã sửa xong.

Integration tests tại work-orders/work-orders.integration.spec.ts nạp cả PartsModule để kiểm tra JWT, chặn KTV xuất trực tiếp, chặn bypass workOrderId và không lộ mật khẩu trong lịch sử giao dịch.

## Bảo vệ trạng thái thiết bị khi nghiệm thu

issuePartToAsset (xuất kho độc lập) khóa Asset và từ chối nếu thiết bị còn phiếu chưa CLOSED/CANCELLED. Cấp vật tư cho công việc đang mở phải qua MaterialRequestsService, không dùng API độc lập vốn tự ghi AssetHistory/đổi thiết bị sang OPERATIONAL. Lỗi trả 409 và rollback, không trừ kho. Test tích hợp xác nhận tồn kho giữ nguyên khi bị chặn.
