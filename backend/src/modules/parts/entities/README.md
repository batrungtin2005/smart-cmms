# Entity phụ tùng và giao dịch kho

## Thay đổi ngày 07/11/2026

Trong `part-transaction.entity.ts`:

- Giữ `workOrderId` ánh xạ cột UUID nullable `work_order_id`.
- Thêm quan hệ `workOrder: WorkOrder | null` với `@ManyToOne`, dùng chính cột `work_order_id` qua `@JoinColumn`.
- Khóa ngoại dùng `ON DELETE SET NULL`: xóa phiếu không xóa lịch sử kho; giao dịch chỉ mất liên kết tới phiếu, khớp SQL.
- `transactionType` dùng `enumName: transaction_type_enum` với các giá trị `IMPORT`, `EXPORT`, `ADJUSTMENT`.

Không thay đổi thuật toán trừ kho, transaction hay pessimistic lock trong PartsService.
