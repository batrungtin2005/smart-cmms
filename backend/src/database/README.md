# THƯ MỤC DATABASE (MIGRATIONS & SEEDS)
**Phụ trách chính:** SV06 (QA/DevOps) phối hợp cùng SV02 và SV03

## Nhiệm vụ:
1. `migrations/`: Quản lý các file migration thay đổi cấu trúc bảng theo chuẩn.
2. `seeds/`: Script sinh dữ liệu lớn để phục vụ kiểm thử và nghiệm thu:
   - `seed-users.ts`: 3 tài khoản mẫu (Admin, Manager, Technician).
   - `seed-assets.ts`: **Đủ 300 thiết bị** (AST-001 đến AST-300) phân bổ khắp các phân xưởng.
   - `seed-parts.ts`: 50+ loại phụ tùng công nghiệp và tồn kho thực tế.
   - `seed-work-orders.ts`: **Đủ 1.000 phiếu Work Order** có ngày bắt đầu, ngày kết thúc và thời gian sửa chữa trong vòng 6 tháng để tính MTTR/MTBF.
