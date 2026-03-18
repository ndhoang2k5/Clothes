
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AdminBanner, BannerSlot, Product, Collection, Blog } from '../types';
import { CATEGORIES, TRUST_FEATURES } from '../constants';
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
  const [tips, setTips] = useState<Blog[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [promoIndex, setPromoIndex] = useState(0);
  const [activeFeaturedTab, setActiveFeaturedTab] = useState<'new' | 'hot' | 'accessory' | 'all'>('new');
  const [clearanceProducts, setClearanceProducts] = useState<Product[]>([]);
  const [quickAddProductId, setQuickAddProductId] = useState<string | null>(null);

  useEffect(() => {
    // Load only first page for homepage (fast) and reuse cache for smooth back navigation.
    const load = async () => {
      try {
        const [productRes, heroPromoCat, colRes, tipRes, clearanceRes] = await Promise.all([
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
          api.getTips(3).catch(() => []),
          api.getProductsPage({ category: 'uu-dai-cuoi-mua', page: 1, per_page: 8, useCache: false }).catch(() => ({ items: [] })),
        ]);

        setProducts((productRes as any).items ?? []);
        setHeroBanners(heroPromoCat.hero.length > 0 ? heroPromoCat.hero : [FALLBACK_HERO]);
        setPromoBanners(heroPromoCat.promo);
        setCategoryBanners(heroPromoCat.cat);
        setHeroIndex(0);
        setPromoIndex(0);
        setCollections(colRes as Collection[]);
        setTips(tipRes as Blog[]);
        setClearanceProducts(((clearanceRes as any).items ?? []) as Product[]);
      } catch {
        // fallback đã xử lý từng phần
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

  return (
    <div className="pb-20">
      {/* Hero Slider — carousel mượt */}
      <section className="relative h-[400px] md:h-[600px] bg-[#F8F3EC] overflow-hidden">
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
                <div className="max-w-md">
                  <h1 className="text-4xl md:text-6xl font-black text-[#4B3B32] mb-4">{slide.title || 'Unbee Baby'}</h1>
                  <p className="text-[#8B7765] text-lg mb-8">
                    {slide.subtitle || 'Mềm mại như vòng tay mẹ, an toàn cho làn da nhạy cảm của bé yêu.'}
                  </p>
                  <a
                    href={slide.link_url || '#/products'}
                    className="inline-flex bg-[#B58A5A] text-[#FDF8F0] px-8 py-4 rounded-full font-bold shadow-lg hover:bg-[#A3784E] transition-all"
                  >
                    Mua ngay
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
        {heroBanners.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {heroBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIndex(i)}
                className={`h-2.5 rounded-full transition-all duration-300 ${i === heroIndex ? 'w-10 bg-pink-500' : 'w-2.5 bg-white/70 hover:bg-white'}`}
                aria-label={`Ảnh ${i + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Quick Categories */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.filter((cat) => cat.slug !== 'uu-dai-cuoi-mua').map((cat) => (
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

      {/* Trust Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {TRUST_FEATURES.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-4 p-6 bg-[#FFF9F1] rounded-2xl border border-[#E5D6C4]/80">
              <div className="p-3 bg-[#F2E3D4] rounded-xl">{feature.icon}</div>
              <div>
                <h4 className="font-bold text-[#4B3B32]">{feature.title}</h4>
                <p className="text-sm text-[#9C8573]">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
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
              onClick={() => setActiveFeaturedTab('accessory')}
              className={`px-4 py-2 rounded-full transition-colors ${
                activeFeaturedTab === 'accessory' ? 'text-pink-600' : 'hover:text-pink-500'
              }`}
            >
              Phụ kiện
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
          if (activeFeaturedTab === 'new') {
            list = products.filter((p) => p.isNew);
          } else if (activeFeaturedTab === 'hot') {
            list = products.filter((p) => p.isHot);
          } else if (activeFeaturedTab === 'accessory') {
            list = products.filter((p) => p.category === 'phu-kien');
          }

          return (
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {list.slice(0, 8).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={() => setQuickAddProductId(product.id)}
                  />
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Ưu đãi cuối mùa — luôn hiển thị block, có hoặc chưa có sản phẩm */}
      <section className="max-w-7xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-[#4B3B32]">Ưu đãi cuối mùa</h2>
            <p className="text-sm text-[#9C8573]">
              Những mẫu còn lại cuối mùa với mức giá dễ chịu để xả kho.
            </p>
          </div>
          <a
            href="#/products?cat=uu-dai-cuoi-mua"
            className="text-sm font-bold text-[#B58A5A] hover:underline"
          >
            Xem tất cả
          </a>
        </div>
        {clearanceProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {clearanceProducts.slice(0, 8).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToCart={() => setQuickAddProductId(p.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-[#FFF9F1] border border-[#E5D6C4]/70 rounded-2xl py-12 text-center">
            <p className="text-[#9C8573] mb-4">Chưa có sản phẩm ưu đãi cuối mùa.</p>
            <a
              href="#/products?cat=uu-dai-cuoi-mua"
              className="inline-flex bg-[#B58A5A] text-[#FDF8F0] px-6 py-3 rounded-full font-bold hover:bg-[#A3784E] transition-colors"
            >
              Xem tất cả sản phẩm
            </a>
          </div>
        )}
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

      {/* Promo Banner — một ô, lần lượt đổi ảnh; không click */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        {promoBanners.length > 0 ? (
          <div className="rounded-[2rem] overflow-hidden relative border border-gray-100 select-none h-[240px] md:h-[280px]">
            <div
              className="flex h-full transition-transform duration-500 ease-out"
              style={{ width: `${promoBanners.length * 100}%`, transform: `translateX(-${promoIndex * (100 / promoBanners.length)}%)` }}
            >
              {promoBanners.map((b, i) => {
                const raw = (b as { image_url?: string; imageUrl?: string }).image_url ?? (b as { image_url?: string; imageUrl?: string }).imageUrl;
                const imageUrl = buildPromoImageUrl(raw ?? undefined);
                return (
                  <div
                    key={b.id ?? i}
                    className="flex-shrink-0 relative h-full"
                    style={{
                      width: `${100 / promoBanners.length}%`,
                      background: imageUrl ? 'transparent' : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 40%, #f9a8d4 100%)',
                    }}
                  >
                    <img
                      key={imageUrl || `placeholder-${b.id ?? i}`}
                      src={imageUrl || PROMO_PLACEHOLDER_SVG}
                      alt={b.title || 'Ưu đãi'}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ zIndex: 0 }}
                      loading="eager"
                      decoding="async"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        if (el.src !== PROMO_PLACEHOLDER_SVG) el.src = PROMO_PLACEHOLDER_SVG;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" style={{ zIndex: 1 }} />
                    <div className="absolute inset-0 flex flex-col md:flex-row items-center gap-8 p-8 md:p-16 pointer-events-none" style={{ zIndex: 2 }}>
                      <div className="text-white max-w-lg">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                          Ưu đãi
                        </span>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                          {b.title || 'Ưu đãi hôm nay'}
                        </h2>
                        <p className="text-white/90 mb-8">
                          {b.subtitle || 'Khuyến mãi đang diễn ra.'}
                        </p>
                        <span className="inline-flex bg-white/90 text-gray-900 px-8 py-4 rounded-full font-bold shadow-xl cursor-default">
                          Xem ưu đãi
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {promoBanners.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {promoBanners.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPromoIndex(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${i === promoIndex ? 'w-10 bg-white' : 'w-2.5 bg-white/50 hover:bg-white/80'}`}
                    aria-label={`Ưu đãi ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-pink-400 to-rose-300 rounded-[2rem] p-8 md:p-16 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
              <div className="relative z-10 text-white max-w-lg">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">Ưu đãi độc quyền</span>
                  <h2 className="text-4xl md:text-5xl font-black mb-6">Giảm 20% cho đơn hàng đầu tiên!</h2>
                  <p className="text-pink-50 mb-8">Nhập mã <span className="font-mono font-bold bg-white text-pink-500 px-2 py-1 rounded">UNBEE20</span> tại trang thanh toán.</p>
                  <button className="bg-white text-pink-500 px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform">Nhận Ưu Đãi</button>
              </div>
              <div className="md:absolute md:-right-10 md:bottom-0">
                   <img src="https://picsum.photos/600/600?baby" alt="Baby" className="w-72 h-72 md:w-[450px] md:h-[450px] object-contain rotate-12" />
              </div>
          </div>
        )}
      </section>

      {quickAddProductId && (
        <QuickAddToCartModal
          productId={quickAddProductId}
          onClose={() => setQuickAddProductId(null)}
        />
      )}

      {/* Blog / Tips Teaser */}
      {tips.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-20 bg-white rounded-[3rem]">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-800 mb-4">Mẹo nhỏ cho mẹ - Vui khỏe cho bé</h2>
            <p className="text-gray-500">Chia sẻ kinh nghiệm chăm sóc bé từ nội dung bạn quản lý trong admin.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {tips.map((tip) => (
              <div key={tip.id} className="group cursor-pointer">
                <div className="aspect-video rounded-3xl overflow-hidden mb-6 bg-gray-50">
                  <img
                    src={tip.thumbnail || 'https://picsum.photos/500/300?baby-tips'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={tip.title}
                  />
                </div>
                <h4 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-pink-500 transition-colors line-clamp-2">
                  {tip.title}
                </h4>
                <p className="text-gray-500 text-sm line-clamp-3">
                  {tip.content?.replace(/\s+/g, ' ').slice(0, 150) || ''}
                  {tip.content && tip.content.length > 150 ? '…' : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
