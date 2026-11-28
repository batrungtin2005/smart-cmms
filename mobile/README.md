# ỨNG DỤNG DI ĐỘNG FLUTTER - SMART CMMS
**Phụ trách chính:** SV05 (Mobile Engineer)  
**Đối tượng sử dụng:** Kỹ thuật viên bảo trì hiện trường (Field Technicians)

Xem nhanh: [hướng dẫn chạy demo](HUONG_DAN_DEMO.md) · [tiến độ SV05 tuần 1–4](docs/SV05_TIEN_DO.md).

---

## KHỞI CHẠY VÀ KIỂM TRA

Chạy các lệnh sau tại thư mục `mobile/`:

```powershell
flutter doctor -v
flutter pub get
flutter analyze
flutter test
flutter devices
```

Để chạy trên Android, cần Android SDK và điện thoại bật USB debugging hoặc giả lập Android. Nếu chưa có, cài Android Studio, dùng SDK Manager để cài SDK/Platform Tools/Command-line Tools/Emulator và tạo thiết bị bằng Device Manager. Xem [hướng dẫn Android của Flutter](https://docs.flutter.dev/platform-integration/android/setup).

Chọn ID thiết bị Android từ kết quả `flutter devices`:

```powershell
flutter run -d <android-device-id>
```

Kiểm tra khả năng đóng gói Android bằng:

```powershell
flutter build apk --debug
```

Nếu Java/Gradle báo lỗi chứng chỉ `PKIX path building failed` trên Windows, dùng kho chứng chỉ tin cậy của Windows cho phiên PowerShell hiện tại rồi chạy lại lệnh build:

```powershell
$env:JAVA_TOOL_OPTIONS = '-Djavax.net.ssl.trustStoreType=Windows-ROOT -Djavax.net.ssl.trustStore=NONE'
```

`android/gradle.properties` giới hạn Gradle ở 2 GB heap và 2 worker, đồng thời chạy Kotlin trong cùng JVM. Kotlin incremental compilation tạm tắt để xử lý lỗi `this and base files have different roots` khi dự án ở ổ D còn Pub Cache ở ổ C. Việc biên dịch Kotlin có thể chậm hơn; không cần đổi phiên bản thư viện để xử lý lỗi đường dẫn này.

`connectivity_plus` dùng nhánh 6.1.5 để hỗ trợ compile SDK 34, thay cho SDK 33 của bản 5.0.2 gây lỗi AAR metadata với các thư viện AndroidX hiện tại. Phiên bản này yêu cầu Dart 3.3 trở lên; khi triển khai theo dõi kết nối, kết quả là `List<ConnectivityResult>`. Xem [tài liệu của phiên bản 6.1.5](https://pub.dev/packages/connectivity_plus/versions/6.1.5).

Bản iOS cần được build và kiểm thử trên macOS có Xcode. Kiểm thử giao diện bằng `flutter test` không thay thế kiểm thử camera, quyền truy cập và cài đặt trên Android/iOS.

## TIẾN ĐỘ THỰC TẾ

Đã triển khai xác thực thuộc tuần 1–2 bằng API backend thật:

- `POST /api/v1/auth/login` nhận `username` và `password`.
- `GET /api/v1/auth/me` xác minh token và lấy hồ sơ. Ứng dụng chỉ nhận tài khoản TECHNICIAN đang hoạt động.
- Lưu token bằng `flutter_secure_storage`: Android Keystore với dữ liệu mã hóa; iOS Keychain. Không tự lưu mật khẩu hoặc hồ sơ vào database cục bộ.
- Mở lại ứng dụng: đọc token rồi xác minh với backend trước khi vào trang chính.
- Token bị từ chối 401/403 khi xác minh phiên: xóa token/hồ sơ offline, về đăng nhập. Lỗi mạng có thể khôi phục phiên đã xác thực còn hạn; lỗi máy chủ giữ token để thử lại. Đăng nhập lần đầu vẫn cần mạng.
- Đăng xuất: xóa token trên máy, xóa trạng thái phiên và trở về form trống. Backend chưa có API thu hồi hoặc refresh token, nên đăng xuất chưa thu hồi JWT trên máy chủ.
- Kiểm thử hợp đồng API, lỗi mạng/lưu trữ và luồng giao diện trong `test/`.

Đã triển khai phần QR và tra cứu tài sản thuộc tuần 1–2:

- Mở “Quét mã QR thiết bị” từ trang chính; xin quyền camera, dừng camera khi ra nền hoặc rời màn hình.
- Nhận mã `AST-xxx`, QR JSON `SMART_CMMS` phiên bản `1.0` do backend sinh, và URL tem cũ có đường dẫn `assets/code/AST-xxx`. URL trong tem chỉ dùng để trích mã, không mở hoặc gửi yêu cầu tới host trong tem.
- Chống xử lý nhiều khung hình cùng lúc. Mã sai không gọi API; người dùng có thể quét lại.
- Có “Nhập mã thủ công” khi không có camera hoặc không cấp quyền.
- Gọi `GET /api/v1/assets/inspect/:code` với Bearer token, hiển thị tên, trạng thái, vị trí/xưởng, hãng/model/serial, giờ vận hành, thông số và tối đa 5 lịch sử bảo trì gần nhất.
- Phân biệt mã không hợp lệ, không tìm thấy tài sản, lỗi mạng/máy chủ. QR JSON có UUID khác với tài sản trên backend sẽ bị từ chối. Token hết hạn sẽ đưa về đăng nhập.

Phần mobile tuần 3 đã chuyển sang API thật của SV03. Ngày 28/11/2026, nhánh SV05 đã lấy develop `8957711`, có cả phần SQLite và hàng đợi PENDING tuần 4 đã được nhóm gộp trước đó. Chạy lại `flutter analyze` không có vấn đề và **117 kiểm thử Flutter đạt**. Sync API vẫn chưa có implementation trên develop hoặc nhánh SV03 `b27e2af`; gửi đồng bộ thật và kiểm thử iOS còn là phần việc tiếp theo.

### Tuần 3 — công việc và vật tư qua API thật

- Danh sách được giao, lọc Khẩn cấp/Cao/Trung bình/Thấp, phân trang, tải lại; đọc đúng `{items, meta}` của backend.
- Bắt đầu ASSIGNED → IN_PROGRESS; tạm dừng ON_HOLD có lý do và tiếp tục; nhận diện REWORK_REQUIRED và nút Bắt đầu sửa lại.
- Tìm/chọn phụ tùng, số lượng và gửi yêu cầu PENDING. Tồn chỉ để tham khảo, không giữ chỗ hoặc trừ kho lúc gửi. Xem yêu cầu/chi tiết, lý do từ chối và hủy yêu cầu đang chờ bằng lý do.
- Thủ kho/Admin duyệt và xuất kho ở luồng riêng. Mobile kỹ thuật viên không có nút duyệt kho. Bấm Cập nhật công việc để lấy trạng thái mới và vật tư đã cấp.
- Nhập nguyên nhân, cách xử lý, ghi chú tùy chọn; xem lại và xác nhận qua `/work-orders/:id/complete`. Máy chủ tự tính giờ sửa; không gửi lại vật tư/giá/timestamp.
- Chặn hoàn thành khi còn PENDING hoặc chưa đọc được trạng thái vật tư, kể cả yêu cầu chờ ở trang sau. Giữ báo cáo khi chọn phụ tùng/tải lại; hỏi trước khi bỏ bản nháp.
- Chống bấm gửi lặp. Nếu POST vật tư mất phản hồi, khóa gửi, yêu cầu tải lại/kiểm tra danh sách và chủ động bắt đầu bản nháp mới; không tự retry.
- Kết quả COMPLETED/CLOSED chỉ đọc, hiển thị nguyên nhân, cách xử lý, giờ sửa và vật tư từ backend. Quản lý nghiệm thu ngoài app kỹ thuật viên.

| Chế độ | Chạy tại mobile/ | Dữ liệu |
| --- | --- | --- |
| Mặc định | `flutter run -d emulator-5554` | API thật, cần backend và database đã migration |
| Mẫu trong bộ nhớ | `flutter run -d emulator-5554 --dart-define=WORK_ORDERS_DEMO=true` | Có nhãn DỮ LIỆU MẪU; không có tài khoản thủ kho, có thể hủy PENDING để thử hoàn thành không dùng vật tư |

Đăng nhập lần đầu cần backend thật. Bản Android/iOS có lưu phiên đã xác thực còn hạn để khôi phục offline, QR dùng cache của thiết bị đã tra cứu. Work Order API trên mobile lưu bản nháp bằng SQLite; Work Order mẫu và bản web vẫn giữ bản nháp trong bộ nhớ. Chi tiết endpoint/payload trong [hợp đồng API hiện tại](docs/work_order_api_contract.md). iOS chưa được build/kiểm thử.

Kết quả đợt tuần 3 trước khi cập nhật backend ngày 28/11: `flutter analyze` không có vấn đề; **81 Flutter tests đạt**; **45 backend tests có sẵn của SV03 đạt** (gồm PostgreSQL trong schema test riêng); **6 nhóm kiểm tra API thật đạt**, gồm chống trừ kho lặp, chặn PENDING và vòng sửa lại/nghiệm thu. API my-tasks và parts đều trả 200. Báo cáo `build/verification/work-orders-live-api-report.json` và `work-orders-api-readiness.json` không chứa mật khẩu/token. Các kết quả API/Android này chưa được chạy lại với backend mới.

Ngày 15/11/2026, **7 bước chạy APK API thật trên Android 11/API 30 đạt**: lọc công việc, bắt đầu, gửi vật tư, chặn hoàn thành khi chờ duyệt, cập nhật sau khi Admin duyệt, hoàn thành và mở lại tiến trình. Báo cáo/nguyên nhân/cách xử lý đã lưu trên backend, tồn kho chỉ trừ một lần. `build/verification/work-orders-android-report.json` ghi `status: passed`, `mode: live-api` và SHA-256 trùng APK đã cài; đây là kết quả bản API thật, độc lập với bản mẫu cũ.

Với backend mới và database cũ, dừng backend, giữ PostgreSQL chạy và sao lưu trước khi nâng cấp theo [hướng dẫn migration của nhóm](../backend/src/database/migrations/README.md). Thứ tự: ba migration Work Order 13/11 (nếu thiếu) → `20261115_asset_history_and_zentech_schema.sql` → `20261123_maintenance_schedules.sql` → `20261123_normalize_asset_enums_and_roles.sql`. Bước chuẩn hóa chạy cuối; không chạy lại migration cũ sau đó. Database thử trên máy mới được áp dụng ba migration Work Order trong đợt trước; lượt cập nhật 28/11 chưa chạy thêm migration hoặc seed.

`prepare_week3_backend.mjs` là công cụ của đợt tuần 3, chỉ áp dụng ba migration Work Order cho database `smart_cmms_mobile_dev` trên localhost. Công cụ này **không nâng cấp đầy đủ database cho backend mới**; không dùng lại sau khi chuẩn hóa enum/role.

Sau khi database đã nâng cấp đúng thứ tự, build/khởi động backend như hướng dẫn bên dưới, rồi tạo fixture và kiểm tra API tại thư mục gốc:

```powershell
node mobile/tool/verify_work_orders_api.mjs
```

`verify_work_orders_api.mjs` tạo phụ tùng thử riêng và các công việc [SV05 DEMO ...] đã giao cho mobile_tech. Dữ liệu có ghi xuống database thử và có kiểm tra xuất kho; chỉ dùng database mobile riêng. Báo cáo/backup cũ nằm ở `build/verification/`.

Đóng gói tại `mobile/`, trước khi mở giả lập nếu máy thiếu RAM:

```powershell
flutter build apk --debug --dart-define=WORK_ORDERS_DEMO=true
New-Item -ItemType Directory -Path build/verification -Force | Out-Null
Copy-Item -LiteralPath build/app/outputs/flutter-apk/app-debug.apk -Destination build/verification/app-week3-demo.apk -Force
flutter build apk --debug
```

`build/app/outputs/flutter-apk/app-debug.apk` là bản API thật; `build/verification/app-week3-demo.apk` là bản trong bộ nhớ. Cùng mã ứng dụng nên cài bản sau thay bản trước.

Với APK mặc định và AVD thử nghiệm 720×1280 đang chạy, tại thư mục gốc:

```powershell
node mobile/tool/verify_android_work_orders_live.mjs
```

Kịch bản dùng công việc CRITICAL mới trong `work-orders-live-fixture.json`, nhập yêu cầu trên Android, dùng Admin API riêng để duyệt, rồi xác nhận hoàn thành trên app và mở lại từ backend. Không chạy cờ mẫu; mỗi lần chạy cần fixture ASSIGNED mới. Báo cáo ghi đúng APK hash và các bước đã đạt ở `work-orders-android-report.json`; ảnh có tiền tố `work-order-live-`. Entry point cũ `verify_android_work_orders.mjs` chuyển tiếp sang kịch bản này.

Để demo thủ công: [HUONG_DAN_DEMO.md](HUONG_DAN_DEMO.md). Lệnh `node mobile/tool/approve_mobile_material.mjs` chỉ duyệt một yêu cầu của công việc CRITICAL trong fixture SV05 hiện tại, dùng Admin từ `.env`; không thuộc luồng quyền kỹ thuật viên trong Flutter.


Kiểm tra cập nhật cho phần QR: `flutter analyze` không có vấn đề, toàn bộ **51 kiểm thử Flutter đạt** (gồm 28 kiểm thử xác thực trước đó); 4 kiểm tra API tài sản thật đạt. APK mới đã build/cài được. Trên giả lập đã kiểm tra thành công đăng nhập, từ chối quyền camera, mã không hợp lệ, mã không tồn tại và tra cứu thủ công tài sản thật. Ảnh ở `build/verification/qr-camera-denied-android.png` và `qr-manual-detail-android.png`.

Ca camera được kiểm tra riêng và đã đạt: camera Android nhận QR JSON của backend, tải đúng tài sản, sau đó đóng luồng về trang chính. Báo cáo 3 bước ở `build/verification/assets-camera-android-report.json`, ảnh kết quả ở `qr-camera-detail-android.png`. Camera giả lập dùng ảnh thử; vẫn cần kiểm thử camera trên điện thoại thật và bản iOS trước nghiệm thu.

Đã kiểm chứng trong đợt triển khai xác thực:

- `flutter analyze`: không có vấn đề.
- `flutter test`: 28 kiểm thử đạt.
- API backend thật: 7 kiểm tra đạt.
- APK debug build và cài được trên Android API 36.
- Trên giả lập: từ chối sai mật khẩu, đăng nhập thật, khôi phục phiên sau khi dừng tiến trình và đăng xuất bền vững đều đạt. Báo cáo và ảnh nằm ở `build/verification/auth-android-report.json`, `auth-home-android.png`, `auth-restored-android.png`, `auth-logged-out-android.png`.

Máy hiện tại có 8 GB RAM. Demo tuần 3 dùng AVD AOSP Android 11 `smart_cmms_api_30_light`, RAM 2048 MB, màn hình 720×1280, bàn phím máy tính và điều hướng ba nút. AVD API 36 dùng trước đó có thể nâng RAM lên 2560 MB dù yêu cầu 2048 MB, gây treo System UI khi máy thiếu bộ nhớ. Nên build xong rồi mới mở giả lập; xem lệnh khởi động bản nhẹ trong [HUONG_DAN_DEMO.md](HUONG_DAN_DEMO.md).

### Cấu trúc mã nguồn

```text
lib/
  main.dart                         # Khởi tạo HTTP, repository, secure storage
  app.dart                          # Chọn màn hình theo trạng thái xác thực
  core/config/api_config.dart       # URL backend theo môi trường
  core/network/api_client.dart      # JSON envelope, timeout và lỗi kết nối
  features/auth/
    domain/                         # AuthUser, hợp đồng AuthRepository
    data/                           # Gọi API, đọc/ghi token, repository
    presentation/                   # AuthController, form đăng nhập
  features/home/presentation/        # Hồ sơ đã xác thực và đăng xuất
  features/assets/
    domain/                         # Mã QR/tài sản, thông tin thiết bị, hợp đồng repository
    data/                           # Tra cứu API và ánh xạ chi tiết/lịch sử
    presentation/                   # Camera, nhập mã, chi tiết và xử lý lỗi
  features/work_orders/
    domain/                         # Công việc, vật tư, báo cáo, hợp đồng repository
    data/                           # API Work Order/vật tư và kho dữ liệu mẫu riêng
    presentation/                   # Danh sách, chi tiết, bản nháp, chọn phụ tùng và xác nhận
```

### Backend và tài khoản thử trên máy hiện tại

Database riêng cho mobile là `smart_cmms_mobile_dev` trong PostgreSQL hiện có, đã khởi tạo từ `backend/src/database/smart_cmms_db.sql`. File `.env` ở gốc dự án đặt `DB_NAME=smart_cmms_mobile_dev` và `DB_SYNCHRONIZE=false` để giữ schema theo SQL.

Tài khoản thử là `mobile_tech`; mật khẩu nằm ở `MOBILE_TECH_PASSWORD` trong `.env` cục bộ được Git bỏ qua. `DEFAULT_ADMIN_PASSWORD` là mật khẩu admin để tạo tài khoản thử. Khi chuyển máy, cấu hình database và tài khoản riêng; không đưa bí mật vào mã Flutter.

Sau khi PostgreSQL và Redis đã chạy, khởi động backend từ thư mục gốc:

```powershell
npm ci --workspace=backend --include-workspace-root
npm run dev:backend
```

Backend mặc định ở `http://localhost:3000/api/v1`, Swagger ở `http://localhost:3000/api/docs`. Nếu cổng 3000 đã có backend dự án chạy, dùng tiến trình đó.

Kiểm tra API thật bằng Node.js 22.9 trở lên, từ thư mục gốc:

```powershell
node mobile/tool/verify_auth_api.mjs
```

Script đọc `.env`, tạo kỹ thuật viên nếu chưa tồn tại, không đặt lại mật khẩu tài khoản đã có. Script kiểm tra đăng nhập, hồ sơ, từ chối sai mật khẩu/token và chặn kỹ thuật viên truy cập quản lý người dùng. Báo cáo không chứa mật khẩu/token nằm ở `mobile/.dart_tool/auth-api-report.json`.

Kiểm tra API tài sản và tạo QR thử, từ thư mục gốc:

```powershell
node mobile/tool/verify_assets_api.mjs
```

Script chỉ thêm dữ liệu mẫu có mã riêng trong database `smart_cmms_mobile_dev`, không ghi đè bản ghi đã có và từ chối ghi nếu database có tên khác. Tài sản thử là `AST-MOBILE-QR-001`. Ảnh `asset-qr-json.png`, `asset-qr-code.png`, nội dung QR và báo cáo API nằm ở `mobile/build/verification/`. Có thể hiển thị ảnh QR trên máy tính hoặc in tem để quét bằng điện thoại.

### Kiểm thử QR trên giả lập Android

Sau khi build APK và chạy `verify_assets_api.mjs`, mở AVD thử nghiệm với ảnh QR làm đầu vào camera (thực hiện khi AVD này chưa chạy):

```powershell
# Chạy từ thư mục gốc. Dùng terminal khác cho lệnh kiểm thử tiếp theo.
$qrImage = (Resolve-Path 'mobile/build/verification/asset-qr-camera.png').Path
& "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd smart_cmms_api_36 -memory 2048 -no-snapshot -camera-back "imagefile:$qrImage"
```

Khi Android khởi động xong, chạy từ thư mục gốc:

```powershell
node mobile/tool/verify_android_assets.mjs
```

Kịch bản này dành cho giả lập thử nghiệm của dự án: cài APK, đưa quyền camera về trạng thái chưa cấp, đăng nhập tài khoản thử, kiểm tra từ chối quyền và nhập mã, rồi cấp quyền và quét ảnh QR qua camera Android. Ảnh minh chứng/báo cáo nằm ở `mobile/build/verification/`. Camera dùng ảnh thử trong phiên giả lập này; khi chạy trên điện thoại, ứng dụng sử dụng camera thật.

Để kiểm tra riêng luồng camera, dùng `node mobile/tool/verify_android_assets.mjs --camera-only`. Chế độ này ghi báo cáo riêng `assets-camera-android-report.json`, gồm đúng các bước đã chạy. Ảnh `asset-qr-camera.png` có khung trắng và vị trí QR riêng cho camera `imagefile` của giả lập; ảnh QR chuẩn để in/quét bằng điện thoại vẫn là `asset-qr-json.png` hoặc `asset-qr-code.png`.

### URL backend trên thiết bị

Giả lập Android mặc định gọi `http://10.0.2.2:3000/api/v1`, trỏ tới máy Windows chạy backend. Điện thoại thật cần IP LAN của máy chạy backend và cùng mạng; `localhost` trên điện thoại là chính điện thoại đó.

```powershell
flutter run -d <device-id> --dart-define=API_BASE_URL=http://<backend-lan-ip>:3000/api/v1
```

Chỉ truyền URL qua `--dart-define`; không truyền mật khẩu hoặc JWT vì chúng có thể bị đóng gói vào ứng dụng. Android cho phép HTTP ở bản debug phục vụ phát triển cục bộ. Bản release cần URL backend HTTPS. Đã loại trừ secure storage khỏi backup/transfer Android.

iOS đã cấu hình Keychain và mô tả truy cập mạng nội bộ, **chưa build hoặc chạy thử** do chưa có macOS/Xcode. Cần kiểm tra quyền mạng, Keychain và khôi phục phiên trên iOS trước nghiệm thu.

### Kịch bản kiểm tra trên thiết bị

1. Sai mật khẩu: hiện lỗi, vẫn ở form đăng nhập.
2. Đăng nhập kỹ thuật viên hợp lệ: hiện tên và email từ backend.
3. Tắt hẳn rồi mở lại khi backend còn hoạt động: khôi phục hồ sơ bằng token đã lưu.
4. Đăng xuất rồi mở lại: thấy form trống.
5. Mở lại khi backend không truy cập được: hiện lỗi và nút thử lại, giữ token để thử lại sau.

Với giả lập Android đang chạy và APK debug đã build, có thể tự động kiểm tra sai mật khẩu, đăng nhập, mở lại bằng token và đăng xuất từ thư mục gốc:

```powershell
node mobile/tool/verify_android_auth.mjs
```

Script mặc định dùng `emulator-5554`, cài APK debug, rồi điều khiển tài khoản thử trong `.env`. Có thể đổi `ANDROID_SERIAL` hoặc `ADB_PATH` khi cần. Kết quả và ảnh chụp không chứa mật khẩu/token nằm ở `mobile/build/verification/`. Chỉ chạy trên thiết bị thử nghiệm của dự án. Trường hợp tài khoản khác đang đăng nhập, script dừng và giữ nguyên tài khoản đó.

APK debug nằm ở `build/app/outputs/flutter-apk/app-debug.apk`. Unit/widget test và kiểm tra API bằng Node không thay thế chạy ứng dụng trên Android/iOS.

---

## Tuần 4: kiểm tra và lộ trình tiếp theo

Đợt tuần 4: `flutter analyze` không có vấn đề, **117 kiểm thử Flutter đạt**, APK debug build thành công. Ngày 18/11/2026, **6 bước Android offline đạt** trên API 30: giữ cache/phiên còn hạn, thao tác chờ, bản nháp và UUID qua đóng/mở app; đối chiếu SQLite và backend sau khi có mạng lại. Tồn kho giữ 16 → 16, công việc server vẫn ASSIGNED. Báo cáo `build/verification/offline-android-report.json` ghi `status: passed` và SHA-256 khớp APK đã cài. Các số 28/51/81 ở các phần trên là kết quả từng đợt tuần 1–3.
Work Order đã tích hợp API SV03. SQLite, bản nháp bền vững và hàng đợi PENDING đã triển khai ở tuần 4. Phần gửi đồng bộ thật vẫn chờ hợp đồng Sync API; chưa nghiệm thu đồng bộ hai chiều.

1. **Đã có phần lưu trên máy (tuần 4):**
   - Luồng online đã gọi `GET /api/v1/assets/inspect/:code` và hiển thị thông tin/lịch sử.
   - Đã có SQLite cache theo tài khoản/backend, thời điểm cập nhật, bản nháp tự lưu/khôi phục và hàng đợi UUID bền vững. Không lưu token/mật khẩu vào SQLite.
   - Đọc cache chỉ khi thiếu kết nối; lỗi HTTP/quyền/dữ liệu không tự chuyển thành dữ liệu cũ. Phiên offline phải còn hạn và đúng token đã xác thực.
2. **Duy trì tích hợp Work Order thật:**
   - Đã dùng hợp đồng SV03 trong `docs/work_order_api_contract.md`; tiếp tục kiểm tra khi backend thay đổi.
   - Chạy bản mặc định với dữ liệu được giao thật; kiểm tra JWT/ownership, đồng thời thay đổi phân công/trạng thái/tồn kho, chống xuất kho lặp và rollback.
   - Chụp ảnh đính kèm là phần mở rộng nếu nhóm thống nhất, chưa có trong luồng tuần 3 hiện tại.
3. **Còn lại: nối Sync API và nghiệm thu offline tuần 4–5:**
   - Chốt DTO/kết quả từng thao tác, chống trùng UUID, thứ tự/phụ thuộc và quy tắc xung đột với SV03. Định dạng nội bộ hiện tại chưa phải DTO đã thống nhất.
   - Sau đó triển khai gửi `POST /api/v1/sync/batch`, tự động/thủ công, retry có kiểm soát và nhận SYNCED/CONFLICT/FAILED.
   - Hiện tại app chỉ lưu PENDING, hiển thị rõ Chờ đồng bộ, không trừ kho cục bộ và không phát lại qua API ghi cũ khi có mạng.
   - Thao tác đã gửi online nhưng chưa rõ kết quả không được tự chuyển thành operation mới. Đọc cache không thể mở khóa gửi tiếp.
   - Cần nghiệm thu trên điện thoại thật và iOS/macOS. Xem [hướng dẫn demo](HUONG_DAN_DEMO.md) cho ca ngắt mạng và mở lại app.

Các test offline dùng SQLite thật trên Windows qua dev dependency [sqflite_common_ffi](https://pub.dev/packages/sqflite_common_ffi); ứng dụng Android/iOS dùng plugin sqflite. Database `smart_cmms_offline_v1.db` nằm trong vùng riêng của app và được loại khỏi backup/transfer Android.

Kịch bản Android tuần 4 tại thư mục gốc: `node mobile/tool/verify_android_offline.mjs`. Chỉ chạy trên giả lập dự án, database riêng và fixture SV05 mới. Script tạm tắt Wi-Fi/mobile data của giả lập rồi luôn thử bật lại; không tắt mạng của máy Windows. Báo cáo/ảnh ở `mobile/build/verification/offline-*`.
