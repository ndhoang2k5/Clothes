-- Nới cột size/color/material cho product_variants (tên Salework dài khi sync).
-- PostgreSQL: docker compose exec -T db psql -U unbee_user -d unbee_db < database/widen_product_variant_text_columns.sql

ALTER TABLE product_variants ALTER COLUMN size TYPE VARCHAR(255);
ALTER TABLE product_variants ALTER COLUMN color TYPE VARCHAR(255);
ALTER TABLE product_variants ALTER COLUMN material TYPE VARCHAR(255);
