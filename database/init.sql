
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
    ('Combo đi sinh', 'di-sinh', '👜', 6)
ON CONFLICT (slug) DO NOTHING;

-- Seed sample data ~500 products + variants/images/combos for testing
DO $$
DECLARE
    cat_so_sinh INT;
    cat_be_trai INT;
    cat_be_gai INT;
    cat_phu_kien INT;
    cat_box_qua INT;
    cat_combo_di_sinh INT;

    be_trai_count INT := 120;
    be_gai_count INT := 120;
    so_sinh_count INT := 80;
    phu_kien_count INT := 80;
    box_qua_count INT := 50;
    combo_di_sinh_count INT := 50;

    all_variant_ids INT[];
    variant_count INT;
    i INT;
    new_combo_id INT;
    v1 INT;
    v2 INT;
    v3 INT;
    base_price NUMERIC(12,2);
BEGIN
    -- Resolve category ids by slug
    SELECT id INTO cat_so_sinh FROM categories WHERE slug = 'so-sinh';
    SELECT id INTO cat_be_trai FROM categories WHERE slug = 'be-trai';
    SELECT id INTO cat_be_gai FROM categories WHERE slug = 'be-gai';
    SELECT id INTO cat_phu_kien FROM categories WHERE slug = 'phu-kien';
    SELECT id INTO cat_box_qua FROM categories WHERE slug = 'qua-tang';
    SELECT id INTO cat_combo_di_sinh FROM categories WHERE slug = 'di-sinh';

    -- Avoid reseeding if products already exist
    IF EXISTS (SELECT 1 FROM products) THEN
        RAISE NOTICE 'Products already exist, skip sample seed.';
        RETURN;
    END IF;

    -- 1) Single products: bé trai
    INSERT INTO products (category_id, name, slug, description, base_price, discount_price, currency, kind,
                          is_active, is_hot, is_new, is_sale, external_source, external_product_id)
    SELECT
        cat_be_trai,
        format('Đồ bé trai #%s', gs_i),
        format('do-be-trai-%s', gs_i),
        'Sản phẩm mẫu quần áo bé trai để test hệ thống.',
        150000 + gs_i * 1000,
        CASE WHEN gs_i % 3 = 0 THEN (150000 + gs_i * 1000) * 0.9 ELSE NULL END,
        'VND',
        'single',
        TRUE,
        (gs_i % 5 = 0),
        TRUE,
        (gs_i % 3 = 0),
        'seed',
        format('BT-%s', gs_i)
    FROM generate_series(1, be_trai_count) AS g(gs_i);

    -- 2) Single products: bé gái
    INSERT INTO products (category_id, name, slug, description, base_price, discount_price, currency, kind,
                          is_active, is_hot, is_new, is_sale, external_source, external_product_id)
    SELECT
        cat_be_gai,
        format('Đồ bé gái #%s', gs_i),
        format('do-be-gai-%s', gs_i),
        'Sản phẩm mẫu quần áo bé gái để test hệ thống.',
        150000 + gs_i * 1000,
        CASE WHEN gs_i % 4 = 0 THEN (150000 + gs_i * 1000) * 0.88 ELSE NULL END,
        'VND',
        'single',
        TRUE,
        (gs_i % 4 = 0),
        TRUE,
        (gs_i % 4 = 0),
        'seed',
        format('BG-%s', gs_i)
    FROM generate_series(1, be_gai_count) AS g(gs_i);

    -- 3) Single products: đồ sơ sinh
    INSERT INTO products (category_id, name, slug, description, base_price, discount_price, currency, kind,
                          is_active, is_hot, is_new, is_sale, external_source, external_product_id)
    SELECT
        cat_so_sinh,
        format('Đồ sơ sinh #%s', gs_i),
        format('do-so-sinh-%s', gs_i),
        'Sản phẩm mẫu đồ sơ sinh, phù hợp cho các combo đi sinh.',
        120000 + gs_i * 800,
        CASE WHEN gs_i % 3 = 0 THEN (120000 + gs_i * 800) * 0.9 ELSE NULL END,
        'VND',
        'single',
        TRUE,
        (gs_i % 6 = 0),
        TRUE,
        (gs_i % 3 = 0),
        'seed',
        format('SS-%s', gs_i)
    FROM generate_series(1, so_sinh_count) AS g(gs_i);

    -- 4) Single products: phụ kiện
    INSERT INTO products (category_id, name, slug, description, base_price, discount_price, currency, kind,
                          is_active, is_hot, is_new, is_sale, external_source, external_product_id)
    SELECT
        cat_phu_kien,
        format('Phụ kiện em bé #%s', gs_i),
        format('phu-kien-%s', gs_i),
        'Phụ kiện em bé (mũ, bao tay, tất...) dùng cho box quà / combo.',
        50000 + gs_i * 500,
        CASE WHEN gs_i % 5 = 0 THEN (50000 + gs_i * 500) * 0.85 ELSE NULL END,
        'VND',
        'single',
        TRUE,
        (gs_i % 7 = 0),
        TRUE,
        (gs_i % 5 = 0),
        'seed',
        format('PK-%s', gs_i)
    FROM generate_series(1, phu_kien_count) AS g(gs_i);

    -- 5) Add primary & extra images for all products
    INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
    SELECT
        p.id,
        format('https://picsum.photos/seed/unbee-prod-%s-main/800/1000', p.id),
        p.name,
        0,
        TRUE
    FROM products p;

    INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
    SELECT
        p.id,
        format('https://picsum.photos/seed/unbee-prod-%s-alt1/800/1000', p.id),
        p.name || ' ảnh 2',
        1,
        FALSE
    FROM products p;

    INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
    SELECT
        p.id,
        format('https://picsum.photos/seed/unbee-prod-%s-alt2/800/1000', p.id),
        p.name || ' ảnh 3',
        2,
        FALSE
    FROM products p;

    -- 6) Variants cho tất cả sản phẩm single (size / màu / tồn kho)
    INSERT INTO product_variants (product_id, sku, size, color, material, stock, price_override, discount_price_override)
    SELECT
        p.id,
        format('SKU-%s-%s-%s', p.id, s.size_code, c.color_code),
        s.size_label,
        c.color_label,
        'Cotton',
        10 + (random() * 40)::INT,
        p.base_price + s.price_delta,
        CASE
            WHEN p.discount_price IS NOT NULL THEN p.discount_price + s.price_delta * 0.9
            ELSE NULL
        END
    FROM products p
    JOIN LATERAL (
        VALUES
            ('0-3', 'S1', 0),
            ('3-6', 'S2', 10000),
            ('6-9', 'S3', 15000)
    ) AS s(size_label, size_code, price_delta) ON TRUE
    JOIN LATERAL (
        VALUES
            ('trắng', 'C1'),
            ('xanh', 'C2')
    ) AS c(color_label, color_code) ON TRUE
    WHERE p.kind = 'single';

    -- 7) Variant images (mỗi variant 1 ảnh chính)
    INSERT INTO product_variant_images (variant_id, image_url, alt_text, sort_order, is_primary)
    SELECT
        v.id,
        format('https://picsum.photos/seed/unbee-variant-%s/800/1000', v.id),
        'Ảnh biến thể ' || coalesce(v.size, '') || ' ' || coalesce(v.color, ''),
        0,
        TRUE
    FROM product_variants v;

    -- 8) Chuẩn bị danh sách variant cho combo (chỉ dùng single products)
    SELECT array_agg(v.id ORDER BY v.id)
    INTO all_variant_ids
    FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE p.kind = 'single';

    variant_count := COALESCE(array_length(all_variant_ids, 1), 0);

    IF variant_count = 0 THEN
        RAISE NOTICE 'No variants found, skip combo seed.';
        RETURN;
    END IF;

    -- 9) Box quà tặng (kind = combo, dùng nhiều loại sản phẩm + phụ kiện)
    FOR i IN 1..box_qua_count LOOP
        base_price := 400000 + i * 8000;

        INSERT INTO products (category_id, name, slug, description, base_price, discount_price, currency, kind,
                              is_active, is_hot, is_new, is_sale, external_source, external_product_id)
        VALUES (
            cat_box_qua,
            format('Box quà tặng Unbee #%s', i),
            format('box-qua-tang-%s', i),
            'Box quà tặng gồm nhiều món đồ sơ sinh, quần áo và phụ kiện.',
            base_price,
            base_price * 0.9,
            'VND',
            'combo',
            TRUE,
            (i % 3 = 0),
            TRUE,
            TRUE,
            'seed',
            format('BOX-%s', i)
        )
        RETURNING id INTO new_combo_id;

        -- Gán 3 biến thể sản phẩm vào combo
        v1 := all_variant_ids[((i * 3) % variant_count) + 1];
        v2 := all_variant_ids[((i * 3 + 1) % variant_count) + 1];
        v3 := all_variant_ids[((i * 3 + 2) % variant_count) + 1];

        INSERT INTO combo_items (combo_product_id, component_variant_id, quantity)
        VALUES
            (new_combo_id, v1, 1),
            (new_combo_id, v2, 1),
            (new_combo_id, v3, 1);
    END LOOP;

    -- 10) Combo đi sinh (kind = combo, ưu tiên đồ sơ sinh + phụ kiện)
    FOR i IN 1..combo_di_sinh_count LOOP
        base_price := 600000 + i * 9000;

        INSERT INTO products (category_id, name, slug, description, base_price, discount_price, currency, kind,
                              is_active, is_hot, is_new, is_sale, external_source, external_product_id)
        VALUES (
            cat_combo_di_sinh,
            format('Combo đi sinh Unbee #%s', i),
            format('combo-di-sinh-%s', i),
            'Combo đi sinh đầy đủ đồ sơ sinh, quần áo và phụ kiện cần thiết.',
            base_price,
            base_price * 0.88,
            'VND',
            'combo',
            TRUE,
            (i % 4 = 0),
            TRUE,
            TRUE,
            'seed',
            format('CBS-%s', i)
        )
        RETURNING id INTO new_combo_id;

        v1 := all_variant_ids[((i * 4) % variant_count) + 1];
        v2 := all_variant_ids[((i * 4 + 1) % variant_count) + 1];
        v3 := all_variant_ids[((i * 4 + 2) % variant_count) + 1];

        INSERT INTO combo_items (combo_product_id, component_variant_id, quantity)
        VALUES
            (new_combo_id, v1, 1),
            (new_combo_id, v2, 1),
            (new_combo_id, v3, 1);
    END LOOP;
END;
$$;

COMMIT;
