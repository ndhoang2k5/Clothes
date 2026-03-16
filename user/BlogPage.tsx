import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getTips(20);
        if (!cancelled) setPosts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-10">
        <nav className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <a href="#/" className="hover:text-pink-500">
            Trang chủ
          </a>
          <span>/</span>
          <span className="text-gray-700 font-bold">Blog</span>
        </nav>
        <h1 className="text-4xl font-black text-gray-800 mb-2">Blog & Tips cho ba mẹ</h1>
        <p className="text-gray-500 max-w-2xl">
          Những bài viết chọn lọc về chăm sóc bé, lựa chọn quần áo, giặt giũ và mẹo nhỏ hàng ngày.
        </p>
      </header>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl border border-gray-100 p-5 animate-pulse">
              <div className="h-40 bg-gray-200 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-200 rounded-xl w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded-xl w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded-xl w-2/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 p-12 text-center shadow-sm">
          <h2 className="text-2xl font-black text-gray-800 mb-2">Chưa có bài viết</h2>
          <p className="text-gray-500 mb-4">
            Hiện tại chưa có bài Blog nào được đăng. Vui lòng quay lại sau nhé!
          </p>
          <a
            href="#/products"
            className="inline-flex px-6 py-3 rounded-full bg-pink-500 text-white font-bold hover:bg-pink-600 transition-colors shadow-lg"
          >
            Xem sản phẩm
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {posts.map((p) => (
            <article
              key={p.id}
              className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col"
            >
              {p.image && (
                <div className="h-40 bg-gray-50 overflow-hidden">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 flex flex-col flex-grow">
                <h2 className="text-lg font-black text-gray-900 mb-2 line-clamp-2">{p.title}</h2>
                {p.excerpt && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{p.excerpt}</p>
                )}
                <div className="mt-auto text-xs text-gray-400 flex items-center justify-between pt-2 border-t border-gray-100">
                  <span>{p.category || 'Tips'}</span>
                  {p.publishedAt && (
                    <span>{new Date(p.publishedAt).toLocaleDateString('vi-VN')}</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogPage;

