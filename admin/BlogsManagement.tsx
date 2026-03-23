import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';
import BlogBlockEditor from './components/BlogBlockEditor';

type TabKey = 'intro' | 'tips' | 'news' | 'charity';
type ListKey = Exclude<TabKey, 'intro'>;
type VisibilityFilter = 'all' | 'on' | 'off';

type StoryState = {
  id?: number;
  title: string;
  content: string;
  imageUrl: string;
};

type EditingState = Partial<Blog> | null;
type BlogKpi = {
  total_posts: number;
  visible_posts: number;
  hidden_posts: number;
  published_last_7_days: number;
  updated_last_7_days: number;
  avg_minutes_to_publish: number;
};

const DEFAULT_STORY: StoryState = {
  id: undefined,
  title: 'Câu chuyện thương hiệu Unbee',
  content:
    'Shop ra đời từ tình yêu vô bờ bến của ba mẹ dành cho bé yêu. Chúng tôi cam kết mang đến những sản phẩm an toàn nhất.',
  imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800',
};

const CATEGORY_LABEL: Record<ListKey, string> = {
  tips: 'Tips',
  news: 'News',
  charity: 'Charity',
};

function visibilityBadge(isPublished: boolean) {
  return isPublished
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-gray-100 text-gray-700 border-gray-200';
}

const BlogsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('intro');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [story, setStory] = useState<StoryState>(DEFAULT_STORY);
  const [postsByCategory, setPostsByCategory] = useState<Record<ListKey, Blog[]>>({
    tips: [],
    news: [],
    charity: [],
  });

  const [editingPostCategory, setEditingPostCategory] = useState<ListKey>('tips');
  const [editingPost, setEditingPost] = useState<EditingState>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [kpi, setKpi] = useState<BlogKpi | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [useBlockEditor, setUseBlockEditor] = useState(true);
  const [editorConfigLoading, setEditorConfigLoading] = useState(false);

  const upsert = (list: Blog[], saved: Blog) => {
    const idx = list.findIndex((x) => x.id === saved.id);
    if (idx === -1) return [saved, ...list];
    const next = [...list];
    next[idx] = saved;
    return next;
  };

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void load();
    }, 250);

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [introBlogs, tipsBlogs, newsBlogs, charityBlogs] = await Promise.all([
          api
            .adminListBlogs({ category: 'intro', q: searchText, author: authorFilter, date_from: dateFrom, date_to: dateTo })
            .catch(() => []),
          api
            .adminListBlogs({ category: 'tips', q: searchText, author: authorFilter, date_from: dateFrom, date_to: dateTo })
            .catch(() => []),
          api
            .adminListBlogs({ category: 'news', q: searchText, author: authorFilter, date_from: dateFrom, date_to: dateTo })
            .catch(() => []),
          api
            .adminListBlogs({ category: 'charity', q: searchText, author: authorFilter, date_from: dateFrom, date_to: dateTo })
            .catch(() => []),
        ]);

        if (cancelled) return;

        const intro = introBlogs?.[0];
        if (intro) {
          setStory({
            id: Number(intro.id),
            title: intro.title || '',
            content: intro.content || '',
            imageUrl: intro.thumbnail || '',
          });
        } else {
          setStory(DEFAULT_STORY);
        }

        setPostsByCategory({
          tips: tipsBlogs || [],
          news: newsBlogs || [],
          charity: charityBlogs || [],
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Không thể tải blog');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchText, authorFilter, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    const loadEditorConfig = async () => {
      setEditorConfigLoading(true);
      try {
        const cfg = await api.adminGetBlogEditorConfig();
        if (!cancelled) setUseBlockEditor(Boolean(cfg.enable_block_editor));
      } catch {
        if (!cancelled) setUseBlockEditor(true);
      } finally {
        if (!cancelled) setEditorConfigLoading(false);
      }
    };
    void loadEditorConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const upsertPostInState = (category: ListKey, saved: Blog) => {
    if (category === 'tips') {
      setPostsByCategory((prev) => ({ ...prev, tips: upsert(prev.tips, saved) }));
    } else if (category === 'news') {
      setPostsByCategory((prev) => ({ ...prev, news: upsert(prev.news, saved) }));
    } else {
      setPostsByCategory((prev) => ({ ...prev, charity: upsert(prev.charity, saved) }));
    }
  };

  const handleSaveStory = async () => {
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
      alert('Đã cập nhật câu chuyện Unbee');
    } catch (e: any) {
      setError(e?.message || 'Lưu câu chuyện thất bại');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadKpis = async () => {
      setKpiLoading(true);
      try {
        const value = await api.adminGetBlogKpis({
          category: (activeTab as Blog['category']) || 'all',
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        });
        if (!cancelled) setKpi(value);
      } catch {
        if (!cancelled) setKpi(null);
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    };
    void loadKpis();
    return () => {
      cancelled = true;
    };
  }, [activeTab, dateFrom, dateTo]);

  const openCreatePost = (category: ListKey) => {
    setEditingPostCategory(category);
    setEditingPost({
      id: undefined,
      title: '',
      content: '',
      thumbnail: '',
      author: '',
      category,
      isPublished: false,
    } as any);
  };

  const openEditPost = (category: ListKey, p: Blog) => {
    setEditingPostCategory(category);
    setEditingPost({
      ...p,
      isPublished: !!p.isPublished,
    });
  };

  const handleSavePost = async () => {
    if (!editingPost) return;
    if (!editingPost.title) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: editingPost.title,
        content: editingPost.content || '',
        thumbnail: editingPost.thumbnail || '',
        author: editingPost.author || '',
        category: editingPostCategory,
        is_published: Boolean((editingPost as any).isPublished),
      };

      let saved: Blog;
      if (editingPost.id) {
        saved = await api.adminUpdateBlog(Number(editingPost.id), payload);
      } else {
        saved = await api.adminCreateBlog(payload as any);
      }

      upsertPostInState(editingPostCategory, saved);
      setEditingPost(null);
    } catch (e: any) {
      setError(e?.message || 'Lưu bài viết thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = async (category: ListKey, id: string) => {
    if (!confirm('Xoá bài viết này?')) return;
    setSaving(true);
    setError(null);
    try {
      await api.adminDeleteBlog(Number(id));
      setPostsByCategory((prev) => ({
        ...prev,
        [category]: prev[category].filter((x) => x.id !== id),
      }));
    } catch (e: any) {
      setError(e?.message || 'Xoá bài viết thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickVisibilityChange = async (
    category: ListKey,
    post: Blog,
    nextPublished: boolean,
  ) => {
    if (!post.id) return;
    if (Boolean(post.isPublished) === nextPublished) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.adminUpdateBlog(Number(post.id), {
        is_published: nextPublished,
      });
      upsertPostInState(category, saved);
    } catch (e: any) {
      setError(e?.message || 'Cập nhật trạng thái hiển thị thất bại');
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ key: TabKey; label: string }> = useMemo(
    () => [
      { key: 'intro', label: 'Intro (Về Unbee)' },
      { key: 'tips', label: 'Tips' },
      { key: 'news', label: 'News' },
      { key: 'charity', label: 'Charity' },
    ],
    [],
  );

  const handleToggleEditorMode = async () => {
    const next = !useBlockEditor;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.adminUpdateBlogEditorConfig({ enable_block_editor: next });
      setUseBlockEditor(Boolean(saved.enable_block_editor));
    } catch (e: any) {
      setError(e?.message || 'Không thể cập nhật chế độ editor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-2xl font-black text-gray-800">Quản lý Blog & Câu chuyện</h2>
          <button
            type="button"
            onClick={() => void handleToggleEditorMode()}
            disabled={saving || editorConfigLoading}
            className={`px-4 py-2 rounded-xl text-xs font-black border ${
              useBlockEditor
                ? 'bg-pink-50 text-pink-700 border-pink-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            } disabled:opacity-60`}
          >
            {editorConfigLoading
              ? 'Đang tải cấu hình...'
              : useBlockEditor
              ? 'Editor mới: BẬT'
              : 'Editor mới: TẮT (classic)'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-2xl font-black text-xs border transition-all ${
                activeTab === t.key
                  ? 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-200'
                  : 'bg-white text-gray-700 border-gray-100 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 border border-red-200 rounded-2xl px-5 py-3 font-bold text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-500 font-bold">Đang tải...</div>
      ) : activeTab === 'intro' ? (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tiêu đề</label>
                <input
                  className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                  value={story.title}
                  onChange={(e) => setStory((s) => ({ ...s, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Nội dung (nhiều ảnh + nhiều đoạn)
                </label>
                {useBlockEditor ? (
                  <BlogBlockEditor
                    value={story.content}
                    onChange={(next) => setStory((s) => ({ ...s, content: next }))}
                  />
                ) : (
                  <textarea
                    className="w-full min-h-[260px] bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                    value={story.content}
                    onChange={(e) => setStory((s) => ({ ...s, content: e.target.value }))}
                    placeholder="Nhập nội dung bài viết..."
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Thumbnail (ảnh bìa)
              </label>
              <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 mb-4 border-2 border-dashed border-gray-200 flex items-center justify-center relative group">
                {story.imageUrl ? (
                  <img src={story.imageUrl} className="w-full h-full object-cover" alt="thumbnail" />
                ) : (
                  <div className="text-gray-300">Chưa có ảnh</div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">Thay đổi</span>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-pink-500"
                  value={story.imageUrl}
                  placeholder="Dán link ảnh vào đây..."
                  onChange={(e) => setStory((s) => ({ ...s, imageUrl: e.target.value }))}
                />

                <label className="block">
                  <span className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Upload ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSaving(true);
                      setError(null);
                      try {
                        const url = await api.adminUploadImage(file);
                        setStory((s) => ({ ...s, imageUrl: url }));
                      } catch (err: any) {
                        setError(err?.message || 'Upload ảnh thất bại');
                      } finally {
                        setSaving(false);
                        e.target.value = '';
                      }
                    }}
                    disabled={saving}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
            <button
              onClick={() => void handleSaveStory()}
              disabled={saving}
              className="bg-pink-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all hover:scale-105 disabled:opacity-60"
            >
              {saving ? 'Đang lưu...' : 'Cập nhật câu chuyện'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-6 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 font-black">Tổng bài</div>
              <div className="text-xl font-black text-gray-900">{kpiLoading ? '...' : (kpi?.total_posts ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-green-700 font-black">Đang mở</div>
              <div className="text-xl font-black text-green-800">{kpiLoading ? '...' : (kpi?.visible_posts ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-gray-600 font-black">Đang tắt</div>
              <div className="text-xl font-black text-gray-800">{kpiLoading ? '...' : (kpi?.hidden_posts ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-blue-700 font-black">Mở mới 7 ngày</div>
              <div className="text-xl font-black text-blue-800">{kpiLoading ? '...' : (kpi?.published_last_7_days ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-purple-700 font-black">Cập nhật 7 ngày</div>
              <div className="text-xl font-black text-purple-800">{kpiLoading ? '...' : (kpi?.updated_last_7_days ?? 0)}</div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3">
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-black">TB mở bài (phút)</div>
              <div className="text-xl font-black text-amber-800">
                {kpiLoading ? '...' : Math.round(kpi?.avg_minutes_to_publish ?? 0)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-gray-800">{CATEGORY_LABEL[activeTab as ListKey]}</h3>
              <p className="text-xs text-gray-500 mt-2">
                Tạo nhiều bài viết. Mỗi bài có nhiều ảnh + nhiều đoạn văn trong nội dung.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {([
                  { key: 'all', label: 'Tất cả' },
                  { key: 'on', label: 'Đang mở' },
                  { key: 'off', label: 'Đang tắt' },
                ] as const).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setVisibilityFilter(s.key)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-black border ${
                      visibilityFilter === s.key ? 'bg-pink-50 text-pink-700 border-pink-200' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Tìm theo tiêu đề / slug / nội dung..."
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                  placeholder="Lọc theo tác giả"
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-500"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => openCreatePost(activeTab as ListKey)}
              className="px-5 py-3 rounded-2xl bg-pink-500 text-white font-black text-xs hover:bg-pink-600 transition-colors shadow-lg shadow-pink-200"
              disabled={saving}
            >
              + Thêm bài viết
            </button>
          </div>

          {postsByCategory[activeTab as ListKey].length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-[2rem] p-10 text-center">
              <h4 className="text-xl font-black text-gray-800 mb-2">Chưa có bài viết</h4>
              <p className="text-gray-500 mb-6">Bạn có thể bắt đầu tạo bài News/Charity ngay tại nút “+ Thêm bài viết”.</p>
              <button
                type="button"
                onClick={() => openCreatePost(activeTab as ListKey)}
                className="bg-pink-500 text-white px-8 py-3 rounded-xl font-black hover:bg-pink-600 transition-colors disabled:opacity-60"
                disabled={saving}
              >
                Tạo bài viết
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {postsByCategory[activeTab as ListKey]
                .filter((p) => {
                  if (visibilityFilter === 'all') return true;
                  if (visibilityFilter === 'on') return Boolean(p.isPublished);
                  return !Boolean(p.isPublished);
                })
                .map((p) => (
                <div key={p.id} className="border border-gray-100 rounded-[2rem] overflow-hidden bg-white hover:shadow-sm transition-shadow">
                  {p.thumbnail ? (
                    <div className="h-40 bg-gray-50 overflow-hidden">
                      <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-40 bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                  <div className="p-4">
                    <div className="text-sm font-black text-gray-900 line-clamp-2 mb-2">{p.title}</div>
                    <div className="text-[11px] text-gray-400 mb-3">
                      {(p.publishedAt || p.createdAt) ? new Date(p.publishedAt || p.createdAt).toLocaleDateString('vi-VN') : ''}
                    </div>
                    <div className={`inline-flex px-2 py-1 rounded-full text-[10px] font-black border mb-3 ${visibilityBadge(Boolean(p.isPublished))}`}>
                      {Boolean(p.isPublished) ? 'Đang mở' : 'Đang tắt'}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => void handleQuickVisibilityChange(activeTab as ListKey, p, true)}
                        disabled={saving || Boolean(p.isPublished)}
                        className="px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[11px] font-black disabled:opacity-50"
                      >
                        Mở bài viết
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleQuickVisibilityChange(activeTab as ListKey, p, false)}
                        disabled={saving || !Boolean(p.isPublished)}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-700 text-[11px] font-black disabled:opacity-50"
                      >
                        Tắt bài viết
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditPost(activeTab as ListKey, p)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white border border-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-50"
                        disabled={saving}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePost(activeTab as ListKey, p.id)}
                        className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold hover:bg-red-100"
                        disabled={saving}
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
      )}

      {editingPost && activeTab !== 'intro' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-800">
                  {editingPost.id ? `Sửa bài viết (${CATEGORY_LABEL[editingPostCategory]})` : `Thêm bài viết (${CATEGORY_LABEL[editingPostCategory]})`}
                </h3>
                <div className="text-xs text-gray-500 mt-1">{editingPostCategory}</div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPost(null)}
                className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 font-black hover:bg-gray-200"
                disabled={saving}
              >
                ×
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl px-4 py-3 font-bold text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Tiêu đề</label>
                  <input
                    value={editingPost.title || ''}
                    onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Tác giả (tuỳ chọn)</label>
                  <input
                    value={editingPost.author || ''}
                    onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, author: e.target.value } : prev))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={saving}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean((editingPost as any).isPublished)}
                  onChange={(e) =>
                    setEditingPost((prev) => (prev ? ({ ...prev, isPublished: e.target.checked } as any) : prev))
                  }
                  className="accent-pink-500"
                  disabled={saving}
                />
                <div className="text-sm">
                  <div className="font-black text-gray-800">Mở bài viết cho người dùng</div>
                  <div className="text-xs text-gray-500">Bật để hiển thị ngoài website, tắt để ẩn bài viết.</div>
                </div>
              </label>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Thumbnail (ảnh bìa)</label>
                <input
                  value={editingPost.thumbnail || ''}
                  onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, thumbnail: e.target.value } : prev))}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Dán link ảnh hoặc upload bên dưới"
                  disabled={saving}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500">
                    Preview:
                  </div>
                  <div className="w-36 h-24 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    {editingPost.thumbnail ? (
                      <img src={editingPost.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                </div>
                <div className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-xs"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSaving(true);
                      setError(null);
                      try {
                        const url = await api.adminUploadImage(file);
                        setEditingPost((prev) => (prev ? { ...prev, thumbnail: url } : prev));
                      } catch (err: any) {
                        setError(err?.message || 'Upload thumbnail thất bại');
                      } finally {
                        setSaving(false);
                        e.target.value = '';
                      }
                    }}
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Nội dung (nhiều ảnh + nhiều đoạn)</label>
                {useBlockEditor ? (
                  <BlogBlockEditor
                    value={editingPost.content || ''}
                    onChange={(next) => setEditingPost((prev) => (prev ? { ...prev, content: next } : prev))}
                  />
                ) : (
                  <textarea
                    className="w-full min-h-[260px] bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                    value={editingPost.content || ''}
                    onChange={(e) => setEditingPost((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
                    placeholder="Nhập nội dung bài viết..."
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200"
                  disabled={saving}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={() => void handleSavePost()}
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-pink-500 text-white font-bold text-xs hover:bg-pink-600 disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : 'Lưu bài viết'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogsManagement;

