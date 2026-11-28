# SV05 — Tiến độ mobile tuần 1–4

**Cập nhật:** 28/11/2026. **Nhánh:** `feat/sv05-mobile-app`.

## Đã hoàn thành

- Đã lấy develop `8957711` về nhánh SV05 ngày 28/11/2026. Luồng Work Order được tích hợp từ đợt tuần 3; lượt này chỉ cập nhật source của nhóm và tài liệu mobile.
- Flutter chia presentation/domain/data; đăng nhập TECHNICIAN, lưu token an toàn, khôi phục phiên và đăng xuất.
- Camera QR/nhập mã thủ công; tra cứu thông tin và lịch sử thiết bị bằng API thật.
- Work Order thật: danh sách/lọc 4 ưu tiên/phân trang, chi tiết, bắt đầu, tạm dừng có lý do, tiếp tục và nhận công việc Cần sửa lại.
- Yêu cầu vật tư: tìm/chọn/số lượng, gửi PENDING, xem trạng thái/chi tiết/lý do, hủy yêu cầu. Thủ kho/Admin duyệt ngoài app kỹ thuật viên; Flutter chỉ đọc vật tư đã cấp.
- Hoàn thành qua endpoint riêng: nguyên nhân, cách xử lý, ghi chú; giờ sửa do server tính. Không gửi lại vật tư hoặc trừ kho thêm lúc hoàn thành. Kết quả COMPLETED/CLOSED chỉ đọc.
- Giữ bản nháp khi chọn vật tư/tải lại; hỏi trước khi bỏ thay đổi, chống bấm lặp. Mất phản hồi khi tạo yêu cầu phải tải lại, kiểm tra danh sách và xác nhận bản nháp mới.
- Chặn hoàn thành nếu còn PENDING (kể cả trang sau) hoặc chưa đọc được trạng thái vật tư.
- Cập nhật hướng dẫn demo, tài liệu API thực tế và công cụ tạo fixture/duyệt vật tư thử.

## Kết quả kiểm tra tuần 3 (15/11/2026)

- `flutter analyze`: không có vấn đề; **81 Flutter tests đạt**.
- **45 backend tests có sẵn của SV03 đạt**, gồm PostgreSQL trong schema ngẫu nhiên riêng và kiểm tra khóa/rollback/phân quyền.
- **6 nhóm kiểm tra Work Order qua API thật đạt**: danh sách, bắt đầu/tạm dừng/tiếp tục, chặn PENDING, duyệt đúng quyền/chống xuất lặp, hoàn thành và vòng sửa lại/nghiệm thu.
- **4 kiểm tra API tài sản/QR thật đạt** sau cập nhật backend.
- Hai APK debug đã build thành công: bản API thật và bản mẫu trong bộ nhớ.
- **7 bước Android API thật đạt** trên AOSP Android 11/API 30: danh sách/lọc ưu tiên → bắt đầu → gửi PENDING không trừ kho → chặn hoàn thành khi chờ duyệt → cập nhật vật tư đã cấp và giữ báo cáo → hoàn thành, lưu báo cáo/vật tư không trừ kho lần nữa → đóng tiến trình và mở lại vẫn xem kết quả chỉ đọc.
- Báo cáo `build/verification/work-orders-android-report.json` có `mode: live-api`, `status: passed`, `liveWorkOrderIntegrationAccepted: true` và SHA-256 khớp APK đã cài. Lần kiểm tra này không có cảnh báo System UI; tồn phụ tùng thử từ 18 xuống 16 đúng một lần cấp 2 đơn vị. Ảnh minh chứng có tiền tố `work-order-live-` trong cùng thư mục.
- my-tasks và parts trả **200**. Kết quả 404 ngày 13/11 là của backend cũ, đã được thay bằng báo cáo mới.

## Tuần 4 — dữ liệu trên máy và hàng đợi

- SQLite lưu công việc, thiết bị/lịch sử đã tra cứu, kết quả tìm phụ tùng, trạng thái vật tư và bản nháp. Dữ liệu tách theo tài khoản và URL backend.
- Khi mất kết nối, đọc dữ liệu đã tải và hiển thị thời điểm cập nhật. Không tạo dữ liệu thay thế nếu chưa tải về; lỗi dữ liệu/quyền truy cập không bị coi là mất mạng.
- Khôi phục phiên offline chỉ từ hồ sơ đã xác thực, cùng token còn hạn và đúng tài khoản. Token/hồ sơ phiên nằm trong secure storage; đăng nhập lần đầu vẫn cần mạng.
- Bắt đầu/tạm dừng/tiếp tục, yêu cầu/hủy vật tư và ghi hoàn thành offline sinh UUID, lưu PENDING cùng trạng thái cục bộ trong một transaction. Thứ tự và liên kết thao tác được giữ khi đóng/mở app.
- Hoàn thành trên máy có nhãn Chờ đồng bộ, chưa coi là server chấp nhận. Yêu cầu vật tư chưa duyệt vẫn chặn hoàn thành; không trừ kho trên điện thoại.
- Tự lưu/khôi phục báo cáo và vật tư đang soạn; có lựa chọn giữ bản nháp hoặc bỏ thay đổi. Khóa gửi sau phản hồi POST chưa rõ được lưu cùng bản nháp; cache không thay cho xác nhận lại từ server.
- Màn hình Trạng thái đồng bộ hiển thị UUID, công việc, thời điểm và trạng thái từng thao tác. Có mạng lại vẫn giữ nguyên PENDING, chưa gửi tự động qua API ghi cũ.
- `flutter analyze` không có vấn đề; **117 kiểm thử mobile đạt** (gồm 36 ca mới cho SQLite thật, phiên offline, bản nháp và chặn gửi lặp). APK debug đã build thành công.
- Ngày 18/11/2026, **6 bước Android offline đạt** trên API 30: khớp APK/tài khoản/cache → mở lại khi mất mạng và giữ thao tác Bắt đầu → yêu cầu vật tư bằng dữ liệu đã tải, chặn hoàn thành → mở lại vẫn đủ ba ô báo cáo → kiểm tra UUID/hàng đợi SQLite → bật mạng lại, backend không bị cập nhật.
- Báo cáo `build/verification/offline-android-report.json` ghi `status: passed`, SHA-256 khớp APK đã cài; xác nhận 2 thao tác của công việc thử và giữ nguyên 2 thao tác đã chờ trước đó. Tồn kho 16 → 16; công việc trên backend vẫn ASSIGNED; chưa gọi Sync API. Ảnh: `offline-pending-android.png`, `offline-draft-restored-android.png`, `offline-queue-android.png`.
- Khi ghi yêu cầu offline, xóa phần vật tư đã gửi khỏi bản nháp trong cùng transaction với hàng đợi; giữ nguyên báo cáo. Khi gửi POST online, ghi cờ cần kiểm tra trước khi gọi API, chống tạo trùng nếu app tắt giữa chừng.
- Đã sửa lỗi mất focus khi dòng thông báo tự lưu xuất hiện; kiểm thử giữ focus và nhập tiếp sau ký tự đầu tiên đã đạt.

## Cập nhật source ngày 28/11/2026

- Đã lấy `develop` tại `8957711` về nhánh SV05 bằng fast-forward. Source mới có cập nhật SV02 về bảo mật/lịch sử tài sản, SV03 về lịch bảo dưỡng, SV04 về dashboard và SV06 về kiểm thử. Commit mobile tuần 4 `37245c8` đã được nhóm gộp vào develop.
- Đã đối chiếu API Work Order và quyền đọc của TECHNICIAN: các payload mobile đang dùng vẫn được hỗ trợ; các trường hủy/hoãn lịch PM mới là tùy chọn, không cần thêm vào thao tác bắt đầu/tạm dừng/hoàn thành của mobile.
- `flutter analyze` không có vấn đề; chạy lại đủ **117 kiểm thử mobile đạt** sau khi cập nhật source. Các kết quả Android/API thật ngày 15–18/11 ở trên là kết quả của đợt trước, chưa phải nghiệm thu với backend ngày 28/11.
- Đã cài thêm thư viện theo source mới và `npm run build:backend` thành công. Không sửa dependency manifest hoặc lockfile của nhóm; chưa khởi động backend mới để kiểm thử API trên database.
- Đã kiểm tra cả develop `8957711` và nhánh SV03 `b27e2af`: Sync vẫn chỉ có README, chưa có controller/service/DTO/module cho `POST /api/v1/sync/batch`. Theo phạm vi đã thống nhất, SV05 chỉ làm mobile và chờ API SV03; chưa thể chốt nghiệm thu đồng bộ thật tuần 4–5.
- Chưa áp dụng thêm migration hoặc chạy seed lên database trong lượt cập nhật này. Trước khi chạy backend mới với database cũ, cần sao lưu và áp dụng migration nhóm theo thứ tự: Work Order 13/11 (nếu thiếu) → lịch sử/schema 15/11 → PM 23/11 → chuẩn hóa enum/role 23/11. Không chạy lại các migration cũ sau bước chuẩn hóa.

## Database và giới hạn

- Đã kiểm tra lại GitHub ngày 28/11/2026: Sync vẫn chỉ có README, chưa có API batch thực thi. Phần bàn giao này hoàn thành lưu trữ/hàng đợi cục bộ; thao tác vẫn PENDING cho tới khi tích hợp Sync API.
- Đã sao lưu `smart_cmms_mobile_dev` trước khi áp dụng 3 migration SV03: status history → material requests → completion. Backup/báo cáo nằm trong `mobile/build/verification/`, được Git bỏ qua.
- Các thử nghiệm ghi dữ liệu có nhãn SV05 vào database riêng; có giao dịch xuất kho thử qua API. Không chạy trên database dùng chung/sản xuất.
- SQLite, bản nháp bền vững và hàng đợi UUID đã triển khai cho Work Order API trên mobile. Gửi Sync API, nhận SYNCED/CONFLICT/FAILED và thử lại có kiểm soát còn chờ hợp đồng/API SV03. Chưa nghiệm thu đồng bộ hai chiều tuần 4–5.
- iOS mới có cấu hình, **chưa build/kiểm thử trên macOS**; chưa kiểm thử điện thoại thật.
- `.env`, mật khẩu/token, APK, ảnh, backup và báo cáo build không đưa vào Git.

**Kết luận tuần 3:** đã hoàn thành luồng mobile trực tuyến bằng API thật hiện có của SV03; chưa cần bổ sung endpoint cho các chức năng tuần 3 đã nêu. Lead có thể kiểm tra thay đổi mobile trên nhánh SV05 trước khi gộp vào develop.

Chạy lại theo [HUONG_DAN_DEMO.md](../HUONG_DAN_DEMO.md), xem [API hiện tại](work_order_api_contract.md) và [README.md](../README.md).
