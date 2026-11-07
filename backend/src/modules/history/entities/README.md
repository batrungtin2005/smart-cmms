# Entity lịch sử bảo trì

## Thay đổi ngày 07/11/2026

- `eventType` dùng `enumName: maintenance_event_type_enum`.
- `statusBefore` và `statusAfter` cùng dùng `enumName: asset_status_enum`, khớp Asset và SQL.
- `partsReplaced` được ánh xạ tường minh đến cột `parts_replaced` (JSONB). Tên thuộc tính TypeScript giữ nguyên để các service hiện có không phải đổi cách truy cập.

Thay đổi này không sửa công thức KPI hoặc cơ chế ghi log. `downtime_hours` của History vẫn là số liệu snapshot được lưu; chỉ `downtime_hours` của Work Order là cột PostgreSQL tự tính trong đợt sửa này. Khi xây luồng hoàn thành phiếu, cần chép giá trị Work Order đã tính sang log tương ứng.
