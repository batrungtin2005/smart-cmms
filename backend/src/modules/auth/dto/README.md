# DTO tài khoản

## Thay đổi ngày 11/11/2026

- `create-user.dto.ts`, `update-user.dto.ts`: mô tả Swagger của `roleId` dùng tên vai trò chuẩn `MAINTENANCE_MANAGER`.
- `roleId` vẫn là số nguyên; lấy ID thực tế từ `GET /api/v1/auth/roles`. Không giả định vai trò quản lý luôn có ID 2 vì thứ tự seed/dữ liệu giữa các database có thể khác nhau.
- Không thay đổi validation, quyền tạo/sửa tài khoản hoặc dữ liệu database.
