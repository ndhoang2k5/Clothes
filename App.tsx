
import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './user/Navbar';
import HomePage from './user/HomePage';
import ProductPage from './user/ProductPage';
import CollectionPage from './user/CollectionPage';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import ProductManagement from './admin/ProductManagement';
import OrderManagement from './admin/OrderManagement';
import CollectionManagement from './admin/CollectionManagement';
import BannerManagement from './admin/BannerManagement';
import IntroManagement from './admin/IntroManagement';

const Footer: React.FC = () => (
  <footer className="bg-gray-900 text-white pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
      <div className="col-span-1 md:col-span-1">
        <div className="flex items-center mb-6">
          <span className="text-3xl font-black text-pink-500">unbee</span>
          <div className="w-2 h-2 bg-pink-400 rounded-full ml-1"></div>
        </div>
        <p className="text-gray-400 leading-relaxed mb-6">
          Đồng hành cùng ba mẹ trong hành trình chăm sóc những thiên thần nhỏ. 
          Sản phẩm chất lượng cao, an toàn tuyệt đối.
        </p>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6">Về Unbee</h4>
        <ul className="space-y-4 text-gray-400">
          <li><a href="#/about" className="hover:text-pink-400 transition-colors">Giới thiệu</a></li>
          <li><a href="#" className="hover:text-pink-400 transition-colors">Tuyển dụng</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6">Chính sách</h4>
        <ul className="space-y-4 text-gray-400">
          <li><a href="#" className="hover:text-pink-400 transition-colors">Chính sách đổi trả</a></li>
          <li><a href="#" className="hover:text-pink-400 transition-colors">Điều khoản dịch vụ</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-bold text-lg mb-6">Liên hệ</h4>
        <ul className="space-y-4 text-gray-400">
          <li className="flex items-center gap-3">0987.654.321</li>
          <li className="flex items-center gap-3">hello@unbee.vn</li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 mt-20 pt-10 border-t border-white/10 text-center text-gray-500 text-sm">
        © 2024 Unbee Baby. All rights reserved. Crafted with ❤️ cho bé yêu.
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

  const routePath = useMemo(() => currentHash.split('?')[0], [currentHash]);
  const isAdmin = useMemo(() => routePath.startsWith('#/admin'), [routePath]);

  const renderUserRoute = () => {
    switch (routePath) {
      case '#/': return <HomePage />;
      case '#/products': return <ProductPage />;
      case '#/collections': return <CollectionPage />;
      case '#/about': return <div className="max-w-7xl mx-auto px-4 py-20"><h2 className="text-4xl font-black mb-8">Về Unbee</h2></div>;
      default: return <HomePage />;
    }
  };

  const renderAdminRoute = () => {
    switch (routePath) {
      case '#/admin/products': return <ProductManagement />;
      case '#/admin/orders': return <OrderManagement />;
      case '#/admin/collections': return <CollectionManagement />;
      case '#/admin/banners': return <BannerManagement />;
      case '#/admin/intro': return <IntroManagement />;
      case '#/admin':
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? (
        <AdminLayout>
            {renderAdminRoute()}
        </AdminLayout>
      ) : (
        <>
          <Navbar />
          <main className="min-h-[80vh]">
            {renderUserRoute()}
          </main>
          <Footer />
        </>
      )}

      {/* Dev Switcher - Hidden on production but useful for your current dual-port test */}
      <div className="fixed bottom-6 right-6 z-[999]">
         <a 
          href={isAdmin ? '#/' : '#/admin'} 
          className={`flex items-center gap-2 px-6 py-4 rounded-full text-xs font-black shadow-2xl transition-all border border-white/20 hover:scale-105 active:scale-95 ${
            isAdmin ? 'bg-gray-800 text-white' : 'bg-pink-500 text-white'
          }`}
         >
           {isAdmin ? "Xem Shop 🛍️" : "Quản lý ⚙️"}
         </a>
      </div>
    </div>
  );
};

export default App;
