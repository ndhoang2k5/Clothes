-- Thêm cột thẻ khuyến mãi trang chủ cho bảng vouchers (chạy một lần trên DB đã có sẵn).
-- PostgreSQL: psql hoặc docker compose exec db psql < add_voucher_promo_columns.sql

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS max_order_total NUMERIC(12, 2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS show_on_homepage BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS show_in_checkout BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS homepage_sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS card_theme VARCHAR(32) NOT NULL DEFAULT 'amber';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS card_icon VARCHAR(32) NOT NULL DEFAULT 'gift';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS benefits_json TEXT;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS terms_text TEXT;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS order_condition_mode VARCHAR(16) NOT NULL DEFAULT 'from';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS percent_value NUMERIC(12, 2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS fixed_value NUMERIC(12, 2);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS gift_name VARCHAR(255);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS gift_image_url TEXT;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS gift_product_id INT REFERENCES products(id) ON DELETE SET NULL;
ALTER TABLE vouchers DROP CONSTRAINT IF EXISTS vouchers_type_check;
ALTER TABLE vouchers ADD CONSTRAINT vouchers_type_check CHECK (type IN ('percent', 'fixed', 'product', 'combo'));
