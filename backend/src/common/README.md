# THƯ MỤC COMMON (HẠ TẦNG CHUNG)
**Phụ trách code chính:** SV01 (Leader & System Architect)

## Mục đích:
Xây dựng nền tảng dùng chung cho toàn bộ Backend để các bạn SV02, SV03 kế thừa và sử dụng thống nhất.

## Cấu trúc đề xuất:
- `base.entity.ts`: Lớp thực thể cơ sở chứa `id` (UUID), `created_at`, `updated_at`.
- `guards/`:
  - `jwt-auth.guard.ts`: Bảo vệ các API yêu cầu đăng nhập.
  - `roles.guard.ts`: Kiểm tra vai trò người dùng (ADMIN, MAINTENANCE_MANAGER, TECHNICIAN).
- `decorators/`:
  - `roles.decorator.ts`: Decorator `@Roles('ADMIN', 'MAINTENANCE_MANAGER')`.
  - `current-user.decorator.ts`: Lấy thông tin user hiện tại từ Request (`@CurrentUser()`).
- `filters/`:
  - `http-exception.filter.ts`: Chuẩn hóa định dạng lỗi toàn hệ thống về dạng chuẩn JSON.
- `interceptors/`:
  - `transform.interceptor.ts`: Tự động bao bọc kết quả trả về `{ success: true, statusCode: 200, data: ... }`.
