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

## Lịch sử từ nghiệm thu Work Order

HistoryService.createHistoryLog từ chối workOrderId: phiếu chỉ có lịch sử chính thức qua WorkOrdersService.verify(ACCEPT). Ghi lịch sử thủ công chạy trong transaction khóa Asset, bị chặn nếu còn Work Order chưa CLOSED/CANCELLED, tránh ghi trùng hoặc phục hồi máy trước nghiệm thu. Repository ghi log/cập nhật Asset và việc tính cache MTTR/MTBF trong thao tác thủ công dùng cùng transaction để đọc được log vừa ghi.

WorkOrdersService tạo AssetHistory trực tiếp trong transaction đóng phiếu: thời gian/giờ sửa đã loại khoảng chờ, vật tư/đơn giá/chi phí đã cấp, nguyên nhân/giải pháp và KTV. REJECT không tạo AssetHistory, chỉ ghi statusHistory và trả REWORK_REQUIRED. Chính sách chi tiết, giới hạn dữ liệu cũ và kiểm thử xem work-orders/COMPLETION.md.
