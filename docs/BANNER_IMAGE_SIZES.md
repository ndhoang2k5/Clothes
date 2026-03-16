# Lưu ý khi sử dụng phần mềm (dành cho Admin)

Tài liệu này lưu trữ các thông tin cần lưu ý khi vận hành và quản lý nội dung qua khu vực Admin.

---

## 1. Truy cập hệ thống

| Mục đích | URL (chạy Docker) | Ghi chú |
|----------|-------------------|--------|
| **Trang Admin** (quản lý nội dung) | **http://localhost:8000** | Đăng nhập / quản lý banner, sản phẩm, đơn hàng, bộ sưu tập, bài viết. |
| **Trang người dùng** (khách xem mua hàng) | **http://localhost:3000** | Trang bán hàng; banner chân trang và section ưu đãi cuối mùa chỉ hiển thị ở đây. |
| **Backend API** | http://localhost:8888 | Service phía sau; Admin và User đều gọi API này. |

- Đang làm việc trong Admin (port 8000) thì **không** thấy banner chân trang — banner đó chỉ hiện trên **trang user (port 3000)**.
- Sau khi thêm/sửa banner hoặc sản phẩm, cần reload trang (hoặc mở tab user) để xem thay đổi.

---

## 2. Banner — kích thước ảnh khuyến nghị

Ảnh đúng tỉ lệ giúp không bị crop hoặc vỡ hình trên giao diện. Trong form thêm/sửa banner, khi chọn **Vị trí hiển thị**, ô "Ảnh banner" sẽ hiển thị dòng **Khuyến nghị: [rộng] × [cao] px** tương ứng bảng dưới.

| Vị trí banner | Kích thước khuyến nghị (px) | Tỉ lệ | Hiển thị trên site |
|---------------|-----------------------------|--------|---------------------|
| **Ảnh bìa trang chủ** | **1920 × 600** | ~3,2 : 1 | Carousel đầu trang, cao 400px (mobile) / 600px (desktop). |
| **Banner khuyến mãi** | **1920 × 400** | ~4,8 : 1 | Dải ưu đãi giữa trang, cao ~240–280px. |
| **Danh mục nổi bật** | **800 × 352** | ~2,3 : 1 | Mỗi banner trong 1 ô (1/3 cột), ~400×176px/ô. Có thể dùng 600×264 để file nhẹ hơn. |
| **Banner chân trang** | **1920 × 220** | ~8,7 : 1 | Dải ngang ngay trên footer, cao ~180–220px. Chỉ hiện trên **trang user (port 3000)**. |

**Lưu ý chung khi dùng ảnh banner**

- **Độ phân giải**: Nên dùng 1920px chiều ngang cho bìa trang chủ, khuyến mãi, chân trang; danh mục nổi bật 800px là đủ.
- **Định dạng**: JPG hoặc WebP, nén vừa phải để vừa nét vừa tải nhanh.
- **Nội dung**: Tránh đặt chữ/logo quan trọng sát mép ảnh (dễ bị crop trên một số màn hình).

---

## 3. Sản phẩm

- **Danh mục "Ưu đãi cuối mùa"**: Trong danh sách sản phẩm, nút **"Ưu đãi cuối mùa"** dùng để chuyển sản phẩm sang danh mục này. Sản phẩm thuộc danh mục **Ưu đãi cuối mùa** sẽ hiển thị trong section **"Ưu đãi cuối mùa"** trên trang chủ (trang user, port 3000), ngay dưới **"Sản phẩm nổi bật"**.
- Sau khi bấm "Ưu đãi cuối mùa", nên reload trang Admin để thấy cột danh mục cập nhật đúng.

---

## 4. Các khu vực quản lý trong Admin

- **Banners**: Quản lý ảnh bìa, banner khuyến mãi, danh mục nổi bật, banner chân trang. Chọn đúng **Vị trí hiển thị** và **bật hiển thị** (Đang hiển thị) rồi lưu.
- **Sản phẩm**: Thêm/sửa/xóa sản phẩm, biến thể, ảnh; chuyển sản phẩm vào Ưu đãi cuối mùa; gộp sản phẩm (merge) nếu cần.
- **Bộ sưu tập**: Tạo/sửa bộ sưu tập và gán sản phẩm; hiển thị trên trang chủ và trang Bộ sưu tập (user).
- **Đơn hàng**: Xem và cập nhật trạng thái đơn.
- **Bài viết / Mẹo**: Nội dung tips (category = tips) có thể hiển thị trên trang chủ; intro (giới thiệu) dùng cho trang Về Unbee.
- **Đồng bộ Salework** (nếu có cấu hình): Dùng để kéo sản phẩm/tồn kho từ Salework vào hệ thống.

---

## 5. Lỗi thường gặp và cách xử lý

- **Banner đã thêm nhưng không thấy trên trang**: Kiểm tra (1) đang xem **trang user (port 3000)** chứ không phải trang Admin (8000); (2) banner đã chọn **Đang hiển thị** và đúng **Vị trí hiển thị**; (3) backend (port 8888) đang chạy.
- **Bấm "Ưu đãi cuối mùa" nhưng danh mục không đổi**: Reload trang Admin; nếu vẫn sai, kiểm tra kết nối API (backend 8888) và console/network trên trình duyệt.
- **Ảnh banner bị méo hoặc crop**: Dùng đúng tỉ lệ theo bảng **Kích thước ảnh khuyến nghị** ở mục 2.

---

*Tài liệu được cập nhật theo phiên bản hiện tại của phần mềm. Khi có thay đổi tính năng hoặc quy trình, nên cập nhật lại file này.*
