# 🧪 BÁO CÁO KỊCH BẢN KIỂM THỬ SMART CMMS (SV06 - QA & DEVOPS)

## 1. Môi trường kiểm thử
- **Database:** PostgreSQL 16 + Redis (Docker Compose)
- **Backend API:** NestJS (Port 3000)
- **Mobile App:** Flutter Offline-First (SQLite)

## 2. Các kịch bản kiểm thử trọng tâm do SV06 phụ trách
- [ ] **Test Offline-First Sync:** Giả lập ngắt mạng trên app Flutter, thực hiện phiếu sửa chữa, bật lại mạng và kiểm tra batch sync về server.
- [ ] **Test Race Condition:** Giả lập 2 kỹ thuật viên cùng gửi request trừ tồn kho 1 mã phụ tùng đồng thời để kiểm tra transaction lock.
- [ ] **Test Seed Data 1.000 WOs:** Thực thi script sinh 1.000 phiếu công việc để kiểm tra tốc độ tính toán chỉ số MTTR/MTBF trên Dashboard.