# ỨNG DỤNG DI ĐỘNG FLUTTER - SMART CMMS
**Phụ trách chính:** SV05 (Mobile Engineer)  
**Đối tượng sử dụng:** Kỹ thuật viên bảo trì hiện trường (Field Technicians)

Xem nhanh: [hướng dẫn chạy demo](HUONG_DAN_DEMO.md) · [ghi chú bàn giao SV05 tuần 1–3](docs/SV05_TIEN_DO.md).

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
- Token bị từ chối 401/403: xóa token, về đăng nhập. Lỗi mạng/máy chủ: giữ token và cho phép thử lại; chưa có đăng nhập offline.
- Đăng xuất: xóa token trên máy, xóa trạng thái phiên và trở về form trống. Backend chưa có API thu hồi hoặc refresh token, nên đăng xuất chưa thu hồi JWT trên máy chủ.
- Kiểm thử hợp đồng API, lỗi mạng/lưu trữ và luồng giao diện trong `test/`.

Đã triển khai phần QR và tra cứu tài sản thuộc tuần 1–2:

- Mở “Quét mã QR thiết bị” từ trang chính; xin quyền camera, dừng camera khi ra nền hoặc rời màn hình.
- Nhận mã `AST-xxx`, QR JSON `SMART_CMMS` phiên bản `1.0` do backend sinh, và URL tem cũ có đường dẫn `assets/code/AST-xxx`. URL trong tem chỉ dùng để trích mã, không mở hoặc gửi yêu cầu tới host trong tem.
- Chống xử lý nhiều khung hình cùng lúc. Mã sai không gọi API; người dùng có thể quét lại.
- Có “Nhập mã thủ công” khi không có camera hoặc không cấp quyền.
- Gọi `GET /api/v1/assets/inspect/:code` với Bearer token, hiển thị tên, trạng thái, vị trí/xưởng, hãng/model/serial, giờ vận hành, thông số và tối đa 5 lịch sử bảo trì gần nhất.
- Phân biệt mã không hợp lệ, không tìm thấy tài sản, lỗi mạng/máy chủ. QR JSON có UUID khác với tài sản trên backend sẽ bị từ chối. Token hết hạn sẽ đưa về đăng nhập.

Phần mobile Work Order tuần 3 đã triển khai; backend hiện chỉ có entity, chưa có controller/service. Do đó **chưa nghiệm thu được Work Order với dữ liệu thật**. SQLite và hàng đợi đồng bộ chưa triển khai. iOS chưa được build/kiểm thử trên macOS.

### Tuần 3 — công việc được giao

- Danh sách công việc, lọc Khẩn cấp/Cao/Trung bình/Thấp, phân trang và kéo tải lại.
- Chi tiết thiết bị/công việc, trạng thái, hạn dự kiến; chỉ cho bắt đầu khi ASSIGNED.
- Bắt đầu làm → IN_PROGRESS; nhập ghi chú, giờ thực hiện, tìm/chọn phụ tùng, số lượng và bỏ phụ tùng.
- Kiểm tra ghi chú/thời gian/số lượng/tồn kho, giữ bản nháp khi chọn phụ tùng và hỏi trước khi bỏ thay đổi. Nút Back hệ thống đóng bàn phím trước khi xử lý việc rời màn hình.
- Xem lại báo cáo rồi xác nhận hoàn thành → COMPLETED, hiển thị kết quả chỉ đọc và chờ quản lý nghiệm thu.
- Chống gửi lặp trong lúc đang xử lý. Kết quả ghi chưa rõ ràng sẽ khóa gửi tiếp và yêu cầu đọc lại trạng thái; bản nháp vẫn được giữ trong màn hình.
- Tách repository API và repository dữ liệu mẫu. **Không tự dùng mẫu khi API lỗi.**

| Chế độ | Cách chạy tại `mobile/` | Dữ liệu công việc |
| --- | --- | --- |
| Mặc định | `flutter run -d emulator-5554` | Gọi API thật; hiện hiển thị máy chủ chưa hỗ trợ danh sách |
| Dữ liệu mẫu | `flutter run -d emulator-5554 --dart-define=WORK_ORDERS_DEMO=true` | Có nhãn DỮ LIỆU MẪU trên mọi màn hình Work Order; thao tác chỉ ở bộ nhớ |

Đăng nhập và QR vẫn sử dụng backend thật trong cả hai chế độ. Dữ liệu công việc mẫu tách theo kỹ thuật viên và mất khi đóng tiến trình app; không ghi Work Order hoặc trừ kho trên server. Bản nháp chưa có lưu bền SQLite.

Adapter gọi API theo [hợp đồng đề xuất với SV03](docs/work_order_api_contract.md). Trước tích hợp thật phải thống nhất payload và xử lý hoàn thành/vật tư nguyên tử ở backend; mobile không gọi xuất kho và đổi trạng thái bằng hai yêu cầu riêng.

`flutter analyze` không có vấn đề; toàn bộ **75 kiểm thử Flutter đạt**, gồm các kiểm thử trước đó và 24 kiểm thử Work Order. Kiểm tra backend thật bằng `node mobile/tool/check_work_orders_api.mjs` từ thư mục gốc: hiện my-tasks trả 404, danh mục phụ tùng trả 200. Báo cáo `build/verification/work-orders-api-readiness.json` không xác nhận nghiệm thu mutation backend.

Hai APK có cùng mã ứng dụng; cài bản sau sẽ thay bản trước:

- `build/app/outputs/flutter-apk/app-debug.apk`: bản mặc định gọi API thật.
- `build/verification/app-week3-demo.apk`: bản thử luồng tuần 3 có nhãn dữ liệu mẫu.

Để tạo lại đúng hai bản trên, chạy tại `mobile/`:

```powershell
flutter build apk --debug --dart-define=WORK_ORDERS_DEMO=true
New-Item -ItemType Directory -Path build/verification -Force | Out-Null
Copy-Item -LiteralPath build/app/outputs/flutter-apk/app-debug.apk -Destination build/verification/app-week3-demo.apk -Force
flutter build apk --debug
```

Sau khi đã build hai APK và mở giả lập, chạy `node mobile/tool/verify_android_work_orders.mjs` từ thư mục gốc để thử thông báo API chưa hỗ trợ và luồng mẫu: lọc → bắt đầu → ghi chú/thời gian → phụ tùng → xác nhận hoàn thành. Script chỉ thao tác dữ liệu công việc mẫu. Báo cáo/ảnh được lưu ở `mobile/build/verification/` sau khi kiểm tra thành công.

Đã chạy thành công **6 bước trên giả lập Android API 36** ở chế độ mẫu: nhận danh sách có nhãn, lọc ưu tiên, bắt đầu, giữ báo cáo/phụ tùng khi chuyển màn hình, xác nhận hoàn thành và mở lại kết quả chỉ đọc. Báo cáo [work-orders-android-report.json](build/verification/work-orders-android-report.json) ghi `mode: demo-only`, SHA-256 của APK đã chạy và `liveWorkOrderIntegrationAccepted: false`. Ảnh [xem lại báo cáo](build/verification/work-order-review-android.png) và [kết quả hoàn thành](build/verification/work-order-completed-android.png) minh họa đúng dữ liệu mẫu đã kiểm tra. Bản API cũng đã hiển thị đúng thông báo thiếu endpoint trên Android, ảnh [work-orders-api-unavailable-android.png](build/verification/work-orders-api-unavailable-android.png).

Để kiểm tra riêng bản mẫu đang cài, dùng `node mobile/tool/verify_android_work_orders.mjs --demo-only --skip-demo-install`; mỗi lần chạy đóng/mở lại tiến trình nên dữ liệu mẫu được khởi tạo mới. Công cụ này dùng AVD thử nghiệm ở độ phân giải 720×1280; thao tác thu bàn phím và cuộn màn hình dựa vào kích thước đó. Các tệp trong `build/` được Git bỏ qua, cần build/chạy kiểm tra lại trên máy khác.

Kiểm tra cập nhật cho phần QR: `flutter analyze` không có vấn đề, toàn bộ **51 kiểm thử Flutter đạt** (gồm 28 kiểm thử xác thực trước đó); 4 kiểm tra API tài sản thật đạt. APK mới đã build/cài được. Trên giả lập đã kiểm tra thành công đăng nhập, từ chối quyền camera, mã không hợp lệ, mã không tồn tại và tra cứu thủ công tài sản thật. Ảnh ở `build/verification/qr-camera-denied-android.png` và `qr-manual-detail-android.png`.

Ca camera được kiểm tra riêng và đã đạt: camera Android nhận QR JSON của backend, tải đúng tài sản, sau đó đóng luồng về trang chính. Báo cáo 3 bước ở `build/verification/assets-camera-android-report.json`, ảnh kết quả ở `qr-camera-detail-android.png`. Camera giả lập dùng ảnh thử; vẫn cần kiểm thử camera trên điện thoại thật và bản iOS trước nghiệm thu.

Đã kiểm chứng trong đợt triển khai xác thực:

- `flutter analyze`: không có vấn đề.
- `flutter test`: 28 kiểm thử đạt.
- API backend thật: 7 kiểm tra đạt.
- APK debug build và cài được trên Android API 36.
- Trên giả lập: từ chối sai mật khẩu, đăng nhập thật, khôi phục phiên sau khi dừng tiến trình và đăng xuất bền vững đều đạt. Báo cáo và ảnh nằm ở `build/verification/auth-android-report.json`, `auth-home-android.png`, `auth-restored-android.png`, `auth-logged-out-android.png`.

Máy hiện tại có 8 GB RAM. AVD `smart_cmms_api_36` dùng 2048 MB RAM khi kiểm tra camera, bàn phím máy tính và màn hình thử nghiệm 720×1280. Bàn phím ảo từng gây treo, và mức RAM 1536 MB từng khiến Android đóng tiến trình kiểm thử. Nên build xong rồi mở giả lập khi máy thiếu RAM.

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
    data/                           # Adapter API đề xuất và kho dữ liệu mẫu riêng
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

## LỘ TRÌNH TIẾP THEO
Tiếp theo là thống nhất/tích hợp API Work Order của SV03, sau đó SQLite/đồng bộ tuần 4–5 và nghiệm thu trên thiết bị. Sync API vẫn là hợp đồng dự kiến.

1. **Bổ sung offline cho tra cứu tài sản (tuần 4–5):**
   - Luồng online đã gọi `GET /api/v1/assets/inspect/:code` và hiển thị thông tin/lịch sử.
   - Cần bổ sung SQLite cache, thông báo dữ liệu lưu trên máy và thời điểm cập nhật khi mất mạng.
2. **Tích hợp Work Order thật:**
   - SV03 xác nhận và triển khai hợp đồng trong `docs/work_order_api_contract.md`.
   - Chạy bản mặc định với dữ liệu được giao thật; kiểm tra JWT/ownership, đồng thời thay đổi phân công/trạng thái/tồn kho, chống xuất kho lặp và rollback.
   - Chụp ảnh đính kèm là phần mở rộng nếu nhóm thống nhất, chưa có trong luồng tuần 3 hiện tại.
3. **CƠ CHẾ OFFLINE-FIRST (TIÊU CHÍ NGHIỆM THU ĐỒ ÁN):**
   - Lưu trữ cục bộ bằng **SQLite** (`sqflite`).
   - Mỗi khi kỹ thuật viên thực hiện hành động lúc mất mạng:
     - Tạo 1 mã `operation_uuid = Uuid().v4()`.
     - Lưu bản ghi vào bảng SQLite `sync_queue` với trạng thái `PENDING`.
     - Ứng dụng vẫn phản hồi thành công trên giao diện ngay lập tức.
   - Khi có kết nối mạng trở lại (lắng nghe `connectivity_plus`):
     - Tự động đóng gói danh sách operations gửi lên `POST /api/v1/sync/batch`.
     - Nhận phản hồi từ Backend và đổi trạng thái bản ghi sang `SYNCED` hoặc `CONFLICT`.
   - Màn hình Trạng thái đồng bộ: Cho phép Kỹ thuật viên xem danh sách các thao tác đang chờ, đã đồng bộ, hoặc bị lỗi.
