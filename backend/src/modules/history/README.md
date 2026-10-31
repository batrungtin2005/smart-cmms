# MODULE NHẬT KÝ THIẾT BỊ (ASSET HISTORY)
**Phụ trách code chính:** SV02 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý bảng `asset_history`:
   - Ghi lại mọi biến động lịch sử bảo dưỡng, sửa chữa, thay linh kiện của thiết bị (không chỉ cập nhật đè trạng thái của máy).
2. Viết API:
   - `GET /api/v1/assets/:assetId/history`: Lấy toàn bộ dòng thời gian (timeline) sự kiện của máy.
   - Hàm service nội bộ: `createHistoryLog(...)` để các module WorkOrder và Parts gọi mỗi khi hoàn thành sửa chữa.

## Cấu trúc thư mục:
- `entities/`: `asset-history.entity.ts`
- `history.controller.ts`
- `history.service.ts`
- `history.module.ts`
