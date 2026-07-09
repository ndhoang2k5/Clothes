import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';
import { navigate } from '../App';
import { buildBlogPostPath, getSearchParams } from './utils/urls';
import {
  blogSectionPath,
  getBlogSectionLabel,
  normalizeBlogSectionSlug,
  type BlogSectionSlug,
} from './utils/blogCategories';

function readCategoryFromUrl(): BlogSectionSlug {
  return normalizeBlogSectionSlug(getSearchParams().get('category'));
}

const BlogPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<BlogSectionSlug>(readCategoryFromUrl);
  const [posts, setPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const syncFromUrl = () => {
      const next = readCategoryFromUrl();
      setActiveCategory(next);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getBlogs(activeCategory, 20);
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
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const sectionLabel = getBlogSectionLabel(activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-9">
      <header className="mb-8">
        <nav className="text-sm text-gray-400 mb-3 flex flex-wrap items-center gap-2">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="hover:text-pink-500">
            Trang chủ
          </a>
          <span>/</span>
          <a
            href={blogSectionPath('tin-tuc')}
            onClick={(e) => {
              e.preventDefault();
              navigate(blogSectionPath('tin-tuc'));
            }}
            className="hover:text-pink-500"
          >
            Blog
          </a>
          <span>/</span>
          <span className="text-gray-700 font-bold">{sectionLabel}</span>
        </nav>

        <h1 className="text-3xl font-black text-gray-800">{sectionLabel}</h1>
      </header>

      {loading ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-pink-500 rounded-full" />
            <div className="h-5 w-36 rounded-full skeleton" />
            <div className="h-3 w-16 rounded-full skeleton" />
          </div>
          <div className="h-px bg-gray-100" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-4">
                <div className="h-44 rounded-[1.5rem] mb-4 skeleton" />
                <div className="h-4 rounded-xl w-3/4 mb-2 skeleton" />
                <div className="h-4 rounded-xl w-full mb-2 skeleton" />
                <div className="h-4 rounded-xl w-2/3 skeleton" />
              </div>
            ))}
          </div>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center shadow-sm">
          <h2 className="text-2xl font-black text-gray-800 mb-2">Chưa có bài viết</h2>
          <p className="text-gray-500 mb-4">{error || `Hiện chưa có bài viết ở chuyên mục "${sectionLabel}".`}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-7 bg-pink-500 rounded-full" />
              <h2 className="text-xl md:text-2xl font-black text-gray-900">{sectionLabel}</h2>
              <span className="text-xs font-bold text-gray-400">{posts.length} bài</span>
            </div>
            <div className="h-px bg-gray-100 mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts[0] && (
              <button
                type="button"
                onClick={() => navigate(buildBlogPostPath(posts[0]))}
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
                      {sectionLabel}
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
                onClick={() => navigate(buildBlogPostPath(p))}
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
                      {sectionLabel}
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
