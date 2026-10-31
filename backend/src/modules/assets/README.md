# MODULE QUẢN LÝ THIẾT BỊ / TÀI SẢN (ASSETS)
**Phụ trách code chính:** SV02 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý bảng `assets`:
   - `id`, `asset_code` (duy nhất, ví dụ `"AST-001"`), `name`, `category`, `manufacturer`, `model`, `serial_number`, `location_id`, `status`, `install_date`, `warranty_expiry_date`, `operating_hours`, `qr_code_url`.
   - **Trạng thái tài sản (`status`):**
     - `OPERATIONAL`: Đang hoạt động bình thường.
     - `DOWN`: Hỏng hóc, ngừng hoạt động.
     - `MAINTENANCE`: Đang trong quá trình bảo dưỡng / sửa chữa.
     - `DECOMMISSIONED`: Đã thanh lý, ngừng sử dụng.

2. Viết API:
   - `GET /api/v1/assets`: Danh sách thiết bị (phân trang, tìm kiếm theo mã/tên, lọc theo `status`, lọc theo `location_id`).
   - `GET /api/v1/assets/:id`: Chi tiết 1 thiết bị, kèm thông tin vị trí (`location`) và lịch sử công việc liên quan.
   - `GET /api/v1/assets/code/:code`: Tra cứu nhanh theo `asset_code` — dùng cho Mobile Flutter quét QR.
   - `POST /api/v1/assets`: Thêm mới tài sản và tự động sinh `qr_code_url`.
   - `PATCH /api/v1/assets/:id`: Cập nhật thông tin hoặc chuyển trạng thái tài sản.

3. Liên kết với các module khác:
   - **SV06 (Seeding & Testing):** Phối hợp seed đủ 300+ thiết bị, kiểm tra tải với dữ liệu thực tế.
   - **SV03 (Work Orders):** `work_orders` tham chiếu `asset_id` để tạo phiếu công việc cho thiết bị.
   - **SV05 (Maintenance Schedule):** Lịch bảo dưỡng định kỳ gắn với từng `asset_id`.

## Cấu trúc thư mục:
```
assets/
├── entities/
│   └── asset.entity.ts
├── dto/
│   ├── create-asset.dto.ts
│   ├── update-asset.dto.ts
│   └── query-asset.dto.ts
├── assets.controller.ts
├── assets.service.ts
└── assets.module.ts
```

## Lưu ý triển khai:
- `asset_code` phải là **duy nhất** trong toàn hệ thống, áp dụng `UNIQUE` constraint ở DB.
- API `GET /api/v1/assets/code/:code` phải đặt **trước** route `GET /api/v1/assets/:id` trong controller để NestJS không nhầm `code` với `id`.
- `qr_code_url` sinh tự động khi tạo mới, có thể dùng thư viện `qrcode` hoặc lưu URL tĩnh theo quy ước `"/qr/{asset_code}.png"`.
- Khi `status` chuyển sang `MAINTENANCE` hoặc `DOWN`, nên emit event để module Work Orders có thể xử lý nếu cần.
