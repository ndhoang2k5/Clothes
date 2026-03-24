
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { AdminBanner, BannerSlot, Product, Collection, Blog } from '../types';
import { CATEGORIES } from '../constants';
import ProductCard from '../components/ProductCard';
import { QuickAddToCartModal } from './QuickAddToCartModal';

const FALLBACK_HERO: AdminBanner = {
  id: -1,
  slot: 'home_hero',
  sort_order: 0,
  image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1600',
  title: 'Unbee Baby',
  subtitle: 'Mềm mại như vòng tay mẹ, an toàn cho làn da nhạy cảm của bé yêu.',
  link_url: '#/products',
  is_active: true,
};

const BACKEND_PORT = 8888;
const PROMO_PLACEHOLDER_SVG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect fill="%23fce7f3" width="800" height="400"/><text fill="%239ca3af" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18">Ưu đãi</text></svg>');

function buildPromoImageUrl(pathOrUrl: string | undefined | null): string {
  if (!pathOrUrl || !String(pathOrUrl).trim()) return '';
  const s = String(pathOrUrl).trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  const origin = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`
    : `http://localhost:${BACKEND_PORT}`;
  return `${origin}${s.startsWith('/') ? '' : '/'}${s}`;
}

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [heroBanners, setHeroBanners] = useState<AdminBanner[]>([]);
  const [promoBanners, setPromoBanners] = useState<AdminBanner[]>([]);
  const [categoryBanners, setCategoryBanners] = useState<AdminBanner[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [blogHighlights, setBlogHighlights] = useState<Blog[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [promoIndex, setPromoIndex] = useState(0);
  const [activeFeaturedTab, setActiveFeaturedTab] = useState<'new' | 'hot' | 'clearance' | 'all'>('new');
  const [clearanceProducts, setClearanceProducts] = useState<Product[]>([]);
  const [quickAddProductId, setQuickAddProductId] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const heroTouchStartXRef = useRef<number | null>(null);
  const blogTrackRef = useRef<HTMLDivElement | null>(null);
  const [canBlogScrollLeft, setCanBlogScrollLeft] = useState(false);
  const [canBlogScrollRight, setCanBlogScrollRight] = useState(false);
  const [blogDotCount, setBlogDotCount] = useState(1);
  const [activeBlogDot, setActiveBlogDot] = useState(0);
  const promoSlides = promoBanners.length > 0
    ? promoBanners
    : [
        {
          id: -999,
          slot: 'home_promo' as BannerSlot,
          sort_order: 0,
          image_url: PROMO_PLACEHOLDER_SVG,
          title: 'Ưu đãi theo mùa',
          subtitle: 'Nhiều mã giảm giá và quà tặng đang chờ ba mẹ.',
          link_url: '#/products',
          is_active: true,
        } as AdminBanner,
      ];

  useEffect(() => {
    // Load only first page for homepage (fast) and reuse cache for smooth back navigation.
    const load = async () => {
      setHomeLoading(true);
      try {
        const [productRes, heroPromoCat, colRes, blogRes, clearanceRes] = await Promise.all([
          api
            .getProductsPage({ page: 1, per_page: 36, useCache: true })
            .catch(() => ({ items: [] })),
          (async () => {
            const slots: BannerSlot[] = ['home_hero', 'home_promo', 'home_category_feature'];
            const [hero, promo, cat] = await Promise.all(
              slots.map((s) => api.userListBannersBySlot(s).catch(() => [])),
            );
            return { hero, promo, cat };
          })(),
          api.getCollections().catch(() => []),
          Promise.all([
            api.getBlogs('tips', 12).catch(() => []),
            api.getBlogs('news', 12).catch(() => []),
          ]),
          api.getProductsPage({ category: 'uu-dai-cuoi-mua', page: 1, per_page: 8, useCache: false }).catch(() => ({ items: [] })),
        ]);

        setProducts((productRes as any).items ?? []);
        setHeroBanners(heroPromoCat.hero.length > 0 ? heroPromoCat.hero : [FALLBACK_HERO]);
        setPromoBanners(heroPromoCat.promo);
        setCategoryBanners(heroPromoCat.cat);
        setHeroIndex(0);
        setPromoIndex(0);
        setCollections(colRes as Collection[]);
        const [tipsList, newsList] = blogRes as [Blog[], Blog[]];
        const mergedBlogs = [...tipsList, ...newsList]
          .filter((b) => !!b?.id && !!b?.title)
          .sort((a, b) => {
            const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
            const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
            return tb - ta;
          });
        const uniqueBlogs: Blog[] = [];
        const seen = new Set<string>();
        mergedBlogs.forEach((b) => {
          if (seen.has(String(b.id))) return;
          seen.add(String(b.id));
          uniqueBlogs.push(b);
        });
        setBlogHighlights(uniqueBlogs.slice(0, 12));
        setClearanceProducts(((clearanceRes as any).items ?? []) as Product[]);
      } catch {
        // fallback đã xử lý từng phần
      } finally {
        setHomeLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const t = window.setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroBanners.length);
    }, 6000);
    return () => window.clearInterval(t);
  }, [heroBanners.length]);

  useEffect(() => {
    if (promoBanners.length <= 1) return;
    const t = window.setInterval(() => {
      setPromoIndex((i) => (i + 1) % promoBanners.length);
    }, 6000);
    return () => window.clearInterval(t);
  }, [promoBanners.length]);

  useEffect(() => {
    const el = blogTrackRef.current;
    if (!el) return;
    const updateButtons = () => {
      const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      setCanBlogScrollLeft(el.scrollLeft > 4);
      setCanBlogScrollRight(el.scrollLeft < maxScrollLeft - 4);
      const pages = Math.max(1, Math.ceil(el.scrollWidth / Math.max(1, el.clientWidth)));
      setBlogDotCount(pages);
      const pageIndex = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setActiveBlogDot(Math.min(Math.max(pageIndex, 0), pages - 1));
    };
    updateButtons();
    el.addEventListener('scroll', updateButtons, { passive: true });
    window.addEventListener('resize', updateButtons);
    return () => {
      el.removeEventListener('scroll', updateButtons);
      window.removeEventListener('resize', updateButtons);
    };
  }, [blogHighlights.length]);

  const scrollBlogs = (dir: 'left' | 'right') => {
    const el = blogTrackRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const amount = firstCard
      ? Math.max(260, firstCard.getBoundingClientRect().width + 20)
      : Math.max(280, Math.round(el.clientWidth * 0.85));
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const goToBlogDot = (index: number) => {
    const el = blogTrackRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.min(max, Math.max(0, index * el.clientWidth));
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  if (homeLoading) {
    return (
      <div className="pb-20">
        <section className="h-[400px] md:h-[600px] px-4 md:px-0">
          <div className="max-w-7xl mx-auto h-full rounded-[2rem] md:rounded-none skeleton" />
        </section>
        <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#FFF9F1] p-6 rounded-2xl border border-[#E5D6C4]/70">
                <div className="h-8 w-8 rounded-full mx-auto mb-3 skeleton" />
                <div className="h-3 w-16 mx-auto rounded-full skeleton" />
              </div>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 py-20">
          <div className="grid md:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-6 rounded-2xl border border-[#E5D6C4]/80 bg-[#FFF9F1]">
                <div className="h-6 w-6 rounded-lg mb-4 skeleton" />
                <div className="h-4 w-3/4 rounded-full mb-2 skeleton" />
                <div className="h-3 w-1/2 rounded-full skeleton" />
              </div>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="h-8 w-64 rounded-full mx-auto mb-8 skeleton" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] border border-gray-100 p-3">
                <div className="aspect-[4/5] rounded-2xl mb-3 skeleton" />
                <div className="h-4 w-4/5 rounded-full mb-2 skeleton" />
                <div className="h-4 w-1/2 rounded-full skeleton" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Hero Slider — carousel mượt */}
      <section
        className="relative h-[400px] md:h-[600px] bg-[#F8F3EC] overflow-hidden touch-pan-y"
        onTouchStart={(e) => {
          heroTouchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (heroBanners.length <= 1) return;
          const startX = heroTouchStartXRef.current;
          const endX = e.changedTouches[0]?.clientX ?? null;
          heroTouchStartXRef.current = null;
          if (startX == null || endX == null) return;
          const delta = endX - startX;
          if (Math.abs(delta) < 45) return;
          if (delta < 0) {
            setHeroIndex((i) => (i + 1) % heroBanners.length);
          } else {
            setHeroIndex((i) => (i <= 0 ? heroBanners.length - 1 : i - 1));
          }
        }}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ width: `${heroBanners.length * 100}%`, transform: `translateX(-${heroIndex * (100 / heroBanners.length)}%)` }}
        >
          {heroBanners.map((slide, i) => (
            <div key={slide.id ?? i} className="flex-shrink-0 h-full relative" style={{ width: `${100 / heroBanners.length}%` }}>
              <img
                src={slide.image_url}
                alt={slide.title || 'Unbee'}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#F8F3EC]/80 to-transparent flex items-center px-12 md:px-32">
                <div className="max-w-md" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Categories */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.filter((cat) => cat.slug !== 'uu-dai-cuoi-mua' && cat.slug !== 'phu-kien').map((cat) => (
            <a 
              key={cat.id}
              href={`#/products?cat=${cat.slug}`}
              className="bg-[#FFF9F1] p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-center flex flex-col items-center group border border-[#E5D6C4]/70"
            >
              <span className="text-4xl mb-3 group-hover:scale-125 transition-transform">{cat.icon}</span>
              <span className="text-sm font-bold text-[#4B3B32]">{cat.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Promo Slider Compact (mobile-friendly) */}
      <section className="max-w-7xl mx-auto px-4 py-8 md:py-10">
        <div className="relative rounded-[1.6rem] overflow-hidden border border-[#E5D6C4]/80 bg-[#FFF9F1] shadow-sm">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              width: `${promoSlides.length * 100}%`,
              transform: `translateX(-${promoIndex * (100 / promoSlides.length)}%)`,
            }}
          >
            {promoSlides.map((b, i) => {
              const raw = (b as { image_url?: string; imageUrl?: string }).image_url ?? (b as { image_url?: string; imageUrl?: string }).imageUrl;
              const imageUrl = buildPromoImageUrl(raw ?? undefined) || PROMO_PLACEHOLDER_SVG;
              return (
                <div
                  key={b.id ?? i}
                  className="flex-shrink-0 relative h-[170px] md:h-[210px]"
                  style={{ width: `${100 / promoSlides.length}%` }}
                >
                  <img
                    src={imageUrl}
                    alt={b.title || 'Ưu đãi'}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/25 to-transparent" />
                  <div className="relative z-10 h-full p-4 pl-10 pr-10 md:p-6 md:pl-20 md:pr-20 lg:pl-24 lg:pr-24 flex flex-col justify-end">
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
                      href={b.link_url || '#/products'}
                      className="inline-flex w-fit px-4 py-2 rounded-full bg-white text-[#8B6A47] text-xs md:text-sm font-black hover:bg-[#FFF7EC] transition-colors"
                    >
                      Xem ngay
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {promoSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPromoIndex((i) => (i <= 0 ? promoSlides.length - 1 : i - 1))}
                className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/35 text-[#8B6A47]/80 border border-white/40 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-80 md:opacity-40 hover:opacity-100 hover:bg-white/65 hover:text-[#8B6A47] transition-all duration-200"
                aria-label="Banner trước"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                onClick={() => setPromoIndex((i) => (i >= promoSlides.length - 1 ? 0 : i + 1))}
                className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/35 text-[#8B6A47]/80 border border-white/40 backdrop-blur-sm shadow-sm flex items-center justify-center opacity-80 md:opacity-40 hover:opacity-100 hover:bg-white/65 hover:text-[#8B6A47] transition-all duration-200"
                aria-label="Banner sau"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>
        {promoSlides.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {promoSlides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromoIndex(i)}
                className={`h-2 rounded-full transition-all ${i === promoIndex ? 'w-6 bg-[#B58A5A]' : 'w-2 bg-[#D6C1A9]'}`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Category Feature Banners */}
      {categoryBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-2xl font-black text-gray-800">Danh mục nổi bật</h3>
              <p className="text-gray-500">Bấm vào để xem nhanh theo chủ đề</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {categoryBanners.slice(0, 6).map((b) => (
              <a
                key={b.id}
                href={b.link_url || '#/products'}
                className="group bg-white border border-gray-100 rounded-[2rem] overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="h-44 bg-gray-50 overflow-hidden">
                  <img src={b.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <div className="font-black text-gray-900 text-lg">{b.title || 'Xem ngay'}</div>
                  {b.subtitle && <div className="text-sm text-gray-500 mt-1 line-clamp-2">{b.subtitle}</div>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Featured Collections */}
      {collections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-800">Bộ sưu tập nổi bật</h2>
              <p className="text-gray-500 text-sm">
                Chọn nhanh theo chủ đề đã được mix sẵn cho bé.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.slice(0, 4).map((col) => (
              <a
                key={col.id}
                href={`#/collections?id=${col.id}`}
                className="group relative h-[260px] md:h-[320px] rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 block bg-gray-50"
              >
                <img
                  src={col.coverImage || 'https://picsum.photos/800/500?collection'}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  alt={col.name}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8 flex flex-col justify-end">
                  <span className="text-pink-300 font-bold uppercase tracking-widest text-xs mb-2">
                    Bộ sưu tập
                  </span>
                  <h3 className="text-2xl font-black text-white mb-2 line-clamp-2 group-hover:text-pink-200 transition-colors">
                    {col.name}
                  </h3>
                  {col.description && (
                    <p className="text-gray-200 text-sm line-clamp-2 mb-3">{col.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-white font-black text-sm group-hover:translate-x-1 transition-transform">
                    Xem bộ sưu tập
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 tracking-wide mb-4">
            SẢN PHẨM NỔI BẬT
          </h2>
          <div className="inline-flex bg-gray-100 rounded-full px-2 py-1 text-sm font-semibold text-gray-500">
            <button
              onClick={() => setActiveFeaturedTab('new')}
              className={`px-4 py-2 rounded-full transition-colors ${
                activeFeaturedTab === 'new' ? 'text-pink-600' : 'hover:text-pink-500'
              }`}
            >
              Hàng mới
            </button>
            <button
              onClick={() => setActiveFeaturedTab('hot')}
              className={`px-4 py-2 rounded-full transition-colors ${
                activeFeaturedTab === 'hot' ? 'text-pink-600' : 'hover:text-pink-500'
              }`}
            >
              Hot sales
            </button>
            <button
              onClick={() => setActiveFeaturedTab('clearance')}
              className={`px-4 py-2 rounded-full transition-colors ${
                activeFeaturedTab === 'clearance' ? 'text-pink-600' : 'hover:text-pink-500'
              }`}
            >
              Ưu đãi
            </button>
            <button
              onClick={() => setActiveFeaturedTab('all')}
              className={`px-4 py-2 rounded-full transition-colors ${
                activeFeaturedTab === 'all' ? 'text-pink-600' : 'hover:text-pink-500'
              }`}
            >
              Xem thêm
            </button>
          </div>
        </div>

        {(() => {
          let list = products;
          let featuredViewAllHref = '#/products';
          if (activeFeaturedTab === 'new') {
            list = products.filter((p) => p.isNew);
          } else if (activeFeaturedTab === 'hot') {
            list = products.filter((p) => p.isHot);
          } else if (activeFeaturedTab === 'clearance') {
            list = clearanceProducts.length > 0
              ? clearanceProducts
              : products.filter((p) => p.category === 'uu-dai-cuoi-mua');
            featuredViewAllHref = '#/products?cat=uu-dai-cuoi-mua';
          }

          return (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {list.slice(0, 16).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => setQuickAddProductId(product.id)}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <a
                  href={featuredViewAllHref}
                  className="text-xs md:text-sm font-bold text-[#8B6A47] hover:underline"
                >
                  Xem tất cả
                </a>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Box quà tặng */}
      {products.some((p) => p.category === 'qua-tang') && (
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-800">Box quà tặng</h2>
            <a href="#/products?cat=qua-tang" className="text-sm font-bold text-pink-500 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products
              .filter((p) => p.category === 'qua-tang')
              .slice(0, 4)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={() => setQuickAddProductId(p.id)}
                />
              ))}
          </div>
        </section>
      )}

      {/* Combo đi sinh */}
      {products.some((p) => p.category === 'di-sinh') && (
        <section className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-800">Combo đi sinh</h2>
            <a href="#/products?cat=di-sinh" className="text-sm font-bold text-pink-500 hover:underline">
              Xem tất cả
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products
              .filter((p) => p.category === 'di-sinh')
              .slice(0, 4)
              .map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={() => setQuickAddProductId(p.id)}
                />
              ))}
          </div>
        </section>
      )}

      {quickAddProductId && (
        <QuickAddToCartModal
          productId={quickAddProductId}
          onClose={() => setQuickAddProductId(null)}
        />
      )}

      {/* Tips & News */}
      {blogHighlights.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-[#758796] tracking-tight">tips % news</h2>
              <p className="text-gray-500 mt-2">
                Cập nhật bài viết hữu ích cho ba mẹ mỗi ngày.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollBlogs('left')}
                disabled={!canBlogScrollLeft}
                className="w-10 h-10 rounded-full border border-[#D8CDD0] text-[#8B6A47] bg-white/70 opacity-55 hover:opacity-100 hover:bg-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Bài trước"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                onClick={() => scrollBlogs('right')}
                disabled={!canBlogScrollRight}
                className="w-10 h-10 rounded-full border border-[#D8CDD0] text-[#8B6A47] bg-white/70 opacity-55 hover:opacity-100 hover:bg-white transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Bài tiếp theo"
              >
                <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div
            ref={blogTrackRef}
            className="hide-scrollbar flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          >
            {blogHighlights.map((post) => (
              <article
                key={post.id}
                className="flex-none basis-[85%] sm:basis-[48%] lg:basis-[31%] snap-start bg-white rounded-[1.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <button
                  type="button"
                  onClick={() => (window.location.hash = `#/blog/post/${post.id}`)}
                  className="w-full text-left"
                >
                  <div className="h-48 bg-gray-50 overflow-hidden">
                    <img
                      src={post.thumbnail || 'https://picsum.photos/640/360?blog'}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-[1.15rem] md:text-[1.25rem] leading-7 font-extrabold text-[#6F8190] line-clamp-2 mb-2 uppercase">
                      {post.title}
                    </h3>
                    <p className="text-[#6B6B6B] text-sm md:text-base line-clamp-2 min-h-[42px] mb-4">
                      {post.excerpt || post.content?.replace(/\s+/g, ' ').slice(0, 120) || ''}
                    </p>
                    <span className="inline-flex items-center px-5 py-2 rounded-full border border-gray-300 text-[#4D4D4D] text-base hover:bg-gray-50 transition-colors">
                      Xem thêm
                    </span>
                  </div>
                </button>
              </article>
            ))}
          </div>

          {blogDotCount > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              {Array.from({ length: blogDotCount }).map((_, i) => (
                <button
                  key={`blog-dot-${i}`}
                  type="button"
                  onClick={() => goToBlogDot(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === activeBlogDot ? 'w-5 bg-[#8B6A47]/75' : 'w-2.5 bg-[#D6C1A9]/70 hover:bg-[#C8AF92]/80'
                  }`}
                  aria-label={`Chuyển đến trang bài viết ${i + 1}`}
                />
              ))}
            </div>
          )}

          <div className="flex md:hidden items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={() => scrollBlogs('left')}
              disabled={!canBlogScrollLeft}
              className="w-9 h-9 rounded-full border border-[#D8CDD0] text-[#8B6A47] bg-white/70 opacity-70 hover:opacity-100 transition-all disabled:opacity-25"
              aria-label="Bài trước"
            >
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              type="button"
              onClick={() => scrollBlogs('right')}
              disabled={!canBlogScrollRight}
              className="w-9 h-9 rounded-full border border-[#D8CDD0] text-[#8B6A47] bg-white/70 opacity-70 hover:opacity-100 transition-all disabled:opacity-25"
              aria-label="Bài tiếp theo"
            >
              <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
