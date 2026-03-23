# Test matrix Blog Editor (Phase 6)

## A. Functional test

- [ ] Tạo bài mới với đủ block cơ bản: heading, paragraph, image, list, quote, divider, spacer.
- [ ] Sửa bài hiện có và lưu thành công.
- [ ] Xóa block bất kỳ không làm hỏng block khác.
- [ ] Reorder block (move up/down) đúng thứ tự render.
- [ ] Upload ảnh vào block image thành công.
- [ ] Bật/tắt hiển thị bài viết hoạt động đúng.

## B. Regression test

- [ ] Bài cũ (legacy text) vẫn render đúng trên user page.
- [ ] Intro page vẫn lấy đúng nội dung category `intro`.
- [ ] Excerpt blog list không lộ raw JSON.
- [ ] Tìm kiếm blog trong admin (tiêu đề/slug/nội dung) hoạt động.
- [ ] Filter theo tác giả + ngày không lỗi.

## C. UX quality

- [ ] Không flicker khi gõ liên tục trong editor.
- [ ] Không bị jump caret khi chỉnh đoạn văn dài.
- [ ] Form lưu bài phản hồi trạng thái rõ (loading/success/error).
- [ ] Nút thao tác nhanh trên card hoạt động đúng và disable hợp lý.

## D. Responsive check

- [ ] Admin Blog page dùng được ở 1280px.
- [ ] Admin Blog page dùng được ở 1024px.
- [ ] User Blog post hiển thị ổn trên mobile (375px).

## E. KPI theo dõi sau rollout

- `total_posts`: tổng số bài trong phạm vi lọc.
- `visible_posts`: số bài đang mở.
- `hidden_posts`: số bài đang tắt.
- `published_last_7_days`: số bài mở mới trong 7 ngày.
- `updated_last_7_days`: số bài cập nhật trong 7 ngày.
- `avg_minutes_to_publish`: thời gian trung bình từ tạo tới mở bài.

## F. Exit criteria

- [ ] Không có lỗi blocker trong checklist A/B.
- [ ] Không có regression nghiêm trọng ở user-facing pages.
- [ ] KPI baseline thu thập được sau 3 ngày rollout.
