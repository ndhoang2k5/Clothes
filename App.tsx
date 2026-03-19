
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

const Footer: React.FC = () => (
  <footer className="bg-[#3B2C24] text-white pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-4 mb-10">
      <ErrorBoundary>
        <FooterBannerBlock />
      </ErrorBoundary>
    </div>
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center mb-6">
          <span className="text-3xl font-black text-[#F4E1CD]">unbee</span>
          <div className="w-2 h-2 bg-[#D6A86A] rounded-full ml-1"></div>
        </div>
        <p className="text-gray-400 leading-relaxed mb-6">
          Đồng hành cùng ba mẹ trong hành trình chăm sóc những thiên thần nhỏ. 
          Sản phẩm chất lượng cao, an toàn tuyệt đối.
        </p>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6">Về Unbee</h4>
        <ul className="space-y-4 text-[#E5D6C4]">
          <li><a href="#/about" className="hover:text-white transition-colors">Giới thiệu</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6">Chính sách</h4>
        <ul className="space-y-4 text-[#E5D6C4]">
          <li><a href="#" className="hover:text-white transition-colors">Chính sách đổi trả</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Điều khoản dịch vụ</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6">Liên hệ</h4>
        <ul className="space-y-4 text-[#E5D6C4]">
          <li className="flex items-center gap-3">0987.654.321</li>
          <li className="flex items-center gap-3">hello@unbee.vn</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-20 pt-10 border-t border-white/10 text-center text-[#C2B3A4] text-sm">
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
    <section className="w-full py-6 bg-[#F8F3EC]" aria-label="Banner chân trang">
      <div className="max-w-7xl mx-auto px-4">
        <div className="rounded-2xl overflow-hidden border-2 border-[#B58A5A] shadow-lg min-h-[180px] md:min-h-[220px] bg-[#FFF9F1]">
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
