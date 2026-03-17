-- Unbee schema migration (safe/additive)
-- Apply to an existing DB that was initialized with an older init.sql.
-- Postgres 15.

BEGIN;

-- 1) Add missing columns to existing core tables
ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS parent_id INT NULL,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_categories_parent'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT fk_categories_parent
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
    ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'VND',
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'single',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS is_sale BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS external_source TEXT,
    ADD COLUMN IF NOT EXISTS external_product_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_kind'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT chk_products_kind CHECK (kind IN ('single', 'combo'));
  END IF;
END $$;

ALTER TABLE product_variants
    ADD COLUMN IF NOT EXISTS sku VARCHAR(64),
    ADD COLUMN IF NOT EXISTS material VARCHAR(80),
    ADD COLUMN IF NOT EXISTS price_override NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS discount_price_override NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS external_sku_id TEXT;

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku ON product_variants (sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_external_sku ON product_variants (external_sku_id) WHERE external_sku_id IS NOT NULL;

-- Bảng customers (Phase A.2) – tạo trước khi thêm FK từ orders
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(30),
    email VARCHAR(255) UNIQUE,
    password_hash TEXT,
    default_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS order_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS note TEXT,
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Chuẩn hóa order status theo pipeline: pending | confirmed | paid | shipped | completed | cancelled
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','paid','shipped','completed','cancelled'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_order_code ON orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);

-- 2) Create new tables
CREATE TABLE IF NOT EXISTS system_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
    id SERIAL PRIMARY KEY,
    slot TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    image_url TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    link_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_banners_slot_active ON banners (slot, is_active);

CREATE TABLE IF NOT EXISTS product_images (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id);

CREATE TABLE IF NOT EXISTS product_variant_images (
    id SERIAL PRIMARY KEY,
    variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_variant_images_variant ON product_variant_images (variant_id);

CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    description TEXT,
    cover_image TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_products (
    collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products (product_id);

CREATE TABLE IF NOT EXISTS combo_items (
    combo_product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (combo_product_id, component_variant_id)
);

CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    thumbnail TEXT,
    author VARCHAR(100),
    category VARCHAR(50),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs (is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE SET NULL,
    variant_id INT REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    variant_label VARCHAR(120),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    line_total NUMERIC(12, 2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (type IN ('percent', 'fixed')),
    value NUMERIC(12, 2) NOT NULL,
    min_order_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_discount NUMERIC(12, 2),
    usage_limit INT,
    used_count INT NOT NULL DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vouchers_code ON vouchers (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_vouchers_code_active ON vouchers (code, is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_valid ON vouchers (valid_from, valid_to);

CREATE TABLE IF NOT EXISTS shipping_rules (
    id SERIAL PRIMARY KEY,
    min_order_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    base_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('percent', 'fixed', 'free')),
    discount_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipping_rules_min_order ON shipping_rules (min_order_total DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_rules_active_sort ON shipping_rules (is_active, sort_order);

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 3) Seed / normalize
INSERT INTO categories (name, slug, icon, sort_order)
VALUES
    ('Đồ sơ sinh', 'so-sinh', '👶', 1),
    ('Quần áo bé trai', 'be-trai', '👕', 2),
    ('Quần áo bé gái', 'be-gai', '👗', 3),
    ('Phụ kiện', 'phu-kien', '🧢', 4),
    ('Box quà tặng', 'qua-tang', '🎁', 5),
    ('Combo đi sinh', 'di-sinh', '👜', 6),
    ('Ưu đãi cuối mùa', 'uu-dai-cuoi-mua', '🏷️', 7)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

