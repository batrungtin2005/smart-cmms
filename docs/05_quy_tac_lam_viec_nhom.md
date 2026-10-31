# 📜 QUY TẮC LÀM VIỆC NHÓM & QUẢN LÝ TIẾN ĐỘ DỰ ÁN
**Đề tài:** Hệ Thống Quản Lý Vận Hành & Bảo Trì Thiết Bị (Smart CMMS - DT05)  
**Quy mô:** 6 Thành viên (SV01 $\to$ SV06) | **Thời gian triển khai:** 6 Tuần  
**Mục tiêu tối thượng:** Bàn giao sản phẩm đạt điểm tối đa (A+), đúng hạn, đúng chỉ tiêu đề bài (300 thiết bị, 1.000 Work Orders, 3 kiểu lịch PM, Offline sync, MTTR/MTBF).

---

## 🌟 1. NGUYÊN TẮC CỐT LÕI (CORE VALUES)

1. **Trách nhiệm & Tự giác (Ownership):** Mỗi thành viên chịu trách nhiệm 100% về module và tính năng được phân công theo tài liệu [01_phan_cong_nhiem_vu.md](01_phan_cong_nhiem_vu.md).
2. **Không giấu việc - Không giấu lỗi (Transparency):** Khi gặp vấn đề kỹ thuật (blocker), lỗi thư viện hoặc khó khăn cá nhân không giải quyết được trong vòng **24 giờ**, phải chủ động nhắn tin lên nhóm để Leader và cả nhóm cùng hỗ trợ.
3. **Tôn trọng Deadline (Punctuality):** Đúng giờ trong các buổi họp và hoàn thành đúng hạn các mốc giao nộp sản phẩm hàng tuần.

---

## 💬 2. GIAO TIẾP & HỌP ĐỊNH KỲ (COMMUNICATION)

* **Kênh trao đổi chính:** Nhóm Zalo / Discord của đội ngũ DT05.
* **Thời gian phản hồi tin nhắn:**
  * Tin nhắn thông thường: Phản hồi trong ngày.
  * Tin nhắn gắn tag `@All` hoặc thông báo khẩn từ Leader: Phải phản hồi/thả tim xác nhận trong vòng **tối đa 4 tiếng** (trừ khung giờ 23:00 - 07:00).
* **Lịch họp cố định:**
  * **Họp tổng kết tuần (Weekly Sync):** **20:00 Tối Chủ Nhật hàng tuần** (Online qua Google Meet / Discord).
    * Từng thành viên báo cáo 3 câu hỏi:
      1. Tuần qua đã hoàn thành được những gì? (Demo tính năng nếu có).
      2. Đang gặp khó khăn/vướng mắc gì cần người khác hỗ trợ?
      3. Kế hoạch cụ thể của tuần tiếp theo là gì?
  * **Họp kỹ thuật nhanh (Quick Sync - nếu cần):** 15-30 phút tối Thứ Tư để tháo gỡ vướng mắc phát sinh giữa Frontend - Backend - Mobile.

---

## ⏰ 3. QUẢN LÝ TIẾN ĐỘ & MỐC NỘP CODE (DEADLINES)

* **Lộ trình 6 tuần nghiêm ngặt:**
  * **Tuần 1:** Xong BA, SRS, BPMN, Database ERD, Docker, Khung dự án.
  * **Tuần 2:** Xong Auth JWT/RBAC, Base Entity, Setup React & Flutter shell.
  * **Tuần 3:** Xong CRUD Thiết bị & Phụ tùng, State Machine Work Order, Seed 300 máy.
  * **Tuần 4:** Xong Lịch bảo dưỡng 3 kiểu, Web Kanban, Mobile quét QR.
  * **Tuần 5:** Xong MTTR/MTBF Dashboard, Cơ chế Offline Sync SQLite & Kiểm thử xung đột.
  * **Tuần 6:** Seed 1.000 Work Orders, Tối ưu hiệu năng, Test Report, diễn tập Demo & Bảo vệ.
* **Khung giờ chốt code tuần:**
  * **23:59 Thứ Bảy hàng tuần:** Hạn chót để các thành viên đẩy toàn bộ code đã hoàn thành lên nhánh của mình và tạo Pull Request vào nhánh `develop`.
  * **Chủ Nhật:** Leader duyệt PR, QA (SV06) kiểm thử tích hợp trước giờ họp tối.
* **Quy tắc trễ hạn:** Nếu có lý do bất khả kháng (bệnh, lịch thi đột xuất...), phải xin phép Leader trước deadline **ít nhất 24 tiếng**.

---

## 🐙 4. QUY TẮC LÀM VIỆC VỚI GIT & GITHUB (GIT ETIQUETTE)

Tất cả thành viên bắt buộc tuân thủ đúng quy trình kỹ thuật để đảm bảo điểm đóng góp trên GitHub:

### 4.1. Cấu hình định danh cá nhân (Bắt buộc)
Trước khi commit code, kiểm tra cấu hình Git trên máy cá nhân:
```bash
git config --global user.name "ten_github_cua_ban"
git config --global user.email "email_dang_ky_github_cua_ban"
```
*(Nếu sai email, GitHub sẽ không tính điểm đóng góp vào danh sách **Contributors** và tab **Insights**)*.

### 4.2. Quy tắc 4 KHÔNG trên Git:
1. ❌ **KHÔNG** commit hoặc push trực tiếp vào nhánh `main` hoặc `develop`.
2. ❌ **KHÔNG** sử dụng lệnh `git push --force` trên các nhánh dùng chung (`main`, `develop`).
3. ❌ **KHÔNG** tự ý merge Pull Request của chính mình nếu chưa được **Leader (SV01)** hoặc ít nhất **1 thành viên khác review và Approve**.
4. ❌ **KHÔNG** commit các file rác (`node_modules/`, `dist/`, file `.env` cá nhân, file `.DS_Store`, build cache).

### 4.3. Quy trình làm việc nhánh (Branching Workflow):
* **Nhánh làm việc riêng của từng người:**
  * SV01: `feat/sv01-leader-core`
  * SV02: `feat/sv02-asset-parts`
  * SV03: `feat/sv03-work-order-engine`
  * SV04: `feat/sv04-frontend-web`
  * SV05: `feat/sv05-mobile-app`
  * SV06: `feat/sv06-devops-testing`
* **Trước khi bắt đầu code mỗi ngày:**
  ```bash
  git checkout <nhanh_cua_ban>
  git pull origin develop
  ```
* **Khi xong tính năng:**
  ```bash
  git add .
  git commit -m "feat(module): mo ta ngan gon cong viec"
  git push origin <nhanh_cua_ban>
  ```
  Sau đó lên web GitHub tạo **Pull Request (PR)** từ `<nhanh_cua_ban>` vào `develop`.

---

## 💻 5. QUY CHUẨN CHẤT LƯỢNG MÃ NGUỒN (CODE STANDARDS)

1. **Quy chuẩn đặt tên:**
   * Tên biến, hàm, file viết bằng tiếng Anh rõ nghĩa (`camelCase` cho biến/hàm, `PascalCase` cho Class/Component).
   * Không đặt tên cẩu thả kiểu `a`, `b`, `temp1`, `test2`, `dataNewFinal`.
2. **Kiểm tra trước khi tạo PR:**
   * Code phải biên dịch thành công không có lỗi (`npm run build`).
   * Phải tự chạy thử tính năng hoạt động trơn tru trên máy mình trước khi tạo PR.
3. **Mô tả Pull Request rõ ràng:**
   * PR phải nêu rõ: Đã làm gì? Hướng dẫn cách test?
   * Với Frontend Web & Mobile: **Bắt buộc đính kèm ảnh chụp màn hình hoặc video ngắn minh chứng giao diện**.

---

## ⚖️ 6. ĐÁNH GIÁ ĐÓNG GÓP & CHẾ TÀI VI PHẠM

Điểm số đồ án cuối kỳ của từng thành viên sẽ được đánh giá công tâm dựa trên **mức độ đóng góp thực tế (Peer Review)**:

### 6.1. Tiêu chí tính điểm đóng góp:
* **Mức độ hoàn thành sản phẩm bàn giao (Deliverables):** Đúng chức năng, đúng số lượng máy móc/WO theo yêu cầu đề bài (chiếm 50%).
* **Minh chứng trên GitHub (Insights & Commits):** Số lượng PR chất lượng, commit đều đặn qua từng tuần, không dồn vào ngày cuối (chiếm 30%).
* **Ý thức kỷ luật:** Đi họp đầy đủ, đúng giờ, chủ động phối hợp tích hợp cùng đồng đội (chiếm 20%).

### 6.2. Chế tài xử lý vi phạm:
* **Trễ deadline không báo trước:**
  * Lần 1: Nhắc nhở và phải bù đắp tiến độ trong vòng 48h.
  * Lần 2: Trừ 10% điểm đánh giá thành viên cuối kỳ.
  * Lần 3: Trừ 25% điểm đánh giá, phân công lại công việc cho thành viên khác để cứu tiến độ nhóm.
* **Mất tích / Không tham gia họp 2 buổi liên tiếp không lý do:**
  * Leader lập biên bản làm việc và báo cáo trực tiếp với Giảng viên hướng dẫn về việc thành viên không tham gia đóng góp cho đồ án nhóm.

---

## ✍️ 7. CAM KẾT ĐỒNG LÒNG CỦA 6 THÀNH VIÊN

Tất cả 6 thành viên trong đội ngũ DT05 đã đọc, hiểu rõ và cam kết thực hiện nghiêm túc toàn bộ các quy tắc nêu trên vì mục tiêu chung của cả nhóm:

* **SV01 (Leader):** Ba Trung Tin *(Cam kết điều phối công tâm, hỗ trợ kỹ thuật và hoàn thành đúng hạn Core Backend/Security)*.
* **SV02 (Backend 1):** *(Cam kết hoàn thành trọn vẹn Module Asset, Parts & Seed 300 thiết bị)*.
* **SV03 (Backend 2):** *(Cam kết hoàn thành Work Order State Machine, Lịch PM 3 kiểu & Sync Engine)*.
* **SV04 (Frontend Web):** *(Cam kết xây dựng giao diện Web Admin hiện đại, Dashboard MTTR/MTBF chuẩn chỉ)*.
* **SV05 (Mobile Flutter):** *(Cam kết hoàn thành App Mobile quét QR và cơ chế Offline-First mượt mà)*.
* **SV06 (QA & DevOps):** *(Cam kết môi trường Docker chuẩn, Test Plan chi tiết và Seed 1.000 Work Orders)*.
