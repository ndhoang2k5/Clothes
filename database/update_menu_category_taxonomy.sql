BEGIN;

-- 1) Upsert taxonomy mới cho menu giao diện người dùng
INSERT INTO categories (name, slug, icon, sort_order, is_active)
VALUES
  ('Sơ sinh', 'so-sinh', '👶', 1, TRUE),
  ('Bé', 'be', '🧒', 2, TRUE),
  ('Nhộng chũn', 'nhong-chun', '🛌', 3, TRUE),
  ('Phụ kiện', 'phu-kien', '🧢', 4, TRUE),
  ('Đồ chip bé gái', 'do-chip-be-gai', '🩲', 5, TRUE),
  ('Combo đi sinh kèm quà', 'combo-di-sinh-kem-qua', '👜', 6, TRUE),
  ('Ưu đãi cuối mùa', 'uu-dai-cuoi-mua', '🏷️', 7, TRUE)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

-- 2) Lấy id danh mục
WITH ids AS (
  SELECT
    MAX(CASE WHEN slug = 'so-sinh' THEN id END) AS so_sinh_id,
    MAX(CASE WHEN slug = 'be' THEN id END) AS be_id,
    MAX(CASE WHEN slug = 'nhong-chun' THEN id END) AS nhong_chun_id,
    MAX(CASE WHEN slug = 'do-chip-be-gai' THEN id END) AS chip_id,
    MAX(CASE WHEN slug = 'combo-di-sinh-kem-qua' THEN id END) AS combo_id,
    MAX(CASE WHEN slug = 'be-trai' THEN id END) AS be_trai_id,
    MAX(CASE WHEN slug = 'be-gai' THEN id END) AS be_gai_id,
    MAX(CASE WHEN slug = 'body' THEN id END) AS body_id,
    MAX(CASE WHEN slug = 'qua-tang' THEN id END) AS qua_tang_id,
    MAX(CASE WHEN slug = 'di-sinh' THEN id END) AS di_sinh_id
  FROM categories
)
UPDATE products p
SET category_id = ids.be_id
FROM ids
WHERE ids.be_id IS NOT NULL
  AND p.category_id = ids.be_trai_id;

WITH ids AS (
  SELECT
    MAX(CASE WHEN slug = 'so-sinh' THEN id END) AS so_sinh_id,
    MAX(CASE WHEN slug = 'body' THEN id END) AS body_id
  FROM categories
)
UPDATE products p
SET category_id = ids.so_sinh_id
FROM ids
WHERE ids.so_sinh_id IS NOT NULL
  AND p.category_id = ids.body_id;

WITH ids AS (
  SELECT
    MAX(CASE WHEN slug = 'combo-di-sinh-kem-qua' THEN id END) AS combo_id,
    MAX(CASE WHEN slug = 'qua-tang' THEN id END) AS qua_tang_id,
    MAX(CASE WHEN slug = 'di-sinh' THEN id END) AS di_sinh_id
  FROM categories
)
UPDATE products p
SET category_id = ids.combo_id
FROM ids
WHERE ids.combo_id IS NOT NULL
  AND p.category_id IN (ids.qua_tang_id, ids.di_sinh_id);

WITH ids AS (
  SELECT
    MAX(CASE WHEN slug = 'be' THEN id END) AS be_id,
    MAX(CASE WHEN slug = 'do-chip-be-gai' THEN id END) AS chip_id,
    MAX(CASE WHEN slug = 'be-gai' THEN id END) AS be_gai_id
  FROM categories
)
UPDATE products p
SET category_id = ids.chip_id
FROM ids
WHERE ids.chip_id IS NOT NULL
  AND p.category_id = ids.be_gai_id
  AND (
    p.name ILIKE '%chip%'
    OR p.slug ILIKE '%chip%'
  );

WITH ids AS (
  SELECT
    MAX(CASE WHEN slug = 'be' THEN id END) AS be_id,
    MAX(CASE WHEN slug = 'be-gai' THEN id END) AS be_gai_id
  FROM categories
)
UPDATE products p
SET category_id = ids.be_id
FROM ids
WHERE ids.be_id IS NOT NULL
  AND p.category_id = ids.be_gai_id;

WITH ids AS (
  SELECT
    MAX(CASE WHEN slug = 'so-sinh' THEN id END) AS so_sinh_id,
    MAX(CASE WHEN slug = 'nhong-chun' THEN id END) AS nhong_chun_id
  FROM categories
)
UPDATE products p
SET category_id = ids.nhong_chun_id
FROM ids
WHERE ids.nhong_chun_id IS NOT NULL
  AND p.category_id = ids.so_sinh_id
  AND (
    p.name ILIKE '%nhộng%'
    OR p.name ILIKE '%nhong%'
    OR p.name ILIKE '%chũn%'
    OR p.name ILIKE '%chun%'
    OR p.name ILIKE '%túi ngủ%'
    OR p.name ILIKE '%tui ngu%'
    OR p.slug ILIKE '%nhong%'
    OR p.slug ILIKE '%chun%'
    OR p.slug ILIKE '%tui-ngu%'
  );

-- 3) Ẩn taxonomy legacy khỏi UI admin/user
UPDATE categories
SET is_active = FALSE
WHERE slug IN ('be-trai', 'be-gai', 'body', 'qua-tang', 'di-sinh');

COMMIT;
