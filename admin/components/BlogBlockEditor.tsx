import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { BlogBlock } from '../../user/utils/blogContent';
import type { BlogRenderMeta } from '../../user/utils/blogContent';
import { composeBlogContent, parseBlogContent, parseBlogRenderMeta } from '../../user/utils/blogContent';

type Props = {
  value: string;
  onChange: (nextContent: string) => void;
};

const BlogBlockEditor: React.FC<Props> = ({ value, onChange }) => {
  const [blocks, setBlocks] = useState<BlogBlock[]>(() => parseBlogContent(value));
  const [meta, setMeta] = useState<BlogRenderMeta>(() => parseBlogRenderMeta(value));
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadIdxRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string>(value);

  // Sync blocks from outside changes (e.g. switching to another post),
  // but avoid overwriting while the user is typing (which can cause caret jumps).
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setBlocks(parseBlogContent(value));
      setMeta(parseBlogRenderMeta(value));
    }
  }, [value]);

  useEffect(() => {
    const nextValue = composeBlogContent(blocks, meta);
    if (nextValue !== value) {
      lastEmittedRef.current = nextValue;
      onChange(nextValue);
    }
  }, [blocks, meta, onChange, value]);

  const addBlock = (type: BlogBlock['type']) => {
    if (type === 'heading') setBlocks((prev) => [...prev, { type: 'heading', text: '', level: 2 }]);
    if (type === 'paragraph') setBlocks((prev) => [...prev, { type: 'paragraph', text: '' }]);
    if (type === 'image') setBlocks((prev) => [...prev, { type: 'image', url: '', alt: '', caption: '' }]);
    if (type === 'media_text') {
      setBlocks((prev) => [
        ...prev,
        { type: 'media_text', imageUrl: '', imageAlt: '', text: '', imagePosition: 'left' },
      ]);
    }
    if (type === 'quote') setBlocks((prev) => [...prev, { type: 'quote', text: '', author: '' }]);
    if (type === 'list') setBlocks((prev) => [...prev, { type: 'list', style: 'bullet', items: [''] }]);
    if (type === 'divider') setBlocks((prev) => [...prev, { type: 'divider' }]);
    if (type === 'spacer') setBlocks((prev) => [...prev, { type: 'spacer', size: 'md' }]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setBlocks((prev) => {
      const next = [...prev];
      const to = idx + dir;
      if (to < 0 || to >= next.length) return prev;
      const temp = next[idx];
      next[idx] = next[to];
      next[to] = temp;
      return next;
    });
  };

  const remove = (idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  };

  const requestUpload = (idx: number) => {
    pendingUploadIdxRef.current = idx;
    fileRef.current?.click();
  };

  const onFileSelected = async (file: File | null) => {
    const idx = pendingUploadIdxRef.current;
    pendingUploadIdxRef.current = null;
    if (idx == null || !file) return;

    try {
      setUploadingIdx(idx);
      const url = await api.adminUploadImage(file);
      setBlocks((prev) =>
        prev.map((b, i) => {
          if (i !== idx) return b;
          if (b.type === 'image') return { ...b, url };
          if (b.type === 'media_text') return { ...b, imageUrl: url };
          return b;
        }),
      );
    } catch {
      // Admin UI will surface errors via outer handler sometimes; keep silent here.
      // If you need error UI, we can wire it into a toast later.
    } finally {
      setUploadingIdx(null);
    }
  };

  const blockCount = blocks.length;
  const empty = blockCount === 0;

  const blockUI = useMemo(() => {
    return blocks.map((b, idx) => {
      const topBar = (
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-xs font-black text-gray-500 uppercase tracking-widest">
              {b.type === 'heading' && 'Tiêu đề'}
              {b.type === 'paragraph' && 'Đoạn văn'}
              {b.type === 'image' && 'Hình ảnh'}
              {b.type === 'media_text' && 'Ảnh + đoạn văn'}
              {b.type === 'quote' && 'Trích dẫn'}
              {b.type === 'list' && 'Danh sách'}
              {b.type === 'divider' && 'Đường phân cách'}
              {b.type === 'spacer' && 'Khoảng cách'}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-2 py-1 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
            >
              ↑
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 disabled:opacity-50"
              onClick={() => move(idx, 1)}
              disabled={idx === blockCount - 1}
            >
              ↓
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded-xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100"
              onClick={() => remove(idx)}
            >
              Xoá
            </button>
          </div>
        </div>
      );

      if (b.type === 'image') {
        const hasUrl = Boolean(b.url && String(b.url).trim());
        return (
          <div key={`img-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">URL</label>
                <input
                  value={b.url}
                  onChange={(e) => setBlocks((prev) => prev.map((it, i) => (i === idx && it.type === 'image' ? { ...it, url: e.target.value } : it)))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Dán link ảnh (png/jpg/webp...)"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Alt (tuỳ chọn)</label>
                <input
                  value={b.alt || ''}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'image' ? { ...it, alt: e.target.value } : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Mô tả ngắn ảnh"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Caption (tuỳ chọn)</label>
                <input
                  value={b.caption || ''}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'image' ? { ...it, caption: e.target.value } : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Mô tả hiển thị dưới ảnh"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors disabled:opacity-60"
                  onClick={() => requestUpload(idx)}
                  disabled={uploadingIdx === idx}
                >
                  {uploadingIdx === idx ? 'Đang up...' : 'Upload'}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 hover:bg-gray-200 disabled:opacity-60"
                  onClick={() => {
                    setBlocks((prev) =>
                      prev.map((it, i) => (i === idx && it.type === 'image' ? { ...it, url: '' } : it)),
                    );
                  }}
                  disabled={!hasUrl}
                >
                  Clear
                </button>
              </div>

              {hasUrl && (
                <div className="rounded-[1.25rem] overflow-hidden border border-gray-100 bg-gray-50">
                  <img src={b.url} alt={b.alt || ''} className="w-full max-h-64 object-cover" />
                </div>
              )}
            </div>
          </div>
        );
      }

      if (b.type === 'media_text') {
        const hasUrl = Boolean(b.imageUrl && String(b.imageUrl).trim());
        return (
          <div key={`mt-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-gray-500 mb-1">URL ảnh</label>
                  <input
                    value={b.imageUrl}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((it, i) => (i === idx && it.type === 'media_text' ? { ...it, imageUrl: e.target.value } : it)),
                      )
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Dán link ảnh"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 mb-1">Bố cục trái/phải</label>
                  <select
                    value={b.imagePosition}
                    onChange={(e) =>
                      setBlocks((prev) =>
                        prev.map((it, i) =>
                          i === idx && it.type === 'media_text'
                            ? { ...it, imagePosition: e.target.value === 'right' ? 'right' : 'left' }
                            : it,
                        ),
                      )
                    }
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="left">Ảnh trái • Đoạn văn phải</option>
                    <option value="right">Đoạn văn trái • Ảnh phải</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Alt ảnh (tuỳ chọn)</label>
                <input
                  value={b.imageAlt || ''}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'media_text' ? { ...it, imageAlt: e.target.value } : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Mô tả ảnh"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Đoạn văn đi kèm</label>
                <textarea
                  value={b.text}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'media_text' ? { ...it, text: e.target.value } : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 min-h-28"
                  placeholder="Nhập đoạn văn hiển thị cạnh ảnh..."
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors disabled:opacity-60"
                  onClick={() => requestUpload(idx)}
                  disabled={uploadingIdx === idx}
                >
                  {uploadingIdx === idx ? 'Đang up...' : 'Upload'}
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-fuchsia-50 text-fuchsia-700 text-xs font-bold border border-fuchsia-100 hover:bg-fuchsia-100"
                  onClick={() => {
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'media_text'
                          ? { ...it, imagePosition: it.imagePosition === 'left' ? 'right' : 'left' }
                          : it,
                      ),
                    );
                  }}
                >
                  Đảo trái/phải
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 hover:bg-gray-200 disabled:opacity-60"
                  onClick={() => {
                    setBlocks((prev) =>
                      prev.map((it, i) => (i === idx && it.type === 'media_text' ? { ...it, imageUrl: '' } : it)),
                    );
                  }}
                  disabled={!hasUrl}
                >
                  Clear
                </button>
              </div>
              {hasUrl && (
                <div className="rounded-[1.25rem] overflow-hidden border border-gray-100 bg-gray-50">
                  <img src={b.imageUrl} alt={b.imageAlt || ''} className="w-full max-h-64 object-cover" />
                </div>
              )}
            </div>
          </div>
        );
      }

      if (b.type === 'heading') {
        return (
          <div key={`h-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}
            <div className="grid md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Cấp heading</label>
                <select
                  value={b.level}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'heading'
                          ? { ...it, level: Number(e.target.value) as 1 | 2 | 3 }
                          : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value={1}>H1</option>
                  <option value={2}>H2</option>
                  <option value={3}>H3</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-black text-gray-500 mb-1">Nội dung</label>
                <input
                  value={b.text}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) => (i === idx && it.type === 'heading' ? { ...it, text: e.target.value } : it)),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Nhập tiêu đề..."
                />
              </div>
            </div>
          </div>
        );
      }

      if (b.type === 'quote') {
        return (
          <div key={`q-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Nội dung trích dẫn</label>
                <textarea
                  value={b.text}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) => (i === idx && it.type === 'quote' ? { ...it, text: e.target.value } : it)),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 min-h-28"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Tác giả (tuỳ chọn)</label>
                <input
                  value={b.author || ''}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) => (i === idx && it.type === 'quote' ? { ...it, author: e.target.value } : it)),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="VD: Unbee Team"
                />
              </div>
            </div>
          </div>
        );
      }

      if (b.type === 'list') {
        return (
          <div key={`list-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Kiểu danh sách</label>
                <select
                  value={b.style}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'list'
                          ? { ...it, style: e.target.value === 'number' ? 'number' : 'bullet' }
                          : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="bullet">Bullet</option>
                  <option value="number">Number</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1">Mỗi dòng là 1 item</label>
                <textarea
                  value={b.items.join('\n')}
                  onChange={(e) =>
                    setBlocks((prev) =>
                      prev.map((it, i) =>
                        i === idx && it.type === 'list'
                          ? { ...it, items: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) }
                          : it,
                      ),
                    )
                  }
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 min-h-28"
                  placeholder="Ưu điểm 1&#10;Ưu điểm 2&#10;Ưu điểm 3"
                />
              </div>
            </div>
          </div>
        );
      }

      if (b.type === 'spacer') {
        return (
          <div key={`spacer-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}
            <div>
              <label className="block text-xs font-black text-gray-500 mb-1">Kích thước</label>
              <select
                value={b.size}
                onChange={(e) =>
                  setBlocks((prev) =>
                    prev.map((it, i) =>
                      i === idx && it.type === 'spacer'
                        ? { ...it, size: e.target.value === 'sm' || e.target.value === 'lg' ? e.target.value : 'md' }
                        : it,
                    ),
                  )
                }
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="sm">Nhỏ</option>
                <option value="md">Vừa</option>
                <option value="lg">Lớn</option>
              </select>
            </div>
          </div>
        );
      }

      if (b.type === 'divider') {
        return (
          <div key={`divider-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            {topBar}
            <div className="py-3">
              <div className="h-px bg-gray-300" />
            </div>
          </div>
        );
      }

      return (
        <div key={`p-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
          {topBar}

          <textarea
            value={b.text}
            onChange={(e) =>
              setBlocks((prev) =>
                prev.map((it, i) => (i === idx && it.type === 'paragraph' ? { ...it, text: e.target.value } : it)),
              )
            }
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 min-h-32"
          />
        </div>
      );
    });
  }, [blocks, blockCount, move]);

  return (
    <div className="space-y-4">
      <div className="border border-gray-100 rounded-[1.5rem] p-4 bg-white space-y-3">
        <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Hiển thị tiêu đề bài viết</div>
        <div>
          <label className="block text-xs font-black text-gray-500 mb-1">Intro nhỏ (tuỳ chọn)</label>
          <input
            value={meta.heroIntro || ''}
            onChange={(e) => setMeta((prev) => ({ ...prev, heroIntro: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="VD: SẢN PHẨM MAY MẶC AN TOÀN"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-black text-gray-500 mb-1">Canh tiêu đề</label>
            <select
              value={meta.titleAlign || 'left'}
              onChange={(e) => setMeta((prev) => ({ ...prev, titleAlign: e.target.value === 'center' ? 'center' : 'left' }))}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="left">Trái</option>
              <option value="center">Giữa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 mb-1">Màu tiêu đề</label>
            <select
              value={meta.titleColor || 'default'}
              onChange={(e) => setMeta((prev) => ({ ...prev, titleColor: e.target.value === 'brown' ? 'brown' : 'default' }))}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="default">Mặc định</option>
              <option value="brown">Nâu</option>
            </select>
          </div>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          void onFileSelected(file);
          e.currentTarget.value = '';
        }}
      />

      {empty ? (
        <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
          Chưa có nội dung. Thêm <b>Đoạn văn</b> và/hoặc <b>Hình ảnh</b> để tạo bài viết.
        </div>
      ) : (
        <div className="space-y-4">{blockUI}</div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => addBlock('paragraph')}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
        >
          + Thêm đoạn văn
        </button>
        <button
          type="button"
          onClick={() => addBlock('heading')}
          className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          + Heading
        </button>
        <button
          type="button"
          onClick={() => addBlock('image')}
          className="px-4 py-2 rounded-xl bg-pink-50 text-pink-700 border border-pink-100 text-xs font-bold hover:bg-pink-100 transition-colors"
        >
          + Thêm hình ảnh
        </button>
        <button
          type="button"
          onClick={() => addBlock('media_text')}
          className="px-4 py-2 rounded-xl bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 text-xs font-bold hover:bg-fuchsia-100 transition-colors"
        >
          + Ảnh + đoạn văn
        </button>
        <button
          type="button"
          onClick={() => addBlock('quote')}
          className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 text-xs font-bold hover:bg-amber-100 transition-colors"
        >
          + Trích dẫn
        </button>
        <button
          type="button"
          onClick={() => addBlock('list')}
          className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-100 text-xs font-bold hover:bg-teal-100 transition-colors"
        >
          + Danh sách
        </button>
        <button
          type="button"
          onClick={() => addBlock('divider')}
          className="px-4 py-2 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold hover:bg-gray-100 transition-colors"
        >
          + Divider
        </button>
        <button
          type="button"
          onClick={() => addBlock('spacer')}
          className="px-4 py-2 rounded-xl bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold hover:bg-gray-100 transition-colors"
        >
          + Spacer
        </button>
        <div className="text-xs text-gray-500 font-bold">
          {blockCount} block
        </div>
      </div>
    </div>
  );
};

export default BlogBlockEditor;

