-- ==============================================================================
-- SMART CMMS - DỮ LIỆU TÀI KHOẢN TEST CHO POSTMAN / NEWMAN (SV06)
-- Tạo 3 vai trò và 3 tài khoản test, mật khẩu chung: Test@123
-- Chỉ dùng cho môi trường local / CI. Chạy lại nhiều lần không bị trùng.
--
-- Chạy: docker exec -i smart_cmms_postgres psql -U postgres -d smart_cmms_db < devops/postman/seed-test-users.sql
-- ==============================================================================

BEGIN;

INSERT INTO roles (name, description)
VALUES
    ('ADMIN', 'Quản trị hệ thống'),
    ('MAINTENANCE_MANAGER', 'Quản lý bảo trì'),
    ('TECHNICIAN', 'Kỹ thuật viên hiện trường')
ON CONFLICT (name) DO NOTHING;

-- Hash bcrypt (10 rounds) của mật khẩu test 'Test@123'
INSERT INTO users (username, email, password_hash, full_name, role_id)
SELECT v.username, v.email, '$2b$10$nyv.DbBKGMLlTJijVeUrQ.DQ3a/pwJRg0qaZ69/0Yt2OCAubnWI.q', v.full_name, r.id
FROM (VALUES
    ('qa_admin', 'qa_admin@smartcmms.test', 'QA Admin', 'ADMIN'),
    ('qa_manager', 'qa_manager@smartcmms.test', 'QA Manager', 'MAINTENANCE_MANAGER'),
    ('qa_tech', 'qa_tech@smartcmms.test', 'QA Technician', 'TECHNICIAN')
) AS v(username, email, full_name, role_name)
JOIN roles r ON r.name = v.role_name
ON CONFLICT (username) DO NOTHING;

COMMIT;

SELECT u.username, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.username LIKE 'qa_%' ORDER BY u.username;
