# MODULE QUẢN LÝ VỊ TRÍ NHÀ XƯỞNG (LOCATIONS)
**Phụ trách code chính:** SV02 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý bảng `locations` (Cấu trúc phân cấp hình cây: Nhà máy $\to$ Xưởng $\to$ Dây chuyền/Khu vực).
2. Viết API:
   - `GET /api/v1/locations`: Danh sách vị trí (dạng cây hoặc phẳng).
   - `POST /api/v1/locations`: Thêm vị trí mới.
   - `PATCH /api/v1/locations/:id`: Sửa vị trí.

## Cấu trúc thư mục:
- `entities/`: `location.entity.ts`
- `dto/`: `create-location.dto.ts`
- `locations.controller.ts`
- `locations.service.ts`
- `locations.module.ts`
