# Yêu cầu vật tư và duyệt xuất kho

## Quy trình

1. Quản lý tạo/giao phiếu; KTV bắt đầu công việc.
2. KTV được giao gửi yêu cầu khi phiếu IN_PROGRESS hoặc ON_HOLD. Một yêu cầu có 1–50 loại vật tư, mỗi loại xuất hiện một lần, số lượng nguyên dương tối đa 1.000.000.
3. Yêu cầu PENDING nằm trong danh sách của thủ kho. Chưa giữ chỗ hoặc trừ tồn kho. Gửi yêu cầu không tự đổi trạng thái Work Order.
4. WAREHOUSE_KEEPER hoặc ADMIN chọn **Duyệt và xuất kho**: cấp đủ tất cả dòng, trừ kho, ghi giao dịch EXPORT, chụp đơn giá, cập nhật vật tư/chi phí phiếu và chuyển APPROVED trong cùng transaction. APPROVED nghĩa là đã xuất vật tư, không cần thêm bước lấy hàng trong API.
5. Thủ kho có thể từ chối (REJECTED); KTV gửi yêu cầu có thể hủy (CANCELLED). Cả hai phải nhập lý do. Chỉ xử lý yêu cầu PENDING; chưa hỗ trợ duyệt từng phần, đổi số lượng, trả vật tư hoặc sửa yêu cầu đã gửi. Muốn sửa: hủy và tạo yêu cầu mới.

Từ chối/hủy không thay đổi kho. Nếu bất kỳ vật tư nào không hoạt động hoặc thiếu tồn, toàn bộ lần duyệt rollback, yêu cầu vẫn PENDING. Có thể duyệt lại sau khi nhập đủ kho hoặc từ chối để KTV gửi yêu cầu mới.

## API (prefix `/api/v1`)

| Method | URL | Quyền |
| --- | --- | --- |
| POST | `/work-orders/:id/material-requests` | TECHNICIAN được giao |
| GET | `/material-requests?status=PENDING&page=1&limit=20&workOrderId=<UUID>` | Thủ kho/Admin/quản lý; KTV chỉ thấy yêu cầu của mình |
| GET | `/material-requests/:id` | Như danh sách |
| PATCH | `/material-requests/:id/approve` | WAREHOUSE_KEEPER / ADMIN |
| PATCH | `/material-requests/:id/reject` | WAREHOUSE_KEEPER / ADMIN |
| PATCH | `/material-requests/:id/cancel` | TECHNICIAN đã gửi yêu cầu |

Tất cả cần JWT. MAINTENANCE_MANAGER chỉ xem, không duyệt xuất kho. Filter status và workOrderId là tùy chọn; limit tối đa 100. Danh sách trả `{items, meta}` trong envelope chung `data`; chi tiết có `items` chứa thông tin vật tư và tồn hiện tại. Người gửi/người xử lý lấy từ JWT, không lấy từ body.

Body gửi yêu cầu:

```json
{
  "items": [{ "partId": "UUID-vat-tu", "quantity": 2 }],
  "notes": "Thay vòng bi"
}
```

Body từ chối/hủy: `{"reason":"Không còn cần vật tư"}` (trim, tối đa 1.000 ký tự). Duyệt không cần body. Không có gửi email/push; frontend/mobile gọi API danh sách để hiển thị hàng chờ và trạng thái.

## Dữ liệu và tính đồng thời

- `material_requests`: phiếu gốc, người yêu cầu, trạng thái, ghi chú, người/thời điểm/lý do xử lý. Không có API xóa/sửa lịch sử xử lý.
- `material_request_items`: vật tư/số lượng yêu cầu; unitPrice và transactionId chỉ được điền khi xuất. Mỗi dòng gắn một giao dịch kho duy nhất.
- Thứ tự khóa: Work Order → yêu cầu → vật tư theo UUID tăng dần. API chuyển trạng thái Work Order đã dùng cùng khóa hàng phiếu. Hai lần duyệt hoặc duyệt/hủy đồng thời chỉ một lần thành công; lần còn lại trả 409.
- Không duyệt khi phiếu đã hoàn thành/đóng/hủy, chưa bắt đầu hoặc KTV nhận phiếu không còn trùng người yêu cầu. Có thể từ chối/hủy yêu cầu còn chờ để dọn hàng đợi ngay cả khi phiếu không còn hoạt động.
- `work_order_parts` gom theo **phiếu + vật tư + đơn giá**, thay cho chỉ phiếu + vật tư. Cùng vật tư nhưng giá khác tạo dòng khác để không làm tròn sai chi phí; cùng giá cộng số lượng. UI phải cộng các dòng nếu muốn tổng lượng theo vật tư.
- actualCostParts = tổng subtotal trong work_order_parts; totalActualCost = actualCostParts + actualCostLabor. Tính bằng PostgreSQL NUMERIC; không thay đổi chi phí nhân công.
- Không tạo AssetHistory hay đổi thiết bị sang OPERATIONAL khi cấp vật tư: cấp vật tư chưa có nghĩa đã sửa xong.

## Tích hợp kho cũ

PartsController nay yêu cầu JWT; chỉ ADMIN/WAREHOUSE_KEEPER được thay đổi kho/danh mục/BOM. Các API adjust/issue-to-asset từ chối workOrderId: muốn cấp cho phiếu phải qua yêu cầu. Xuất kho độc lập không gắn phiếu vẫn dành cho thủ kho/Admin. performedById luôn được ghi đè bằng JWT. Cập nhật danh mục chỉ cập nhật trường được yêu cầu để tránh ghi đè tồn kho vừa xuất đồng thời. Lịch sử giao dịch chỉ trả tóm tắt người thực hiện, không trả passwordHash.

## Migration và kiểm thử

Database cũ chạy `src/database/migrations/20261113_material_requests.sql` trước khi khởi động backend mới, sau migration lịch sử trạng thái nếu chưa chạy. File thêm hai bảng và thay unique constraint của work_order_parts; giữ nguyên các dòng vật tư có sẵn. Xem README tại thư mục migrations. Database mới dùng smart_cmms_db.sql đã cập nhật.

HTTP integration tests kiểm tra cả schema nâng cấp/replay, phân quyền, validation, không trừ lúc gửi, duyệt trùng, hủy/từ chối, thiếu tồn rollback, cạnh tranh tồn kho, giá thay đổi, chặn phiếu hoàn thành và chặn API cũ bỏ qua duyệt. Chạy theo hướng dẫn kiểm thử trong README.md; chỉ dùng schema test riêng.

## Tích hợp hoàn thành phiếu

API hoàn thành/nghiệm thu đã triển khai (xem COMPLETION.md): khóa Work Order, từ chối hoàn thành nếu còn material_requests PENDING, bắt buộc rootCause/solution và lấy vật tư từ các lần cấp đã ghi; KTV không nhập lại vật tư. Trạng thái ON_HOLD vẫn cần KTV chủ động tiếp tục. Không tự tiếp tục khi duyệt vật tư.
