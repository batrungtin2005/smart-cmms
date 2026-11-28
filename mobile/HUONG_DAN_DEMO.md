# Demo mobile tuần 1–4 bằng API thật

Dành cho máy Windows hiện tại. Dùng PowerShell trong VS Code; mở Docker Desktop trước.

## 1. Bật backend

Đã lấy develop `8957711` ngày 28/11/2026. Nếu database còn ở phiên bản demo cũ, **sao lưu và nâng cấp DB trước khi khởi động backend mới**: migration Work Order 13/11 (nếu chưa có) → `20261115_asset_history_and_zentech_schema.sql` → `20261123_maintenance_schedules.sql` → `20261123_normalize_asset_enums_and_roles.sql`. Xem [hướng dẫn migration của nhóm](../backend/src/database/migrations/README.md). Giữ backend dừng lúc nâng cấp; không chạy lại migration cũ sau bước chuẩn hóa.

```powershell
cd D:\Tuan3
$env:NODE_USE_SYSTEM_CA = '1'
npm install --ignore-scripts --package-lock=false
docker start smart_cmms_postgres smart_cmms_redis
npm run dev:backend
```

Lệnh cài thư viện chỉ cần sau khi lấy source mới; dòng `NODE_USE_SYSTEM_CA` dùng kho chứng chỉ Windows trên Node hiện tại. Đây là máy đã cài backend trước đó; `--ignore-scripts` giữ nguyên thư viện native đang có. Nếu backend đã chạy ở cổng 3000 thì bỏ qua lệnh cuối. Lượt cập nhật 28/11 chưa tự nâng cấp database hoặc chạy seed. Sync API vẫn chưa có trên GitHub; chỉ demo được phần online và offline cục bộ đang có.

Tạo công việc và phụ tùng thử mới (terminal khác, tại thư mục gốc):

```powershell
cd D:\Tuan3
node mobile/tool/verify_work_orders_api.mjs
```

Lệnh này kiểm tra API và tạo 4 công việc `[SV05 DEMO ...]` trong database riêng `smart_cmms_mobile_dev`.

## 2. Mở giả lập

Bỏ qua nếu giả lập đã mở:

```powershell
$qr = 'D:\Tuan3\mobile\build\verification\asset-qr-camera.png'
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd smart_cmms_api_30_light -memory 2048 -no-snapshot -gpu swiftshader -feature -Vulkan -timezone Asia/Bangkok -camera-back "imagefile:$qr"
```

Chờ Android khởi động xong.

## 3. Cài APK gọi API thật

Trong terminal khác:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 install -r 'D:\Tuan3\mobile\build\app\outputs\flutter-apk\app-debug.apk'
& $adb -s emulator-5554 shell am start -n com.example.smart_cmms_mobile/.MainActivity
```

Nếu sửa code và cần chạy bản mới, thay bước cài APK bằng:

```powershell
cd D:\Tuan3\mobile
flutter pub get
flutter run -d emulator-5554
```

## 4. Bấm thử trên app

1. Đăng nhập bằng `mobile_tech`; mật khẩu xem `MOBILE_TECH_PASSWORD` trong `.env` ở gốc dự án.
2. **QR:** chọn Quét mã QR thiết bị, cấp quyền camera. Hoặc Nhập mã thủ công → `AST-MOBILE-QR-001` → Tra cứu.
3. **Công việc:** mở Công việc được giao → thử lọc ưu tiên → mở công việc `[SV05 DEMO ...] Kiểm tra CRITICAL` mới nhất → Bắt đầu làm.
4. **Vật tư:** Thêm phụ tùng → tìm mã `partCode` trong `mobile/build/verification/work-orders-live-fixture.json` → chọn Vòng bi thử mobile tuần 3 → số lượng `2` → Gửi yêu cầu vật tư. Trạng thái Chờ duyệt; chưa trừ kho, chưa được hoàn thành.
5. **Giả lập bước thủ kho/Admin:** tại thư mục gốc, terminal khác chạy:

```powershell
node mobile/tool/approve_mobile_material.mjs
```

6. Quay lại app → bấm biểu tượng **Cập nhật công việc** trên thanh trên cùng → thấy Đã cấp vật tư.
7. Nhập **Nguyên nhân**, **Cách xử lý**, ghi chú nếu cần → Hoàn thành → Xác nhận hoàn thành. Kết quả lưu trên backend; máy chủ tự tính giờ sửa và không trừ kho thêm lần nữa.
8. Đóng hẳn rồi mở lại app → vẫn xem được kết quả. Có thể thử Tạm dừng/Tiếp tục trước khi hoàn thành. Đăng xuất → trở về đăng nhập.

## Ghi chú

- Đây là API thật trên **database thử nghiệm riêng**, dữ liệu có nhãn SV05. App kỹ thuật viên không có quyền duyệt kho; lệnh bước 5 dùng tài khoản Admin từ `.env`.
- Đã chạy đạt toàn luồng trên Android 11/API 30 ngày 15/11/2026, gồm đóng/mở lại app và kiểm tra dữ liệu lưu ở backend. Mỗi lần demo mới, chạy lại lệnh tạo công việc ở bước 1.
- APK `app-week3-demo.apk` / cờ `WORK_ORDERS_DEMO=true` chỉ dùng dữ liệu trong bộ nhớ, không có bước thủ kho thật. Dùng `app-debug.apk` để trình bày luồng tích hợp.
- Đã có SQLite và hàng đợi cục bộ (tuần 4); gửi đồng bộ thật đang chờ API SV03. iOS chưa build/kiểm thử. Chi tiết cài đặt: [README.md](README.md).

## Tuần 4: thử mất mạng và mở lại app

Đã kiểm tra đạt trên Android 11/API 30 ngày 18/11/2026. Dùng APK `app-debug.apk` mới trong bước 3.

1. Khi còn mạng: đăng nhập, mở công việc mới, Bắt đầu làm → Thêm phụ tùng → tìm/chọn phụ tùng để tải dữ liệu cần dùng về máy.
2. Nhập báo cáo/vật tư đang soạn; chờ dòng **Bản nháp đã lưu trên máy**.
3. Tắt mạng riêng giả lập rồi đóng/mở app bằng PowerShell:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 shell svc wifi disable
& $adb -s emulator-5554 shell svc data disable
& $adb -s emulator-5554 shell am force-stop com.example.smart_cmms_mobile
& $adb -s emulator-5554 shell am start -n com.example.smart_cmms_mobile/.MainActivity
```

4. Mở lại công việc: vẫn có dữ liệu/bản nháp, app báo đang offline. Thử tạm dừng/tiếp tục hoặc gửi yêu cầu vật tư → chỉ lưu **Chờ đồng bộ**.
5. Quay lại bằng **Giữ bản nháp và quay lại** → trang chủ → **Trạng thái đồng bộ**. Đóng/mở app lần nữa, hàng đợi vẫn còn.
6. Bật lại mạng:

```powershell
& $adb -s emulator-5554 shell svc wifi enable
& $adb -s emulator-5554 shell svc data enable
```

Chỉ dùng được dữ liệu đã tải trước. Đăng nhập lần đầu hoặc token hết hạn cần mạng. **Có mạng lại chưa gửi hàng đợi lên server**; phần này chờ Sync API SV03. PENDING chưa phải kết quả đã cập nhật backend.
