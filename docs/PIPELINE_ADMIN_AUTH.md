# Pipeline: Bảo mật Admin (đăng nhập JWT) — triển khai trước khi public web

Mục tiêu:

- Khóa toàn bộ API `/api/admin/*` bằng **JWT Bearer**; chỉ user admin trong bảng `admin_users` mới gọi được.
- Hỗ trợ **3–5 tài khoản admin**, **cùng quyền** (không phân quyền role).
- **Không** nên dùng một mật khẩu chung cho nhiều người: mỗi người một dòng trong `admin_users` để đổi mật khẩu và vận hành an toàn hơn.
- **Tài khoản admin chỉ được tạo trong database** (INSERT thủ công hoặc migration SQL). **Không** có API / màn hình “tạo tài khoản admin” trong app.

Thứ tự đề xuất: **Phase 1 (Backend) → Phase 2 (Frontend admin) → Phase 3 (Kiểm thử) → Phase 4 (Triển khai production)**. Làm xong Phase 1–3 trên môi trường dev/staging rồi mới gắn domain / HTTPS.

---

## Bối cảnh codebase (tại thời điểm viết tài liệu)

| Thành phần | Trạng thái |
|------------|------------|
| Bảng `admin_users` | Đã có trong `database/init.sql` (email unique, `password_hash`, `is_active`, …). |
| Model SQLAlchemy `AdminUser` | Đã có trong `backend/entities/models.py`. |
| `backend/service/auth_service.py` | JWT khách + **`create_admin_access_token`**, `get_current_admin`, v.v. |
| `backend/api/admin/router.py` | Login tách `auth_router`; còn lại `protected_router` + `get_current_admin`. |
| `frontend_admin` + `services/api.ts` | `adminFetch` + `unbee_admin_token`, login `/api/admin/auth/login`. |

---

## Phase 1 — Backend

### 1.1 Model & DB

- [x] Thêm class `AdminUser` trong `backend/entities/models.py` map tới bảng `admin_users` (khớp cột trong `init.sql`).
- [x] Nếu DB đã chạy trước khi có bảng: bảng `admin_users` đã có trong `database/migrate.sql` — áp dụng migrate khi cần.
- [ ] Mọi user admin (3–5 người) được **thêm / sửa / khóa (`is_active`) trực tiếp trên DB**; không triển khai chức năng tạo user trong backend hay admin UI. *(Quy ước vận hành; áp dụng khi làm login / bảo vệ API.)*

### 1.2 JWT admin (tách biệt JWT khách)

**Yêu cầu:** Token của khách và token admin **không được** thay thế lẫn nhau.

Gợi ý payload admin (ví dụ):

```json
{
  "sub": "<admin_users.id>",
  "typ": "admin",
  "iat": ...,
  "exp": ...
}
```

- **Ký token:** mặc định dùng chung `JWT_SECRET`. Có thể tách **`JWT_ADMIN_SECRET`** (khuyến nghị production) để token admin không verify được bằng secret khách.
- **Thời hạn:** `JWT_ADMIN_EXPIRES_MINUTES` (mặc định code: 720 phút ≈ 12 giờ), tách biệt `JWT_EXPIRES_MINUTES` của khách.

- [x] Thêm hàm `create_admin_access_token(admin_user_id: int) -> str` trong `backend/service/auth_service.py`.
- [x] Thêm `get_current_admin_optional` / `get_current_admin` (Bearer → verify `typ == "admin"` → load `AdminUser`, `is_active`).
- [x] Bổ sung: `get_current_customer_optional` bỏ qua token có `typ == "admin"` (khi dùng chung `JWT_SECRET`, tránh nhầm `sub` với `customer_id`).

**Lưu ý:** JWT khách hiện dùng `sub` = `customer_id` và không có `typ`. Luồng verify admin **bắt buộc** kiểm `typ` để tránh khách dùng token của mình gọi `/api/admin`.

### 1.3 Endpoint đăng nhập

- [x] Thêm **`POST /api/admin/auth/login`** (hoặc `/api/auth/admin/login` — chọn một, thống nhất với frontend).
  - Body: `{ "email": "...", "password": "..." }`.
  - Tìm user theo email, `verify_password`, kiểm `is_active`.
  - Trả về `{ "access_token": "...", "token_type": "bearer" }` (và có thể thêm `admin: { id, email, full_name }` không nhạy cảm).
  - (Tuỳ chọn) Cập nhật `last_login_at`.

### 1.4 Bảo vệ toàn bộ router admin

- [x] Áp `Depends(get_current_admin)` cho **mọi** route trong `backend/api/admin/router.py` **trừ** login.

Cách gọn:

- Khai báo `router = APIRouter(dependencies=[Depends(get_current_admin)])` và tách `auth_router` không dependency; hoặc gắn dependency từng nhóm route.

### 1.5 Biến môi trường production

| Biến | Ý nghĩa |
|------|---------|
| `JWT_SECRET` | Chuỗi bí mật ký JWT **khách** — **bắt buộc** đổi trên production. |
| `JWT_ADMIN_SECRET` | (Tuỳ chọn) Ký / verify JWT **admin**; nếu để trống thì dùng chung `JWT_SECRET`. |
| `JWT_EXPIRES_MINUTES` | Thời gian sống token khách (mặc định rất dài trong code). |
| `JWT_ADMIN_EXPIRES_MINUTES` | Thời gian sống token admin (mặc định trong code: 10080 phút = 7 ngày). |

### 1.6 Tạo tài khoản admin — chỉ qua database

**Không** có API đăng ký / tạo user admin. **Không** env tự động tạo user trên startup. Chỉ:

- [x] Seed admin đầu tiên trong `database/init.sql` (DB mới) và `database/migrate.sql` (DB cũ đã có bảng): email **`globaladmin`**, `password_hash` chỉ bcrypt trong SQL (không lưu plaintext mật khẩu trong repo). Form login CMS: ô **Email** = `globaladmin`, kèm mật khẩu đã thống nhất với team.
- [x] Nếu Postgres đã tạo volume **trước** khi có dòng seed trong `init.sql`, seed sẽ **không** tự chạy lại: dùng `database/ensure_admin_globaladmin.sql` (UPSert) — chạy một lần qua `psql` trong container `db` (xem comment đầu file).
- [x] Thêm user khác: dùng client SQL hoặc bổ sung `INSERT … WHERE NOT EXISTS` (cột tối thiểu: `email`, `password_hash` bcrypt, `full_name` tuỳ chọn, `is_active`).

`password_hash` phải đúng định dạng mà backend dùng khi đăng nhập (cùng thuật toán với `hash_password` trong `auth_service.py` — bcrypt). Cách thực tế:

1. Trên máy dev (một lần), chạy Python có `bcrypt` để **in ra** chuỗi hash từ mật khẩu plaintext (không lưu plaintext vào repo):  
   `python -c "import bcrypt; print(bcrypt.hashpw(b'MatKhauTam', bcrypt.gensalt()).decode())"`
2. Copy hash vào câu lệnh `INSERT` (hoặc `UPDATE admin_users SET password_hash = ...` khi đổi mật khẩu).
3. Lặp lại cho **3–5 dòng** `admin_users` (mỗi người một email); cùng quyền, không cần bảng role.

Khi off-board hoặc mất thiết bị: set `is_active = false` hoặc xóa dòng trên DB (theo chính sách nội bộ).

### 1.7 Rate limit (khuyến nghị)

- [x] Rule riêng cho `/api/admin/auth/login` trong `backend/main.py` (`SimpleRateLimitMiddleware`): tối đa ~8 lần thử liên tiếp/IP, sau đó refill ~1 yêu cầu/phút (token bucket; xem `backend/middleware/rate_limit.py`).

---

## Phase 2 — Frontend admin (`frontend_admin`)

### 2.1 Trang đăng nhập

- [x] Component **Login**: `frontend_admin/pages/AdminLoginPage.tsx` — form email + mật khẩu, gọi `api.adminAuthLogin` → `POST /api/admin/auth/login`.
- [x] Lưu token vào **`localStorage`** với key **`unbee_admin_token`** (tách biệt `unbee_user_token` của shop).

### 2.2 Gắn token vào mọi request admin

Trong `services/api.ts`:

- [x] `adminFetch`: mọi request tới `/api/admin/...` (trừ login) gửi `Authorization: Bearer <unbee_admin_token>`.
- [x] Response **401** (trừ `/auth/login`): xóa token admin, `window.location.hash = '#/admin/login'`.

### 2.3 Bảo vệ routing UI

Trong `frontend_admin/AdminApp.tsx`:

- [x] Không có token và không phải `#/admin/login` → chuyển hash tới đăng nhập; có token mà đang ở login → về `#/admin`.
- [x] Sau login thành công → `#/admin` (dashboard).

**Đăng xuất:** nút sidebar trong `admin/AdminLayout.tsx` gọi `api.adminAuthLogout()` và chuyển `#/admin/login`.

### 2.4 Build & env

- [x] **`VITE_API_ORIGIN`**: biến môi trường Vite dùng chung shop + admin (xem `services/api.ts`).
- [x] File mẫu gốc repo: **`.env.example`** — copy thành `.env.production` (hoặc export biến trong CI) trước khi `npm run build` / **`npm run build:admin`**.
- [x] **`frontend_admin/vite.config.ts`**: `envDir` trỏ tới thư mục gốc monorepo (`Clothes/`) để một file `.env*` phục vụ cả shop và CMS.
- [x] **`package.json`**: `dev:admin`, `build:admin`, `preview:admin` — build artefact CMS ở **`frontend_admin/dist/`** (serve static + CDN/nginx như shop).

**Build admin production (máy dev / CI):**

```bash
# Windows PowerShell: $env:VITE_API_ORIGIN="https://api.example.com"; npm run build:admin
VITE_API_ORIGIN=https://api.example.com npm run build:admin
```

Deploy nội dung thư mục **`frontend_admin/dist/`** lên host admin; đảm bảo trình duyệt mở CMS qua **HTTPS** nếu API production dùng HTTPS (tránh mixed content).

---

## Phase 3 — Kiểm thử (checklist trước khi mở internet)

Chạy khi backend đã chạy (ví dụ `http://localhost:8888`). Thay `BASE` nếu khác.

| # | Việc kiểm tra | Cách làm / kỳ vọng |
|---|----------------|---------------------|
| 1 | Sai mật khẩu login | `curl -s -o NUL -w "%{http_code}" -X POST "%BASE%/api/admin/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"globaladmin\",\"password\":\"wrong\"}"` → **401** |
| 2 | Truy cập admin API không token | `curl -s -o NUL -w "%{http_code}" "%BASE%/api/admin/orders"` → **401** |
| 3 | Token **khách** (JWT shop) gọi admin | Lấy token từ `POST /api/user/login`, gọi `GET /api/admin/orders` với `Authorization: Bearer <token>` → **401** (payload không có `typ: admin`). |
| 4 | User admin bị khóa | Trên DB: `UPDATE admin_users SET is_active = false WHERE email = '...';` rồi login / gọi API với token cũ → **401**; bật lại `is_active = true` sau khi xong. |
| 5 | Luồng CMS thật | Đăng nhập CMS → mở Sản phẩm / Banner → thao tác đọc hoặc sửa nhẹ → không lỗi 401 vòng lặp. |
| 6 | Rate limit login | Gửi liên tiếp **hơn 8** `POST` tới `/api/admin/auth/login` cùng IP trong vài giây → một số bản ghi trả **429** (`rate_limited`). |

Lệnh mẫu (PowerShell, `BASE=http://localhost:8888`) — kỳ vọng HTTP **401** khi sai mật khẩu:

```powershell
$BASE = "http://localhost:8888"
curl.exe -s -w "%{http_code}" -o NUL -X POST "$BASE/api/admin/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"globaladmin\",\"password\":\"wrong\"}"
```
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
Read

---

## Phase 4 — Triển khai production (sau khi auth xong)

- [ ] HTTPS (Let’s Encrypt hoặc CDN).
- [ ] `JWT_SECRET` chỉ trên server, không commit.
- [ ] (Khuyến nghị) `JWT_ADMIN_SECRET` khác `JWT_SECRET` để token admin không verify được bằng secret khách.
- [ ] Thu hẹp `CORSMiddleware` trong `backend/main.py` từ `allow_origins=["*"]` → danh sách domain shop + admin thật.
- [ ] (Tuỳ chọn) Basic Auth / IP allowlist phía reverse proxy chỉ cho path `/admin` — lớp thêm, không thay JWT.

**Env cần set trên production (backend):**

- `JWT_SECRET`: bắt buộc (mạnh, không commit).
- `JWT_ADMIN_SECRET`: khuyến nghị.
- `CORS_ALLOWED_ORIGINS`: danh sách origin, phân tách bằng dấu phẩy. Ví dụ:  
  `https://unbee.vn,https://admin.unbee.vn`  
  *(Nếu không set, backend sẽ fallback `*` để tiện dev; production không nên để vậy.)*

**Gợi ý cho `unbee.vn`:**

- Nếu **shop** ở `https://unbee.vn` và **admin** ở `https://admin.unbee.vn` → set:  
  `CORS_ALLOWED_ORIGINS=https://unbee.vn,https://admin.unbee.vn`
- Nếu **admin** cũng nằm trên cùng origin `https://unbee.vn` (ví dụ route `/admin`) → chỉ cần:  
  `CORS_ALLOWED_ORIGINS=https://unbee.vn`

**Gợi ý reverse proxy:**

- Bật HTTPS cho cả shop + admin.
- (Tuỳ chọn) Chặn `/admin` bằng Basic Auth hoặc IP allowlist để giảm brute-force/scan.

**Deploy Docker (phương án A: cùng domain `unbee.vn`):**

- Route gợi ý:
  - Shop: `https://unbee.vn/`
  - Admin: `https://unbee.vn/admin/`
  - API: `https://unbee.vn/api/...`
  - Static uploads: `https://unbee.vn/static/...`
- Repo đã có `docker-compose.yml` (production) + Nginx proxy nội bộ. HTTPS được terminate ở Caddy (Let’s Encrypt).
- Build-time cho shop/admin cần set `VITE_API_ORIGIN=https://unbee.vn` (nếu không app sẽ fallback gọi `:8888`).

**Chạy nhanh bằng Docker Compose (gợi ý):**

- Tạo file env từ mẫu: `.env.prod.example` → `.env` (không commit `.env`)
- Chạy:

```bash
docker compose up -d --build
```

**Salework sync (production):**

- Bắt buộc set trong `.env`:
  - `SALEWORK_CLIENT_ID`
  - `SALEWORK_TOKEN`
- Nếu thiếu cấu hình, `POST /api/admin/salework/sync` sẽ trả **400** với `detail` rõ lỗi để debug nhanh.

**Bật HTTPS (khuyến nghị) bằng Caddy (Let’s Encrypt, auto renew):**

- Điều kiện:
  - DNS `A` record của `unbee.vn` trỏ về IP VPS.
  - Mở inbound port **80** và **443** trên VPS/firewall.
- Caddy đã nằm trong `docker-compose.override.yml` nên chỉ cần chạy `docker compose up -d --build` là tự có HTTPS.
  - Nếu VPS có **2 IP public** và IP cũ đang bị web khác chiếm 80/443, hãy bind Caddy vào IP mới (ví dụ `45.117.177.53`) như trong `docker-compose.override.yml`.

Sau khi lên xong, truy cập:

- Shop: `https://unbee.vn/`
- Admin: `https://unbee.vn/admin/`

---

## Thứ tự tổng thể với “đưa lên web”

1. Hoàn thành **Phase 1–3** trên staging.
2. Deploy backend + DB production; **INSERT đủ user vào `admin_users` trên DB** (xem mục 1.6).
3. Deploy static shop + static admin (cùng domain hoặc subdomain); cấu hình `VITE_API_ORIGIN`.
4. Rà soát CORS, HTTPS, secrets.

---

## Tài liệu liên quan trong repo

- Schema `admin_users`: `database/init.sql`
- Auth bcrypt/JWT khách: `backend/service/auth_service.py`
- Router admin: `backend/api/admin/router.py`
- Client admin API: `services/api.ts`
- SPA admin: `frontend_admin/`
