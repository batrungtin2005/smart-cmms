# Chạy demo mobile — tuần 1–3

Hướng dẫn cho **máy Windows hiện tại**, dùng giả lập Android đã cài. Mở Terminal PowerShell trong VS Code.

## 1. Bật backend — Terminal 1

Mở **Docker Desktop**, chờ Docker chạy rồi nhập:

```powershell
cd D:\Tuan3
docker start smart_cmms_postgres smart_cmms_redis
npm run dev:backend
```

Giữ terminal này mở. Nếu backend đã chạy ở cổng `3000`, bỏ qua lệnh `npm run dev:backend`.

## 2. Mở giả lập — Terminal 2

Nếu giả lập đã mở thì bỏ qua bước này. Lệnh dưới dùng ảnh QR thử làm camera để demo quét mã:

```powershell
$qr = 'D:\Tuan3\mobile\build\verification\asset-qr-camera.png'
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd smart_cmms_api_36 -memory 2048 -no-snapshot -camera-back "imagefile:$qr"
```

Chờ màn hình chính Android xuất hiện.

## 3. Cài và mở APK demo đã có — Terminal 3

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb -s emulator-5554 install -r 'D:\Tuan3\mobile\build\verification\app-week3-demo.apk'
& $adb -s emulator-5554 shell am start -n com.example.smart_cmms_mobile/.MainActivity
```

Nếu vừa sửa code và muốn chạy bản mới từ Flutter, dùng cách này thay cho cài APK:

```powershell
cd D:\Tuan3\mobile
flutter pub get
flutter run -d emulator-5554 --dart-define=WORK_ORDERS_DEMO=true
```

## 4. Bấm thử những gì?

1. **Đăng nhập:** tên `mobile_tech`; mật khẩu xem dòng `MOBILE_TECH_PASSWORD` trong file `.env` ở gốc dự án. Thử sai mật khẩu để xem thông báo lỗi.
2. **Khôi phục phiên:** sau khi đăng nhập, đóng hẳn rồi mở lại app → vẫn vào trang chính khi backend hoạt động. Đăng xuất → trở về đăng nhập; đăng nhập lại để thử các bước tiếp theo.
3. **QR / thiết bị:** chọn **Quét mã QR thiết bị**, cấp quyền camera → xem thông tin và lịch sử thiết bị. Nếu camera chưa có ảnh QR, chọn **Nhập mã thủ công**, nhập `AST-MOBILE-QR-001` → **Tra cứu**.
4. **Công việc tuần 3:** chọn **Công việc được giao** → thử các bộ lọc ưu tiên → mở `WO-DEMO-001` → **Bắt đầu làm** → nhập ghi chú, thời gian `0,5` giờ → **Thêm phụ tùng** → chọn **Vòng bi 6205**, số lượng `2` → **Hoàn thành** → xem lại → **Xác nhận hoàn thành**. Kết quả: **Đã hoàn thành**, xem được báo cáo và phụ tùng đã chọn.

## Ghi chú cần nhớ

- Đăng nhập và tra cứu thiết bị dùng **backend thật**. Công việc có nhãn **DỮ LIỆU MẪU**, chỉ lưu trong phiên chạy; đóng hẳn app sẽ đặt lại. Không trừ kho thật.
- Bỏ cờ `--dart-define=WORK_ORDERS_DEMO=true` thì app gọi API Work Order thật; hiện API SV03 chưa có nên sẽ báo chưa hỗ trợ.
- Chưa có demo mất mạng/đồng bộ SQLite (tuần 4–5); iOS chưa build/kiểm thử.
- Không đăng nhập được: kiểm tra Docker, backend và mật khẩu. Chi tiết cài đặt/xử lý lỗi nằm trong [README.md](README.md).
