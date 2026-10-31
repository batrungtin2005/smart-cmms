# MODULE ĐỒNG BỘ OFFLINE & CHỐNG XUNG ĐỘT (OFFLINE SYNC)
**Phụ trách code chính:** SV03 (Backend) phối hợp cùng SV05 (Mobile)

## Nhiệm vụ:
1. Quản lý bảng `sync_operations` (Lưu lịch sử các hành động đồng bộ và Idempotency Key).
2. Xử lý API nhận lô đồng bộ: `POST /api/v1/sync/batch`:
   - Mobile gửi lên mảng các thao tác đã thực hiện khi mất mạng kèm `client_operation_uuid`.
   - **Chống trùng lặp (Idempotency):** Nếu UUID thao tác đã được xử lý trước đó, trả về kết quả cũ ngay mà không thực thi lại (tránh trừ kho 2 lần hoặc đổi trạng thái trùng).
   - **Giải quyết xung đột (Conflict Resolution):** Ví dụ trường hợp 2 kỹ thuật viên cùng offline lấy món phụ tùng cuối cùng trong kho $\to$ người đồng bộ trước thành công, người sau nhận trạng thái `CONFLICT` kèm thông báo rõ ràng để xử lý.
3. Trả về kết quả cho từng operation: `{ operationUuid, status: 'SYNCED' | 'CONFLICT' | 'FAILED', error }`.

## Cấu trúc thư mục:
- `entities/`: `sync-operation.entity.ts`
- `dto/`: `sync-batch.dto.ts`
- `sync.controller.ts`
- `sync.service.ts`
- `sync.module.ts`
