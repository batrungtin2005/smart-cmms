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

## Đồng bộ ngày 07/11/2026

- `auth.controller.ts`: quyền xem danh sách người dùng dùng `MAINTENANCE_MANAGER`, khớp vai trò seed trong SQL và AuthService. ADMIN vẫn được truy cập; quyền tạo tài khoản vẫn chỉ ADMIN.
- Chi tiết thay đổi User/Role và ánh xạ SQL được ghi trong `entities/README.md`.

## Chốt tên vai trò ngày 11/11/2026

Thống nhất `MAINTENANCE_MANAGER` theo quyết định mới. Đã cập nhật kiểm tra quyền GET /auth/users; cơ chế seed trong AuthService đã dùng tên này nên giữ nguyên. Tài khoản có role tên cũ cần được chuyển sang role chuẩn trong một bước xử lý dữ liệu riêng; thay đổi source này không tự sửa role hoặc JWT đã phát hành.
