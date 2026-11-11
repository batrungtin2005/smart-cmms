# Cấu hình backend và đăng ký entity

## Thay đổi ngày 07/11/2026

- `app.module.ts` đăng ký `WorkOrder`, `WorkOrderPart`, `MaintenanceSchedule` qua `TypeOrmModule.forFeature`. Các entity này được đưa vào connection nhờ `autoLoadEntities: true`.
- Việc đăng ký giải quyết các quan hệ từ Asset, User, History, PartTransaction tới WorkOrder và từ WorkOrder tới lịch bảo dưỡng. Chỉ import class trong một entity khác chưa đủ để auto-load entity.
- Chưa bổ sung controller, service hoặc cron nghiệp vụ Work Order/Schedule trong đợt đồng bộ schema này.
- Cấu hình `DB_SYNCHRONIZE` hiện vẫn lấy từ môi trường. File SQL là schema khởi tạo, không phải migration nâng cấp database cũ; không dùng synchronize để thay cho migration dữ liệu thực tế.

## Kiểm tra

Từ thư mục gốc dự án: `npm run build:backend`.
Kiểm tra tích hợp schema theo hướng dẫn trong `database/README.md`.
