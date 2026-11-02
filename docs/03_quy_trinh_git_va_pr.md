# QUY TRÌNH LÀM VIỆC GIT & QUY ĐỊNH PULL REQUEST (PR)
**Dành cho toàn bộ 6 thành viên đội ngũ DT05 - Smart CMMS**

Để tránh tình trạng xung đột mã nguồn (merge conflict), đè code của nhau hoặc code vỡ production, cả nhóm thống nhất tuân theo quy tắc làm việc sau:

---

## 1. CẤU TRÚC NHÁNH (BRANCHING STRATEGY - GITFLOW ĐƠN GIẢN HÓA)

- **`main`**: Nhánh chứa mã nguồn ổn định nhất, dùng để demo với Giảng viên và nghiệm thu đồ án.
- **`develop`**: Nhánh tích hợp chính của cả nhóm. Mọi tính năng sau khi test xong đều merge vào đây.
- **Nhánh tính năng (Feature branches):** Tạo từ nhánh `develop`, đặt tên theo cú pháp:
  - `feat/sv02-asset-crud`
  - `feat/sv03-work-order-workflow`
  - `feat/sv04-dashboard-ui`
  - `feat/sv05-qr-scanner-offline`
  - `test/sv06-seed-data`
  - `fix/sv02-part-stock-calculation`

---

## 2. QUY CHUẨN ĐẶT TÊN COMMIT (CONVENTIONAL COMMITS)

Mọi commit phải tuân thủ chuẩn sau:
`[loại]: [mô tả ngắn bằng tiếng Việt hoặc tiếng Anh]`

Các loại commit cho phép:
- `feat`: Thêm tính năng mới (Ví dụ: `feat(asset): thêm API lọc thiết bị theo vị trí`)
- `fix`: Sửa lỗi (Ví dụ: `fix(auth): sửa lỗi token hết hạn không trả về 401`)
- `docs`: Cập nhật tài liệu (Ví dụ: `docs: bổ sung hướng dẫn chạy docker-compose`)
- `refactor`: Tái cấu trúc code mà không thay đổi chức năng (Ví dụ: `refactor(sync): tách logic kiểm tra idempotency thành service riêng`)
- `test`: Viết thêm unit test hoặc seed data (Ví dụ: `test: bổ sung script seed 1000 work orders`)
- `chore`: Cập nhật cấu hình, dependencies (Ví dụ: `chore: nâng cấp nestjs packages`)

---

## 3. QUY TRÌNH PULL REQUEST (PR) & REVIEW

1. **Trước khi tạo PR:**
   - Kéo code mới nhất từ `develop` về nhánh của mình: `git pull origin develop`.
   - Chạy test và lint cục bộ trên máy để đảm bảo không có lỗi biên dịch.
2. **Khi tạo PR:**
   - Tiêu đề PR rõ ràng.
   - Nội dung PR mô tả:
     - Đã làm những gì?
     - Cách kiểm tra (Test steps)?
     - Ảnh chụp màn hình kết quả (đối với Frontend Web / Mobile).
3. **Quy định Phê duyệt (Review & Approval):**
   - **Ít nhất 1 thành viên hoặc Leader (SV01)** phê duyệt thì mới được Merge vào `develop`.
   - Không được phép tự ý `git push --force` vào `develop` hoặc `main`.
