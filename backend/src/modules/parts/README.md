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
