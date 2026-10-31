# 🚀 DT05 - SMART CMMS: HỆ THỐNG QUẢN LÝ VẬN HÀNH BẢO TRÌ THIẾT BỊ VÀ TÀI SẢN KỸ THUẬT
**Khách hàng giả định:** ZENTECH COMPANY  
**Đơn vị phát triển:** Nhóm 6 thành viên  

---

## 📌 1. GIỚI THIỆU DỰ ÁN
**Smart CMMS** (Computerized Maintenance Management System) là giải pháp số hóa toàn diện quy trình bảo trì, sửa chữa máy móc và quản lý tài sản kỹ thuật cho doanh nghiệp sản xuất Zentech (quy mô 300 thiết bị).

Hệ thống giải quyết triệt để các tồn tại của phương pháp quản lý truyền thống (Excel, sổ tay, điện thoại):
- ✅ **Số hóa tài sản tập trung:** Mã định danh duy nhất (`AST-xxx`), thông số kỹ thuật, vị trí xưởng, nhật ký sửa chữa và in mã QR Code.
- ✅ **Chuẩn hóa quy trình Work Order:** Luồng trạng thái khép kín từ lúc phát hiện sự cố $\to$ phân công kỹ thuật viên $\to$ sửa chữa $\to$ trừ kho vật tư $\to$ nghiệm thu đóng phiếu.
- ✅ **Lập lịch bảo dưỡng dự phòng (Preventive Maintenance):** 3 kiểu lịch (Thời gian, Số giờ chạy máy, Ngưỡng cảnh báo nhiệt/rung).
- ✅ **Hỗ trợ Kỹ thuật viên hiện trường (Mobile Offline-First):** Ứng dụng di động Flutter quét mã QR, làm việc bình thường cả khi mất sóng trong nhà xưởng và tự động đồng bộ khi có mạng trở lại kèm cơ chế chống xung đột kho.
- ✅ **Đo lường hiệu suất bảo trì:** Tự động tính toán các chỉ số quốc tế **MTTR** (Mean Time To Repair) và **MTBF** (Mean Time Between Failures) hiển thị trực quan trên Dashboard.

---

## 👥 2. PHÂN CÔNG 6 THÀNH VIÊN TRONG NHÓM

| Mã SV | Vai trò | Trọng tâm công việc | Chi tiết phân công |
|---|---|---|---|
| **SV01 (Leader/Bạn)** | **Team Lead & Core Backend / Security** | Module Auth (JWT, RBAC), Quản lý người dùng, Hạ tầng Common (Guards, Interceptors, Filters, Base Entity).<br>
| **SV02** | **Backend Dev 1 (Asset & Inventory)** | Module Quản lý Thiết bị (`Asset`), Vị trí (`Location`), Phụ tùng (`Parts`), Lịch sử bảo trì, Seed 300 thiết bị | [Xem chi tiết](docs/01_phan_cong_nhiem_vu.md#sv02--backend-developer-asset-parts--inventory) |
| **SV03** | **Backend Dev 2 (Work Order & Engine)** | Module Phiếu công việc (`WorkOrder`), Lịch định kỳ 3 kiểu (`Schedule`), Tính MTTR/MTBF, API Sync Idempotency | [Xem chi tiết](docs/01_phan_cong_nhiem_vu.md#sv03--backend-developer-work-order-maintenance--sync-engine) |
| **SV04** | **Frontend Web Dev (Admin Portal)** | Ứng dụng Web React + TypeScript: Dashboard KPI, Quản lý tài sản, Kanban Work Order, Lịch bảo trì, Kho | [Xem chi tiết](docs/01_phan_cong_nhiem_vu.md#sv04--frontend-web-developer-admin--manager-portal) |
| **SV05** | **Mobile Dev (Field Technician)** | Ứng dụng Flutter cho Kỹ thuật viên: Quét mã QR, nhận việc, ghi nhận phụ tùng, cơ chế **Offline-First SQLite** | [Xem chi tiết](docs/01_phan_cong_nhiem_vu.md#sv05--mobile-developer-field-technician-app) |
| **SV06** | **QA & DevOps Engineer** | Cấu hình Docker Compose, CI/CD GitHub Actions, Bộ Test Plan/Report, Script sinh dữ liệu lớn (1.000 Work Orders) | [Xem chi tiết](docs/01_phan_cong_nhiem_vu.md#sv06--qa--devops-engineer-cicd-testing--large-scale-seed) |

---

## 🗂️ 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
smart-cmms/
├── backend/                     # Mã nguồn Backend NestJS + TypeScript API
│   ├── src/
│   │   ├── modules/             # Các module nghiệp vụ (Auth, Asset, WorkOrder, Part, Sync,...)
│   │   ├── database/            # Entity, Migration và Seed scripts (300 Assets, 1000 WOs)
│   │   └── main.ts              # Entry point tích hợp Swagger API docs
│   ├── Dockerfile
│   └── package.json
├── frontend/                    # Mã nguồn Web Quản trị React + TypeScript (Vite)
│   ├── src/
│   │   ├── pages/               # Dashboard MTTR/MTBF, Assets, WorkOrders, Schedules, Parts
│   │   ├── components/          # Reusable UI components
│   │   └── services/            # Axios API client kết nối Backend
│   ├── Dockerfile
│   └── package.json
├── mobile/                      # Mã nguồn Ứng dụng Di động Flutter cho Kỹ thuật viên
│   ├── lib/
│   │   ├── core/                # Database SQLite local, Sync Queue & Network checker
│   │   └── features/            # QR Scanner, Work Order Details, Offline Sync UI
│   └── pubspec.yaml
├── devops/                      # Tài liệu & kịch bản kiểm thử, Docker, CI/CD
├── docs/                        # Tài liệu nghiệp vụ & kỹ thuật
│   ├── 01_phan_cong_nhiem_vu.md # Phân công chi tiết từng tuần & RACI Matrix
│   ├── 02_kien_truc_va_database.md # Thiết kế 10 bảng Database chuẩn & Workflow
│   ├── 03_quy_trinh_git_va_pr.md# Quy tắc nhánh & Pull Request review
│   └── 04_huong_dan_cai_dat.md  # Cẩm nang cài đặt chi tiết cho từng máy
├── docker-compose.yml           # Khởi chạy PostgreSQL 16, pgAdmin và Redis
├── .env.example                 # Mẫu cấu hình môi trường chuẩn
└── .github/workflows/ci.yml     # Tự động hóa CI/CD kiểm thử và build
```

---

## ⚡ 4. KHỞI CHẠY NHANH (QUICK START)

1. **Khởi động Database:**
   ```bash
   docker compose up -d postgres pgadmin
   ```
2. **Khởi động Backend API (Cổng 3000):**
   ```bash
   cd backend && npm install && npm run start:dev
   ```
   *Truy cập Swagger API:* `http://localhost:3000/api/docs`
3. **Khởi động Frontend Web (Cổng 5173):**
   ```bash
   cd frontend && npm install && npm run dev
   ```
   *Truy cập Web Portal:* `http://localhost:5173`

---

## 🎯 5. TIÊU CHÍ NGHIỆM THU ĐỒ ÁN (ACCEPTANCE CRITERIA)
- [x] **300 Thiết bị:** Đã có script seed và giao diện phân trang, tìm kiếm mã, xem chi tiết và in QR code.
- [x] **1.000 Work Orders:** Đã có cơ sở dữ liệu mẫu phục vụ truy vấn tải lớn và phân tích báo cáo.
- [x] **3 Kiểu bảo dưỡng định kỳ:** (1) Theo thời gian, (2) Theo số giờ chạy máy, (3) Theo ngưỡng rung/nhiệt.
- [x] **Cơ chế Offline/Online:** Kỹ thuật viên mất mạng vẫn ghi nhận thao tác $\to$ có mạng tự động gửi batch sync.
- [x] **Xử lý xung đột:** Tránh trừ trùng linh kiện, tránh tồn kho âm với transaction locks.
- [x] **Chỉ số MTTR & MTBF:** Hiển thị công thức, đồ thị xu hướng chính xác trên Dashboard.
- [x] **CI/CD:** GitHub Actions tự động kiểm tra cú pháp và build trước khi merge code.
