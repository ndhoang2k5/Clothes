# Kiến trúc & logic hệ thống Unbee

Tài liệu mô tả toàn bộ kiến trúc, luồng dữ liệu và logic nghiệp vụ của shop **Unbee** (`unbee.vn`) theo codebase tại `/opt/Clothes`.

---

## 1. Tổng quan

Unbee là nền tảng bán lẻ thời trang mẹ & bé gồm:

| Lớp | Vai trò |
|-----|---------|
| Shop (user) | SPA React: xem sản phẩm, giỏ hàng, đặt hàng, blog, tài khoản |
| Admin CMS | SPA React riêng (`/admin/`): quản lý SP, đơn, KM, banner, blog |
| API | FastAPI (`/api/user`, `/api/admin`) |
| DB | PostgreSQL 15 |
| Tích hợp kho | Salework (đồng bộ tồn / SKU) |
| CDN/ảnh | Upload tĩnh + thumb WebP on-demand |

**Không dùng Alembic.** Schema khởi tạo bằng SQL (`database/init.sql`), bổ sung bằng `database/migrate*.sql` và một số `CREATE TABLE IF NOT EXISTS` lúc runtime (ví dụ khuyến mãi %).

---

## 2. Sơ đồ triển khai (production)

```
Internet
   │
   ▼
Caddy (TLS Let's Encrypt)     45.117.177.53:80/443
   │  reverse_proxy web:80
   ▼
nginx (container unbee_web)
   ├── /                shop SPA (Vite dist)
   ├── /admin/          admin SPA
   ├── /assets/         JS/CSS hashed, cache dài
   ├── /api/            proxy → backend:8000
   └── /static/         proxy → backend /static (uploads + thumb cache)
   │
   ▼
FastAPI (unbee_backend :8000)
   ├── PostgreSQL (unbee_db)
   ├── volume uploads:  ./backend/static/uploads
   └── volume cache:    ./backend/static/cache
```

- Compose: `docker-compose.yml` + `docker-compose.override.yml` (Caddy, không publish `web:80` ra host).
- Build shop/admin: `deploy/nginx/Dockerfile` (`npm run build` + `npm run build:admin`), `VITE_API_ORIGIN` mặc định `https://unbee.vn`.
- Backend image: Python 3.11 + uvicorn, **không** `--reload`.

**Deploy lại sau khi sửa code:**

```bash
cd /opt/Clothes
docker compose build backend web   # hoặc chỉ service đã đổi
docker compose up -d backend web
```

Thay đổi SQL schema trên DB đã có: chạy file trong `database/` thủ công (`psql`), không tự chạy khi recreate container (trừ `init.sql` lần tạo volume Postgres lần đầu).

---

## 3. Cấu trúc thư mục

| Path | Ý nghĩa |
|------|---------|
| `App.tsx`, `user/`, `components/`, `services/api.ts` | **Shop production** (Vite root) |
| `frontend_admin/`, `admin/` | CMS: wrapper Vite + màn hình nghiệp vụ |
| `frontend/` | Bản shop cũ / stub, **không** được Docker build |
| `backend/` | FastAPI, model, service, script |
| `database/` | `init.sql` + các migrate SQL |
| `deploy/nginx/` | Dockerfile + `nginx.conf` |
| `deploy/caddy/` | `Caddyfile` |
| `docs/` | Pipeline, runbook, Salework |

Shop dùng **History API** (`navigate()` + `popstate`), không React Router. Admin dùng **hash router** (`#/admin/...`).

---

## 4. Backend

### 4.1 Entry & middleware

`backend/main.py`:

- CORS từ `CORS_ALLOWED_ORIGINS`
- Rate limit (`SimpleRateLimitMiddleware`) theo path: login admin, list products, thumbs, voucher…
- Mount `/api/user`, `/api/admin`
- Mount `/static` (uploads + `cache/thumbs`)
- Startup: Salework auto-sync (mặc định mỗi 60s) + warm thumb homepage
- MIME `.webp` đăng ký thủ công để StaticFiles không trả `text/plain`

JWT:

- Khách: `JWT_SECRET` — `POST /api/user/login|register`, `GET /api/user/me`
- Admin: `JWT_ADMIN_SECRET` (hoặc fallback) — `POST /api/admin/auth/login`; mọi route admin khác cần Bearer

### 4.2 API user (`/api/user`)

| Method | Path | Logic |
|--------|------|--------|
| GET | `/categories` | Danh mục active, cache TTL ~30s |
| GET | `/products` | SP active, phân trang, filter size/màu/chất liệu/giá/sort/`q`; `category=giam-gia` = SP đang KM % |
| GET | `/products/{id}` | Chi tiết; bỏ URL ảnh file đã mất; áp % KM |
| GET | `/products/{id}/combo-items` | Thành phần combo |
| GET | `/banners?slot=` | Banner active theo slot |
| GET | `/collections` | BST |
| GET | `/blogs`, `/blogs/{id}` | Blog public |
| GET | `/vouchers/available` | Mã đủ điều kiện theo `cart_total` |
| GET | `/vouchers/homepage-promo-cards` | Thẻ vé trang chủ |
| POST | `/vouchers/validate` | Kiểm tra mã |
| GET | `/vouchers/auto` | Mã auto-apply |
| GET | `/shipping/calculate` | Phí ship theo rule |
| POST | `/orders` | Tạo đơn (giá từ DB, không tin giá client) |
| POST | `/newsletter/subscribe` | Đăng ký email |
| GET | `/thumbs?path=&w=` | Resize WebP on-demand |
| POST | `/register`, `/login` | Tài khoản khách |
| GET | `/me` | Hồ sơ + đơn gần nhất |

### 4.3 API admin (`/api/admin`)

Login: `POST /auth/login` → JWT.

CRUD/protected: đơn hàng + KPI + đổi status; khách hàng; voucher; shipping rules; categories; products (list/picker/CRUD/merge); variants + images; combo items; collections; banners; newsletter; blogs + editor-config; **promotions**; `POST /upload-image`; Salework `POST /salework/sync` + `GET /salework/status`.

Admin user **không** tạo từ UI — INSERT `admin_users` trên DB.

---

## 5. Mô hình dữ liệu (logic)

### 5.1 Catalog

```
Category  ←── Product.category_id (legacy, 1 danh mục “chính”)
    ↑
ProductCategory (M2M)  — SP thuộc nhiều danh mục
    ↑
Product
    ├── ProductVariant (sku unique, size/color/material, stock, price override)
    ├── ProductImage
    └── ComboItem (nếu kind=combo) → variant của SP khác
```

Cờ SP: `is_active`, `is_hot`, `is_new`, `is_sale`. Giá: `base_price`, `discount_price`.

Filter shop theo slug: **junction HOẶC** `category_id` (`product_category_utils.apply_category_slug_filter`).

Danh mục ảo (không phải hàng `categories`):

- `giam-gia` — SP trong chương trình KM % đang bật
- `uu-dai-cuoi-mua` — danh mục thật, admin “Ưu đãi cuối mùa” gán SP vào đây

### 5.2 Khuyến mãi theo % (Sản phẩm khuyến mãi)

Bảng `product_promotions` + `product_promotion_items` (1 SP chỉ thuộc **một** chương trình — unique `product_id`).

Tạo nhiều campaign: ví dụ 20% cho 10 SP, 15% cho 5 SP.

Khi lưu / tắt / xóa:

- `discount_price = round(base_price * (100 − %))`
- `is_sale = true` khi còn trong KM active; gỡ KM thì xóa `discount_price`

Serialize shop luôn gắn `sale_percent` + ghi đè `discount_price` từ % hiện tại (`apply_promo_to_payload`).

List `/products?category=giam-gia` chỉ trả ID trong promo active.

Menu shop: **Sản phẩm → Xem thêm → Giảm giá** → `/products?cat=giam-gia`.

**Khác voucher:** voucher giảm trên **đơn**; % SP giảm **giá niêm yết / giá bán dòng hàng**.

**Khác ưu đãi cuối mùa:** đó là **danh mục**, không phải engine %.

### 5.3 Combo

`Product.kind = combo` + `combo_items` (variant thành phần + số lượng). Shop load `/combo-items` khi xem box.

### 5.4 Bộ sưu tập

`collections` + `collection_products` (sort_order).

### 5.5 Giỏ hàng & đơn

Giỏ **chỉ trên trình duyệt** (`localStorage` key `unbee_cart_v1`). Server không lưu cart.

Đặt hàng `POST /orders`:

1. Bắt buộc tên, SĐT, địa chỉ
2. Resolve từng dòng: product/variant tồn tại, **đơn giá từ DB** (`discount_price` variant override → product `discount_price` → `base_price`)
3. `subtotal` = Σ qty × unit_price
4. Áp voucher (nếu có) → `discount_total`
5. Tính ship theo `shipping_rules` (rule `min_order_total` lớn nhất ≤ tổng sau giảm)
6. `total_amount = subtotal − discount + shipping`
7. Snapshot `product_name`, `variant_label` trên `order_items`
8. `status = pending`; mã `ORD-YYYYMMDD-XXXXXX`
9. (Tuỳ env) email thông báo quản lý

Luồng status: `pending → confirmed → paid → shipped → completed`; hoặc `cancelled`.

### 5.6 Voucher

`type`: `percent | fixed | product | combo`.

Điều kiện: `min_order_total` / `max_order_total`, hạn dùng, `usage_limit`, `is_active`, `auto_apply`, `show_on_homepage` (thẻ vé trang chủ), `show_in_checkout`.

Checkout gọi validate/auto; số giảm **tính lại trên server** lúc tạo đơn.

### 5.7 Phí ship

Chọn rule active có `min_order_total` lớn nhất mà ≤ tổng đơn. `discount_type`: percent / fixed / free trên `base_fee`.

### 5.8 Banner

Slot ví dụ: `home_hero`, `home_category_feature`. Có `image_url` + `mobile_image_url`.

### 5.9 Blog

`status`: draft / review / scheduled / published. Shop lọc published.

Nhóm nav: `tin-tuc`, `tram-sac-cua-me`, `cam-nang-me-be`, `goc-nho-bat-mi`. URL `/blogs?category=<slug>`. Bài intro (`category=intro`) dùng “Về Unbee”, không xóa kiểu bài thường.

### 5.10 Newsletter

Email unique; form footer → `POST /newsletter/subscribe`. Admin xuất / đánh dấu đã gửi.

---

## 6. Shop frontend — routing & trang

`App.tsx` đọc `pathname + search`:

| Path | Trang |
|------|--------|
| `/` | HomePage (hero, voucher cards, category banners, SP nổi bật, BST, blog) |
| `/products` | List; `?cat=`, `?q=` |
| `/products/:id-:slug` | Chi tiết |
| `/collections` | BST |
| `/blogs`, `/blogs/:cat/:id-slug` | List / bài |
| `/tips` | Redirect/alias cẩm nang |
| `/cart` | Giỏ + checkout |
| `/login`, `/account` | Auth khách |
| `/order-success` | Sau đặt hàng |
| `/about` | Về Unbee |

HomePage: fetch ~20 SP (không load cả catalog); tab Hàng mới / Hot / Ưu đãi / Xem thêm.

Giá card khi có KM: **giá đỏ** + **giá gốc gạch** + badge **%**.

### Ảnh list

1. Ưu tiên `/static/cache/thumbs/{480|640}/uploads/{stem}.webp`
2. Fallback `GET /api/user/thumbs?path=uploads/...&w=`
3. Fallback file gốc `/static/uploads/...`

Thumb: LANCZOS, WebP quality ~82. Upload admin: resize cạnh dài ≤ 2000px, JPEG ~85. Ảnh cũ đã batch nén (`backend/scripts/optimize_uploads.py`).

ProductCard: lazy dưới fold; 4 ảnh đầu homepage `priority`.

---

## 7. Admin frontend

Vào `/admin/` → hash:

- `#/admin` dashboard
- `#/admin/products` sản phẩm + Salework status
- `#/admin/promotions` **Sản phẩm khuyến mãi**
- `#/admin/clearance` ưu đãi cuối mùa
- `#/admin/orders` đơn
- `#/admin/vouchers` mã giảm giá
- `#/admin/shipping-rules` phí ship
- `#/admin/collections` BST
- `#/admin/banners`
- `#/admin/newsletter`
- `#/admin/blogs` (+ intro)

Token: `unbee_admin_token`. `services/api.ts` (root) dùng chung shop + admin.

---

## 8. Salework

Env: `SALEWORK_BASE_URL`, `SALEWORK_CLIENT_ID`, `SALEWORK_TOKEN`.

- Auto-sync ~60s (`SALEWORK_AUTO_SYNC_*`)
- Map `product_variants.sku` ↔ mã Salework; `external_sku_id`
- Parse size/màu từ tên SKU (kể cả combo “Hồng - Trắng sz 0-3m”)
- SP **mới tạo** từ sync: `is_active=false` (Off) — bật tay trên admin
- Conflict unique `(product_id, size, color)` được xử lý thân thiện

Chi tiết API: `docs/SALEWORK_API_STRUCTURE.md`.

---

## 9. Auth & bảo mật

| Ai | Cơ chế |
|----|--------|
| Admin | JWT riêng, bcrypt, `is_active`; không self-register |
| Khách | JWT user; giỏ không cần login; login để `/account` + gắn `customer_id` đơn |
| Upload | Chỉ admin; nén server-side |
| Rate limit | Chống brute-force login và burst list/thumbs |
| CORS | Production: origin `https://unbee.vn` |

---

## 10. Luồng nghiệp vụ chính

### 10.1 Khách mua hàng

1. Duyệt list/chi tiết (giá đã gồm % KM nếu có)
2. Chọn size/màu (`variantSelection` không khóa chéo khi mỗi size một màu)
3. Thêm giỏ → localStorage
4. Cart: voucher tay / auto, tính ship preview
5. Submit order → server tính lại giá + voucher + ship → giảm stock (nếu service có) → email (optional)
6. Admin đổi status trên `#/admin/orders`

### 10.2 Admin chạy KM %

1. `#/admin/promotions` → tên, %, chọn SP → Lưu
2. DB ghi `discount_price`
3. Shop: badge % + gạch giá gốc; menu Giảm giá list đúng các SP đó

### 10.3 Upload ảnh

Admin `POST /upload-image` → optimize → `/static/uploads/{uuid}.jpg`. Thumb tạo khi xem list hoặc warm lúc startup.

---

## 11. Cache & hiệu năng

- List product client: cache trong `api.ts` (`getProductsPage` / `peekProductsPage`)
- Categories/banners user: TTLCache ~10–30s
- Nginx `/static/`: Cache-Control 7 ngày
- Thumb cache disk persist (volume) — mất volume = cold resize lại
- Rate limit thumbs cao hơn list JSON (nhiều ảnh song song)

---

## 12. Env quan trọng (`.env`)

| Biến | Công dụng |
|------|-----------|
| `VITE_API_ORIGIN` | Origin API lúc build SPA |
| `JWT_SECRET` / `JWT_ADMIN_SECRET` | Ký token |
| `CORS_ALLOWED_ORIGINS` | CORS |
| `SALEWORK_*` | Kho |
| `ORDER_NOTIFY_*` / `SMTP_*` | Email đơn |
| `SALEWORK_AUTO_SYNC_*` | Bật/tắt & chu kỳ sync |

---

## 13. Điểm dễ nhầm

1. Thư mục `frontend/` không phải shop đang chạy — sửa `user/` + `App.tsx`.
2. `giam-gia` không có row category; `uu-dai-cuoi-mua` thì có.
3. Giá trên card có thể đến từ **promo %**, không chỉ field `discount_price` gõ tay.
4. Giỏ tin localStorage; **đơn luôn tính lại trên server**.
5. Recreate backend **không** mất ảnh nếu volume uploads/cache còn mount.
6. Schema mới: nhớ `migrate.sql` / runtime `ensure_*` — `init.sql` chỉ volume Postgres mới.

---

## 14. File “nguồn sự thật” theo domain

| Domain | File |
|--------|------|
| Model | `backend/entities/models.py` |
| API user/admin | `backend/api/user/router.py`, `backend/api/admin/router.py` |
| List SP + giam-gia | `backend/service/user/product_service.py` |
| KM % | `backend/service/promotion_service.py` |
| Đơn | `backend/service/order_service.py` |
| Voucher / ship | `voucher_service.py`, `shipping_service.py` |
| Serialize giá | `backend/service/serializers.py` |
| Shop API client | `services/api.ts` |
| Route shop | `App.tsx` |
| Menu | `user/Navbar.tsx` |
| Admin shell | `frontend_admin/AdminApp.tsx`, `admin/AdminLayout.tsx` |
| Compose | `docker-compose.yml`, `docker-compose.override.yml` |
)
