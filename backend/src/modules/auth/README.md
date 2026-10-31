# MODULE XÁC THỰC & PHÂN QUYỀN (AUTH & USERS)
**Phụ trách code chính:** SV01 (Leader & System Architect)

## Nhiệm vụ:
1. Quản lý 2 bảng Database: `roles` và `users`.
2. Viết API Đăng nhập: `POST /api/v1/auth/login` (Xác thực mật khẩu với bcrypt, sinh JWT Token).
3. Viết API Lấy thông tin cá nhân: `GET /api/v1/auth/me` (Lấy thông tin người dùng đang đăng nhập).
4. Viết API Quản lý tài khoản Kỹ thuật viên & Quản lý: CRUD người dùng cho trang Admin (Web SV04 gọi).

## Cấu trúc thư mục:
- `entities/`: `user.entity.ts`, `role.entity.ts`
- `dto/`: `login.dto.ts`, `create-user.dto.ts`
- `strategies/`: `jwt.strategy.ts`
- `auth.controller.ts`
- `auth.service.ts`
- `auth.module.ts`
