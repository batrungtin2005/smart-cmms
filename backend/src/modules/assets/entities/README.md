# Entity thiết bị

## Thay đổi ngày 07/11/2026

Trong `asset.entity.ts`, khai báo tên enum PostgreSQL tường minh:

| Thuộc tính | Enum PostgreSQL |
|---|---|
| `status` | `asset_status_enum` |
| `criticality` | `asset_criticality_enum` |

Giá trị enum và nghiệp vụ hiện có được giữ nguyên. `enumName` giúp TypeORM sử dụng đúng kiểu enum trong `smart_cmms_db.sql`, tránh tự suy ra một tên kiểu khác. Enum trạng thái thiết bị này cũng được dùng cho trạng thái trước/sau sửa chữa trong History.

Enum được tách sang `asset.enums.ts` để tránh vòng import Asset → History → Asset làm `AssetStatus` chưa được khởi tạo khi đọc decorator của History. `asset.entity.ts` vẫn re-export enum, giữ tương thích các import cũ; History lấy enum trực tiếp từ file mới.
