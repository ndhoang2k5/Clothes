
-- Unbee E-commerce Database Initialization (PostgreSQL 15)
-- Notes:
-- - Store images in filesystem/cloud; DB stores URLs only.
-- - This file is mounted by docker-compose into Postgres init scripts.

BEGIN;

-- Search optimization for ILIKE (admin search, phone, order_code, product fields)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 0) System configs (key-value / JSON)
CREATE TABLE IF NOT EXISTS system_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1) Banners / homepage assets
-- slot examples: home_hero, home_promo, home_category_feature, footer_banner
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

-- 2) Categories (supports nesting)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    icon VARCHAR(20),
    image_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);

-- 3) Products
-- kind: single | combo
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    base_price NUMERIC(12, 2) NOT NULL,
    discount_price NUMERIC(12, 2),
    currency CHAR(3) NOT NULL DEFAULT 'VND',
    kind TEXT NOT NULL DEFAULT 'single' CHECK (kind IN ('single', 'combo')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_hot BOOLEAN NOT NULL DEFAULT FALSE,
    is_new BOOLEAN NOT NULL DEFAULT TRUE,
    is_sale BOOLEAN NOT NULL DEFAULT FALSE,
    external_source TEXT,
    external_product_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_products_discount_price CHECK (discount_price IS NULL OR discount_price <= base_price)
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_flags ON products (is_active, is_hot, is_new, is_sale);
CREATE INDEX IF NOT EXISTS gin_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_products_slug_trgm ON products USING gin (slug gin_trgm_ops);

-- 4) Product images (non-variant specific)
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

-- 5) Variants (size/color/stock/price override)
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(64) UNIQUE,
    external_sku_id TEXT,
    size VARCHAR(50),
    color VARCHAR(50),
    material VARCHAR(80),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price_override NUMERIC(12, 2),
    discount_price_override NUMERIC(12, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_variant_discount_price CHECK (
        discount_price_override IS NULL
        OR price_override IS NOT NULL
        AND discount_price_override <= price_override
    )
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_size_color ON product_variants (product_id, size, color);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_external_sku ON product_variants (external_sku_id) WHERE external_sku_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS gin_product_variants_sku_trgm ON product_variants USING gin (sku gin_trgm_ops);

-- 6) Variant images
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

-- 7) Collections
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

-- 8) Product-Collection (many-to-many)
CREATE TABLE IF NOT EXISTS collection_products (
    collection_id INT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_products_product ON collection_products (product_id);

-- 9) Combo items (combo is a Product with kind='combo')
CREATE TABLE IF NOT EXISTS combo_items (
    combo_product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_variant_id INT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    PRIMARY KEY (combo_product_id, component_variant_id)
);

-- 10) Blog
CREATE TABLE IF NOT EXISTS blogs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    thumbnail TEXT,
    author VARCHAR(100),
    category VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CONSTRAINT blogs_status_check CHECK (status IN ('draft','review','scheduled','published')),
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs (status, scheduled_at, published_at DESC);

-- 11) Customers (sẵn sàng cho Phase A.2 – liên kết với Order qua customer_id)
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
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS gin_customers_email_trgm ON customers USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_customers_phone_trgm ON customers USING gin (phone gin_trgm_ops);

-- 12) Orders (guest checkout; customer_id nullable cho khách đặt không đăng nhập)
-- status: pending | confirmed | paid | shipped | completed | cancelled (theo pipeline cart/checkout)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(32) UNIQUE,
    customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CONSTRAINT orders_status_check CHECK (status IN ('pending','confirmed','paid','shipped','completed','cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (phone);
CREATE INDEX IF NOT EXISTS gin_orders_order_code_trgm ON orders USING gin (order_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS gin_orders_phone_trgm ON orders USING gin (phone gin_trgm_ops);

-- 13) Order items
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

-- 14) Vouchers (mã giảm giá – Phase A.3)
-- type: percent | fixed; value: % hoặc số tiền; max_discount: trần giảm (cho percent)
CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    image_url TEXT,
    auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
    type VARCHAR(20) NOT NULL DEFAULT 'fixed' CHECK (type IN ('percent', 'fixed', 'product')),
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
CREATE INDEX IF NOT EXISTS idx_vouchers_auto_active ON vouchers (auto_apply, is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_valid ON vouchers (valid_from, valid_to);

-- 15) Shipping rules (Phase A.4 – admin tự do đổi ngưỡng và phí ship)
-- Chọn rule: min_order_total lớn nhất mà ≤ cart_total; discount_type: percent | fixed | free
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

-- Rule mặc định (chỉ seed khi chưa có rule): đơn 0 → 30k; đơn ≥ 200k → giảm 50%; đơn ≥ 300k → freeship
INSERT INTO shipping_rules (min_order_total, base_fee, discount_type, discount_value, is_active, sort_order)
SELECT 0, 30000, 'fixed', 0, true, 1
WHERE NOT EXISTS (SELECT 1 FROM shipping_rules LIMIT 1);
INSERT INTO shipping_rules (min_order_total, base_fee, discount_type, discount_value, is_active, sort_order)
SELECT 200000, 30000, 'percent', 50, true, 2
WHERE NOT EXISTS (SELECT 1 FROM shipping_rules WHERE min_order_total = 200000 LIMIT 1);
INSERT INTO shipping_rules (min_order_total, base_fee, discount_type, discount_value, is_active, sort_order)
SELECT 300000, 30000, 'free', 0, true, 3
WHERE NOT EXISTS (SELECT 1 FROM shipping_rules WHERE min_order_total = 300000 LIMIT 1);

-- 16) Admin users (JWT auth will use this table)
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Seed minimal categories (can be managed by Admin later)
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

-- Không seed sản phẩm test; dữ liệu sản phẩm lấy từ đồng bộ Salework hoặc nhập tay trong Admin.

COMMIT;
