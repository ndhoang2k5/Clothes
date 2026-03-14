# Pipeline: Kéo API Salework → Xử lý dữ liệu → Admin gộp sản phẩm → User hiển thị size/số lượng

## Tổng quan

1. **Backend**: Gọi API Salework → lưu/ cập nhật theo mã SKU (code) → API đồng bộ + API gộp sản phẩm.
2. **Admin**: Nút đồng bộ Salework; màn hình gộp nhiều mã (nhiều sản phẩm 1 variant) thành 1 sản phẩm có nhiều size/màu.
3. **User**: Hiển thị size, màu, tồn kho trên card và trang chi tiết; filter động theo dữ liệu thực.

---

## Phase 1: Backend – Kéo API & xử lý dữ liệu

### 1.1 Cấu hình

- **Env** (backend): đặt trong `.env` hoặc biến môi trường container:
  - `SALEWORK_CLIENT_ID` (vd: 2573)
  - `SALEWORK_TOKEN` (token từ Salework Open API)
  - `SALEWORK_BASE_URL` (tùy chọn, mặc định `https://salework.net/api/open/stock/v1`)
- **Endpoint**: GET `{BASE_URL}/product/list`, headers: `client-id`, `token`.

### 1.2 Cấu trúc response Salework (thô)

- `data.products`: object, key = `code` (vd: `BCV001`, `Pn001_hong_1`).
- Mỗi item: `_id`, `code`, `name`, `image`, `retailPrice`, `cost`, `barcode`, `stocks`: `[{ "wid", "value" }]`.
- Tồn kho: tổng `stocks[].value` hoặc theo `wid` nếu cần.

### 1.3 Chiến lược lưu (sync)

- **Match theo SKU**: `product_variants.sku` = Salework `code` (unique).
- **Lần sync đầu**:
  - Với mỗi `code` chưa có variant nào có `sku = code`: tạo 1 **Product** (name từ Salework, 1 ảnh, category mặc định) + 1 **ProductVariant** (sku=code, stock=tổng stocks, price_override=retailPrice). → Mỗi mã Salework = 1 sản phẩm 1 variant.
- **Các lần sau**:
  - Nếu đã có variant với `sku = code`: chỉ cập nhật **stock**, **price_override** (và có thể ảnh variant/product nếu muốn).
  - Nếu chưa có: tạo mới như trên.
- Sản phẩm nhập tay (variant không có `sku` trùng Salework): **không đụng tới**, vẫn giữ nguyên.

### 1.4 DB

- **product_variants**: dùng `sku` làm mã Salework (đã có). Thêm **external_sku_id** (TEXT, nullable) = Salework `_id` để sau này đổi cách match nếu cần.
- Migration: `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS external_sku_id TEXT;` + index (optional).

### 1.5 API Backend

- **POST /api/admin/salework/sync**: Gọi Salework → xử lý như 1.3 → trả về { synced, created_products, updated_variants, errors }.
- **GET /api/admin/salework/status**: Trả về { last_sync_at, last_sync_result } (lưu trong bảng config hoặc cache).

---

## Phase 2: Admin – Giao diện & chức năng gộp sản phẩm

### 2.1 Đồng bộ Salework

- Trang **Sản phẩm** (hoặc trang **Cài đặt**): nút **"Đồng bộ Salework"**.
- Gọi POST `/api/admin/salework/sync`, hiển thị loading → kết quả (đã tạo/đã cập nhật bao nhiêu, lỗi nếu có).

### 2.2 Gộp sản phẩm (merge)

- **Mục tiêu**: Chọn nhiều sản phẩm (mỗi sản phẩm 1 variant từ Salework) → gộp thành **1 sản phẩm** với nhiều variant (size/màu do admin nhập).
- **Luồng**:
  1. Trong danh sách sản phẩm: checkbox chọn N sản phẩm (nên lọc: kind=single, có đúng 1 variant).
  2. Nút **"Gộp thành 1 sản phẩm"** → mở modal:
     - Tên sản phẩm mới, danh mục, mô tả (tùy chọn).
     - Danh sách variant (từ N sản phẩm đã chọn): mỗi dòng = 1 variant, hiển thị mã SKU + cho nhập **Size**, **Màu** (và tồn kho chỉ đọc từ sync).
  3. Gửi **POST /api/admin/products/merge** (hoặc tương đương):
     - Body: `{ name, category_id, description?, variant_assignments: [ { variant_id, size, color } ] }`.
     - Backend: Tạo 1 Product mới; chuyển tất cả variant được chọn sang product mới (update product_id), set size/color theo gửi lên; xóa các Product cũ (không còn variant).

### 2.3 Hiển thị phù hợp data

- Danh sách sản phẩm: cột **Mã SKU** (variants[0].sku) để dễ nhận diện từ Salework.
- Sản phẩm từ Salework: có thể badge "Salework" (variant có sku khớp pattern hoặc external_sku_id not null).

---

## Phase 3: User – Hiển thị size, số lượng

### 3.1 Trang danh sách (ProductPage / ProductCard)

- **ProductCard**: Hiển thị thông tin gọn về biến thể:
  - Ví dụ: "3 size" hoặc "Size: 0-3m, 3-6m" (rút gọn); hoặc "Còn hàng" / "Hết hàng" theo tổng stock.
- **Filter**: Lấy **sizes**, **colors**, **materials** từ danh sách sản phẩm thực tế (đã có trong code: `availableOptions`) → có thể chuyển thành động từ API/products thay vì hardcode.

### 3.2 Trang chi tiết (ProductDetailPage)

- Đã có: chọn Size, Màu, hiển thị "Còn lại: X sản phẩm", số lượng mua (min/max theo stock).
- Đảm bảo: variant có **size**, **color**, **stock** từ backend (serializer đã trả đủ) → không cần đổi logic lớn, chỉ kiểm tra hiển thị rõ ràng (label "Size", "Màu", "Tồn kho").

### 3.3 Filter động

- Ở trang sản phẩm: gọi API products → từ `products[].variants` collect tập sizes, colors, materials → truyền vào `FilterSidebar` thay cho mảng cố định.

---

## Thứ tự triển khai đề xuất

| Bước | Nội dung |
|------|----------|
| 1 | Migration: `product_variants.external_sku_id` (optional index). |
| 2 | Backend: Salework client (GET product/list), parse products + stocks. |
| 3 | Backend: Sync service (upsert Product + ProductVariant theo sku/code). |
| 4 | Backend: POST /api/admin/salework/sync, GET status. |
| 5 | Backend: POST /api/admin/products/merge (merge N products → 1, gán size/color). |
| 6 | Admin: Nút "Đồng bộ Salework" + hiển thị kết quả. |
| 7 | Admin: Chọn nhiều sản phẩm + modal "Gộp thành 1 sản phẩm" + gọi merge API. |
| 8 | User: ProductCard hiển thị size/tồn kho (text ngắn). |
| 9 | User: Filter sizes/colors/materials lấy động từ danh sách sản phẩm. |

---

## Lưu ý

- **Sync định kỳ**: Có thể thêm cron/celery gọi sync mỗi 1–5 phút; hoặc chỉ sync thủ công từ admin.
- **Encoding**: Request/response Salework dùng UTF-8; backend Python đọc response với encoding đúng để tên sản phẩm không lỗi.
- **Lỗi API**: Nếu Salework trả lỗi hoặc timeout: không xóa dữ liệu hiện tại, chỉ báo lỗi và (nếu có) lưu last_sync_result = error.
