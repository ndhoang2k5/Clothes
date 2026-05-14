import React from 'react';
import type { AdminBanner } from '../../types';

export function CategoryFeatureBanners(props: {
  banners: AdminBanner[];
  onNavigate: (href: string) => void;
}) {
  const { banners, onNavigate } = props;

  if (banners.length <= 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 pb-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-2xl font-black text-gray-800">Danh mục nổi bật</h3>
          <p className="text-gray-500">Bấm vào để xem nhanh theo chủ đề</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {banners.slice(0, 6).map((b) => (
          <a
            key={b.id}
            href={b.link_url || '/products'}
            onClick={(e) => {
              const href = b.link_url || '/products';
              if (href.startsWith('http://') || href.startsWith('https://')) return;
              e.preventDefault();
              onNavigate(href);
            }}
            className="group bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden hover:shadow-xl transition-all"
          >
            <div className="h-44 bg-gray-50 overflow-hidden">
              <img
                src={b.image_url}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-5">
              <div className="font-black text-gray-900 text-lg">
                {b.title || 'Xem ngay'}
              </div>
              {b.subtitle && (
                <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {b.subtitle}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

