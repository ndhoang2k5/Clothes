import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';
import type { BlogBlock } from '../../user/utils/blogContent';
import { composeBlogContent, parseBlogContent } from '../../user/utils/blogContent';

type Props = {
  value: string;
  onChange: (nextContent: string) => void;
};

const BlogBlockEditor: React.FC<Props> = ({ value, onChange }) => {
  const [blocks, setBlocks] = useState<BlogBlock[]>(() => parseBlogContent(value));
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadIdxRef = useRef<number | null>(null);
  const lastEmittedRef = useRef<string>(value);

  // Sync blocks from outside changes (e.g. switching to another post),
  // but avoid overwriting while the user is typing (which can cause caret jumps).
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setBlocks(parseBlogContent(value));
    }
  }, [value]);

  useEffect(() => {
    const nextValue = composeBlogContent(blocks);
    if (nextValue !== value) {
      lastEmittedRef.current = nextValue;
      onChange(nextValue);
    }
  }, [blocks, onChange, value]);

  const addParagraph = () => setBlocks((prev) => [...prev, { type: 'paragraph', text: '' }]);
  const addImage = () => setBlocks((prev) => [...prev, { type: 'image', url: '', alt: '' }]);

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
          if (b.type !== 'image') return b;
          return { ...b, url };
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
      if (b.type === 'image') {
        const hasUrl = Boolean(b.url && String(b.url).trim());
        return (
          <div key={`img-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Hình ảnh</div>
                <div className="text-[11px] text-gray-400 mt-1">URL ảnh nên nằm trên 1 dòng.</div>
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

      // paragraph block
      return (
        <div key={`p-${idx}`} className="border border-gray-100 rounded-[1.5rem] p-4 bg-white">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="text-xs font-black text-gray-500 uppercase tracking-widest">Đoạn văn</div>
              <div className="text-[11px] text-gray-400 mt-1">Bạn có thể xuống dòng; khi lưu sẽ được gộp thành câu.</div>
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
          onClick={addParagraph}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-black transition-colors"
        >
          + Thêm đoạn văn
        </button>
        <button
          type="button"
          onClick={addImage}
          className="px-4 py-2 rounded-xl bg-pink-50 text-pink-700 border border-pink-100 text-xs font-bold hover:bg-pink-100 transition-colors"
        >
          + Thêm hình ảnh
        </button>
        <div className="text-xs text-gray-500 font-bold">
          {blockCount} block
        </div>
      </div>
    </div>
  );
};

export default BlogBlockEditor;

