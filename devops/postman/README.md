# Postman Collection - Kiểm thử API tự động (SV06)

Bộ kiểm thử API của Smart CMMS, chạy được bằng Postman (giao diện) hoặc Newman (dòng lệnh / CI).

| File | Nội dung |
|---|---|
| `smart-cmms.postman_collection.json` | 81 request, 285 kiểm tra, chia theo module |
| `local.postman_environment.json` | Biến môi trường local: `baseUrl`, tài khoản test |
| `seed-test-users.sql` | Tạo 3 vai trò + 3 tài khoản test (`qa_admin`, `qa_manager`, `qa_tech`, mật khẩu `Test@123`) |

Danh sách test case và kết quả: [`../test-plans/02_api_test_cases.md`](../test-plans/02_api_test_cases.md).

## Chuẩn bị (1 lần)

```bash
cp .env.example .env              # máy đã có Redis ở 6379 thì đặt REDIS_PORT=6380
docker compose up -d
npm ci
npm run dev:backend               # hoặc: cd backend && npm run build && node dist/main
docker exec -i smart_cmms_postgres psql -U postgres -d smart_cmms_db < devops/postman/seed-test-users.sql
```

> **Lưu ý (09/11/2026):** backend trên `develop` chưa khởi động được do entity `WorkOrder` chưa được đăng ký (BUG-02, chờ SV03 tạo `WorkOrderModule`).

`seed-test-users.sql` chạy lại nhiều lần không bị trùng. Các dữ liệu khác (vị trí, thiết bị, phụ tùng…) do collection tự tạo với mã riêng cho mỗi lần chạy và tự dọn ở folder `99. Cleanup`.

## Chạy bằng Newman

```bash
npx newman@6 run devops/postman/smart-cmms.postman_collection.json \
  -e devops/postman/local.postman_environment.json
```

Backend chạy cổng khác 3000 thì thêm `--env-var baseUrl=http://localhost:<cổng>/api/v1`.

Chỉ chạy một module: thêm `--folder "03. Parts & Inventory (SV02)"` (bắt buộc kèm `--folder "00. Auth & Users (SV01)"` để lấy token).

## Chạy bằng Postman

1. **Import** cả hai file `.json` trong thư mục này.
2. Chọn environment **Smart CMMS - Local** ở góc phải.
3. Chuột phải collection → **Run collection** → **Run**.

## Cấu trúc collection

| Folder | Nội dung |
|---|---|
| `00. Auth & Users (SV01)` | Đăng nhập, `/me`, vai trò, tạo user, kiểm tra 401/403. **Luôn chạy đầu tiên.** |
| `01. Locations (SV02)` | Cây vị trí, CRUD, trùng mã |
| `02. Assets & QR (SV02)` | CRUD thiết bị, tìm kiếm, phân trang, lọc, trạng thái, mã QR |
| `03. Parts & Inventory (SV02)` | Phụ tùng, cảnh báo tồn kho, nhập/xuất, **chặn tồn kho âm**, BOM |
| `04. History & KPI MTTR/MTBF (SV02)` | Ghi sự cố, tính MTTR/MTBF |
| `05. Security` | Gọi API nghiệp vụ không token, mong đợi 401. **Hiện đang trượt** cho tới khi SV02 gắn `JwtAuthGuard` (BUG-01) |
| `06. Work Orders… (SV03)` | Chờ API của SV03 |
| `99. Cleanup` | Xóa mềm dữ liệu vừa tạo |

## Thêm test cho API mới

Mỗi request nên có ít nhất: kiểm tra mã HTTP, kiểm tra dữ liệu chính trong `data`, và một case lỗi (400/404/409). Lưu ID cần dùng lại bằng `pm.collectionVariables.set(...)`. Sau khi sửa, chạy Newman để chắc cả collection vẫn đạt.
