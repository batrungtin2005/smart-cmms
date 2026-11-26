# Lịch bảo dưỡng PM — backend và bàn giao

Phụ trách: **SV03**. Cập nhật: **23/11/2026**. Module đã triển khai; giao diện Web/Mobile cần tích hợp API. Đây là README duy nhất được cập nhật cho đợt làm PM này, gồm cả thay đổi ở các folder liên quan.

## 1. Nghiệp vụ đã triển khai

| Kiểu lịch | Điều kiện sinh phiếu | Kỳ tiếp theo khi nghiệm thu ACCEPT |
| --- | --- | --- |
| TIME_BASED | Đến `nextDueDate`, theo ngày Việt Nam | Ngày nghiệm thu thực tế + `intervalDays` |
| USAGE_BASED | Số giờ tích lũy mới nhất ≥ `nextDueHours` | Số giờ được xác nhận lúc nghiệm thu + `intervalHours` |
| CONDITION_BASED | Nhiệt độ hoặc độ rung mới nhất vượt ngưỡng `>` / `>=`, còn hiệu lực | Chờ số đo sau nghiệm thu, hết cooldown; nếu vẫn vượt ngưỡng được sinh phiếu mới |

- Một máy có thể dùng cả ba kiểu, nhiều lịch độc lập. Mỗi lịch chỉ theo một thông số; chưa tự gộp phiếu giữa các lịch.
- Chỉ thiết bị đang hoạt động, chưa DECOMMISSIONED và lịch đang bật mới sinh phiếu.
- Mỗi lịch chỉ có một phiếu chưa giải quyết: OPEN, ASSIGNED, IN_PROGRESS, ON_HOLD, COMPLETED, REWORK_REQUIRED đều chặn lượt mới.
- Phiếu tự sinh loại PREVENTIVE. Chọn TECHNICIAN đang hoạt động có ít phiếu chưa nghiệm thu nhất, tính cả phiếu ngoài PM. Hòa thì ưu tiên lâu chưa được tự giao, tiếp theo ID. Không có KTV phù hợp thì tạo OPEN để quản lý giao sau.
- Hệ thống dùng tài khoản `__pm_scheduler__` bị vô hiệu hóa đăng nhập, vai trò ADMIN, được migration tạo. Không giả JWT quản lý.
- KTV hoàn thành chưa đổi kỳ. REJECT giữ kỳ và chuyển REWORK_REQUIRED; chỉ ACCEPT/CLOSED cập nhật kỳ trong cùng transaction nghiệm thu.
- Chu kỳ giờ ví dụ: sinh ở 1501, nghiệm thu ở 1510, chu kỳ 1500 → hạn sau 3010. Không reset đồng hồ khi bảo dưỡng.
- Nhiệt độ: °C. Độ rung: vận tốc RMS, mm/s RMS. Mỗi máy/thông số có một vị trí đo chuẩn; không trộn vị trí, gia tốc hoặc biên độ rung. Ngưỡng phải lấy từ tài liệu thiết bị/quy trình doanh nghiệp.
- `maxReadingAgeMinutes`, `cooldownMinutes`, `measurementLocation` bắt buộc với lịch điều kiện; không đặt mặc định thay doanh nghiệp. Vị trí đo không được sửa sau cấu hình.
- Tắt lịch không hủy phiếu hiện có. Khi còn phiếu mở, không sửa cấu hình lịch. Không đổi máy/kiểu lịch; tạo lịch khác nếu cần.
- Vật tư giữ nguyên luồng yêu cầu → thủ kho duyệt/xuất → trừ kho. PM không tự trừ vật tư.

## 2. Nhập Excel và lịch sử số đo

Quản lý tải mẫu bằng API; một file chứa nhiều máy, nhiều thời điểm. Chỉ nhận `.xlsx`, một sheet `Readings`, đúng sáu tiêu đề:

| Mã thiết bị | Thời điểm đo | Tổng giờ vận hành (h) | Nhiệt độ (°C) | Độ rung (mm/s RMS) | Ghi chú |
| --- | --- | ---: | ---: | ---: | --- |
| MN-001 | 23/11/2026 08:00:00 | 1501 | 82 | 3.2 | Đo đầu ca |
| MN-002 | 23/11/2026 08:05:00 | | 72 | | Chỉ đo nhiệt |

Giá trị trên chỉ minh họa, không phải ngưỡng an toàn.

- Tối đa **5 MiB, 500 dòng dữ liệu**; đọc file có giới hạn kích thước giải nén. Không nhận macro, công thức, hyperlink hoặc liên kết ngoài.
- Thời điểm Excel: `dd/MM/yyyy HH:mm[:ss]` hoặc ô ngày Excel, hiểu theo UTC+7. API nhập lẻ dùng ISO có timezone. Không nhận thời gian tương lai.
- Ít nhất một số đo mỗi dòng. Ô trống khác 0; ô số phải chứa số thuần. Giờ tối đa hai chữ số thập phân, nhiệt/rung tối đa bốn.
- Giờ tích lũy và độ rung không âm. Giờ không được giảm theo thứ tự thời gian; kiểm tra cả dữ liệu trước/sau đã lưu. Chưa hỗ trợ thay/reset đồng hồ.
- **Preview** chỉ lưu bản xem trước, lỗi dòng/cột và checksum, chưa lưu số đo hay sinh phiếu. Có lỗi thì không confirm cả file. Preview hết hạn sau 24 giờ; tải lại để kiểm tra lại.
- **Confirm** kiểm tra lại trạng thái DB, lưu toàn bộ số đo trong một transaction rồi đánh giá PM sau commit. Confirm lặp không nhập lại. Cùng file/cùng người dùng tái sử dụng batch; file khác trùng máy + thông số + thời điểm bị báo lỗi.
- Số đo nhập muộn vẫn lưu nếu hợp lệ; không thay giá trị hiện tại mới hơn. PM xét số đo mới nhất, không sinh phiếu hồi tố cho từng dòng cũ.
- `status=CONFIRMED` nghĩa là số đo đã lưu; `evaluationStatus=PENDING/SUCCEEDED/FAILED` là kết quả xử lý PM riêng. SUCCEEDED không đồng nghĩa phải có phiếu mới. FAILED được cron thử lại.
- Đính chính giữ bản gốc, người sửa, lý do và `supersedesId`; lịch sử trả cả bản cũ và mới (`isCurrentVersion`). Không tự xóa phiếu đã sinh hoặc tính lại mốc đã nghiệm thu; trả `affectedWorkOrderIds` để quản lý đối soát.
- Lưu dữ liệu đã chuẩn hóa, tên file và checksum trong DB; chưa lưu bản nhị phân Excel gốc. Nguồn hiện dùng EXCEL/MANUAL/CORRECTION. IOT/SIMULATED mới được dành trong schema, chưa có endpoint tiếp nhận IoT.

## 3. API bàn giao

Prefix `/api/v1`, JWT. ADMIN/MAINTENANCE_MANAGER quản lý lịch và import. Quản lý xem/xác nhận batch của mình; ADMIN có thể xem/xác nhận mọi batch.

| Method / đường dẫn | Nội dung |
| --- | --- |
| POST /schedules | Tạo lịch |
| GET /schedules | Phân trang; lọc assetId, scheduleType, active=true/false |
| GET /schedules/due | Sắp đến hạn/đến hạn/quá hạn đủ điều kiện, không gồm lịch đang bị phiếu mở chặn |
| GET /schedules/:id | Cấu hình và evaluation, số đo mới nhất, blockingWorkOrderId |
| PATCH /schedules/:id | Gửi cấu hình đầy đủ và expectedRevision; không phải patch từng trường |
| PATCH /schedules/:id/activation | isActive và expectedRevision |
| GET /schedules/:id/work-orders | Lịch sử kỳ, snapshot lý do/số đo, phiếu liên quan |
| GET /reading-imports/template | Tải file mẫu .xlsx |
| POST /reading-imports/preview | multipart/form-data, trường file |
| POST /reading-imports/:id/confirm | Xác nhận batch, không cần gửi lại rows |
| GET /reading-imports | Lịch sử import phân trang |
| GET /reading-imports/:id | Dòng, lỗi, trạng thái và kết quả đánh giá PM |
| GET /assets/:id/readings | Lịch sử phân trang, lọc parameter |
| POST /readings | Nhập một số đo |
| POST /readings/:id/corrections | Đính chính với value, reason |

Phân trang `page=1`, `limit=20`, tối đa 100; danh sách trả `items`, `meta`. Response đi qua wrapper `data` chung của dự án. Lỗi import có `errors: [{row,column,message}]`. HTTP 400: dữ liệu không hợp lệ; 403: thiếu quyền; 409: dữ liệu đã thay đổi/xung đột, cần tải lại. Bật/tắt và sửa lịch dùng `expectedRevision` lấy từ GET gần nhất.

POST lịch theo ngày:

```json
{"assetId":"<UUID máy>","title":"Bảo dưỡng định kỳ","scheduleType":"TIME_BASED","intervalDays":30,"nextDueDate":"2026-12-01","advanceNoticeDays":3}
```

POST lịch theo giờ:

```json
{"assetId":"<UUID máy>","title":"Thay dầu","scheduleType":"USAGE_BASED","intervalHours":1500,"nextDueHours":1500}
```

POST lịch điều kiện (các giá trị chỉ minh họa, phải cấu hình theo máy):

```json
{"assetId":"<UUID máy>","title":"Kiểm tra nhiệt ổ trục","scheduleType":"CONDITION_BASED","conditionParameter":"TEMPERATURE","conditionThreshold":85,"conditionOperator":">","measurementLocation":"Ổ trục đầu truyền động","maxReadingAgeMinutes":60,"cooldownMinutes":10}
```

Không gửi các trường thuộc kiểu lịch khác. `priority` mặc định MEDIUM. `advanceNoticeDays` phục vụ cảnh báo lịch ngày, không tạo phiếu trước hạn; chưa có báo trước theo giờ.

Nhập lẻ:

```json
{"assetId":"<UUID máy>","parameter":"OPERATING_HOURS","value":1510,"measuredAt":"2026-11-23T09:30:00+07:00","notes":"Đọc đồng hồ sau khi hoàn thành"}
```

TECHNICIAN được xem số đo của máy có phiếu giao cho mình; chỉ nhập số đo khi còn phiếu được giao chưa CLOSED/CANCELLED, gồm COMPLETED chờ nghiệm thu. Không được thay ngưỡng/import/đính chính. Nhập lẻ trùng khóa và cùng giá trị là no-op.

### Nghiệm thu và hủy phiếu PM

- `PATCH /work-orders/:id/verify`: nghiệm thu lịch giờ phải thêm `meterReadingId` bên cạnh `decision: "ACCEPT"`, `verificationNotes`. Số đo phải là giờ vận hành của đúng máy, bản hiện hành, đo từ khi hoàn thành và **không quá 15 phút** trước nghiệm thu. Đây là giới hạn kỹ thuật hiện tại trong `pm-lifecycle.ts`; nhóm cần điều chỉnh nếu quy trình thực tế yêu cầu khác. Thiếu số đo thì từ chối, không tự lấy mốc lúc sinh phiếu.
- `PATCH /work-orders/:id/status`: hủy PM cần `status: "CANCELLED"`, `reason`, `scheduleAction`.
- `scheduleAction: "DEFER"`: gửi đúng một trường theo kiểu: `deferDate` ngày sau hôm nay; `deferHours` lớn hơn đồng hồ hiện tại; hoặc `deferUntil` thời điểm tương lai cho lịch điều kiện.
- `scheduleAction: "DISABLE"`: không gửi trường dời; tắt lịch cùng transaction hủy.
- Vẫn giữ điều kiện hủy của Work Order hiện có. Hủy không ghi nghiệm thu giả. Lần bật lại có thể sinh phiếu nếu lịch vẫn đến hạn.

## 4. Code và cơ chế đồng thời

| File/nhóm | Trách nhiệm |
| --- | --- |
| schedules.module.ts, schedules.controller.ts, schedules.service.ts, dto/ | Đăng ký entity, API lịch, quyền và validation |
| schedule-evaluator.ts | Hàm xác định đến hạn, ngày Việt Nam, độ mới số đo, cooldown |
| schedule-engine.service.ts | Tạo phiếu/giao KTV, snapshot kỳ, lỗi sinh phiếu |
| schedules.scheduler.ts | Cron mỗi phút, retry batch và quét lịch đang bật |
| excel-readings.ts, readings.controller.ts, readings.service.ts | Mẫu Excel, preview/confirm, nhập lẻ, lịch sử/đính chính |
| pm-lifecycle.ts | Nối nghiệm thu/hủy Work Order với cập nhật kỳ |
| entities/ | MaintenanceSchedule và bốn bảng bổ sung |
| *.spec.ts | Kiểm thử quy tắc, Excel, API PostgreSQL và đồng thời |

Các thay đổi ngoài folder: AppModule import SchedulesModule; WorkOrdersService thêm hàm tạo PM nội bộ, cập nhật kỳ khi nghiệm thu/hủy và điều phối khóa; DTO verify/status thêm trường PM; AssetsService chặn thay tổng giờ qua API update (dùng readings); HttpExceptionFilter giữ lỗi từng dòng; package thêm exceljs/fflate; SQL mới và migration; `backend/tsconfig.build.json` loại test khỏi build, giữ đầu ra `dist/main.js`. Không cập nhật README tại các folder đó theo yêu cầu.

- Các transaction PM và thao tác phân công/hoàn thành/nghiệm thu/đổi trạng thái WO dùng PostgreSQL advisory transaction lock chung trước khóa dòng. Ưu tiên tính đúng và thứ tự khóa; chưa tối ưu cho tải ghi lớn.
- Unique `(schedule_id, cycle)` cùng partial unique một WO chưa đóng/hủy trên mỗi lịch chống trùng bền vững. Tạo WO/lịch sử/trigger cùng transaction; lỗi rollback cả lượt.
- Cron mỗi phút, timezone Asia/Ho_Chi_Minh; `PM_CRON_ENABLED=false` chỉ tắt cron, không tắt đánh giá ngay sau nhập số đo. Nhiều instance vẫn chống sinh trùng bằng DB.
- Lỗi đánh giá lưu `lastError`/`lastEvaluatedAt`; nhập Excel đã commit được retry mà không nhập lại số đo.

## 5. Database và cách chạy

**Chưa áp dụng migration vào dữ liệu thật của bạn.** Kiểm thử dùng schema riêng rồi dọn.

- Database mới: chạy `backend/src/database/smart_cmms_db.sql`, đã chứa cấu trúc PM và tài khoản hệ thống.
- Database có dữ liệu: không chạy lại file khởi tạo. Backup, áp dụng các migration Work Order còn thiếu theo thứ tự: `20261113_work_order_status_history.sql`, `20261113_material_requests.sql`, `20261113_work_order_completion.sql`, sau đó `20261123_maintenance_schedules.sql` và `20261123_normalize_asset_enums_and_roles.sql`.
- Migration PM thêm cột vào maintenance_schedules và bốn bảng: reading_import_batches, asset_reading_submissions, asset_readings, schedule_triggers. Không xóa dữ liệu cũ. Đã thử chạy PM migration hai lần trong schema kiểm thử.
- Nếu lịch cũ đang có nhiều WO mở, unique index sẽ từ chối: cần đối soát trước. Phiếu PM cũ chưa có schedule_trigger cần đối soát/backfill riêng, không tự coi là kỳ mới. Lịch điều kiện cũ thiếu cấu hình tuổi số đo/vị trí/cooldown không tự hoạt động đầy đủ.
- Đặt **DB_SYNCHRONIZE=false** trong môi trường backend. AppModule hiện vẫn có mặc định true nếu không đặt biến này; không dựa vào synchronize để nâng cấp DB.
- Chạy migration qua Query Tool pgAdmin hoặc psql trên đúng database, kiểm tra COMMIT thành công trước khi khởi động backend.

Từ root repository, sau khi DB đã được cập nhật:

```powershell
npm ci
npm run build:backend
cd backend
node dist/main
```

**Đã đồng bộ enum và vai trò:** database cũ chạy thêm `20261123_normalize_asset_enums_and_roles.sql` sau migration PM. SQL/entity dùng `assets_status_enum`, `assets_criticality_enum`; các user MANAGER được chuyển sang MAINTENANCE_MANAGER trước khi xóa vai trò cũ. Đã đối chiếu database thật đạt 18 entity và kiểm tra backend/API thành công. Chi tiết tại README database.

## 6. Kiểm thử và giới hạn

Đã chạy build đạt. Bộ backend 8 suites/97 tests chạy đạt; sau đó bổ sung hai test schema PM và retry import, chạy lại suite PM đạt **13/13** (tổng code hiện có 99 tests). PostgreSQL tests opt-in:

```powershell
$env:RUN_POSTGRES_TESTS='1'
try { npm run test --workspace=backend -- --runInBand } finally { Remove-Item Env:RUN_POSTGRES_TESTS -ErrorAction SilentlyContinue }
```

Test đọc cấu hình DB hiện có, tạo schema tên ngẫu nhiên, không dùng public để lưu dữ liệu thử và dọn sau chạy. Cần tài khoản có quyền tạo schema. Log ERROR trong test rollback/retry là lỗi được cố ý gây ra để kiểm chứng giao dịch.

Đã kiểm chứng: RBAC/validation/revision; ngày nghiệm thu và REWORK; 1501→1510→3010; nhiệt độ sau nghiệm thu/cooldown; phân công đồng thời/chống trùng; fallback OPEN; hủy dời/tắt; Excel nhiều máy/ô trống/0/công thức/dòng lỗi; confirm đồng thời; dữ liệu đổi sau preview; đính chính; rollback sinh phiếu và retry sau import.

Chưa bao gồm: Web/Mobile UI, IoT thật, lưu file gốc, reset đồng hồ, gộp nhiều lịch vào một WO, phân công theo tay nghề/ca, push notification, thử tải lớn/nhiều tiến trình thực tế. `/schedules/due` hiện đánh giá tập lịch đã lọc trước phân trang, cần tối ưu khi số lịch lớn. Tests đồng thời dùng nhiều kết nối DB, chưa thay thế kiểm thử nhiều deployment của QA.

## 7. Thành viên khác cần làm tiếp

| Thành viên | Công việc tiếp theo | Đầu ra cần bàn giao |
| --- | --- | --- |
| SV01 — Core/Auth/Leader | Review quyền/tài khoản cron bị khóa; cập nhật ERD/SRS/BPMN; phối hợp thống nhất tên enum và migration cũ | Quyền, schema thống nhất; môi trường chạy synchronize=false |
| SV02 — Asset/Inventory/History | Chuẩn hóa mã máy và vị trí đo; cung cấp ngưỡng từ tài liệu máy; chuyển cập nhật giờ sang readings; thiết kế quy trình thay/reset đồng hồ nếu cần | Danh sách máy/ngưỡng/dữ liệu demo, quy tắc bộ đếm; không viết bộ sinh PM thứ hai |
| SV04 — Web | Form ba kiểu lịch, revision, bật/tắt, đến hạn, lịch sử; tải mẫu/upload/preview lỗi/confirm/lịch sử import; nhập/đính chính số đo; UI dời/tắt khi hủy và chọn meterReadingId khi nghiệm thu | UI gọi API thật; phân biệt số đo đã lưu và xử lý PM thất bại; không tính hạn/phân công ở client |
| SV05 — Mobile | Nhận/xử lý phiếu PM; hiển thị lịch/số đo liên quan theo quyền; nhập giờ sau hoàn thành cho nghiệm thu; giữ luồng vật tư và sửa lại | Tích hợp WO/readings, không cần import Excel trên mobile |
| SV06 — QA/DevOps | Chạy migration trên staging/backup; test ba kiểu end-to-end, retry/restart/nhiều instance; kiểm tra giới hạn file và tải; đưa PostgreSQL tests vào CI | Test report/Postman, demo và hướng dẫn triển khai |

SV03 bàn giao module/API/migration/test này; phối hợp sửa lỗi tích hợp và thống nhất giới hạn 15 phút khi nghiệp vụ thực tế cần đổi. MTTR/MTBF và Sync API là phần công việc riêng, không được coi là đã hoàn tất bởi module lịch bảo dưỡng.
