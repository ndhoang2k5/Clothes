-- Multi-category support for products (many-to-many via product_categories)
-- Apply: psql -U unbee_user -d unbee_db < database/migrate_product_categories.sql

BEGIN;

CREATE TABLE IF NOT EXISTS product_categories (
    product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_category ON product_categories (category_id);

-- Backfill from legacy single category_id
INSERT INTO product_categories (product_id, category_id)
SELECT p.id, p.category_id
FROM products p
WHERE p.category_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
