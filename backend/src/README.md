# Cấu hình backend và đăng ký entity

## Thay đổi ngày 07/11/2026

- Ban đầu `app.module.ts` đăng ký `WorkOrder`, `WorkOrderPart`, `MaintenanceSchedule` trực tiếp. Từ 11/11/2026, đăng ký nằm trong `WorkOrdersModule`; AppModule import module này, vẫn dùng `autoLoadEntities: true`.
- Việc đăng ký giải quyết các quan hệ từ Asset, User, History, PartTransaction tới WorkOrder và từ WorkOrder tới lịch bảo dưỡng. Chỉ import class trong một entity khác chưa đủ để auto-load entity.
- Chưa bổ sung controller, service hoặc cron nghiệp vụ Work Order/Schedule trong đợt đồng bộ schema này.
- Cấu hình `DB_SYNCHRONIZE` hiện vẫn lấy từ môi trường. File SQL là schema khởi tạo, không phải migration nâng cấp database cũ; không dùng synchronize để thay cho migration dữ liệu thực tế.

## Work Order bước 1–2, ngày 11/11/2026

- AppModule bỏ import từng entity và forFeature trực tiếp, import WorkOrdersModule để đăng ký entity và API trong module nghiệp vụ.
- Có API tạo phiếu, danh sách/chi tiết, giao/giao lại KTV, my-tasks. Xem `modules/work-orders/README.md` để biết quyền, hợp đồng và cách test.
- MaintenanceSchedule vẫn đăng ký trong WorkOrdersModule để không tái phát lỗi metadata. Chưa có cron hoặc luồng hoàn thành/xuất kho trong bước này.

## Lệnh kiểm tra

Từ thư mục gốc dự án: `npm run build:backend`.
Kiểm tra tích hợp schema theo hướng dẫn trong `database/README.md`.
