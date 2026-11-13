# Migration Work Order — 13/11/2026

`20261113_work_order_status_history.sql` thêm bảng lịch sử cho database đã có schema CMMS. Chạy **trước khi khởi động backend mới**. File chỉ tạo bảng mới, không sửa/xóa phiếu hiện có, không tự tạo lịch sử giả cho dữ liệu cũ. Có thể chạy lại nếu bảng đúng cấu trúc đã tồn tại; không dùng để sửa một bảng cùng tên nhưng khác cấu trúc.

Trong pgAdmin: chọn đúng database đang dùng trong cấu hình backend → Query Tool → Open File → chọn file migration → Execute (F5). Kiểm tra thông báo COMMIT. Schema mặc định là public; nếu dùng schema riêng cần đặt search_path đúng trước khi chạy.

Database mới: dùng `../smart_cmms_db.sql`, đã bao gồm bảng này, không cần chạy migration riêng. Không chạy lại toàn bộ schema trên database cũ.

Bảng lưu trạng thái trước/sau, người thực hiện, KTV tại thời điểm thao tác, lý do, thời gian server và thứ tự trong từng phiếu. Khóa ngoại giữ người thực hiện; xóa phiếu sẽ xóa lịch sử. Thứ tự được service cấp dưới khóa hàng Work Order. Không có API sửa/xóa lịch sử.

Migration chưa được tự động áp dụng vào database ứng dụng. Test chỉ chạy trong schema ngẫu nhiên rồi dọn dẹp.
