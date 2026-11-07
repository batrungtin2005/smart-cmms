# Entity lịch bảo dưỡng

## Thay đổi ngày 07/11/2026

Thêm `maintenance-schedule.entity.ts`, ánh xạ đầy đủ bảng `maintenance_schedules`:

- Mã lịch unique, thiết bị, người tạo bắt buộc, tiêu đề và mô tả.
- Enum `ScheduleType` dùng tên PostgreSQL `schedule_type_enum`: TIME_BASED, USAGE_BASED, CONDITION_BASED.
- Thời gian: `intervalDays`, `nextDueDate`.
- Giờ chạy: `intervalHours`, `operatingHoursAtLastTrigger`, `nextDueHours`.
- Điều kiện: `conditionParameter`, `conditionThreshold`, `conditionOperator`.
- `priority` dùng chung `work_order_priority_enum` với WorkOrder.
- Người được giao, thời lượng dự kiến, trạng thái bật/tắt, lần kích hoạt gần nhất, số ngày báo trước.
- Quan hệ Asset (`CASCADE`), người tạo (`RESTRICT`), người được giao (`SET NULL`), phiếu gần nhất (`SET NULL`, constraint `fk_schedule_last_wo`).
- Giữ `assigned_to_id` của bảng lịch theo SQL; chỉ bảng Work Order đổi thành `assigned_technician_id` để khớp backend cũ.
- Các trường DATE dùng chuỗi ngày để không vô tình dịch ngày theo múi giờ. Các mốc thời gian đầy đủ dùng `timestamptz`.

Entity đã đăng ký tại AppModule để giải quyết quan hệ từ WorkOrder. Chưa bổ sung CRUD, validation theo từng kiểu lịch hoặc cron sinh phiếu; các phần này thuộc bước triển khai nghiệp vụ tiếp theo.
