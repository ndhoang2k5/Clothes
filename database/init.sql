
-- Unbee E-commerce Database Initialization (PostgreSQL 15)
-- Notes:
-- - Store images in filesystem/cloud; DB stores URLs only.
-- - This file is mounted by docker-compose into Postgres init scripts.

BEGIN;

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
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs (is_published, published_at DESC);

-- 11) Orders (guest checkout)
-- status: pending | confirmed | processing | shipped | delivered | cancelled
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(32) UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC);

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

-- 12) Admin users (JWT auth will use this table)
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
