# MODULE QUẢN LÝ THIẾT BỊ / TÀI SẢN (ASSETS)
**Phụ trách code chính:** SV02 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý bảng `assets`:
   - `id`, `asset_code` (duy nhất, ví dụ "AST-001"), `name`, `category`, `manufacturer`, `model`, `serial_number`, `location_id`, `status` (`OPERATIONAL`, `DOWN`, `MAINTENANCE`, `DECOMMISSIONED`), `install_date`, `warranty_expiry_date`, `operating_hours`, `qr_code_url`.
2. Viết API:
   - `GET /api/v1/assets`: Danh sách 300+ thiết bị (hỗ trợ phân trang, tìm kiếm theo mã/tên, lọc theo tình trạng, lọc theo vị trí).
   - `GET /api/v1/assets/:id`: Chi tiết 1 thiết bị kèm vị trí và lịch sử sửa chữa.
   - `GET /api/v1/assets/code/:code`: Tra cứu nhanh theo mã QR (dành cho Mobile Flutter).
   - `POST /api/v1/assets`: Thêm mới tài sản & sinh mã QR.
   - `PATCH /api/v1/assets/:id`: Cập nhật thông tin hoặc trạng thái tài sản.
3. Liên kết với SV06: Phối hợp kiểm tra tải trên tập 300 thiết bị đã seed.

## Cấu trúc thư mục:
- `entities/`: `asset.entity.ts`
- `dto/`: `create-asset.dto.ts`, `update-asset.dto.ts`, `query-asset.dto.ts`
- `assets.controller.ts`
- `assets.service.ts`
- `assets.module.ts`
