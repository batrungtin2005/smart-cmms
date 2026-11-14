# Migration Work Order — 13/11/2026

`20261113_work_order_status_history.sql` thêm bảng lịch sử cho database đã có schema CMMS. Chạy **trước khi khởi động backend mới**. File chỉ tạo bảng mới, không sửa/xóa phiếu hiện có, không tự tạo lịch sử giả cho dữ liệu cũ. Có thể chạy lại nếu bảng đúng cấu trúc đã tồn tại; không dùng để sửa một bảng cùng tên nhưng khác cấu trúc.

Trong pgAdmin: chọn đúng database đang dùng trong cấu hình backend → Query Tool → Open File → chọn file migration → Execute (F5). Kiểm tra thông báo COMMIT. Schema mặc định là public; nếu dùng schema riêng cần đặt search_path đúng trước khi chạy.

Database mới: dùng `../smart_cmms_db.sql`, đã bao gồm bảng này, không cần chạy migration riêng. Không chạy lại toàn bộ schema trên database cũ.

Bảng lưu trạng thái trước/sau, người thực hiện, KTV tại thời điểm thao tác, lý do, thời gian server và thứ tự trong từng phiếu. Khóa ngoại giữ người thực hiện; xóa phiếu sẽ xóa lịch sử. Thứ tự được service cấp dưới khóa hàng Work Order. Không có API sửa/xóa lịch sử.

Migration chưa được tự động áp dụng vào database ứng dụng. Test chỉ chạy trong schema ngẫu nhiên rồi dọn dẹp.

## 20261113_material_requests.sql

Chạy sau migration lịch sử trạng thái phía trên, trước khi khởi động backend có luồng yêu cầu vật tư trong WorkOrdersModule. Trong pgAdmin chọn đúng database/schema, mở file và Execute; chờ COMMIT. File thêm enum, bảng yêu cầu và dòng vật tư, index, khóa ngoại; thay uq_wo_part bằng uq_wo_part_price để nhóm lượng xuất theo từng giá. Không xóa dữ liệu vật tư/phiếu hiện có. Chạy trong transaction; có thể chạy lại trên schema đúng cấu trúc. Không tự sửa bảng cùng tên nhưng khác cấu trúc. Không chạy lại toàn bộ smart_cmms_db.sql trên database cũ.

Ứng dụng đang chạy cần được dừng/cập nhật đồng bộ với migration vì quy tắc unique vật tư đổi. Không có rollback tự động về unique cũ: sau khi phát sinh nhiều mức giá cùng vật tư, cần quyết định cách hợp nhất dữ liệu trước khi quay về phiên bản cũ.

Integration test dựng schema trước thay đổi, áp dụng migration hai lần để kiểm tra upgrade/replay rồi thử API. verify-schema.cjs kiểm tra schema khởi tạo mới khớp entity. Migration chưa được tự động áp dụng vào schema ứng dụng.

## 20261113_work_order_completion.sql

Chạy sau 20261113_work_order_status_history.sql và 20261113_material_requests.sql (nếu chưa chạy). Chọn đúng database/schema trong pgAdmin, mở file và Execute, chờ COMMIT rồi khởi động backend mới. File thêm giá trị REWORK_REQUIRED vào enum work_order_status_enum, thêm hai cột snapshot nullable trên WorkOrder và bỏ NOT NULL trên hai cột snapshot AssetHistory. Không dùng giá trị enum mới trước COMMIT. Có thể chạy lại; không backfill hoặc xóa dữ liệu cũ. Việc thêm enum không có rollback xóa giá trị tự động.

Phiếu cũ thiếu timeline đầy đủ có thể nhận 409 khi hoàn thành; cần đối soát dữ liệu thật thay vì tự dựng timestamp. Frontend/mobile cần nhận diện trạng thái Cần sửa lại. Xem work-orders/COMPLETION.md cho quy tắc nghiệp vụ. Kiểm thử chỉ áp dụng migration trong schema riêng rồi dọn dẹp; schema ứng dụng chưa được cập nhật tự động.
