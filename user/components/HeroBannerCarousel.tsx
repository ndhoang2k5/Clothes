import React, { useEffect, useRef } from 'react';
import type { AdminBanner } from '../../types';

export function HeroBannerCarousel(props: {
  banners: AdminBanner[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  heightClassName?: string;
}) {
  const { banners, index, setIndex, heightClassName } = props;
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [banners.length, setIndex]);

  return (
    <section
      className={`relative ${heightClassName ?? 'h-[400px] md:h-[600px]'} bg-[#F8F3EC] overflow-hidden touch-pan-y`}
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (banners.length <= 1) return;
        const startX = touchStartXRef.current;
        const endX = e.changedTouches[0]?.clientX ?? null;
        touchStartXRef.current = null;
        if (startX == null || endX == null) return;
        const delta = endX - startX;
        if (Math.abs(delta) < 45) return;
        if (delta < 0) {
          setIndex((i) => (i + 1) % banners.length);
        } else {
          setIndex((i) => (i <= 0 ? banners.length - 1 : i - 1));
        }
      }}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{
          width: `${banners.length * 100}%`,
          transform: `translateX(-${index * (100 / banners.length)}%)`,
        }}
      >
        {banners.map((slide, i) => (
          <div
            key={slide.id ?? i}
            className="flex-shrink-0 h-full relative"
            style={{ width: `${100 / banners.length}%` }}
          >
            <picture className="absolute inset-0 block">
              <source
                media="(max-width: 767px)"
                srcSet={slide.mobile_image_url || slide.image_url}
              />
              <img
                src={slide.image_url}
                alt={slide.title || 'Unbee'}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding={i === 0 ? 'sync' : 'async'}
                fetchPriority={i === index ? 'high' : 'low'}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </picture>
            {/* Intentionally no overlay: show banner image as-is */}
          </div>
        ))}
      </div>
    </section>
  );
}

