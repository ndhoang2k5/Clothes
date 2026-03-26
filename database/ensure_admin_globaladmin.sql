-- Chạy khi DB Docker đã tồn tại sẵn và chưa có user admin seed (init.sql không chạy lại).
-- Ví dụ: từ thư mục repo Clothes:
--   Get-Content database/ensure_admin_globaladmin.sql | docker compose exec -T db psql -U unbee_user -d unbee_db
-- Linux/mac:
--   docker compose exec -T db psql -U unbee_user -d unbee_db < database/ensure_admin_globaladmin.sql

INSERT INTO admin_users (email, password_hash, full_name, is_active)
VALUES (
    'globaladmin',
    '$2b$12$mOINgv96fgMMOP7Fu9KuBuMTw5aY8/cI5vOiWZqkNY1w5io5Eunom',
    'Global admin',
    true
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    is_active = EXCLUDED.is_active;
