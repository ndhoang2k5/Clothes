-- Thêm cột external_sku_id cho đồng bộ Salework (chạy trên DB đã tồn tại)
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS external_sku_id TEXT;
CREATE INDEX IF NOT EXISTS idx_product_variants_external_sku ON product_variants (external_sku_id) WHERE external_sku_id IS NOT NULL;
