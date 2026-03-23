import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';
import { parseBlogContent, parseBlogRenderMeta } from './utils/blogContent';

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
  const renderMeta = useMemo(() => parseBlogRenderMeta(mainPost?.content || ''), [mainPost?.content]);
  const titleAlignClass = 'text-center';
  const titleColorClass = renderMeta.titleColor === 'brown' ? 'text-[#8B6B4A]' : 'text-gray-900';

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
        <div className="max-w-5xl">
          <h2 className={`text-4xl md:text-5xl font-black mb-3 ${titleAlignClass} ${titleColorClass}`}>{mainPost.title}</h2>
          {renderMeta.heroIntro && (
            <div className={`text-[11px] uppercase tracking-[0.14em] text-gray-500/90 font-semibold mb-5 ${titleAlignClass}`}>
              {renderMeta.heroIntro}
            </div>
          )}

          <figure className="md:float-right md:w-[52%] md:ml-10 md:mt-1 md:mb-8 md:translate-x-8 mb-6 rounded-[2.8rem] overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
            <img
              src={mainPost.thumbnail || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800'}
              alt={mainPost.title}
              className="w-full max-h-[620px] object-cover"
            />
          </figure>

          <div className="prose prose-pink max-w-none text-gray-700 leading-relaxed md:pr-1">
            {blocks.length === 0 ? (
              <div className="whitespace-pre-line">{mainPost.content}</div>
            ) : (
              blocks.map((b, idx) => {
                if (b.type === 'heading') {
                  if (b.level === 1) return <h1 key={`h-${idx}`} className="text-3xl font-black mt-6 mb-3">{b.text}</h1>;
                  if (b.level === 2) return <h2 key={`h-${idx}`} className="text-2xl font-black mt-6 mb-3">{b.text}</h2>;
                  return <h3 key={`h-${idx}`} className="text-xl font-black mt-5 mb-2">{b.text}</h3>;
                }
                if (b.type === 'image') {
                  return (
                    <div key={`${b.url}-${idx}`} className="my-6">
                      <img src={b.url} alt={b.alt || mainPost.title} className="w-full rounded-[1.25rem]" />
                      {b.caption && <div className="text-xs text-gray-500 mt-2 text-center">{b.caption}</div>}
                    </div>
                  );
                }
                if (b.type === 'media_text') {
                  const imageFirst = b.imagePosition !== 'right';
                  return (
                    <div key={`mt-${idx}`} className="my-6 grid md:grid-cols-2 gap-5 items-start">
                      {imageFirst && (
                        <div className="rounded-[1.25rem] overflow-hidden border border-gray-100 bg-gray-50">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.imageAlt || mainPost.title} className="w-full h-full max-h-72 object-cover" />
                          ) : null}
                        </div>
                      )}
                      <div className="whitespace-pre-line">{b.text}</div>
                      {!imageFirst && (
                        <div className="rounded-[1.25rem] overflow-hidden border border-gray-100 bg-gray-50">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.imageAlt || mainPost.title} className="w-full h-full max-h-72 object-cover" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                }
                if (b.type === 'quote') {
                  return (
                    <blockquote key={`q-${idx}`} className="my-5 border-l-4 border-pink-300 bg-pink-50/40 rounded-r-xl px-4 py-3">
                      <p className="italic">{b.text}</p>
                      {b.author && <div className="text-xs font-bold text-pink-700 mt-1">— {b.author}</div>}
                    </blockquote>
                  );
                }
                if (b.type === 'list') {
                  return b.style === 'number' ? (
                    <ol key={`list-${idx}`} className="list-decimal pl-6 space-y-1 my-4">
                      {b.items.map((it, i) => <li key={`li-${idx}-${i}`}>{it}</li>)}
                    </ol>
                  ) : (
                    <ul key={`list-${idx}`} className="list-disc pl-6 space-y-1 my-4">
                      {b.items.map((it, i) => <li key={`li-${idx}-${i}`}>{it}</li>)}
                    </ul>
                  );
                }
                if (b.type === 'divider') {
                  return <div key={`div-${idx}`} className="my-6 h-px bg-gray-200" />;
                }
                if (b.type === 'spacer') {
                  return <div key={`sp-${idx}`} className={b.size === 'sm' ? 'h-3' : b.size === 'lg' ? 'h-10' : 'h-6'} />;
                }
                return (
                  <p key={idx} className="whitespace-pre-line">
                    {b.text}
                  </p>
                );
              })
            )}
          </div>
          <div className="clear-both" />
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

