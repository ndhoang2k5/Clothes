
import React, { useState, useEffect, Component } from 'react';
import Navbar from './user/Navbar';
import HomePage from './user/HomePage';
import ProductPage from './user/ProductPage';
import CollectionPage from './user/CollectionPage';
import ProductDetailPage from './user/ProductDetailPage';
import AboutPage from './user/AboutPage';

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

    switch (path) {
      case '#/products':
        return <ProductPage />;
      case '#/collections':
        return <CollectionPage />;
      case '#/about':
        return <AboutPage />;
      case '#/':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F3EC]">
      <Navbar />
      <main className="flex-grow min-h-[80vh]">
        {renderRoute()}
      </main>
      <Footer />
    </div>
  );
};

export default App;
