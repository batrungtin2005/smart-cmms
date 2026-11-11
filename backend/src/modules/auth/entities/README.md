# Entity tài khoản và vai trò

## Thay đổi ngày 07/11/2026

- `Role.id` giữ nguyên số nguyên tự tăng, khớp `roles.id SERIAL` và khóa ngoại `users.role_id INTEGER`.
- Role chỉ có `id`, `name`, `description`, `created_at`. SQL đã bỏ `permissions`, `updated_at` và không gắn trigger cập nhật `updated_at` lên bảng này nữa.
- Các vai trò thống nhất: `ADMIN`, `MANAGER`, `TECHNICIAN`, `WAREHOUSE_KEEPER`.
- `User.avatarUrl` ánh xạ cột `avatar_url VARCHAR(500) NULL`; giữ thông tin ảnh đại diện theo yêu cầu.
- Quan hệ User → Role là bắt buộc, `ON DELETE RESTRICT`, khớp SQL.
- Các mốc `created_at`, `updated_at` của User và `created_at` của Role khai báo rõ `timestamptz`.
- SQL dùng `username VARCHAR(50) NOT NULL UNIQUE`, `full_name`/`email` tối đa 100 ký tự, `phone_number`, `is_active` để khớp entity. SQL bỏ `employee_code`, `status`, `last_login_at` và enum trạng thái người dùng không còn dùng.

`avatarUrl` mới được bổ sung ở tầng lưu trữ/entity. DTO tạo tài khoản hiện chưa nhận trường này; chưa có API tải ảnh hoặc sửa ảnh đại diện trong thay đổi này.
