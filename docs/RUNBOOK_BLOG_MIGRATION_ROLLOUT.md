# Runbook migration & rollout Blog Editor

Mục tiêu: rollout editor blog mới an toàn, không mất dữ liệu, có đường lui nhanh nếu phát sinh lỗi.

## 1) Pre-check trước migration

- Backup DB hiện tại (full dump).
- Xác nhận backend version đã có:
  - parser fallback content cũ
  - serializer blog tương thích dữ liệu cũ/mới
  - cột blog mới đã được migrate (`status`, `scheduled_at`, `reviewed_at`).
- Chạy smoke test API:
  - `GET /api/user/blogs`
  - `GET /api/admin/blogs`
  - `POST /api/admin/blogs` (tạo bản test rồi xóa).

## 2) Migration dữ liệu nội dung

- Scope migration:
  - Chỉ convert các bài legacy text sang định dạng block JSON.
  - Không thay đổi slug/id/published state.
- Trình tự:
  1. Đọc tất cả blog hiện có.
  2. Bài nào chưa ở JSON block thì convert bằng parser legacy.
  3. Ghi lại content mới.
  4. Đánh dấu log số bài convert thành công/thất bại.
- Verify sau migration:
  - Random 20 bài ở 4 category (`intro/tips/news/charity`) để kiểm tra render.
  - So sánh excerpt trước/sau migration.

## 3) Rollout theo giai đoạn

- Giai đoạn 1 (internal):
  - Chỉ team nội bộ dùng editor mới.
  - Theo dõi lỗi save, lỗi preview, lỗi publish.
- Giai đoạn 2 (full):
  - Bật toàn bộ admin.
  - Theo dõi KPI 24-72h đầu.

## 4) Rollback plan

- Điều kiện rollback:
  - Tỷ lệ lỗi publish tăng cao.
  - Nhiều bài render sai layout ngoài user.
- Cách rollback:
  1. Tắt luồng editor mới trên admin (route hoặc feature toggle ở UI).
  2. Giữ parser fallback để user vẫn đọc được bài đã convert.
  3. Nếu cần, restore DB từ backup gần nhất.
- Sau rollback:
  - Ghi postmortem: nguyên nhân, ảnh hưởng, hành động khắc phục.

## 5) Checklist sign-off

- [ ] Migration chạy xong không lỗi.
- [ ] Không mất bài/không đổi slug.
- [ ] 20 bài mẫu hiển thị đúng trên user UI.
- [ ] KPI vận hành ổn định sau 72h.
