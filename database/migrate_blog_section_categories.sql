-- Tái cơ cấu chuyên mục blog: gộp news/tips/share/charity -> tin-tuc (giữ intro riêng)
UPDATE blogs
SET category = 'tin-tuc'
WHERE category IN ('news', 'tips', 'share', 'charity');

UPDATE blogs
SET category = 'tin-tuc'
WHERE category IS NULL OR TRIM(category) = '';
