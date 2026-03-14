# Cấu trúc API Salework – Product Get List

## Endpoint

- **Method:** GET  
- **URL:** `https://salework.net/api/open/stock/v1/product/list`  
- **Headers:**  
  - `client-id`: 2573  
  - `token`: (lưu trong env, không commit)  
  - `Content-Type`: application/json  

---

## Response thô (định dạng thực tế)

```json
{
  "status": "success",
  "data": {
    "products": { ... },
    "warehouses": [ ... ]
  }
}
```
 
### 1. `data.products` (object, key = mã sản phẩm)

**Không phải mảng** – là object với key = `code` (mã SKU/variant).

Mỗi phần tử có dạng:

| Field           | Kiểu   | Mô tả                          |
|----------------|--------|---------------------------------|
| `_id`          | string | ID MongoDB trên Salework        |
| `code`         | string | Mã sản phẩm (key trong object)  |
| `cost`         | number | Giá vốn                         |
| `name`         | string | Tên hiển thị (có thể đã gồm màu/size) |
| `image`        | string | URL ảnh                         |
| `retailPrice`  | number | Giá bán lẻ                      |
| `wholesalePrice` | number | Giá sỉ (có thể 0)             |
| `barcode`      | string | Mã vạch                        |
| `stocks`       | array? | Tồn kho theo kho; có thể thiếu  |

**`stocks`** – mảng (có thể không có):

```json
"stocks": [
  { "wid": "SaleworkWarehouse", "value": 49 }
]
```

- `wid`: ID kho (trùng với `warehouses[].wid`).
- `value`: số lượng tồn.

**Ví dụ mã:** `BCV001`, `NP001_Trai_1`, `Pn001_hong_1`, `Pn001_xanh_2`…  
→ Thường là **từng dòng variant** (màu + size) là một “sản phẩm” riêng trên Salework.

---

### 2. `data.warehouses` (mảng)

Mỗi phần tử:

| Field           | Kiểu   | Mô tả                |
|----------------|--------|----------------------|
| `_id`          | string | ID kho               |
| `name`         | string | Tên kho (vd: "Kho Mặc Định") |
| `wid`          | string | Mã kho (vd: "SaleworkWarehouse") – dùng trong `stocks[].wid` |
| `createdAt`    | string | ISO datetime         |
| `updatedAt`    | string | ISO datetime         |
| `address`      | string | Địa chỉ              |
| `bins`         | array  | Các bin trong kho    |
| `pickUpAddress`| object | Địa chỉ lấy hàng     |

Tồn kho thực tế nằm ở **`products[code].stocks`** (theo `wid`), không cần parse sâu `warehouses` nếu chỉ cần số lượng.

---

## Quy ước mã sản phẩm (từ dữ liệu mẫu)

- **Một sản phẩm gốc** có nhiều **variant** trên Salework, mỗi variant = một `code`:
  - Ví dụ: `Pn001_hong_1`, `Pn001_hong_2`, `Pn001_hong_3`, `Pn001_nau_1`, ...
  - Có thể nhóm theo prefix (vd `Pn001`) → 1 Product, các code còn lại → ProductVariant (size, color suy từ `name` hoặc từ quy ước đặt tên).

---

## Bước tiếp theo (xử lý dữ liệu)

1. **Chuẩn hóa response:** Parse `data.products` (object) thành list; xử lý encoding UTF-8 (request/response dùng UTF-8).
2. **Nhóm variant:** Từ `code` (hoặc `name`) suy ra product gốc + size/color để map sang `Product` + `ProductVariant[]`.
3. **Map field:**  
   `retailPrice` → `price`, `stocks` → tổng tồn hoặc từng kho → `stock`, `name`/`code` → tách `size`/`color` nếu có quy ước.
4. **Merge với dữ liệu hiện tại:** Sản phẩm từ API cập nhật theo `code`/`_id`; sản phẩm nhập tay (không có trong API) giữ nguyên.

File này dùng làm tài liệu tham chiếu khi viết code transform và tích hợp sync.
 