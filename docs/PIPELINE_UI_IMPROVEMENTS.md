# Pipeline: Cải thiện giao diện người dùng (Unbee – User Frontend)

## 1. Tổng quan hiện trạng

### 1.1 Công nghệ & cấu trúc
- **Stack**: React (TSX), Tailwind CSS (CDN), hash router (`#/`), font Quicksand.
- **Thư mục user**: `user/` (HomePage, ProductPage, ProductDetailPage, CollectionPage, AboutPage), `components/` (Navbar, ProductCard, FilterSidebar, Pagination), `App.tsx` (Footer, ErrorBoundary, routing).

### 1.2 Trang hiện có
| Route        | Trang            | Ghi chú ngắn |
|-------------|------------------|--------------|
| `#/`        | HomePage         | Hero, quick categories, trust, category banners, collections, featured products (tabs), clearance, promo, tips. |
| `#/products`| ProductPage      | Breadcrumb, filter sidebar, grid sản phẩm, pagination. |
| `#/product/:id` | ProductDetailPage | Gallery, variant picker, mô tả, combo items, add to cart (chưa nối logic). |
| `#/collections` | CollectionPage  | List collections hoặc chi tiết 1 collection + grid sản phẩm, pagination. |
| `#/about`   | AboutPage        | Intro từ API, layout 2 cột. |
| `#/blog`    | —                | **Chưa có route** → mặc định về Home. |
| `#/cart`    | —                | **Chưa có route** → mặc định về Home. |
 
### 1.3 Design system hiện tại
- **Màu chủ đạo**: `#F8F3EC`, `#B58A5A`, `#4B3B32`, `#E5D6C4`, `#FFF9F1` (tông ấm); pink (`pink-500`, `pink-600`) cho CTA và accent.
- **Typography**: Quicksand toàn site; mix `font-black` cho tiêu đề, `font-bold`/`font-semibold` cho nút và nhấn mạnh.
- **Component**: Nút tròn (`rounded-full` / `rounded-xl`), card `rounded-2xl`, border `border-gray-100` / `border-[#E5D6C4]`.
- **Thiếu**: file tokens/design system chung (màu, spacing, radius) dùng nhất quán; một số chỗ dùng gray thay vì palette brand.

### 1.4 Điểm mạnh
- Hero + promo carousel mượt, quick categories, trust features, nhiều block nội dung trên Home.
- ProductCard có hover ảnh, badge Sale/Hot, size/stock trên card.
- ProductDetail có gallery, variant (size/color), quantity, combo.
- FilterSidebar có sort, giá, size, màu, chất liệu; Pagination có ellipsis.
- Loading skeleton, empty state “Không tìm thấy sản phẩm”, ErrorBoundary cơ bản.

### 1.5 Điểm cần cải thiện (tóm tắt)
- **Phase 0 (ưu tiên)**: (1) Banner cuối trang: admin có slot `footer_banner`, API có; user chưa gọi và chưa hiển thị. (2) Admin "Ưu đãi cuối mùa": nút có nhưng chưa cập nhật đúng danh mục sản phẩm. (3) Section ưu đãi cuối mùa: cần đảm bảo hiển thị ngay dưới Sản phẩm nổi bật trên trang chủ.
- **Routing**: Thiếu trang Blog và Cart; link Navbar dẫn về Home.
- **Design system**: Màu/radius chưa thống nhất (gray vs brand); chưa có design tokens.
- **Navbar**: Menu mobile chưa mở/đóng; giỏ hàng hardcode “3”; search chưa chức năng.
- **Responsive**: Một số section có thể tối ưu (quick categories, filter trên mobile).
- **UX conversion**: Add to cart chưa nối API/state; thiếu feedback (toast/notification).
- **Accessibility**: Một số nút/trạng thái thiếu aria; focus visible chưa đồng bộ.
- **Performance**: Ảnh chưa lazy load thống nhất; Tailwind qua CDN.
 
---

## 2. Mục tiêu cải thiện UI (không code, chỉ kế hoạch)

1. **Nhất quán**: Một bộ design tokens (màu, spacing, radius, shadow) dùng chung toàn user frontend.
2. **Đầy đủ luồng**: Có trang Blog và Cart (hoặc placeholder rõ ràng), routing và Navbar khớp nhau.
3. **Navigation rõ ràng**: Navbar desktop/mobile dùng được (menu mobile mở/đóng, link đúng).
4. **Trải nghiệm mua hàng**: Từ danh sách → chi tiết → thêm giỏ → xem giỏ (logic và feedback rõ ràng).
5. **Mobile-first**: Layout và tương tác (filter, bảng giá, nút) thoải mái trên điện thoại.
6. **Cảm giác chất lượng**: Loading/empty/error thống nhất; vi vi (hover, focus, transition) đồng bộ.
7. **Có thể mở rộng**: Dễ thêm theme (ví dụ dark) hoặc A/B UI sau này.

---

## 3. Các phase (pipeline)

### Phase 0: Ưu tiên sửa trước (banner cuối trang, admin ưu đãi cuối mùa, section ưu đãi trên trang chủ)

**Mục tiêu**: Sửa các phần thiếu sót đang có logic/backend nhưng chưa hoạt động đúng trên giao diện hoặc admin; đảm bảo section ưu đãi cuối mùa có vị trí rõ ràng trên trang chủ.

**Công việc (chỉ liệt kê, chưa code)**  

1. **Banner cuối trang (footer banner)**  
   - **Hiện trạng**: Admin đã có quản lý banner với slot "Banner chân trang" (`footer_banner`); backend API user có lấy banner theo slot. Giao diện người dùng **chưa** gọi API slot `footer_banner` và **chưa** hiển thị banner này.  
   - **Công việc**: Trên giao diện user (ví dụ trong `App.tsx` phía trên Footer, hoặc cuối nội dung trang chủ): gọi API lấy banner(s) slot `footer_banner`; hiển thị block banner (ảnh, title, link nếu có) trước khi vào Footer. Xử lý trường hợp không có banner (ẩn block).  

2. **Admin – Nút "Ưu đãi cuối mùa" chưa chỉnh đúng danh mục sản phẩm**  
   - **Hiện trạng**: Trong `admin/ProductManagement.tsx` đã có nút "Ưu đãi cuối mùa" và `handleMoveToClearance` gọi `api.adminUpdateProduct(p.id, { category: 'uu-dai-cuoi-mua' })`. Khi ấn vào, danh mục sản phẩm **chưa** được cập nhật thành "Ưu đãi cuối mùa" (có thể do backend nhận `category_id` thay vì slug, hoặc field khác).  
   - **Công việc**: Kiểm tra API backend cập nhật sản phẩm (PATCH/PUT product): nhận `category` dạng slug (`uu-dai-cuoi-mua`) hay `category_id`; map slug → id nếu cần. Chỉnh admin (hoặc backend) để thao tác "Ưu đãi cuối mùa" thực sự cập nhật danh mục sản phẩm thành "Ưu đãi cuối mùa" và hiển thị đúng sau khi reload.  

3. **Section Ưu đãi cuối mùa trên trang chủ (giao diện user)**  
   - **Hiện trạng**: Trang chủ đã có block "Ưu đãi cuối mùa" (lấy sản phẩm `category: 'uu-dai-cuoi-mua'`), nằm dưới một số section.  
   - **Công việc**: Ưu tiên pipeline để **đảm bảo** có một section giao diện hiển thị sản phẩm "Ưu đãi cuối mùa" **ngay bên dưới** phần "Sản phẩm nổi bật" (Featured Products). Nếu đã có section nhưng vị trí chưa đúng thì chỉnh thứ tự; nếu thiếu thì thêm section mới. Section cần: tiêu đề rõ (ví dụ "Ưu đãi cuối mùa"), grid sản phẩm (từ API category `uu-dai-cuoi-mua`), link "Xem tất cả" tới `#/products?cat=uu-dai-cuoi-mua`.  

**Deliverable**:  
- (1) Banner cuối trang hiển thị trên user khi admin đã thêm banner slot `footer_banner`.  
- (2) Admin: ấn "Ưu đãi cuối mùa" → danh mục sản phẩm được cập nhật đúng.  
- (3) Trang chủ: section "Ưu đãi cuối mùa" nằm ngay dưới "Sản phẩm nổi bật", đủ nổi bật và đúng dữ liệu.  

**Thứ tự**: Làm **trước** tất cả các phase 1–6 bên dưới.

**Cách kiểm tra (sau khi code)**  
- **Banner chân trang**: Giao diện **người dùng** chạy ở port **3000** (Docker: service `frontend`). Mở **http://localhost:3000** → cuộn xuống trước Footer: nếu đã thêm banner slot "Banner chân trang" trong Admin thì block banner sẽ hiển thị. Admin chạy port **8000** (service `frontend_admin`) — không có block banner chân trang ở đó.  
- **Ưu đãi cuối mùa (admin)**: Vào Admin → Sản phẩm → bấm nút "Ưu đãi cuối mùa" trên một sản phẩm → reload trang → danh mục sản phẩm phải là "Ưu đãi cuối mùa".  
- **Section ưu đãi cuối mùa**: Mở http://localhost:3000 (trang chủ) → section "Ưu đãi cuối mùa" luôn hiển thị ngay dưới "Sản phẩm nổi bật" (có sản phẩm thì hiện grid, chưa có thì hiện placeholder + link).

---

### Phase 1: Design system & nhất quán giao diện

**Mục tiêu**: Chuẩn hóa màu sắc, chữ, spacing, radius, shadow để mọi trang dùng chung.

**Công việc (chỉ liệt kê, chưa code)**  
1. **Design tokens**
   - Liệt kê palette: primary, secondary, background, surface, text (primary/secondary/muted), border, success, warning, error.
   - Liệt kê spacing scale (4, 6, 8, 12, 16, 20, 24, 32…), radius (sm, md, lg, xl, 2xl, full), shadow (sm, md, lg).
   - Quyết định: giữ Tailwind CDN hay chuyển build (tailwind.config) để dùng tokens (custom colors, fontFamily).

2. **Áp dụng tokens**
   - Thay thế dần các class hardcode (gray-*, pink-*) bằng token (ví dụ `bg-primary`, `text-brand`, `rounded-card`).
   - Ưu tiên: Navbar, Footer, nút CTA, ProductCard, FilterSidebar, Pagination.

3. **Typography**
   - Chuẩn hóa: H1/H2/H3, body, caption; có thể thêm utility class (`.heading-1`, `.body-lg`).

**Deliverable**: Document design tokens (trong repo hoặc `docs/`) + danh sách file/component sẽ refactor theo tokens. Chưa bắt buộc refactor hết trong phase này.

**Thứ tự**: Làm trước các phase sau để tránh sửa đi sửa lại.

---

### Phase 2: Routing & Navigation

**Mục tiêu**: Route và menu khớp nhau; người dùng không bị “lạc” khi bấm Blog hoặc Giỏ hàng.

**Công việc (chỉ liệt kê)**  
1. **Routing**
   - Thêm route `#/blog` → trang Blog (list tips từ API hoặc placeholder nội dung tĩnh).
   - Thêm route `#/cart` → trang Giỏ hàng (có thể placeholder “Đang phát triển” hoặc layout giỏ trống).

2. **Navbar**
   - Link “Blog” → `#/blog`; “Giỏ hàng” → `#/cart`.
   - Số lượng giỏ: không hardcode “3”; lấy từ state/context (khi đã có cart state) hoặc hiển thị 0 nếu chưa có.

3. **Menu mobile**
   - Nút hamburger: click mở/đóng drawer hoặc dropdown menu (Trang chủ, Sản phẩm, Bộ sưu tập, Blog, Về Unbee, Giỏ).
   - Đảm bảo cùng bộ link với desktop.

4. **Footer**
   - Kiểm tra link (Về Unbee, Chính sách, Liên hệ) trỏ đúng route hoặc anchor; link chết → đánh dấu “TODO” hoặc `#`.

**Deliverable**: Checklist route + Navbar (desktop + mobile) + Footer; quyết định Blog/Cart là trang thật hay placeholder.

**Thứ tự**: Sau Phase 1 (để dùng được tokens cho Navbar/Footer nếu đã refactor).

---

### Phase 3: Trang chủ (HomePage) & danh sách (ProductPage / CollectionPage)

**Mục tiêu**: Trang chủ và danh sách sản phẩm/bộ sưu tập rõ ràng, dễ quét, nhất quán với design system.

**Công việc (chỉ liệt kê)**  
1. **HomePage**
   - Đồng bộ màu/chữ theo tokens: hero, quick categories, trust features, section tiêu đề (Sản phẩm nổi bật, Ưu đãi cuối mùa, v.v.).
   - Nhất quán tiêu đề section: cùng level (H2/H3), cùng style.
   - Tab “Hàng mới / Hot sales / Phụ kiện / Xem thêm”: style rõ ràng (active vs inactive), có thể thêm indicator.
   - CTA “Mua ngay”, “Xem tất cả”: dùng component nút chung (sau khi có design system).

2. **ProductPage**
   - Header (breadcrumb + số sản phẩm): dùng tokens.
   - Filter sidebar: trên mobile có thể đóng/mở (drawer hoặc sheet) thay vì luôn chiếm diện tích.
   - Grid sản phẩm: khoảng cách, số cột responsive thống nhất; loading skeleton giống ProductCard tỷ lệ.

3. **CollectionPage**
   - Hero collection: tỷ lệ ảnh, overlay chữ đọc được trên mọi kích thước.
   - Grid và pagination: cùng style với ProductPage (card, spacing).

**Deliverable**: Danh sách thay đổi từng section (HomePage, ProductPage, CollectionPage) theo tokens và UX đã chốt.

**Thứ tự**: Sau Phase 1, có thể song song một phần với Phase 2.

---

### Phase 4: Chi tiết sản phẩm & conversion (ProductDetailPage, Cart)

**Mục tiêu**: Trang chi tiết rõ ràng, tin cậy; nút “Thêm giỏ hàng” có luồng và feedback.

**Công việc (chỉ liệt kê)**  
1. **ProductDetailPage**
   - Gallery: thumbnails dễ bấm trên mobile; nút prev/next rõ, có aria-label.
   - Thông tin giá, variant (size/color): layout gọn; hết hàng hiển thị rõ và vô hiệu hóa “Thêm giỏ hàng”.
   - Mô tả: có thể thu gọn/mở rộng trên mobile.
   - Combo: hiển thị danh sách sản phẩm trong combo rõ ràng.

2. **Add to cart**
   - Nối sự kiện “Thêm giỏ hàng” với state/context giỏ hàng (và API nếu backend có).
   - Sau khi thêm: feedback (toast hoặc inline “Đã thêm vào giỏ”) và cập nhật số lượng trên Navbar.

3. **Trang Cart**
   - Layout: danh sách item, tổng tiền, nút “Thanh toán” (có thể placeholder).
   - Empty state: “Giỏ trống”, CTA về trang sản phẩm.

**Deliverable**: Mô tả luồng Add to cart (event → state → UI feedback) + yêu cầu trang Cart (layout, empty state). Chưa bắt buộc tích hợp API thanh toán.

**Thứ tự**: Sau Phase 2 (đã có route Cart và Navbar giỏ hàng).

---

### Phase 5: Mobile & responsive

**Mục tiêu**: Mọi trang dùng tốt trên màn nhỏ; không bị vỡ layout, chữ đọc được, nút đủ lớn.

**Công việc (chỉ liệt kê)**  
1. **Breakpoints**
   - Chuẩn hóa breakpoint (sm/md/lg/xl) nếu dùng Tailwind; đảm bảo Navbar, Footer, grid, form dùng đúng.

2. **Navbar mobile**
   - Menu full-screen hoặc drawer; không bị khuất bởi hero hoặc keyboard.

3. **Trang chủ**
   - Quick categories: 3 cột mobile ổn; khoảng cách và kích thước chạm hợp lý.
   - Các section: không bị tràn ngang; CTA đủ lớn.

4. **ProductPage**
   - Filter: drawer/sheet trên mobile; nút “Áp dụng” / “Xóa bộ lọc” rõ.
   - Grid: 2 cột mobile; card không quá nhỏ.

5. **ProductDetailPage**
   - Gallery và form chọn variant: dùng tốt 1 cột; nút + / − số lượng đủ lớn.
 
6. **Cart**
   - Bảng/list item đọc được; nút thanh toán cố định hoặc luôn visible.

**Deliverable**: Checklist từng trang theo viewport (mobile / tablet / desktop) và danh sách chỉnh sửa cụ thể.

**Thứ tự**: Có thể rải trong Phase 3 và 4, hoặc gom một đợt sau khi đã có Cart.

---

### Phase 6: Accessibility & vi chỉnh (polish)

**Mục tiêu**: Dễ dùng với bàn phím và trình đọc màn hình; cảm giác “chỉn chu”.

**Công việc (chỉ liệt kê)**  
1. **A11y**
   - Nút và link: aria-label khi cần (icon-only); focus visible thống nhất (ring màu brand).
   - Form: label gắn với input; thông báo lỗi liên kết với field.
   - Heading: thứ bậc H1 → H2 → H3 hợp lý từng trang.

2. **Loading & empty & error**
   - Skeleton: cùng kiểu (ProductCard, ProductDetail, About).
   - Empty state: icon + message + CTA thống nhất (đã có một phần ở ProductPage).
   - ErrorBoundary: có nút “Thử lại” hoặc “Về trang chủ”; style theo tokens.

3. **Vi chỉnh**
   - Hover/focus: transition đồng bộ (duration, ease).
   - Ảnh: alt có ý nghĩa; quyết định lazy load (native `loading="lazy"` hoặc Intersection Observer) cho list/grid.

**Deliverable**: Checklist a11y (focus, aria, heading) + quy ước loading/empty/error + danh sách vi chỉnh transition/ảnh.

**Thứ tự**: Sau khi các trang chính đã ổn (Phase 3, 4, 5).

---

## 4. Thứ tự thực hiện đề xuất

1. **Phase 0** – Ưu tiên sửa trước: banner cuối trang, admin "Ưu đãi cuối mùa", section ưu đãi cuối mùa dưới Sản phẩm nổi bật.
2. **Phase 1** – Design system & tokens (nền tảng).
3. **Phase 2** – Routing & Navbar/Footer (Blog, Cart, menu mobile).
4. **Phase 3** – HomePage, ProductPage, CollectionPage (áp dụng tokens + UX).
5. **Phase 4** – ProductDetail + Add to cart + trang Cart.
6. **Phase 5** – Mobile/responsive (có thể lồng trong 3 & 4).
7. **Phase 6** – Accessibility & polish.

Sau khi có pipeline này, mỗi bước triển khai sẽ là: chọn phase → chọn task con → code theo đúng mục tiêu đã mô tả. **Nên làm Phase 0 xong rồi mới tới Phase 1.**

---

## 5. Checklist nhanh (trước khi bắt tay code)

- [ ] Đã đọc và chốt pipeline với team/stakeholder.
- [ ] **Phase 0**: Làm trước — banner cuối trang, admin ưu đãi cuối mùa, section ưu đãi cuối mùa dưới Sản phẩm nổi bật.
- [ ] Đã quyết định: Tailwind CDN vs build (tailwind.config) cho design tokens.
- [ ] Đã quyết định: Blog và Cart là trang thật hay placeholder trong đợt này.
- [ ] Đã có nơi lưu design tokens (file config hoặc `docs/`) khi vào Phase 1.
- [ ] Ưu tiên phase: 0 → 1 → 2 → 3 (sau Phase 0).

---

*Tài liệu này chỉ mô tả pipeline và công việc, chưa bao gồm code. Khi sẵn sàng, bắt đầu từ **Phase 0**, sau đó Phase 1, 2, 3...*
