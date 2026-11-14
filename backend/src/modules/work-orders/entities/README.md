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
- Đăng ký entity hiện chuyển sang WorkOrdersModule, gồm thêm lịch sử ở bước 3 bên dưới. API quản lý phiếu đã triển khai; cron thuộc bước sau.

## Cập nhật bước 3 (13/11/2026)

WorkOrdersModule hiện đăng ký WorkOrder, WorkOrderPart, MaintenanceSchedule và WorkOrderStatusHistory (thay cho đăng ký trực tiếp tại AppModule). Entity mới ánh xạ bảng work_order_status_history: UUID, workOrderId CASCADE, sequence số nguyên dương unique theo phiếu, fromStatus nullable/toStatus dùng chung work_order_status_enum, performedById RESTRICT, assignedTechnicianId SET NULL, reason và createdAt. Không có updatedAt vì đây là bản ghi lịch sử. SQL CHECK bắt buộc lý do khi tạm dừng/hủy. Service quản lý thứ tự trong transaction khóa phiếu; không khai báo quan hệ ngược không cần thiết trên User/WorkOrder.

## Entity yêu cầu vật tư

- MaterialRequest ánh xạ material_requests, dùng AppBaseEntity (UUID/createdAt/updatedAt); enum material_request_status_enum gồm PENDING, APPROVED, REJECTED, CANCELLED. Quan hệ tới WorkOrder/người gửi/người xử lý dùng RESTRICT để giữ chứng từ.
- MaterialRequestItem ánh xạ material_request_items, không có timestamp riêng; unique requestId/partId, quantity > 0. Đơn giá nullable và giao dịch kho nullable unique chỉ điền lúc xuất; các quan hệ RESTRICT.
- Cả hai được đăng ký bằng forFeature trong WorkOrdersModule, cùng Part/PartTransaction phục vụ cấp kho.
- WorkOrderPart đổi unique từ uq_wo_part (phiếu/vật tư) sang uq_wo_part_price (phiếu/vật tư/đơn giá). Mỗi giá là một nhóm riêng, giữ chi phí chính xác qua nhiều lần cấp. Migration giữ nguyên dữ liệu cũ, chỉ thay constraint; SQL khởi tạo đã đồng bộ.

## Snapshot và trạng thái sửa lại

work-order.enums.ts thêm REWORK_REQUIRED cuối enum PostgreSQL để giữ thứ tự enum hiện có. WorkOrder thêm assetStatusAtStart (asset_status_enum nullable) và operatingHoursAtFailure (numeric 10,2 nullable). Snapshot lần bắt đầu và bộ đếm lúc tạo phiếu giúp AssetHistory không lấy dữ liệu đã thay đổi ở thời điểm nghiệm thu; phiếu cũ để null. Không thêm entity lịch sử mới: AssetHistory hiện có được đăng ký trong WorkOrdersModule và được ghi trong transaction nghiệm thu. Migration: 20261113_work_order_completion.sql.
