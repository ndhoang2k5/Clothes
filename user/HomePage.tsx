
import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AdminBanner, BannerSlot, Product } from '../types';
import { CATEGORIES, TRUST_FEATURES } from '../constants';
import ProductCard from '../components/ProductCard';

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

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [heroBanners, setHeroBanners] = useState<AdminBanner[]>([]);
  const [promoBanners, setPromoBanners] = useState<AdminBanner[]>([]);
  const [categoryBanners, setCategoryBanners] = useState<AdminBanner[]>([]);
  const [footerBanners, setFooterBanners] = useState<AdminBanner[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  const currentHero = useMemo(() => heroBanners[heroIndex] || null, [heroBanners, heroIndex]);

  useEffect(() => {
    api.getProducts().then(setProducts);

    const load = async () => {
      const slots: BannerSlot[] = ['home_hero', 'home_promo', 'home_category_feature', 'footer_banner'];
      const [hero, promo, cat, footer] = await Promise.all(
        slots.map((s) => api.userListBannersBySlot(s).catch(() => []))
      );
      setHeroBanners(hero.length > 0 ? hero : [FALLBACK_HERO]);
      setPromoBanners(promo);
      setCategoryBanners(cat);
      setFooterBanners(footer);
      setHeroIndex(0);
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

  return (
    <div className="pb-20">
      {/* Hero Slider */}
      <section className="relative h-[400px] md:h-[600px] bg-pink-50 overflow-hidden">
        {currentHero && (
          <div className="absolute inset-0">
            <img 
              src={currentHero.image_url} 
              alt={currentHero.title || 'Unbee'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent flex items-center px-12 md:px-32">
              <div className="max-w-md">
                <h1 className="text-4xl md:text-6xl font-black text-gray-800 mb-4">{currentHero.title || 'Unbee Baby'}</h1>
                <p className="text-gray-700 text-lg mb-8">
                  {currentHero.subtitle || 'Mềm mại như vòng tay mẹ, an toàn cho làn da nhạy cảm của bé yêu.'}
                </p>
                <a
                  href={currentHero.link_url || '#/products'}
                  className="inline-flex bg-pink-500 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-pink-600 transition-all"
                >
                  Mua ngay
                </a>
              </div>
            </div>

            {heroBanners.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {heroBanners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setHeroIndex(i)}
                    className={`h-2.5 rounded-full transition-all ${i === heroIndex ? 'w-10 bg-pink-500' : 'w-2.5 bg-white/70 hover:bg-white'}`}
                    aria-label={`Hero ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Quick Categories */}
      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {CATEGORIES.map(cat => (
            <a 
              key={cat.id} 
              href={`#/products?cat=${cat.slug}`}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-center flex flex-col items-center group"
            >
              <span className="text-4xl mb-3 group-hover:scale-125 transition-transform">{cat.icon}</span>
              <span className="text-sm font-bold text-gray-700">{cat.name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Trust Features */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {TRUST_FEATURES.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-gray-100">
              <div className="p-3 bg-gray-50 rounded-xl">{feature.icon}</div>
              <div>
                <h4 className="font-bold text-gray-800">{feature.title}</h4>
                <p className="text-sm text-gray-500">{feature.desc}</p>
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

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">Sản phẩm Bán Chạy 🔥</h2>
            <p className="text-gray-500">Những món đồ được hàng ngàn mẹ bỉm tin dùng</p>
          </div>
          <a href="#/products" className="text-pink-500 font-bold flex items-center gap-1 hover:underline">
            Xem tất cả <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.filter(p => p.isHot).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Promo Banner */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        {promoBanners.length > 0 ? (
          <div className="rounded-[2rem] overflow-hidden relative border border-gray-100">
            <img src={promoBanners[0].image_url} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/10" />
            <div className="relative p-8 md:p-16 flex flex-col md:flex-row items-center gap-8">
              <div className="text-white max-w-lg">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">
                  Ưu đãi
                </span>
                <h2 className="text-4xl md:text-5xl font-black mb-4">
                  {promoBanners[0].title || 'Ưu đãi hôm nay'}
                </h2>
                <p className="text-white/90 mb-8">
                  {promoBanners[0].subtitle || 'Khuyến mãi đang diễn ra — bấm để xem ngay.'}
                </p>
                <a
                  href={promoBanners[0].link_url || '#/products'}
                  className="inline-flex bg-white text-gray-900 px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                >
                  Xem ưu đãi
                </a>
              </div>
            </div>
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

      {/* Footer Banner */}
      {footerBanners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-8">
          <a
            href={footerBanners[0].link_url || '#/products'}
            className="block rounded-[2rem] overflow-hidden border border-gray-100 hover:shadow-xl transition-all"
          >
            <img src={footerBanners[0].image_url} className="w-full h-44 md:h-56 object-cover" />
          </a>
        </section>
      )}

      {/* Blog Teaser */}
      <section className="max-w-7xl mx-auto px-4 py-20 bg-white rounded-[3rem]">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-800 mb-4">Mẹo nhỏ cho mẹ - Vui khỏe cho bé</h2>
            <p className="text-gray-500">Chia sẻ kinh nghiệm chăm sóc bé từ chuyên gia</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => (
                  <div key={i} className="group cursor-pointer">
                      <div className="aspect-video rounded-3xl overflow-hidden mb-6">
                          <img src={`https://picsum.photos/500/300?baby-tips=${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-pink-500 transition-colors">Cách chọn vải quần áo an toàn cho bé sơ sinh</h4>
                      <p className="text-gray-500 text-sm line-clamp-2">Làn da của trẻ sơ sinh mỏng manh hơn người lớn đến 5 lần, vì thế việc chọn chất liệu là ưu tiên số 1...</p>
                  </div>
              ))}
          </div>
      </section>
    </div>
  );
};

export default HomePage;
