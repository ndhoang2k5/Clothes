import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';

const BlogPage: React.FC = () => {
  const hashQuery = window.location.hash.split('?')[1] || '';
  const queryParams = useMemo(() => new URLSearchParams(hashQuery), [hashQuery]);
  const initialCategory = (queryParams.get('category') as Blog['category'] | null) || 'news';
  const initialQ = queryParams.get('q') || '';
  const [activeCategory, setActiveCategory] = useState<Blog['category']>(initialCategory);
  const [qParam, setQParam] = useState<string>(initialQ);
  const [searchText, setSearchText] = useState<string>(initialQ);

  const [posts, setPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const category = activeCategory === 'intro' || activeCategory === 'tips' ? 'news' : activeCategory;
        const data = await api.getBlogs(category as Blog['category'], 20, qParam);
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setPosts([]);
          setError('Không tải được bài viết');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const t = window.setTimeout(() => {
      void load();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [activeCategory, qParam]);

  const setTab = (next: Blog['category']) => {
    const params = new URLSearchParams();
    params.set('category', next);
    if (qParam && String(qParam).trim()) params.set('q', String(qParam).trim());
    window.location.hash = `#/blog?${params.toString()}`;
    setActiveCategory(next);
  };

  const submitSearch = (nextQ: string) => {
    const trimmed = nextQ.trim();
    setQParam(trimmed);
    const params = new URLSearchParams();
    params.set('category', activeCategory);
    if (trimmed) params.set('q', trimmed);
    window.location.hash = `#/blog?${params.toString()}`;
  };

  const clearSearch = () => submitSearch('');

  const quickChips = [
    'an toàn',
    'chất liệu',
    'chăm sóc',
    'quy trình',
  ];

  const groupLabel = activeCategory === 'news' ? 'News' : activeCategory === 'charity' ? 'Charity' : 'Blog';

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-8">
        <nav className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <a href="#/" className="hover:text-pink-500">
            Trang chủ
          </a>
          <span>/</span>
          <span className="text-gray-700 font-bold">Blog</span>
        </nav>

        <h1 className="text-4xl font-black text-gray-800 mb-4">Bài viết Blog cho ba mẹ</h1>

        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="text-gray-500 font-black">Tìm kiếm</div>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(searchText);
            }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Tìm theo tiêu đề, nội dung..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <button
              type="submit"
              className="bg-[#B58A5A] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#A3784E] transition-colors whitespace-nowrap"
            >
              Tìm
            </button>
            <button
              type="button"
              onClick={clearSearch}
              className="px-3 py-3 rounded-2xl bg-white border border-gray-100 text-gray-500 font-bold hover:bg-gray-50 whitespace-nowrap"
              aria-label="Xóa tìm kiếm"
            >
              Xóa
            </button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            {quickChips.map((c) => {
              const selected = qParam && qParam.toLowerCase() === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSearchText(c);
                    submitSearch(c);
                  }}
                  className={`px-3 py-1.5 rounded-full border text-xs font-black transition-all ${
                    selected ? 'bg-pink-50 border-pink-100 text-pink-700' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setTab('news')}
            className={`px-5 py-2 rounded-full font-black text-sm border transition-all ${
              activeCategory === 'news'
                ? 'bg-pink-50 text-pink-700 border-pink-100'
                : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
            }`}
          >
            News
          </button>
          <button
            type="button"
            onClick={() => setTab('charity')}
            className={`px-5 py-2 rounded-full font-black text-sm border transition-all ${
              activeCategory === 'charity'
                ? 'bg-pink-50 text-pink-700 border-pink-100'
                : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
            }`}
          >
            Charity
          </button>
        </div>

        <p className="text-gray-500 mt-3">Mỗi bài viết có nhiều ảnh và nhiều đoạn văn. Bạn có thể tìm theo nội dung.</p>
      </header>

      {loading ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-pink-500 rounded-full" />
            <div className="h-5 w-36 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="h-px bg-gray-100" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-4 animate-pulse">
                <div className="h-44 bg-gray-200 rounded-[1.5rem] mb-4" />
                <div className="h-4 bg-gray-200 rounded-xl w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded-xl w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded-xl w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center shadow-sm">
          <h2 className="text-2xl font-black text-gray-800 mb-2">Chưa có bài viết</h2>
          <p className="text-gray-500 mb-4">{error || 'Hiện chưa có bài viết ở chuyên mục này.'}</p>
          <a
            href="#/blog"
            className="inline-flex px-6 py-3 rounded-full bg-pink-500 text-white font-bold hover:bg-pink-600 transition-colors shadow-lg"
          >
            Quay lại Blog
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-7 bg-pink-500 rounded-full" />
              <h2 className="text-xl md:text-2xl font-black text-gray-900">{groupLabel}</h2>
              <span className="text-xs font-bold text-gray-400">
                {posts.length} bài
              </span>
            </div>
            <div className="h-px bg-gray-100 mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts[0] && (
              <button
                type="button"
                onClick={() => {
                  window.location.hash = `#/blog/post/${posts[0].id}`;
                }}
                className="md:col-span-2 text-left bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col cursor-pointer"
              >
                {posts[0].thumbnail && (
                  <div className="h-64 bg-gray-50 overflow-hidden">
                    <img src={posts[0].thumbnail} alt={posts[0].title} className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-black px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
                      {posts[0].category}
                    </span>
                    {posts[0].publishedAt && (
                      <span className="text-xs text-gray-400 font-bold">
                        {new Date(posts[0].publishedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>

                  <h2 className="text-2xl font-black text-gray-900 mb-3 line-clamp-2">{posts[0].title}</h2>
                  {posts[0].excerpt && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">{posts[0].excerpt}</p>
                  )}

                  <div className="mt-auto flex items-center gap-2 text-pink-500 font-black text-sm">
                    Đọc ngay
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </button>
            )}

            {posts.slice(1).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  window.location.hash = `#/blog/post/${p.id}`;
                }}
                className="text-left bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col cursor-pointer"
              >
                {p.thumbnail && (
                  <div className="h-44 bg-gray-50 overflow-hidden">
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-[11px] font-black px-3 py-1 rounded-full bg-white text-gray-500 border border-gray-100">
                      {p.category}
                    </span>
                    {p.publishedAt && (
                      <span className="text-xs text-gray-400 font-bold">
                        {new Date(p.publishedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-black text-gray-900 mb-2 line-clamp-2">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-gray-600 mb-4 line-clamp-3">{p.excerpt}</p>}
                  <div className="mt-auto text-xs text-pink-500 font-black">Đọc tiếp</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPage;

