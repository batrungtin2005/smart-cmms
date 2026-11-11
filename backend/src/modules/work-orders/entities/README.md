# Entity phiếu công việc và vật tư sử dụng

## Thay đổi ngày 07/11/2026

### WorkOrder

SQL được đổi theo tên cột backend: `assigned_technician_id`, `start_time`, `completed_time`, `actual_repair_time_hours`.

| Nhóm | Thuộc tính entity / cột SQL |
|---|---|
| Người tạo | `createdById` / `created_by_id`, quan hệ `createdBy` bắt buộc, `ON DELETE RESTRICT` |
| Lịch nguồn | `scheduleId` / `schedule_id`, quan hệ `schedule`, `ON DELETE SET NULL` |
| Kế hoạch | `scheduledStartDate`, `scheduledEndDate` / `scheduled_start_date`, `scheduled_end_date` (DATE) |
| Chi phí | `estimatedCost`, `actualCostParts`, `actualCostLabor`, `totalActualCost`; NUMERIC(12,2), mặc định 0 |
| Hoàn thành | `completionNotes` / `completion_notes` |
| Nghiệm thu | `verificationNotes`, `verifiedById`, `verifiedAt`; quan hệ `verifiedBy` nullable, `ON DELETE SET NULL` |
| Offline | `clientUuid` / `client_uuid`, UUID nullable và unique |

`createdById` cần lấy từ tài khoản đã xác thực khi xây API tạo phiếu, không tin người gọi tự chọn người tạo.

### Sự cố và kết quả sửa chữa

- `breakdownTime` / `breakdown_time`: quản lý nhập thời điểm máy hỏng khi tạo phiếu sự cố. Nullable để lịch bảo dưỡng phòng ngừa không phải giả lập thời điểm hỏng.
- `startTime` / `start_time`: thời điểm KTV bắt đầu sửa.
- `completedTime` / `completed_time`: thời điểm KTV hoàn thành.
- `downtimeHours` / `downtime_hours`: cột GENERATED STORED, tự tính `(completed_time - breakdown_time)` theo giờ, làm tròn theo NUMERIC(10,2). Không cho ORM insert/update trực tiếp.
- Nếu thiếu breakdown/completed thì downtime là 0 (chưa có số liệu hoàn chỉnh), không phải đồng hồ tính downtime đang diễn ra.
- Constraint `chk_wo_completion_after_breakdown` không cho hoàn thành trước thời điểm hỏng.
- Ví dụ hỏng 08:00, bắt đầu sửa 10:00, hoàn thành 12:00: downtime = 4 giờ; thời gian sửa thực tế có thể là 2 giờ. Không đồng nhất hai chỉ số.
- `rootCause` ánh xạ `root_cause TEXT`: lưu giá trị nguyên nhân KTV chọn hoặc nhập tự do. Không tạo enum nguyên nhân cố định.
- `solution TEXT`: biện pháp xử lý do KTV nhập khi hoàn thành.
- `rootCause`, `solution` nullable khi tạo phiếu. Việc bắt buộc nhập khi chuyển COMPLETED và kiểm tra quyền phải được thực hiện trong service/DTO của luồng Work Order khi triển khai API; đợt này chưa có luồng đó.
- Tổng chi phí vẫn là cột lưu thường; chưa có service cộng tiền tự động.

### Enum và quan hệ

- `work-order.enums.ts` tách enum khỏi class để Schedule có thể dùng chung mà không phụ thuộc vòng khởi tạo enum. File entity cũ vẫn re-export enum để giữ tương thích import.
- Khai báo `enumName` là `work_order_type_enum`, `work_order_status_enum`, `work_order_priority_enum`, đúng tên và thứ tự giá trị SQL.
- `WorkOrderPart` ánh xạ bảng `work_order_parts`: quan hệ tới WO (`CASCADE`) và Part (`RESTRICT`), cặp WO/Part unique, `quantity_used > 0`, `subtotal` GENERATED STORED bằng số lượng × đơn giá.
- WorkOrderPart chỉ có `created_at` theo SQL, không kế thừa BaseEntity vì BaseEntity thêm `updated_at`.
- Ba entity WorkOrder, WorkOrderPart, MaintenanceSchedule được đăng ký ở AppModule. Đây là tầng dữ liệu, chưa phải API quản lý phiếu hay cron.
