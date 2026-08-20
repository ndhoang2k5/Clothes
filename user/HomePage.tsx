
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { AdminBanner, BannerSlot, Product, Collection, Blog, HomepagePromoCard } from '../types';
import { getStaticImageUrl } from '../constants';
import ProductCard from '../components/ProductCard';
import { QuickAddToCartModal } from './QuickAddToCartModal';
import { navigate } from '../App';
import { buildBlogPostPath, buildProductPath } from './utils/urls';
import { HeroBannerCarousel } from './components/HeroBannerCarousel';
import { PromoVoucherGrid } from './components/PromoVoucherGrid';
import { CategoryFeatureBanners } from './components/CategoryFeatureBanners';

const FALLBACK_HERO: AdminBanner = {
  id: -1,
  slot: 'home_hero',
  sort_order: 0,
  image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1600',
  title: 'Unbee Baby',
  subtitle: 'Mềm mại như vòng tay mẹ, an toàn cho làn da nhạy cảm của bé yêu.',
  link_url: '/products',
  is_active: true,
};

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [heroBanners, setHeroBanners] = useState<AdminBanner[]>([]);
  const [homepagePromoCards, setHomepagePromoCards] = useState<HomepagePromoCard[]>([]);
  const [categoryBanners, setCategoryBanners] = useState<AdminBanner[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [blogHighlights, setBlogHighlights] = useState<Blog[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [activeFeaturedTab, setActiveFeaturedTab] = useState<'new' | 'hot' | 'clearance' | 'all'>('new');
  const [clearanceProducts, setClearanceProducts] = useState<Product[]>([]);
  const [quickAddProductId, setQuickAddProductId] = useState<string | null>(null);
  const [homeLoading, setHomeLoading] = useState(true);
  const blogTrackRef = useRef<HTMLDivElement | null>(null);
  const [canBlogScrollLeft, setCanBlogScrollLeft] = useState(false);
  const [canBlogScrollRight, setCanBlogScrollRight] = useState(false);
  const [blogDotCount, setBlogDotCount] = useState(1);
  const [activeBlogDot, setActiveBlogDot] = useState(0);

  useEffect(() => {
    // Progressive load: paint hero + products ASAP, then fill secondary sections.
    const load = async () => {
      // Chỉ cần ~16 thẻ nổi bật (+ buffer tab); tránh tải 36 sản phẩm + 36 ảnh cùng lúc.
      const HOME_PRODUCT_PAGE = 20;
      const cachedProducts = api.peekProductsPage({ page: 1, per_page: HOME_PRODUCT_PAGE, useCache: true });
      if (cachedProducts?.items?.length) {
        setProducts(cachedProducts.items);
        setHomeLoading(false);
      } else {
        setHomeLoading(true);
      }

      try {
        const [productRes, heroAndCat] = await Promise.all([
          api
            .getProductsPage({ page: 1, per_page: HOME_PRODUCT_PAGE, useCache: true })
            .catch(() => ({ items: [] as Product[] })),
          (async () => {
            const slots: BannerSlot[] = ['home_hero', 'home_category_feature'];
            const [hero, cat] = await Promise.all(
              slots.map((s) => api.userListBannersBySlot(s).catch(() => [])),
            );
            return { hero, cat };
          })(),
        ]);

        setProducts((productRes as any).items ?? []);
        setHeroBanners(heroAndCat.hero.length > 0 ? heroAndCat.hero : [FALLBACK_HERO]);
        setCategoryBanners(heroAndCat.cat);
        setHeroIndex(0);
      } catch {
        setHeroBanners([FALLBACK_HERO]);
      } finally {
        setHomeLoading(false);
      }

      try {
        const [homepagePromos, colRes, blogRes, clearanceRes] = await Promise.all([
          api.userGetHomepagePromoCards().catch(() => []),
          api.getCollections().catch(() => []),
          Promise.all([
            api.getBlogs('tram-sac-cua-me', 12).catch(() => []),
            api.getBlogs('tin-tuc', 12).catch(() => []),
          ]),
          api
            .getProductsPage({ category: 'uu-dai-cuoi-mua', page: 1, per_page: 8, useCache: true })
            .catch(() => ({ items: [] as Product[] })),
        ]);

        setHomepagePromoCards(Array.isArray(homepagePromos) ? homepagePromos : []);
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
        // secondary sections optional
      }
    };
    void load();
  }, []);

  // auto-slide logic is encapsulated in banner components

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
      <div className="pb-14">
        <section className="h-[400px] md:h-[600px] px-4 md:px-0">
          <div className="max-w-7xl mx-auto h-full rounded-[2rem] md:rounded-none skeleton" />
        </section>
        <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#FFF9F1] p-5 rounded-2xl border border-[#E5D6C4]/70">
                <div className="h-8 w-8 rounded-full mx-auto mb-3 skeleton" />
                <div className="h-3 w-16 mx-auto rounded-full skeleton" />
              </div>
            ))}
          </div>
        </section>
        <section className="bg-[#FFF9F1] py-8 border-y border-[#E5D6C4]/40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="h-8 w-56 rounded-full mb-6 skeleton" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[1.35rem] border-2 border-dashed border-[#E5D6C4]/80 bg-white p-5 min-h-[260px]">
                  <div className="h-6 w-1/2 rounded-full mb-4 skeleton" />
                  <div className="h-4 w-3/4 rounded-full mb-6 skeleton" />
                  <div className="space-y-2 mb-6">
                    <div className="h-3 w-full rounded-full skeleton" />
                    <div className="h-3 w-5/6 rounded-full skeleton" />
                  </div>
                  <div className="h-10 rounded-xl skeleton" />
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 py-14">
          <div className="grid md:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl border border-[#E5D6C4]/80 bg-[#FFF9F1]">
                <div className="h-6 w-6 rounded-lg mb-4 skeleton" />
                <div className="h-4 w-3/4 rounded-full mb-2 skeleton" />
                <div className="h-3 w-1/2 rounded-full skeleton" />
              </div>
            ))}
          </div>
        </section>
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="h-8 w-64 rounded-full mx-auto mb-6 skeleton" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
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
    <div className="pb-16">
      {/* Hero Slider — carousel mượt */}
      <HeroBannerCarousel banners={heroBanners} index={heroIndex} setIndex={setHeroIndex} />

      {/* Quick Categories */}
      <section className="max-w-7xl mx-auto px-4 -mt-14 relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
          {[
            {
              id: 'home-menu-1',
              name: 'Sơ sinh 0-12m',
              img: 'new_image/sosinh.png',
              href: '/products?cat=so-sinh',
            },
            {
              id: 'home-menu-2',
              name: 'Bé 1y-4y',
              img: 'new_image/be.png',
              href: '/products?cat=be',
            },
            {
              id: 'home-menu-3',
              name: 'Nhộng chũn & Giấc ngủ',
              img: 'new_image/nhong&chun.png',
              href: '/products?cat=nhong-chun',
            },
            {
              id: 'home-menu-4',
              name: 'Phụ kiện mẹ & bé',
              img: 'new_image/phukienme&be.png',
              href: '/products?cat=phu-kien',
            },
            {
              id: 'home-menu-5',
              name: 'Đồ chip bé gái',
              img: 'new_image/dochipbegai.png',
              href: '/products?cat=do-chip-be-gai',
            },
            {
              id: 'home-menu-6',
              name: 'Combo đi sinh kèm quà',
              img: 'new_image/combodisinh.png',
              href: '/products?cat=combo-di-sinh-kem-qua',
            },
          ].map((cat) => (
            <a 
              key={cat.id}
              href={cat.href}
              onClick={(e) => { e.preventDefault(); navigate(cat.href); }}
              className="bg-[#FFF9F1] h-[88px] sm:h-[104px] md:h-auto md:aspect-square p-3 md:p-5 rounded-xl md:rounded-2xl shadow-sm hover:shadow-xl transition-all text-center flex flex-col items-center justify-center group border border-[#E5D6C4]/50"
            >
              <div className="mb-2 md:mb-3 flex items-center justify-center">
                <img
                  src={getStaticImageUrl(cat.img)}
                  alt={cat.name}
                  className={`object-contain transition-transform group-hover:scale-110 ${
                    cat.id === 'home-menu-1'
                      ? 'w-10 h-10 md:w-[3.25rem] md:h-[3.25rem] contrast-125 saturate-125 brightness-95'
                      : 'w-10 h-10 md:w-12 md:h-12'
                  }`}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
              <span className="text-[11px] leading-4 md:text-sm font-bold text-[#4B3B32] line-clamp-2">
                {cat.name}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* Thẻ khuyến mãi (vé) — cấu hình từ Admin → Mã giảm giá → bật “Hiển thị trang chủ” */}
      <PromoVoucherGrid cards={homepagePromoCards} />

      {/* Category Feature Banners */}
      <CategoryFeatureBanners
        banners={categoryBanners}
        onNavigate={(href) => navigate(href)}
      />

      {/* Featured Collections */}
      {collections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-gray-800">Bộ sưu tập</h2>
              <p className="text-gray-500 text-sm">
                Chọn nhanh theo chủ đề đã được mix sẵn cho bé.
              </p>
            </div>
          </div>
          <div className="hide-scrollbar flex gap-3 md:gap-5 overflow-x-auto pb-2 snap-x snap-mandatory touch-pan-x">
            {collections.map((col) => (
              <a
                key={col.id}
                href={`#/collections?id=${col.id}`}
                className="group flex-none basis-[72%] sm:basis-[48%] md:basis-[38%] lg:basis-[31%] snap-start block"
              >
                <div className="relative h-[300px] sm:h-[320px] md:h-[340px] rounded-[2rem] overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                  <img
                    src={col.coverImage || 'https://picsum.photos/1200/700?collection'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt={col.name}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 bg-gradient-to-t from-white/85 via-white/35 to-transparent">
                    <h3
                      className="text-[1.15rem] md:text-[1.25rem] leading-tight font-semibold italic text-[#B58A5A] line-clamp-2 text-center max-w-[95%] mx-auto"
                      style={{ fontFamily: '"Dancing Script","Pacifico","Segoe Script","Brush Script MT",cursive' }}
                    >
                      {col.name}
                    </h3>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-wide mb-3">
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
          let featuredViewAllHref = '/products';
          if (activeFeaturedTab === 'new') {
            list = products.filter((p) => p.isNew);
          } else if (activeFeaturedTab === 'hot') {
            list = products.filter((p) => p.isHot);
          } else if (activeFeaturedTab === 'clearance') {
            list = clearanceProducts.length > 0
              ? clearanceProducts
              : products.filter((p) =>
                  (p.categories?.length ? p.categories : [p.category]).includes('uu-dai-cuoi-mua'),
                );
            featuredViewAllHref = '/products?cat=uu-dai-cuoi-mua';
          }

          return (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {list.slice(0, 16).map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    priority={idx < 4}
                    priorityRank={idx}
                    onAddToCart={() => setQuickAddProductId(product.id)}
                  />
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <a
                  href={featuredViewAllHref}
                  onClick={(e) => { e.preventDefault(); navigate(featuredViewAllHref); }}
                  className="text-xs md:text-sm font-bold text-[#8B6A47] hover:underline"
                >
                  Xem tất cả
                </a>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Combo đi sinh kèm quà */}
      {products.some((p) => {
        const slugs = ['combo-di-sinh-kem-qua', 'di-sinh', 'qua-tang'];
        const cats = p.categories?.length ? p.categories : p.category ? [p.category] : [];
        return cats.some((c) => slugs.includes(c));
      }) && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-black text-gray-800">Combo đi sinh kèm quà</h2>
            <a
              href="/products?cat=combo-di-sinh-kem-qua"
              onClick={(e) => {
                e.preventDefault();
                navigate('/products?cat=combo-di-sinh-kem-qua');
              }}
              className="text-sm font-bold text-pink-500 hover:underline"
            >
              Xem tất cả
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {products
              .filter((p) => {
                const slugs = ['combo-di-sinh-kem-qua', 'di-sinh', 'qua-tang'];
                const cats = p.categories?.length ? p.categories : p.category ? [p.category] : [];
                return cats.some((c) => slugs.includes(c));
              })
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
        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-[#758796] tracking-tight">tips % news</h2>
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
            className="hide-scrollbar flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          >
            {blogHighlights.map((post) => (
              <article
                key={post.id}
                className="flex-none basis-[85%] sm:basis-[48%] lg:basis-[31%] snap-start bg-white rounded-[1.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <button
                  type="button"
                  onClick={() => navigate(buildBlogPostPath(post))}
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
