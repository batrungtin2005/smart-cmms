# HƯỚNG DẪN THIẾT LẬP MÔI TRƯỜNG PHÁT TRIỂN (DEVELOPMENT SETUP)
**Dành cho 6 thành viên dự án DT05 - Smart CMMS**

---

## 1. YÊU CẦU CÔNG CỤ THEO TỪNG VAI TRÒ

| Thành viên | Vai trò | Công cụ bắt buộc cần cài đặt trên máy |
|---|---|---|
| **Cả nhóm** | Chung | Git, Node.js LTS (v20 hoặc v22/v24), VS Code, Postman / Thunder Client |
| **SV02, SV03** | Backend | Docker Desktop (chạy PostgreSQL) HOẶC cài PostgreSQL 16 cục bộ, DBeaver / pgAdmin |
| **SV04** | Frontend Web | VS Code (Extensions: ESLint, Tailwind CSS IntelliSense, Prettier) |
| **SV05** | Mobile | Flutter SDK (3.24+), Android Studio, Android SDK & Virtual Device (Emulator) HOẶC máy thật Android bật USB Debugging |
| **SV06** | QA / DevOps | Docker Desktop, Docker Compose, Postman, JMeter / K6 (nếu test tải) |

---

## 2. CÁC BƯỚC KHỞI ĐỘNG NHANH TOÀN BỘ HỆ THỐNG

### Bước 1: Khởi động Database PostgreSQL
Nếu máy đã cài **Docker Desktop**:
```bash
# Tại thư mục gốc smart-cmms:
docker compose up -d postgres pgadmin
```
- PostgreSQL chạy tại cổng: `localhost:5432` (User: `postgres`, Pass: `postgres`, DB: `smart_cmms_db`)
- pgAdmin quản lý trực quan chạy tại: `http://localhost:5050` (Email: `admin@smartcmms.com`, Pass: `admin`)

*(Lưu ý: Nếu không dùng Docker, bạn có thể cài trực tiếp PostgreSQL 16 lên máy Windows/macOS và tạo database `smart_cmms_db` theo thông tin trong file `.env.example`).*

---

### Bước 2: Chạy Backend (NestJS API)
```bash
# Di chuyển vào thư mục backend:
cd backend

# Cài đặt thư viện:
npm install

# Khởi chạy chế độ phát triển (Auto-reload khi sửa code):
npm run start:dev
```
- Backend API chạy tại: `http://localhost:3000`
- Tài liệu kiểm thử trực quan **Swagger API Docs**: `http://localhost:3000/api/docs`

---

### Bước 3: Chạy Frontend Web (React + Vite)
```bash
# Mở một cửa sổ terminal mới, di chuyển vào frontend:
cd frontend

# Cài đặt thư viện:
npm install

# Khởi chạy máy chủ phát triển:
npm run dev
```
- Truy cập giao diện Web Admin tại: `http://localhost:5173`

---

### Bước 4: Chạy Ứng dụng Mobile (Flutter) - Dành riêng cho SV05
```bash
# Mở terminal, di chuyển vào mobile:
cd mobile

# Tải dependencies của Flutter:
flutter pub get

# Kiểm tra thiết bị kết nối (máy thật hoặc giả lập Android):
flutter devices

# Chạy ứng dụng:
flutter run
```
