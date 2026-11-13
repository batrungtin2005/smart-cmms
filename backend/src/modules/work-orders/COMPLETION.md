# Hoàn thành, nghiệm thu và lịch sử bảo trì

## API

Prefix `/api/v1`, Bearer JWT bắt buộc.

| API | Quyền | Chuyển trạng thái |
| --- | --- | --- |
| PATCH `/work-orders/:id/complete` | TECHNICIAN được giao | IN_PROGRESS → COMPLETED |
| PATCH `/work-orders/:id/verify`, decision ACCEPT | ADMIN / MAINTENANCE_MANAGER | COMPLETED → CLOSED |
| PATCH `/work-orders/:id/verify`, decision REJECT | ADMIN / MAINTENANCE_MANAGER | COMPLETED → REWORK_REQUIRED |
| PATCH `/work-orders/:id/status`, status IN_PROGRESS | TECHNICIAN được giao | REWORK_REQUIRED → IN_PROGRESS (làm lại) |

`REWORK_REQUIRED` hiển thị là **Cần sửa lại / Nghiệm thu không đạt**. ON_HOLD vẫn dành cho việc tạm dừng đang sửa, chẳng hạn chờ vật tư. KTV phải chủ động bấm Làm lại trước khi tiếp tục sửa hoặc gửi thêm yêu cầu vật tư.

Hoàn thành:

```json
{
  "rootCause": "Vòng bi mòn",
  "solution": "Thay vòng bi và căn chỉnh trục",
  "completionNotes": "Đã chạy thử"
}
```

rootCause bắt buộc, trim, tối đa 255 ký tự để khớp failure_cause trong AssetHistory. solution bắt buộc, tối đa 10.000 ký tự. completionNotes tùy chọn, tối đa 10.000 ký tự. Không nhận lại vật tư, chi phí, người thực hiện hay timestamp từ client. Phiếu có yêu cầu vật tư PENDING chưa được hoàn thành: phải duyệt, từ chối hoặc hủy trước.

Nghiệm thu:

```json
{ "decision": "ACCEPT", "verificationNotes": "Chạy thử đạt yêu cầu" }
```

decision chỉ ACCEPT/REJECT. verificationNotes bắt buộc, trim, tối đa 1.000 ký tự cho cả hai kết quả. ACCEPT ghi verifiedById/verifiedAt từ JWT/thời gian server. REJECT ghi lý do và người thực hiện vào statusHistory; trả REWORK_REQUIRED, xóa completedTime/verifiedAt/verifiedById, giữ startTime đầu tiên, rootCause/solution lần trước và toàn bộ vật tư đã cấp. KTV cập nhật kết quả khi hoàn thành lại. Lịch sử kỹ thuật chính thức lưu kết quả được nghiệm thu cuối cùng; statusHistory giữ các lần chuyển trạng thái và ghi chú.

## Thời gian

- completedTime lấy từ server sau khi khóa phiếu.
- downtimeHours là cột PostgreSQL sinh tự động: completedTime − breakdownTime, đơn vị giờ. Không trừ thời gian chờ. Sau REJECT, completedTime null nên downtime tạm về 0; lần hoàn thành sau tính lại đến thời điểm mới.
- actualRepairTimeHours cộng tất cả khoảng IN_PROGRESS, loại ON_HOLD, COMPLETED (chờ nghiệm thu) và REWORK_REQUIRED (chờ làm lại), làm tròn hai chữ số sau khi cộng toàn bộ.
- Timestamp lịch sử mới được ghi tại thời điểm thao tác sau khi lấy khóa, dùng cùng mốc với startTime/completedTime; không dùng thời điểm bắt đầu transaction có thể nằm trước thời gian chờ khóa.
- Lịch sử phải có lần ASSIGNED → IN_PROGRESS đầu tiên và các chuyển tiếp liên tục. Dữ liệu cũ thiếu lịch sử hoặc mốc thời gian không hợp lệ trả 409 để đối soát; không đoán giờ sửa. Chấp nhận chênh tối đa 60 giây giữa timestamp lịch sử bắt đầu cũ và startTime (trước đây lịch sử dùng thời gian bắt đầu transaction), dùng startTime làm mốc đầu.

## Trạng thái thiết bị và nhiều phiếu

Khóa Work Order trước, rồi khóa Asset. Không khóa ngược các phiếu cùng thiết bị. Khi tạo phiếu sự cố, bắt đầu/tạm dừng/tiếp tục, hoàn thành, trả sửa lại, nghiệm thu hoặc hủy, service áp dụng:

1. Thiết bị inactive hoặc DECOMMISSIONED được giữ nguyên; không được bắt đầu/tiếp tục sửa trên thiết bị này, nhưng có thể hoàn tất/nghiệm thu công việc đã làm.
2. Có phiếu IN_PROGRESS/ON_HOLD/COMPLETED/REWORK_REQUIRED → MAINTENANCE.
3. Không có phiếu ở bước 2 nhưng còn phiếu CORRECTIVE/EMERGENCY OPEN/ASSIGNED → DOWN.
4. Nghiệm thu đạt/hủy phiếu và không còn các phiếu chặn trên → OPERATIONAL. Phiếu PREVENTIVE/INSPECTION mới lên kế hoạch OPEN/ASSIGNED không chặn hoạt động thiết bị.

Đây là quy tắc trạng thái do vòng đời Work Order quản lý. Thiết bị chỉ được tự khôi phục khi không còn công việc chặn. API Assets.update/updateStatus không cho đặt OPERATIONAL vượt quy tắc này. Sửa thông tin danh mục không ghi đè trạng thái/tồn tại đã được luồng khác cập nhật.

## AssetHistory và số liệu

Chỉ ghi một AssetHistory chính thức khi ACCEPT, trong cùng transaction với CLOSED, statusHistory và trạng thái thiết bị. Lỗi ở bất kỳ bước nào rollback toàn bộ. Yêu cầu nghiệm thu lặp trả 409; nếu dữ liệu cũ đã có history gắn phiếu, phải đối soát thay vì tự ghi thêm.

History chụp rootCause/solution, thời gian, vật tư theo từng giá đã cấp, chi phí, KTV thực hiện và trạng thái thiết bị. CORRECTIVE/EMERGENCY là CORRECTIVE_REPAIR và isFailureCounted=true; PREVENTIVE/INSPECTION có loại sự kiện tương ứng và không tính lần hỏng. Một phiếu sự cố được tính một lần khi đóng, không tính thêm vì sửa lại. Những phiếu khác nhau được coi là các công việc/sự cố riêng; cần tránh tạo nhiều phiếu trùng cùng một sự cố khi nhập liệu.

WorkOrder lưu assetStatusAtStart tại lần bắt đầu đầu tiên; operatingHoursAtFailure là ảnh chụp bộ đếm hiện có khi tạo phiếu sự cố, không suy ngược số giờ tại breakdownTime đã nhập trong quá khứ. Phiếu cũ không có ảnh chụp giữ null; history chấp nhận null cho hai dữ liệu tương ứng. timeBetweenFailuresHours để null trong luồng này; chưa triển khai thuật toán TBF theo lịch sử bộ đếm.

Khi đóng phiếu, tính lại bộ đếm và cache số liệu Asset từ lịch sử: totalFailures, totalRepairTimeHours, cachedMttrHours, cachedMtbfHours theo công thức hiện có (operatingHours / số lần hỏng), lastFailureDate, metricsLastUpdatedAt. Đây chưa phải module báo cáo MTTR/MTBF theo kỳ. Cache Redis assets:* được yêu cầu xóa sau commit.

API ghi history thủ công từ chối workOrderId; khi thiết bị có phiếu chưa đóng/hủy cũng không được ghi thủ công. Luồng xuất kho độc lập issue-to-asset tương tự bị chặn khi còn phiếu: dùng yêu cầu vật tư. Điều này tránh tự đánh dấu sửa xong hoặc ghi trùng lịch sử qua các API cũ.

## Triển khai và kiểm thử

Database cũ chạy lần lượt các migration còn thiếu: lịch sử trạng thái → yêu cầu vật tư → `20261113_work_order_completion.sql`. Migration mới thêm enum REWORK_REQUIRED, hai cột snapshot trên WorkOrder và cho phép null trên hai cột history; không backfill hay sửa dữ liệu cũ. Chờ COMMIT rồi khởi động backend mới. Enum thêm vào không có rollback xóa tự động. Frontend/mobile cần bổ sung nhãn/bộ lọc REWORK_REQUIRED.

Unit test kiểm tra phép cộng giờ, khoảng chờ nghiệm thu/sửa lại, timeline thiếu/sai. Integration test PostgreSQL kiểm tra phân quyền, pending vật tư, hoàn thành/đóng lặp, nhiều phiếu chung thiết bị, snapshot lịch sử/chi phí, REJECT rồi sửa lại, rollback khi ghi history lỗi, giữ trạng thái DECOMMISSIONED và chặn các API cũ bỏ qua vòng đời. Tất cả dùng schema riêng; không chạy migration trên schema ứng dụng.
