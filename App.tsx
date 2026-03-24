
import React, { useState, useEffect, Component } from 'react';
import Navbar from './user/Navbar';
import HomePage from './user/HomePage';
import ProductPage from './user/ProductPage';
import CollectionPage from './user/CollectionPage';
import ProductDetailPage from './user/ProductDetailPage';
import AboutPage from './user/AboutPage';
import BlogPage from './user/BlogPage';
import TipsPage from './user/TipsPage';
import BlogPostPage from './user/BlogPostPage';
import CartPage from './user/CartPage';
import OrderSuccessPage from './user/OrderSuccessPage';
import { CartProvider } from './user/CartContext';
import { AuthProvider } from './user/AuthContext';
import LoginPage from './user/LoginPage';
import AccountPage from './user/AccountPage';
import { api } from './services/api';
import type { AdminBanner } from './types';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
  state = { hasError: false, message: '' };
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-black text-gray-800 mb-2">Đã xảy ra lỗi</h2>
          <p className="text-gray-500 mb-4">{this.state.message}</p>
          <a href="#/" className="text-pink-500 font-bold hover:underline">Về trang chủ</a>
        </div>
      );
    }
    return this.props.children;
  }
}

const COMPANY_INFO = {
  legalName: 'Công ty TNHH U&B Việt Nam',
  taxCode: '0111307364',
  address: 'Số 15, ngõ 01, KTT Tăng Thiết Giáp, đường Phạm Văn Nghị, Đông Ngạc, Hà Nội',
  brand: 'Unbee',
  origin: 'Việt Nam',
  hotlineDisplay: '033 667 4688',
  hotlineTel: '0336674688',
  email: 'hello@unbee.vn',
  messengerUrl: 'https://www.facebook.com/messages/t/115598328165203',
  facebookUrl: 'https://www.facebook.com/thoitrangunbee/',
} as const;

const Footer: React.FC = () => (
  <footer className="bg-[#3B2C24] text-white pb-10">
    <ErrorBoundary>
      <FooterBannerBlock />
    </ErrorBoundary>
    <div className="max-w-7xl mx-auto px-4 pt-14 md:pt-20 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center mb-5 md:mb-6">
          <span className="text-3xl font-black text-[#F4E1CD]">unbee</span>
          <div className="w-2 h-2 bg-[#D6A86A] rounded-full ml-1"></div>
        </div>
        <p className="text-gray-400 leading-8 md:leading-relaxed mb-2 md:mb-6">
          Đồng hành cùng ba mẹ trong hành trình chăm sóc những thiên thần nhỏ.
          Sản phẩm chất lượng cao, an toàn tuyệt đối.
        </p>
      </div>

      <details className="md:hidden border-t border-white/10 pt-4 text-[#E5D6C4]">
        <summary className="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-white">
          Về Unbee
          <span className="text-white/70 text-xl leading-none">+</span>
        </summary>
        <ul className="space-y-4 pt-4 pb-1 leading-8">
          <li><a href="#/about" className="hover:text-white transition-colors">Giới thiệu</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
        </ul>
      </details>
      <div className="hidden md:block">
        <h4 className="font-bold text-lg mb-6">Về Unbee</h4>
        <ul className="space-y-4 text-[#E5D6C4]">
          <li><a href="#/about" className="hover:text-white transition-colors">Giới thiệu</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
        </ul>
      </div>

      <details className="md:hidden border-t border-white/10 pt-4 text-[#E5D6C4]">
        <summary className="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-white">
          Chính sách
          <span className="text-white/70 text-xl leading-none">+</span>
        </summary>
        <ul className="space-y-4 pt-4 pb-1 leading-8">
          <li><a href="#" className="hover:text-white transition-colors">Chính sách đổi trả</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
        </ul>
      </details>
      <div className="hidden md:block">
        <h4 className="font-bold text-lg mb-6">Chính sách</h4>
        <ul className="space-y-4 text-[#E5D6C4]">
          <li><a href="#" className="hover:text-white transition-colors">Chính sách đổi trả</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
        </ul>
      </div>

      <details className="md:hidden border-t border-white/10 pt-4 text-[#E5D6C4]" open>
        <summary className="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-white">
          Liên hệ
          <span className="text-white/70 text-xl leading-none">+</span>
        </summary>
        <div className="space-y-3 pt-4 pb-1 leading-8 text-[#E5D6C4]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-white leading-7">
            {COMPANY_INFO.legalName}
          </p>
          <p className="text-sm leading-7">Mã số doanh nghiệp: {COMPANY_INFO.taxCode}</p>
          <p className="text-sm leading-7 flex items-start gap-2">
            <svg className="w-4 h-4 mt-1 text-[#D6A86A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Địa chỉ: {COMPANY_INFO.address}</span>
          </p>
          <p className="text-sm leading-7">Nhãn hiệu: {COMPANY_INFO.brand} - Xuất xứ: {COMPANY_INFO.origin}</p>
          <div className="pt-2 border-t border-white/10 space-y-2">
            <a href={`tel:${COMPANY_INFO.hotlineTel}`} className="flex items-center gap-2 text-sm hover:text-white transition-colors">
              <svg className="w-4 h-4 text-[#D6A86A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2.28a2 2 0 011.94 1.515l.92 3.68a2 2 0 01-.55 1.94l-1.2 1.2a16 16 0 006.27 6.27l1.2-1.2a2 2 0 011.94-.55l3.68.92A2 2 0 0121 16.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Hotline: {COMPANY_INFO.hotlineDisplay}</span>
            </a>
            <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-2 text-sm hover:text-white transition-colors">
              <svg className="w-4 h-4 text-[#D6A86A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-16 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Email: {COMPANY_INFO.email}</span>
            </a>
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm font-bold text-white mb-2">Mạng xã hội</p>
            <div className="flex flex-wrap gap-2">
              <a href={COMPANY_INFO.messengerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-colors text-sm">
                Messenger
              </a>
              <a href={COMPANY_INFO.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-colors text-sm">
                Facebook
              </a>
            </div>
          </div>
        </div>
      </details>
      <div className="hidden md:block">
        <h4 className="font-bold text-lg mb-6">Liên hệ</h4>
        <div className="space-y-3 text-[#E5D6C4]">
          <p className="text-sm font-extrabold uppercase tracking-wide text-white">
            {COMPANY_INFO.legalName}
          </p>
          <p className="text-sm leading-relaxed">Mã số doanh nghiệp: {COMPANY_INFO.taxCode}</p>
          <p className="text-sm leading-relaxed flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 text-[#D6A86A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Địa chỉ: {COMPANY_INFO.address}</span>
          </p>
          <p className="text-sm">Nhãn hiệu: {COMPANY_INFO.brand} - Xuất xứ: {COMPANY_INFO.origin}</p>
          <div className="pt-2 border-t border-white/10 space-y-2">
            <a href={`tel:${COMPANY_INFO.hotlineTel}`} className="flex items-center gap-2 text-sm hover:text-white transition-colors">
              <svg className="w-4 h-4 text-[#D6A86A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2.28a2 2 0 011.94 1.515l.92 3.68a2 2 0 01-.55 1.94l-1.2 1.2a16 16 0 006.27 6.27l1.2-1.2a2 2 0 011.94-.55l3.68.92A2 2 0 0121 16.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Hotline: {COMPANY_INFO.hotlineDisplay}</span>
            </a>
            <a href={`mailto:${COMPANY_INFO.email}`} className="flex items-center gap-2 text-sm hover:text-white transition-colors">
              <svg className="w-4 h-4 text-[#D6A86A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-16 9h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Email: {COMPANY_INFO.email}</span>
            </a>
          </div>
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm font-bold text-white mb-2">Mạng xã hội</p>
            <div className="flex flex-wrap gap-2">
              <a href={COMPANY_INFO.messengerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-colors text-sm">
                Messenger
              </a>
              <a href={COMPANY_INFO.facebookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-colors text-sm">
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-12 md:mt-20 pt-8 md:pt-10 border-t border-white/10 text-center text-[#C2B3A4] text-sm">
      © 2024 Unbee Baby. All rights reserved. Crafted with ♥ cho bé yêu.
    </div>
  </footer>
);

const FooterBannerBlock: React.FC = () => {
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api
      .userListBannersBySlot('footer_banner')
      .then((list) => setBanners(Array.isArray(list) ? list : []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, []);
  return (
    <section className="w-full mb-10 bg-[#F8F3EC]" aria-label="Banner chân trang">
      <div className="w-full overflow-hidden border-y-2 border-[#B58A5A] shadow-lg min-h-[180px] md:min-h-[220px] bg-[#FFF9F1]">
        {loading ? (
          <div className="h-[180px] md:h-[220px] flex items-center justify-center text-[#6B5645] font-medium">
            Đang tải banner...
          </div>
        ) : banners && banners.length > 0 ? (
          banners.map((b) => (
            <a
              key={b.id}
              href={b.link_url || '#/products'}
              className="block relative h-[180px] md:h-[220px] bg-[#FFF9F1]"
            >
              <img
                src={b.image_url}
                alt={b.title || 'Banner'}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent flex items-center px-8 md:px-12">
                {(b.title || b.subtitle) && (
                  <div className="text-white max-w-xl">
                    {b.title && <h3 className="text-xl md:text-2xl font-black mb-1">{b.title}</h3>}
                    {b.subtitle && <p className="text-white/90 text-sm md:text-base">{b.subtitle}</p>}
                  </div>
                )}
              </div>
            </a>
          ))
        ) : (
          <div className="h-[180px] md:h-[220px] flex flex-col items-center justify-center text-center px-6 text-[#4B3B32]">
            <p className="text-lg font-black mb-2">Banner chân trang</p>
            <p className="text-sm max-w-md text-[#6B5645]">
              Thêm banner tại Admin → Banners → chọn vị trí &quot;Banner chân trang&quot;, bật hiển thị và lưu.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

const App: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderRoute = () => {
    const [path] = currentHash.split('?');

    if (path.startsWith('#/product/')) {
      const id = path.split('/')[2] || '';
      return (
        <ErrorBoundary>
          <ProductDetailPage productId={id} />
        </ErrorBoundary>
      );
    }

    if (path.startsWith('#/blog/post/')) {
      const parts = path.split('/');
      const blogId = parts[parts.length - 1] || '';
      return (
        <ErrorBoundary>
          <BlogPostPage blogId={blogId} />
        </ErrorBoundary>
      );
    }

    switch (path) {
      case '#/products':
        return <ProductPage />;
      case '#/collections':
        return <CollectionPage />;
      case '#/blog':
        return <BlogPage />;
      case '#/tips':
        return <TipsPage />;
      case '#/cart':
        return <CartPage />;
      case '#/login':
        return <LoginPage />;
      case '#/account':
        return <AccountPage />;
      case '#/order-success':
        return <OrderSuccessPage />;
      case '#/about':
        return <AboutPage />;
      case '#/':
      default:
        return <HomePage />;
    }
  };

  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex flex-col min-h-screen bg-[#F8F3EC]">
          <Navbar />
          <main className="flex-grow min-h-[80vh]">
            {renderRoute()}
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
