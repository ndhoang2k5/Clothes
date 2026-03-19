import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';
import { parseBlogContent } from './utils/blogContent';
import type { BlogBlock } from './utils/blogContent';

type Props = {
  blogId: string;
};

const BlogPostPage: React.FC<Props> = ({ blogId }) => {
  const [post, setPost] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const b = await api.getBlogById(blogId);
        if (cancelled) return;
        setPost(b);
        if (!b) setError('Bài viết không tồn tại hoặc chưa được xuất bản.');
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Không tải được bài viết');
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

  const { orderedImages, orderedParagraphs, layoutFallback } = useMemo(() => {
    const images = blocks.filter((b: BlogBlock): b is Extract<BlogBlock, { type: 'image' }> => b.type === 'image');
    const paragraphs = blocks.filter((b: BlogBlock): b is Extract<BlogBlock, { type: 'paragraph' }> => b.type === 'paragraph');

    // If the content doesn't contain enough blocks to apply the layout rules,
    // fallback to a simple sequential render.
    if (images.length === 0 || paragraphs.length === 0) {
      return { orderedImages: images, orderedParagraphs: paragraphs, layoutFallback: true };
    }
    return { orderedImages: images, orderedParagraphs: paragraphs, layoutFallback: false };
  }, [blocks]);

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
            <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4">{post.title}</h1>
            {post.thumbnail && (
              <div className="rounded-[2rem] overflow-hidden bg-gray-100 shadow-sm border border-gray-100">
                <img src={post.thumbnail} alt={post.title} className="w-full h-[360px] object-cover" />
              </div>
            )}
          </div>

          <div className="prose prose-pink max-w-none">
            {blocks.length === 0 ? (
              <div className="whitespace-pre-line">{post.content}</div>
            ) : layoutFallback ? (
              // Fallback: render sequentially (original order) if we can't apply the paired layout safely.
              blocks.map((b, idx) => {
                if (b.type === 'image') {
                  return (
                    <div key={`seq-img-${idx}`} className="my-6">
                      <img src={b.url} alt={b.alt || post.title} className="w-full rounded-[1.5rem] shadow-sm" />
                    </div>
                  );
                }
                return (
                  <p key={`seq-p-${idx}`} className="whitespace-pre-line">
                    {b.text}
                  </p>
                );
              })
            ) : (
              <>
                {/* Rule: first image + first paragraph are always single blocks, rendered in this order */}
                {orderedImages[0] && (
                  <div className="my-6">
                    <img
                      src={orderedImages[0].url}
                      alt={orderedImages[0].alt || post.title}
                      className="w-full rounded-[1.5rem] shadow-sm"
                    />
                  </div>
                )}
                {orderedParagraphs[0] && (
                  <p className="whitespace-pre-line mb-6">{orderedParagraphs[0].text}</p>
                )}

                {/* From 2nd image/paragraph onwards: alternating left-right (pair 2 => image left, pair 3 => image right) */}
                {Array.from({
                  length: Math.min(orderedImages.length, orderedParagraphs.length) - 1,
                }).map((_, pairIdx0) => {
                  const pairIdx = pairIdx0 + 2; // 2nd pair => index 2
                  const img = orderedImages[pairIdx - 1]; // images[1] for pair 2
                  const txt = orderedParagraphs[pairIdx - 1];
                  if (!img || !txt) return null;

                  const imageOnLeft = pairIdx % 2 === 0; // pair 2 => left, pair 3 => right
                  return (
                    <div key={`pair-${pairIdx}`} className="my-8">
                      <div className="grid md:grid-cols-2 gap-8 items-center">
                        {imageOnLeft ? (
                          <>
                            <div>
                              <img
                                src={img.url}
                                alt={img.alt || post.title}
                                className="w-full rounded-[1.5rem] shadow-sm"
                              />
                            </div>
                            <div>
                              <p className="whitespace-pre-line">{txt.text}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <p className="whitespace-pre-line">{txt.text}</p>
                            </div>
                            <div>
                              <img
                                src={img.url}
                                alt={img.alt || post.title}
                                className="w-full rounded-[1.5rem] shadow-sm"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Render leftovers (if there are more paragraphs/images than the paired ones) */}
                {orderedParagraphs.length > orderedImages.length &&
                  orderedParagraphs
                    .slice(orderedImages.length)
                    .map((p, idx) => <p key={`leftover-p-${idx}`} className="whitespace-pre-line mb-6">{p.text}</p>)}
                {orderedImages.length > orderedParagraphs.length &&
                  orderedImages
                    .slice(orderedParagraphs.length)
                    .map((im, idx) => (
                      <div key={`leftover-img-${idx}`} className="my-6">
                        <img
                          src={im.url}
                          alt={im.alt || post.title}
                          className="w-full rounded-[1.5rem] shadow-sm"
                        />
                      </div>
                    ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BlogPostPage;

