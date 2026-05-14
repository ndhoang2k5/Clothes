import React, { useEffect } from 'react';
import type { AdminBanner } from '../../types';

const BACKEND_PORT = 8888;
const PROMO_PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect fill="%23fce7f3" width="800" height="400"/><text fill="%239ca3af" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18">Ưu đãi</text></svg>',
  );

function buildPromoImageUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl || !String(pathOrUrl).trim()) return '';
  const s = String(pathOrUrl).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const origin =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`
      : `http://localhost:${BACKEND_PORT}`;
  return `${origin}${s.startsWith('/') ? '' : '/'}${s}`;
}

export function PromoBannerCarousel(props: {
  slides: AdminBanner[];
  index: number;
  setIndex: React.Dispatch<React.SetStateAction<number>>;
  onCtaClick: (e: React.MouseEvent, banner: AdminBanner) => void;
}) {
  const { slides, index, setIndex, onCtaClick } = props;

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 2000);
    return () => window.clearInterval(t);
  }, [slides.length, setIndex]);

  return (
    <section className="max-w-7xl mx-auto px-4 py-7 md:py-8">
      <div className="relative rounded-[1.6rem] overflow-hidden border border-[#E5D6C4]/80 bg-[#FFF9F1] shadow-sm">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{
            width: `${slides.length * 100}%`,
            transform: `translateX(-${index * (100 / slides.length)}%)`,
          }}
        >
          {slides.map((b, i) => {
            const raw =
              (b as { image_url?: string; imageUrl?: string }).image_url ??
              (b as { image_url?: string; imageUrl?: string }).imageUrl;
            const imageUrl =
              buildPromoImageUrl(raw ?? undefined) || PROMO_PLACEHOLDER_SVG;
            return (
              <div
                key={b.id ?? i}
                className="flex-shrink-0 relative aspect-[24/5] bg-white"
                style={{ width: `${100 / slides.length}%` }}
              >
                <img
                  src={imageUrl}
                  alt={b.title || 'Ưu đãi'}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/25 to-transparent" />
                <div className="relative z-10 h-full p-4 pl-9 pr-9 md:p-5 md:pl-16 md:pr-16 lg:pl-20 lg:pr-20 flex flex-col justify-end">
                  <span className="inline-flex w-fit mb-2 px-2.5 py-1 rounded-full bg-white/20 text-white text-[10px] md:text-xs font-black uppercase tracking-wider">
                    Khuyến mãi
                  </span>
                  <div className="text-white text-lg md:text-2xl font-black leading-tight line-clamp-2 mb-1">
                    {b.title || 'Ưu đãi hôm nay'}
                  </div>
                  {b.subtitle && (
                    <div className="text-white/90 text-xs md:text-sm line-clamp-2 mb-3">
                      {b.subtitle}
                    </div>
                  )}
                  <a
                    href={b.link_url || '/products'}
                    onClick={(e) => onCtaClick(e, b)}
                    className="inline-flex w-fit px-4 py-1.5 rounded-full bg-white text-[#8B6A47] text-xs md:text-sm font-black hover:bg-[#FFF7EC] transition-colors"
                  >
                    Xem ngay
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i <= 0 ? slides.length - 1 : i - 1))}
              className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/35 text-[#8B6A47]/80 border border-white/40 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-80 md:opacity-40 hover:opacity-100 hover:bg-white/65 hover:text-[#8B6A47] transition-all duration-200"
              aria-label="Banner trước"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i >= slides.length - 1 ? 0 : i + 1))}
              className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/35 text-[#8B6A47]/80 border border-white/40 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-80 md:opacity-40 hover:opacity-100 hover:bg-white/65 hover:text-[#8B6A47] transition-all duration-200"
              aria-label="Banner sau"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>
      {slides.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-6 bg-[#B58A5A]' : 'w-2 bg-[#D6C1A9]'
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

