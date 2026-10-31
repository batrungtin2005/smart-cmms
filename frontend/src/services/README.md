# THƯ MỤC DỊCH VỤ GỌI API (SERVICES)
**Phụ trách code chính:** SV04 (Frontend Engineer)

Tập trung toàn bộ các hàm gọi API Backend (NestJS) qua Axios hoặc Fetch API:
- `api-client.ts`: Cấu hình Base URL (`http://localhost:3000/api/v1`), tự động gắn JWT Bearer Token vào Headers.
- `auth.service.ts`: Gọi `POST /auth/login`, `GET /auth/me`.
- `asset.service.ts`: Gọi API quản lý thiết bị và vị trí (kết nối với SV02).
- `work-order.service.ts`: Gọi API quản lý phiếu công việc và chuyển đổi trạng thái (kết nối với SV03).
- `part.service.ts`: Gọi API phụ tùng và xuất/nhập kho (kết nối với SV02).
- `report.service.ts`: Lấy dữ liệu KPI MTTR/MTBF cho Dashboard (kết nối với SV03).
