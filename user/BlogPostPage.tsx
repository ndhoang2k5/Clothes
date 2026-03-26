import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';
import { parseBlogContent, parseBlogRenderMeta } from './utils/blogContent';
import type { BlogBlock } from './utils/blogContent';

type Props = {
  blogId: string;
};

const BlogPostPage: React.FC<Props> = ({ blogId }) => {
  const [post, setPost] = useState<Blog | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const relatedTrackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isRelatedHovered, setIsRelatedHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const b = await api.getBlogById(blogId);
        if (cancelled) return;
        setPost(b);
        if (!b) {
          setError('Bài viết không tồn tại hoặc chưa được xuất bản.');
          setRelatedPosts([]);
          return;
        }
        const related = await api.getBlogs(b.category, 8);
        if (cancelled) return;
        setRelatedPosts(related.filter((x) => String(x.id) !== String(b.id)).slice(0, 6));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Không tải được bài viết');
        setRelatedPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [blogId]);

  const blocks = useMemo(() => parseBlogContent(post?.content || ''), [post?.content]);
  const renderMeta = useMemo(() => parseBlogRenderMeta(post?.content || ''), [post?.content]);
  const titleAlignClass = 'text-center';
  const titleColorClass = renderMeta.titleColor === 'brown' ? 'text-[#8B6B4A]' : 'text-gray-900';

  useEffect(() => {
    const el = relatedTrackRef.current;
    if (!el) return;

    const updateButtons = () => {
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < maxScrollLeft - 4);
    };

    updateButtons();
    el.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    return () => {
      el.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, [relatedPosts.length]);

  const scrollRelated = (dir: 'left' | 'right') => {
    const el = relatedTrackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const amount = firstCard
      ? Math.max(260, firstCard.getBoundingClientRect().width + 20)
      : Math.max(280, Math.round(el.clientWidth * 0.86));
    el.scrollBy({
      left: dir === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (relatedPosts.length <= 1) return;
    if (isRelatedHovered) return;

    const id = window.setInterval(() => {
      const el = relatedTrackRef.current;
      if (!el) return;
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      const atEnd = el.scrollLeft >= maxScrollLeft - 6;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRelated('right');
      }
    }, 4500);

    return () => window.clearInterval(id);
  }, [relatedPosts.length, isRelatedHovered]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {loading ? (
        <div className="py-20 text-center text-gray-500 font-bold">Đang tải...</div>
      ) : error || !post ? (
        <div className="py-20 text-center">
          <div className="text-2xl font-black text-gray-800 mb-2">{error ? 'Không tìm thấy' : 'Lỗi'}</div>
          <div className="text-gray-500 mb-6">{error || 'Không thể tải bài viết.'}</div>
          <a href="#/blog" className="text-pink-500 font-bold hover:underline">
            Quay lại Blog
          </a>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-widest">
              {post.category}
              {post.publishedAt ? ` • ${new Date(post.publishedAt).toLocaleDateString('vi-VN')}` : ''}
            </div>
            <h1 className={`text-4xl font-black leading-tight mb-3 ${titleAlignClass} ${titleColorClass}`}>{post.title}</h1>
            {renderMeta.heroIntro && (
              <div className={`text-xs md:text-sm italic text-gray-500/95 font-medium leading-6 mb-5 ${titleAlignClass}`}>
                {renderMeta.heroIntro}
              </div>
            )}
            {post.thumbnail && (
              <div className="rounded-[2rem] overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                <img src={post.thumbnail} alt={post.title} className="w-full h-[360px] object-cover" />
              </div>
            )}
          </div>

          <div className="prose prose-pink max-w-none">
            {blocks.length === 0 ? (
              <div className="whitespace-pre-line">{post.content}</div>
            ) : (
              blocks.map((b: BlogBlock, idx: number) => {
                if (b.type === 'heading') {
                  if (b.level === 1) return <h1 key={`h-${idx}`} className="text-3xl font-black text-gray-900 mt-8 mb-4">{b.text}</h1>;
                  if (b.level === 2) return <h2 key={`h-${idx}`} className="text-2xl font-black text-gray-900 mt-8 mb-4">{b.text}</h2>;
                  return <h3 key={`h-${idx}`} className="text-xl font-black text-gray-900 mt-7 mb-3">{b.text}</h3>;
                }
                if (b.type === 'paragraph') {
                  return (
                    <p key={`p-${idx}`} className="whitespace-pre-line leading-8 text-gray-700 mb-5">
                      {b.text}
                    </p>
                  );
                }
                if (b.type === 'image') {
                  return (
                    <figure key={`img-${idx}`} className="my-7">
                      <img src={b.url} alt={b.alt || post.title} className="w-full rounded-[1.5rem] shadow-sm" />
                      {b.caption && <figcaption className="text-sm text-gray-500 mt-2 text-center">{b.caption}</figcaption>}
                    </figure>
                  );
                }
                if (b.type === 'media_text') {
                  const imageFirst = b.imagePosition !== 'right';
                  return (
                    <div key={`mt-${idx}`} className="my-7 grid md:grid-cols-2 gap-5 items-start">
                      {imageFirst && (
                        <div className="rounded-[1.5rem] overflow-hidden border border-gray-100 bg-gray-50">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.imageAlt || post.title} className="w-full h-full max-h-80 object-cover" />
                          ) : null}
                        </div>
                      )}
                      <div className="leading-8 text-gray-700 whitespace-pre-line">{b.text}</div>
                      {!imageFirst && (
                        <div className="rounded-[1.5rem] overflow-hidden border border-gray-100 bg-gray-50">
                          {b.imageUrl ? (
                            <img src={b.imageUrl} alt={b.imageAlt || post.title} className="w-full h-full max-h-80 object-cover" />
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                }
                if (b.type === 'quote') {
                  return (
                    <blockquote key={`q-${idx}`} className="my-7 border-l-4 border-pink-300 bg-pink-50/40 rounded-r-xl px-5 py-4">
                      <p className="text-gray-800 italic whitespace-pre-line mb-2">"{b.text}"</p>
                      {b.author && <div className="text-xs font-bold text-pink-700">— {b.author}</div>}
                    </blockquote>
                  );
                }
                if (b.type === 'list') {
                  return b.style === 'number' ? (
                    <ol key={`list-${idx}`} className="list-decimal pl-6 space-y-2 mb-6">
                      {b.items.map((it, i) => <li key={`li-${idx}-${i}`} className="text-gray-700">{it}</li>)}
                    </ol>
                  ) : (
                    <ul key={`list-${idx}`} className="list-disc pl-6 space-y-2 mb-6">
                      {b.items.map((it, i) => <li key={`li-${idx}-${i}`} className="text-gray-700">{it}</li>)}
                    </ul>
                  );
                }
                if (b.type === 'divider') {
                  return <div key={`div-${idx}`} className="my-8 h-px bg-gray-200" />;
                }
                if (b.type === 'spacer') {
                  return <div key={`sp-${idx}`} className={b.size === 'sm' ? 'h-4' : b.size === 'lg' ? 'h-12' : 'h-8'} />;
                }
                return null;
              })
            )}
          </div>

          {relatedPosts.length > 0 && (
            <section className="mt-14">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="text-3xl font-black text-gray-800">Các bài viết khác</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => scrollRelated('left')}
                    disabled={!canScrollLeft}
                    className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed"
                    aria-label="Xem bài trước"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollRelated('right')}
                    disabled={!canScrollRight}
                    className="w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-35 disabled:cursor-not-allowed"
                    aria-label="Xem bài tiếp theo"
                  >
                    →
                  </button>
                </div>
              </div>
              <div
                ref={relatedTrackRef}
                className="hide-scrollbar flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
                onMouseEnter={() => setIsRelatedHovered(true)}
                onMouseLeave={() => setIsRelatedHovered(false)}
              >
                {relatedPosts.map((rp) => {
                  const rpMeta = parseBlogRenderMeta(rp.content || '');
                  const introText = rpMeta.heroIntro || rp.excerpt || '';
                  return (
                    <button
                      key={rp.id}
                      type="button"
                      onClick={() => (window.location.hash = `#/blog/post/${rp.id}`)}
                      className="flex-none basis-[82%] sm:basis-[48%] lg:basis-[31%] snap-start text-left bg-white rounded-[1.75rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
                    >
                      <div className="h-44 bg-gray-50 overflow-hidden">
                        <img
                          src={rp.thumbnail || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800'}
                          alt={rp.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        {introText ? (
                          <div className="text-xs italic text-gray-500 font-medium line-clamp-2 mb-2">
                            {introText}
                          </div>
                        ) : null}
                        <div className="text-[1.35rem] leading-7 font-black text-gray-900 line-clamp-2">{rp.title}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default BlogPostPage;

