
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';

const IntroManagement: React.FC = () => {
  const [story, setStory] = useState<{ id?: number; title: string; content: string; imageUrl: string }>({
    id: undefined,
    title: '',
    content: '',
    imageUrl: '',
  });
  const [tips, setTips] = useState<Blog[]>([]);
  const [editingTip, setEditingTip] = useState<Partial<Blog> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [introBlogs, tipBlogs] = await Promise.all([
          api.adminListBlogs({ category: 'intro' }).catch(() => []),
          api.adminListBlogs({ category: 'tips' }).catch(() => []),
        ]);
        const intro = introBlogs[0];
        if (intro) {
          setStory({
            id: Number(intro.id),
            title: intro.title,
            content: intro.content,
            imageUrl: intro.thumbnail,
          });
        } else {
          setStory({
            id: undefined,
            title: 'Câu chuyện thương hiệu Unbee',
            content:
              'Shop ra đời từ tình yêu vô bờ bến của ba mẹ dành cho bé yêu. Chúng tôi cam kết mang đến những sản phẩm an toàn nhất.',
            imageUrl:
              'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
          });
        }
        setTips(tipBlogs);
      } catch (e: any) {
        setError(e?.message || 'Không thể tải nội dung giới thiệu');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSaveIntro = async () => {
    setSaving(true);
    setError(null);
    try {
      if (story.id) {
        await api.adminUpdateBlog(story.id, {
          title: story.title,
          content: story.content,
          thumbnail: story.imageUrl,
          category: 'intro',
          is_published: true,
        });
      } else {
        const created = await api.adminCreateBlog({
          title: story.title,
          content: story.content,
          thumbnail: story.imageUrl,
          category: 'intro',
          is_published: true,
        });
        setStory((s) => ({ ...s, id: Number(created.id) }));
      }
      alert('Đã cập nhật câu chuyện thương hiệu!');
    } catch (e: any) {
      setError(e?.message || 'Lưu câu chuyện thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-black text-gray-800 mb-8">Nội dung trang Giới thiệu</h2>
      
      {error && <div className="mb-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl px-5 py-3 font-bold text-sm">{error}</div>}

      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-10 shadow-sm">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tiêu đề chính</label>
              <input 
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                value={story.title}
                onChange={e => setStory({...story, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nội dung câu chuyện</label>
              <textarea 
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500 h-64 resize-none"
                value={story.content}
                onChange={e => setStory({...story, content: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ảnh minh họa (Story Image)</label>
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 mb-4 border-2 border-dashed border-gray-200 flex items-center justify-center relative group">
              {story.imageUrl ? (
                <img src={story.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-300">Chưa có ảnh</div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button className="bg-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">Thay đổi ảnh</button>
              </div>
            </div>
            <input 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-pink-500"
              value={story.imageUrl}
              placeholder="Dán link ảnh vào đây..."
              onChange={e => setStory({...story, imageUrl: e.target.value})}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex justify-end">
          <button 
            onClick={() => void handleSaveIntro()}
            disabled={saving}
            className="bg-pink-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all hover:scale-105 disabled:opacity-60"
          >
            {saving ? 'Đang lưu...' : 'Cập nhật nội dung'}
          </button>
        </div>

        {/* Tips section */}
        <div className="pt-10 border-t border-gray-50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-800">Mẹo nhỏ cho mẹ - Vui khỏe cho bé</h3>
              <p className="text-xs text-gray-500 mt-1">
                Quản lý các bài viết mẹo nhỏ (category = tips) hiển thị ở cuối trang chủ.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingTip({
                  title: '',
                  content: '',
                  thumbnail: '',
                  author: '',
                  category: 'tips',
                } as Blog)
              }
              className="px-4 py-2 rounded-2xl bg-pink-500 text-white font-black text-sm hover:bg-pink-600"
            >
              + Thêm bài viết
            </button>
          </div>

          {tips.length === 0 ? (
            <p className="text-sm text-gray-500">Chưa có bài viết mẹo nhỏ nào.</p>
          ) : (
            <div className="space-y-3">
              {tips.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all"
                >
                  <img
                    src={t.thumbnail || 'https://picsum.photos/120/80?baby-tip'}
                    className="w-20 h-16 rounded-xl object-cover bg-gray-100"
                    alt=""
                  />
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-black text-gray-800 truncate">{t.title}</h4>
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded-full ${
                          t.category === 'tips' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {t.category === 'tips' ? 'Tips' : t.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1 truncate">
                      {t.author ? `Tác giả: ${t.author}` : 'Không ghi tác giả'} ·{' '}
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString('vi-VN') : ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-full ${
                        (t as any).is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {(t as any).is_published ? 'ĐÃ HIỂN THỊ' : 'CHƯA HIỂN THỊ'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTip(t)}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-100"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm('Xoá bài viết này?')) return;
                          setSaving(true);
                          setError(null);
                          try {
                            await api.adminDeleteBlog(Number(t.id));
                            setTips((prev) => prev.filter((x) => x.id !== t.id));
                          } catch (e: any) {
                            setError(e?.message || 'Xoá bài viết thất bại');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-red-50 border border-red-100 text-red-500 hover:bg-red-100"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editingTip && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-800">
                  {editingTip.id ? 'Sửa bài viết mẹo nhỏ' : 'Thêm bài viết mẹo nhỏ'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingTip(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-black"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Tiêu đề</label>
                  <input
                    className="w-full bg-gray-50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-pink-500"
                    value={editingTip.title || ''}
                    onChange={(e) => setEditingTip({ ...editingTip, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Ảnh thumbnail</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-gray-50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-pink-500 text-xs"
                      placeholder="Dán link ảnh hoặc dùng nút Upload"
                      value={editingTip.thumbnail || ''}
                      onChange={(e) => setEditingTip({ ...editingTip, thumbnail: e.target.value })}
                    />
                    <label
                      className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black cursor-pointer hover:bg-gray-800"
                    >
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setSaving(true);
                          setError(null);
                          try {
                            const url = await api.adminUploadImage(file);
                            setEditingTip((prev) => (prev ? { ...prev, thumbnail: url } : prev));
                          } catch (err: any) {
                            setError(err?.message || 'Upload ảnh thất bại');
                          } finally {
                            setSaving(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-1">Nội dung</label>
                  <textarea
                    className="w-full bg-gray-50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-pink-500 h-32"
                    value={editingTip.content || ''}
                    onChange={(e) => setEditingTip({ ...editingTip, content: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <input
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-pink-500 text-xs mr-3"
                    placeholder="Tác giả (tuỳ chọn)"
                    value={editingTip.author || ''}
                    onChange={(e) => setEditingTip({ ...editingTip, author: e.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={Boolean((editingTip as any).is_published ?? true)}
                      onChange={(e) => setEditingTip({ ...editingTip, is_published: e.target.checked } as any)}
                      className="w-4 h-4 accent-pink-500"
                    />
                    Hiển thị trên trang chủ
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTip(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    if (!editingTip?.title) return;
                    setSaving(true);
                    setError(null);
                    try {
                      let saved: Blog;
                      if (editingTip.id) {
                        saved = await api.adminUpdateBlog(Number(editingTip.id), {
                          title: editingTip.title,
                          content: editingTip.content || '',
                          thumbnail: editingTip.thumbnail || '',
                          author: editingTip.author || '',
                          category: 'tips',
                          is_published: (editingTip as any).is_published ?? true,
                        });
                      } else {
                        saved = await api.adminCreateBlog({
                          title: editingTip.title,
                          content: editingTip.content || '',
                          thumbnail: editingTip.thumbnail || '',
                          author: editingTip.author || '',
                          category: 'tips',
                          is_published: (editingTip as any).is_published ?? true,
                        });
                      }
                      setTips((prev) => {
                        const existingIdx = prev.findIndex((b) => b.id === saved.id);
                        if (existingIdx !== -1) {
                          const copy = [...prev];
                          copy[existingIdx] = saved;
                          return copy;
                        }
                        return [saved, ...prev];
                      });
                      setEditingTip(null);
                    } catch (e: any) {
                      setError(e?.message || 'Lưu bài viết thất bại');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  className="px-6 py-2 rounded-xl bg-pink-500 text-white text-xs font-black hover:bg-pink-600 disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu bài viết'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntroManagement;
