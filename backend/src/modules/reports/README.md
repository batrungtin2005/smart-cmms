# MODULE BÁO CÁO & CHỈ SỐ BẢO TRÌ (REPORTS & KPI)
**Phụ trách code chính:** SV03 (Backend Engineer)

## Nhiệm vụ:
1. Tính toán 2 chỉ số bảo trì cốt lõi theo dữ liệu thực tế trong hệ thống:
   - **MTTR (Mean Time To Repair):**
     $$\text{MTTR} = \frac{\sum \text{Thời gian sửa chữa thực tế (giờ)}}{\text{Số lần sửa chữa hoàn tất}}$$
   - **MTBF (Mean Time Between Failures):**
     $$\text{MTBF} = \frac{\text{Tổng thời gian hoạt động của máy (giờ)}}{\text{Số khoảng thời gian giữa các lần hỏng}}$$
2. Thống kê tổng hợp:
   - Tỉ lệ phân bố thiết bị theo trạng thái (Hoạt động, Hỏng hóc, Đang bảo trì, Ngừng hoạt động).
   - Tỉ lệ Work Order theo mức độ ưu tiên và trạng thái.
   - Thống kê top 5 máy hỏng nhiều nhất và top 5 phụ tùng tiêu hao nhiều nhất.
3. Viết API:
   - `GET /api/v1/reports/dashboard`: Dữ liệu tổng hợp cho trang Dashboard của SV04.
   - `GET /api/v1/reports/kpi/mttr-mtbf`: Dữ liệu chi tiết về chỉ số MTTR/MTBF theo thời gian.

## Cấu trúc thư mục:
- `dto/`: `kpi-response.dto.ts`
- `reports.controller.ts`
- `reports.service.ts`
- `reports.module.ts`
