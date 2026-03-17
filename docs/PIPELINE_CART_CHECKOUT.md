## Pipeline cải tiến Giỏ hàng, Thanh toán & Khách hàng

Mục tiêu: biến hệ thống hiện tại (đã có giỏ hàng front-end) thành một luồng bán hàng đầy đủ gồm:
- Giỏ hàng ổn định, hiệu năng tốt.
- Tạo đơn hàng (order) chuẩn, có thể xem/duyệt trong admin.
- Mã giảm giá (voucher) áp dụng được trên giỏ.
- Từng bước bổ sung tài khoản khách hàng và quản lý đơn.

Các phase dưới đây có thể triển khai lần lượt theo thứ tự A → B → C → D. Mỗi phase có thể chia nhỏ thành nhiều PR.

---

### Phase A – Chuẩn hóa dữ liệu Order, Customer, Voucher (Backend)

**Mục tiêu**: Có cấu trúc dữ liệu và API nền tảng cho: Order, Customer, Voucher, để các phase sau chỉ cần “nối dây”.

**A.1. Rà soát & hoàn thiện model `Order` / `OrderItem`**

- **Kiểm tra lại** các model trong `backend/entities/models.py`:
  - `Order`:
    - Đảm bảo các field dùng đúng ý nghĩa:
      - `subtotal`: tổng tiền hàng chưa giảm giá.
      - `discount_total`: tổng tiền giảm (voucher, khuyến mãi).
      - `shipping_fee`: phí vận chuyển.
      - `total_amount`: tổng tiền khách phải trả.
      - `status`: `pending | confirmed | paid | shipped | completed | cancelled`.
  - `OrderItem`:
    - Có đủ: `product_id`, `variant_id`, `quantity`, `unit_price`, `line_total`.
    - `product_name`, `variant_label` để tránh phụ thuộc hoàn toàn vào join sản phẩm khi xem lại lịch sử.

**A.2. Thêm model `Customer` (khách hàng)**

- Bảng mới: `customers` (hoặc `users` nếu muốn dùng lại sau này):
  - Các field tối thiểu:
    - `id` (PK)
    - `name`
    - `phone`
    - `email` (unique nếu dùng đăng nhập)
    - `password_hash` (để dành cho Phase C – tài khoản)
    - `default_address` (Text) – địa chỉ mặc định.
    - `created_at`, `updated_at`.
- Liên kết:
  - Thêm `customer_id` (nullable) vào `Order` để biết đơn đó thuộc về ai (nếu có tài khoản).

**A.3. Thêm model `Voucher` (mã giảm giá)**

- Bảng mới: `vouchers`:
  - Trường gợi ý:
    - `id` (PK)
    - `code` (unique, uppercase)
    - `type`: `'percent' | 'fixed'` (giảm theo % hoặc số tiền cố định).
    - `value`: số phần trăm hoặc số tiền.
    - `min_order_total`: đơn tối thiểu để được áp mã.
    - `max_discount`: trần giảm giá (cho loại `%`).
    - `usage_limit`: tổng số lần được dùng toàn hệ thống.
    - `used_count`: số lần đã dùng.
    - `valid_from`, `valid_to`: thời gian hiệu lực.
    - `is_active`: bật/tắt mã.
    - (Optional tương lai) `applies_to`: `'all' | 'category' | 'product'` nếu muốn giới hạn theo sản phẩm.

**A.4. Thêm cấu hình quy tắc phí ship (shipping rules)**

- Hai hướng, có thể kết hợp:
  - **Config đơn giản trong bảng `settings`**:
    - Key: `shipping.threshold_1`, `shipping.discount_1` (ví dụ: đơn ≥ 200000 → giảm 50% ship).
    - Key: `shipping.threshold_2`, `shipping.discount_2` (ví dụ: đơn ≥ 300000 → freeship).
    - Key: `shipping.base_fee` (phí ship mặc định khi không đạt ngưỡng).
  - **Hoặc bảng riêng `shipping_rules`**:
    - Trường gợi ý:
      - `id` (PK)
      - `min_order_total`: ngưỡng áp dụng (VD: 0, 200000, 300000).
      - `discount_type`: `'percent' | 'fixed' | 'free'`.
      - `discount_value`: số % hoặc số tiền (0 nếu `free`).
      - `is_active`, `sort_order`.

- Service:
  - Hàm `ShippingService.calculate_fee(cart_total)`:
    - Đọc rule từ DB/settings.
    - Áp dụng rule có `min_order_total` lớn nhất nhưng ≤ `cart_total`.
    - Trả về `{ baseFee, discountFromShipping, finalFee }`.
 

**A.5. Service & API nền tảng**

- Service:
  - `OrderService`:
    - Hàm `create_order(db, payload)`:
      - Nhận `customer_info`, `cart_items`, `voucher_code?`.
      - Tính toán:
        - `subtotal` từ giá hiện tại trong DB.
        - `voucher_discount` thông qua `VoucherService`.
        - `shipping_fee` và `shipping_discount` thông qua `ShippingService`.
        - `total_amount = subtotal - voucher_discount - shipping_discount + base_shipping_fee`.
      - Lưu `Order` + nhiều `OrderItem` trong 1 transaction.
  - `VoucherService`:
    - Hàm `validate_voucher(db, code, cart_total)`:
      - Kiểm tra `exists`, `is_active`, `valid_from/to`, `usage_limit`, `min_order_total`.
      - Tính toán số tiền giảm `discount_amount` và trả về kết quả.
    - Hàm `consume_voucher(db, code)` – tăng `used_count` sau khi order thành công.

- API user-facing:
  - `POST /api/user/vouchers/validate`:
    - Body: `{ code: string, cart_total: number }`.
    - Response: `{ ok: boolean, discountAmount?: number, reason?: string }`.
  - `POST /api/user/orders`:
    - Body (tối thiểu):
      ```json
      {
        "customer": {
          "name": "string",
          "phone": "string",
          "email": "string?",
          "address": "string"
        },
        "items": [
          { "productId": "string", "variantId": "string?", "quantity": number }
        ],
        "voucherCode": "STRING?",
        "note": "string?"
      }
      ```
    - Response: `{ orderId, orderCode, status, totalAmount, createdAt }`.
 
- API admin:
  - `GET /api/admin/orders` – danh sách đơn (có phân trang).
  - `GET /api/admin/orders/{id}` – chi tiết đơn.
  - `GET/PUT /api/admin/shipping-rules` hoặc `settings` – cho phép admin thay đổi ngưỡng freeship / giảm ship.
  - (Để Phase D cấu hình thêm update trạng thái).

---

### Phase B – Hoàn thiện giỏ hàng & Checkout (guest checkout)

**Mục tiêu**: Từ giỏ hàng hiện tại, cho phép khách:
- Áp mã giảm giá.
- Nhập thông tin giao hàng.
- Gửi đơn lên backend và xem trang xác nhận.

**B.1. Nâng cấp `CartContext` & `CartPage` (frontend)**

- `CartContext`:
  - Thêm field:
    - `appliedVoucher?: { code: string; discountAmount: number }`.
  - Thêm hàm:
    - `applyVoucher(code: string): Promise<void>`:
      - Gửi request tới `POST /api/user/vouchers/validate` với `cart_total` tính từ items.
      - Nếu ok → lưu `appliedVoucher` vào state.
      - Nếu fail → throw error để UI hiển thị thông báo.

- `CartPage`:
  - Phần tóm tắt đơn:
    - `Tạm tính`: sum(unit_price * quantity).
    - `Giảm giá`: từ `appliedVoucher` nếu có.
    - `Phí ship`: tạm 0 hoặc cố định (config).
    - `Tổng thanh toán`: tạm tính – giảm giá + ship.
  - UI mã giảm giá:
    - Input + nút “Áp dụng”:
      - Loading state trong khi chờ kết quả.
      - Thông báo lỗi (mã hết hạn, không đủ điều kiện, sai mã).

**B.2. Form checkout đơn giản (không cần tài khoản)**

- Trên `CartPage` thêm section “Thông tin giao hàng”:
  - Các trường:
    - Họ tên (bắt buộc).
    - Số điện thoại (bắt buộc).
    - Email (tùy chọn, nhưng khuyến khích).
    - Địa chỉ giao hàng (bắt buộc).
    - Ghi chú (optional).
  - Nút “Đặt hàng”:
    - Disable nếu giỏ trống hoặc form chưa hợp lệ.
    - Khi click:
      - Gửi `POST /api/user/orders` với items hiện tại + `appliedVoucher` + customer info.
      - Nếu thành công:
        - Chuyển sang trang “Xác nhận đơn hàng” (`#/order-success?code=...` hoặc state).
        - Gọi `clearCart()` trong `CartContext`.

**B.3. Trang/Xử lý “Order Success”**

- Tạo component mới `OrderSuccessPage` (hoặc modal):
  - Hiển thị:
    - Mã đơn hàng.
    - Ngày tạo.
    - Tổng thanh toán.
    - Tóm tắt vài item chính.
  - CTA:
    - “Tiếp tục mua sắm” → `#/products` hoặc `#/`.

---

### Phase C – Tài khoản khách hàng (đăng nhập nhẹ, lịch sử đơn)

**Mục tiêu**: Cho phép khách có thể tạo tài khoản, đăng nhập, và xem lại đơn của mình. Không cần full tính năng user portal ở giai đoạn đầu.

**C.1. Backend Auth đơn giản**

- Sử dụng bảng `customers` đã có ở Phase A.
- Endpoint:
  - `POST /api/user/register`:
    - Body: `{ name, email, phone, password }`.
    - Hash mật khẩu (bcrypt), tạo khách hàng nếu email/phone chưa tồn tại.
  - `POST /api/user/login`:
    - Body: `{ emailOrPhone, password }`.
    - Trả về JWT hoặc session token (HTTP-only cookie) – chọn giải pháp đơn giản.
  - `GET /api/user/me`:
    - Trả về thông tin cơ bản + danh sách vài đơn gần đây (`last_orders`).

**C.2. Frontend: đăng nhập/đăng ký nhẹ**

- Thêm UI (có thể là modal hoặc trang riêng):
  - Form Đăng ký.
  - Form Đăng nhập.
  - Hiển thị lỗi cơ bản (sai mật khẩu, email đã tồn tại).
- Khi user đăng nhập thành công:
  - Lưu token (nếu dùng localStorage) hoặc dựa vào cookie (nếu dùng cookie HTTP-only).
  - Các request `POST /api/user/orders` kèm theo context user (qua token/cookie) để backend gắn `customer_id` vào đơn.

**C.3. Trang “Tài khoản của tôi” (My Account)**

- Đơn giản: `#/account`:
  - Thông tin khách hàng: tên, email, phone, địa chỉ mặc định.
  - Lịch sử đơn gần đây: mã đơn, ngày, tổng tiền, trạng thái.

---

### Phase D – Quản trị đơn hàng & mã giảm giá (Admin)

**Mục tiêu**: Admin có thể xem và xử lý đơn hàng, quản lý mã giảm giá.

**D.1. Quản lý đơn hàng (Admin UI)**

- Trang mới trong admin, ví dụ `AdminOrderManagement.tsx`:
  - Bảng danh sách:
    - Mã đơn.
    - Tên khách hàng.
    - Tổng tiền.
    - Trạng thái.
    - Ngày tạo.
  - Bộ lọc: theo trạng thái (`pending`, `completed`, ...), theo ngày.
  - Khi click vào 1 hàng:
    - Hiển thị chi tiết đơn:
      - Danh sách sản phẩm, số lượng, đơn giá, tổng dòng.
      - Voucher đã áp dụng (nếu có) và số tiền giảm.
      - Thông tin giao hàng + ghi chú.
    - Cho phép cập nhật trạng thái (`pending → confirmed → shipped → completed`, hoặc `cancelled`). 

**D.2. Quản lý mã giảm giá (Admin UI)**

- Trang mới `AdminVoucherManagement.tsx`:
  - Bảng danh sách vouchers:
    - Code, loại, giá trị, min order, max discount, số lần dùng, giới hạn, hiệu lực, trạng thái.
  - Form tạo/sửa:
    - Code (uppercase).
    - Loại: phần trăm / cố định.
    - Giá trị.
    - Đơn tối thiểu, trần giảm.
    - Thời gian hiệu lực.
    - Giới hạn số lần dùng.
    - Trạng thái bật/tắt.

**D.3. Quản lý quy tắc phí ship (Admin UI)**

- Trang nhỏ hoặc section trong cấu hình:
  - Nếu dùng bảng `shipping_rules`:
    - Cho phép admin:
      - Thêm rule: ví dụ
        - Rule 1: `min_order_total = 0`, `discount_type = fixed`, `discount_value = 0` (base).
        - Rule 2: `min_order_total = 200000`, `discount_type = percent`, `discount_value = 50` (giảm 50% ship).
        - Rule 3: `min_order_total = 300000`, `discount_type = free`, `discount_value = 0` (freeship).
      - Sắp xếp `sort_order`, bật/tắt rule.
  - Nếu dùng `settings` đơn giản:
    - Form chỉnh các giá trị:
      - Phí ship mặc định.
      - Ngưỡng 1 + % giảm.
      - Ngưỡng 2 + option freeship.


---

### Thứ tự triển khai đề xuất

1. **Phase A** – Chuẩn hóa models & service cho Order, Customer, Voucher; expose các API cơ bản.  
2. **Phase B** – Nối `CartPage` với voucher + checkout (guest), tạo đơn hàng vào DB; trang Order Success.  
3. **Phase D (đọc-only)** – Admin xem danh sách đơn & voucher (chưa cần chỉnh sửa).  
4. **Phase C** – Bổ sung tài khoản khách hàng (register/login) + trang “Tài khoản của tôi”.  
5. **Phase D (đầy đủ)** – Admin cập nhật trạng thái đơn, tạo/sửa/xóa mã giảm giá.

Ở mỗi bước, ưu tiên:
- Không phá luồng mua hàng hiện tại (nút Thêm giỏ hàng, CartPage vẫn hoạt động).  
- Đảm bảo backend vẫn trả về dữ liệu hợp lệ cho UI đã có trước đó.  
- Viết log/ngắn gọn trong code (hoặc docs) về các rule tính tiền và áp mã để sau này dễ kiểm toán.
