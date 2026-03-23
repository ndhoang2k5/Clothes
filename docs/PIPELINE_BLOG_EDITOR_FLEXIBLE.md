# Pipeline phát triển Editor bài viết linh hoạt

Mục tiêu: nâng cấp trải nghiệm tạo/sửa bài viết để không còn gò bó định dạng, giúp team content thao tác nhanh, dễ preview, dễ mở rộng và an toàn dữ liệu.

Lưu ý: tài liệu này là kế hoạch triển khai, **chưa sửa code**.

---

## Phase 0 - Chốt phạm vi và tiêu chí thành công

### Mục tiêu
- Chốt rõ "linh hoạt" nghĩa là gì trong ngữ cảnh dự án.
- Thống nhất phạm vi MVP và các tính năng nâng cao.
- Tránh làm dàn trải dẫn tới editor phức tạp nhưng khó dùng.

### Công việc
- Xác định block tối thiểu cần có trong MVP:
  - `heading`, `paragraph`, `image`, `list`, `quote`, `divider`, `spacer`.
- Xác định block nâng cao cho v2/v3:
  - `gallery`, `cta`, `table`, `faq`, `related-posts`.
- Thống nhất vai trò vận hành:
  - content editor, reviewer, admin.
- Chốt checklist trải nghiệm:
  - tạo bài nhanh, sửa bố cục không vỡ nội dung, preview trước publish.

### Output
- 1 file scope ngắn (MVP / Non-MVP).
- 1 bộ acceptance criteria ban đầu.

---

## Phase 1 - Thiết kế mô hình dữ liệu nội dung (content model)

### Mục tiêu
- Chuyển từ text gộp sang mô hình block JSON dễ mở rộng.
- Vẫn tương thích bài cũ để rollout an toàn.

### Công việc
- Thiết kế schema tổng quát:
  - `post.meta`: title, slug, excerpt, category, tags, status, seo fields.
  - `post.blocks[]`: danh sách block theo thứ tự.
- Schema block mẫu:
  - `id`, `type`, `props`, `version`.
- Định nghĩa validation:
  - heading bắt buộc text.
  - image cần `url` hợp lệ.
  - paragraph không vượt ngưỡng tối đa (nếu cần).
- Xây chiến lược backward compatibility:
  - bài cũ render được như hiện tại.
  - có cơ chế convert text cũ -> blocks cho editor mới.
 
### Output
- Spec schema JSON.
- Quy tắc validation + mapping dữ liệu cũ.

---

## Phase 2 - Thiết kế UX/UI editor mới

### Mục tiêu
- Tạo trải nghiệm chỉnh sửa trực quan, giảm thao tác kỹ thuật cho content team.

### Công việc
- Thiết kế layout editor 3 vùng:
  - trái: block library.
  - giữa: canvas nội dung.
  - phải: thuộc tính block + SEO + publish settings.
- Tối ưu thao tác:
  - drag/drop, duplicate, delete, move up/down.
  - undo/redo.
  - autosave trạng thái draft.
- Thiết kế preview:
  - desktop/tablet/mobile.
  - preview giống giao diện user thực tế.

### Output
- Wireframe + flow thao tác chính:
  - tạo bài mới.
  - sửa bài cũ.
  - preview/publish.

---

## Phase 3 - Lộ trình tính năng theo phiên bản

### Mục tiêu
- Ra được bản usable sớm, sau đó mở rộng dần.

### v1 (MVP)
- Block cơ bản:
  - heading, paragraph rich text, image đơn, list, quote, divider.
- Quản lý bài:
  - draft/published.
- Preview:
  - trước khi publish.

### v2
- Nâng cấp block:
  - gallery, CTA, table/faq nâng cao.
- Nâng cấp quản lý:
  - schedule publish.
  - duplicate bài.
 
### v3
- Nâng cao năng suất:
  - template theo category (tips/news/charity/intro).
  - reusable sections.
  - version history cơ bản.

### Output
- Roadmap theo sprint với danh sách tính năng ưu tiên.

---

## Phase 4 - Workflow nội dung và phân quyền

### Mục tiêu
- Chuẩn hóa quy trình nội dung để giảm lỗi publish.

### Công việc
- Chuẩn hóa trạng thái bài:
  - `draft -> review -> scheduled -> published`.
- Quyền thao tác:
  - editor: tạo/sửa draft.
  - reviewer: duyệt.
  - admin: publish/rollback.
- Bổ sung danh sách lọc mạnh:
  - theo category, status, author, date, tag.

### Output
- Tài liệu workflow publish.
- Matrix phân quyền rõ ràng.

---

## Phase 5 - Migration dữ liệu và rollout an toàn

### Mục tiêu
- Nâng cấp không gây mất dữ liệu và không làm gián đoạn vận hành.

### Công việc
- Lập quy trình migrate:
  1. đọc bài cũ.
  2. convert sang block JSON.
  3. review ngẫu nhiên các bài quan trọng.
- Cơ chế fallback:
  - parse block lỗi thì render content cũ.
- Rollout theo feature flag:
  - bật editor mới cho nhóm nhỏ trước.
  - mở rộng toàn bộ sau khi ổn định.

### Output
- Runbook migrate + rollback.

---

## Phase 6 - Test, QA và đo lường hiệu quả

### Mục tiêu
- Đảm bảo chất lượng editor và đo được giá trị sau nâng cấp.

### Công việc
- Test checklist:
  - tạo/sửa/xóa/reorder block.
  - preview khớp user UI.
  - không flicker/caret jump.
  - responsive mobile.
- Regression:
  - bài cũ không vỡ layout.
  - publish flow không lỗi.
- KPI theo dõi sau rollout:
  - thời gian tạo bài trung bình.
  - số lần sửa định dạng thủ công.
  - tỷ lệ lỗi publish.

### Output
- Test matrix.
- Dashboard KPI theo dõi sau triển khai.

---

## Thứ tự triển khai đề xuất

1. Phase 0-1: chốt scope + schema dữ liệu.
2. Phase 2: chốt UX/UI editor.
3. Phase 3 (v1): triển khai MVP.
4. Phase 4: workflow + phân quyền.
5. Phase 5: migration + rollout.
6. Phase 6: QA + tối ưu theo KPI.

---

## Ghi chú vận hành

- Ưu tiên thiết kế "mở rộng được" hơn là thêm nhiều block ngay từ đầu.
- Giữ tương thích bài cũ là bắt buộc để tránh downtime nội dung.
- Mỗi phase nên có demo nội bộ trước khi merge.
 