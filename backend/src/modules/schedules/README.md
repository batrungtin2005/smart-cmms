# MODULE LỊCH BẢO DƯỠNG ĐỊNH KỲ (MAINTENANCE SCHEDULES)
**Phụ trách code chính:** SV03 (Backend Engineer)

## Nhiệm vụ:
1. Quản lý bảng `maintenance_schedules`.
2. Hiện thực **3 Kiểu Lịch Bảo Dưỡng** theo yêu cầu đề bài:
   - **Kiểu 1 - Theo thời gian (Time-based):** Chu kỳ lặp lại theo ngày/tháng (ví dụ: kiểm tra mỗi 30 ngày).
   - **Kiểu 2 - Theo mức sử dụng (Usage/Meter-based):** Chu kỳ lặp lại theo giờ vận hành (ví dụ: bảo dưỡng sau mỗi 500 giờ chạy máy).
   - **Kiểu 3 - Theo tình trạng/ngưỡng (Condition-based):** Kiểm tra khi giá trị cảm biến/đo đạc vượt ngưỡng an toàn (ví dụ: nhiệt độ > 85°C hoặc độ rung > 5mm/s).
3. Tích hợp NestJS Scheduler (`@Cron()`):
   - Quét định kỳ hàng ngày/hàng giờ để phát hiện lịch đến hạn $\to$ tự động sinh ra Work Order ở trạng thái `OPEN`.
   - Cảnh báo công việc sắp đến hạn (màu vàng) hoặc quá hạn (màu đỏ).
4. Viết API:
   - `GET /api/v1/schedules`: Danh sách các quy tắc lịch bảo dưỡng.
   - `POST /api/v1/schedules`: Tạo lịch bảo dưỡng mới theo 1 trong 3 kiểu.
   - `GET /api/v1/schedules/due`: Danh sách lịch đến hạn hoặc quá hạn.

## Cấu trúc thư mục:
- `entities/`: `maintenance-schedule.entity.ts`
- `dto/`: `create-schedule.dto.ts`
- `schedules.controller.ts`
- `schedules.service.ts`
- `schedules.scheduler.ts` (Cron job runner)
- `schedules.module.ts`
