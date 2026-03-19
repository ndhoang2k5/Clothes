import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';
import { parseBlogContent } from './utils/blogContent';

const AboutPage: React.FC = () => {
  const categories = useMemo(() => ['intro', 'news', 'charity'] as Blog['category'][], []);
  const hashQuery = window.location.hash.split('?')[1] || '';
  const queryParams = useMemo(() => new URLSearchParams(hashQuery), [hashQuery]);
  const initialCategory = (queryParams.get('category') as Blog['category'] | null) || 'intro';
  const [activeCategory, setActiveCategory] = useState<Blog['category']>(categories.includes(initialCategory) ? initialCategory : 'intro');

  const [loading, setLoading] = useState(true);
  const [postsByCategory, setPostsByCategory] = useState<Record<string, Blog[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [introBlogs, newsBlogs, charityBlogs] = await Promise.all([
          api.getBlogs('intro', 5),
          api.getBlogs('news', 5),
          api.getBlogs('charity', 5),
        ]);
        if (cancelled) return;
        setPostsByCategory({
          intro: introBlogs,
          news: newsBlogs,
          charity: charityBlogs,
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Không tải được nội dung');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Ensure activeCategory is always valid when user navigates between hash query changes
    if (!categories.includes(activeCategory)) setActiveCategory('intro');
  }, [activeCategory, categories]);

  const posts = postsByCategory[activeCategory] || [];
  const mainPost = posts[0] || null;
  const blocks = useMemo(() => parseBlogContent(mainPost?.content || ''), [mainPost?.content]);

  if (loading && posts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-full" />
          <div className="grid md:grid-cols-2 gap-10 mt-4">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded-full w-3/4" />
              <div className="h-4 bg-gray-200 rounded-full w-5/6" />
              <div className="h-4 bg-gray-200 rounded-full w-2/3" />
            </div>
            <div className="h-64 md:h-80 bg-gray-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || posts.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-black mb-4">Về Unbee</h2>
        <p className="text-gray-500">{error || 'Nội dung giới thiệu đang được cập nhật. Vui lòng quay lại sau nhé.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">Về Unbee</h1>
        <p className="text-gray-500 max-w-2xl">
          Câu chuyện thương hiệu được chia theo nhiều chuyên mục: Intro, News và Charity.
        </p>

        <div className="flex items-center gap-3 flex-wrap mt-5">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                window.location.hash = `#/about?category=${encodeURIComponent(c)}`;
                setActiveCategory(c);
              }}
              className={`px-5 py-2 rounded-full font-black text-sm border transition-all ${
                activeCategory === c ? 'bg-pink-50 text-pink-700 border-pink-100' : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
              }`}
            >
              {c === 'intro' ? 'Intro' : c === 'news' ? 'News' : 'Charity'}
            </button>
          ))}
        </div>
      </div>

      {mainPost && (
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h2 className="text-4xl md:text-5xl font-black mb-6">{mainPost.title}</h2>
            <div className="prose prose-pink max-w-none text-gray-700 leading-relaxed">
              {blocks.length === 0 ? (
                <div className="whitespace-pre-line">{mainPost.content}</div>
              ) : (
                blocks.map((b, idx) => {
                  if (b.type === 'image') {
                    return (
                      <div key={`${b.url}-${idx}`} className="my-6">
                        <img src={b.url} alt={b.alt || mainPost.title} className="w-full rounded-[1.25rem]" />
                      </div>
                    );
                  }
                  return (
                    <p key={idx} className="whitespace-pre-line">
                      {b.text}
                    </p>
                  );
                })
              )}
            </div>
          </div>
          <div>
            <div className="rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
              <img
                src={mainPost.thumbnail || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800'}
                alt={mainPost.title}
                className="w-full h-full max-h-[420px] object-cover"
              />
            </div>
          </div>
        </div>
      )}

      {posts.length > 1 && (
        <div className="mt-12">
          <h3 className="text-2xl font-black text-gray-800 mb-6">Các bài khác</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {posts.slice(1, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => (window.location.hash = `#/blog/post/${p.id}`)}
                className="text-left bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all"
              >
                {p.thumbnail && (
                  <div className="h-36 bg-gray-50 overflow-hidden">
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="text-lg font-black text-gray-900 line-clamp-2">{p.title}</div>
                  {p.excerpt && <div className="text-sm text-gray-600 line-clamp-3 mt-2">{p.excerpt}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutPage;

