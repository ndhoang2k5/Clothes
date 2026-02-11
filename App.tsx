
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
  // Thay đổi mặc định sang #/admin để đáp ứng yêu cầu "chỉ chạy admin"
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/admin');

  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || '#/admin';
      setCurrentHash(newHash);
      window.scrollTo(0, 0);
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Nếu chưa có hash, tự động chuyển sang trang admin dashboard
    if (!window.location.hash) {
      window.location.hash = '#/admin';
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const routePath = useMemo(() => currentHash.split('?')[0], [currentHash]);
  const isAdmin = useMemo(() => routePath.startsWith('#/admin'), [routePath]);

  // User Router (vẫn giữ lại để có thể chuyển đổi ngược lại nếu cần)
  const renderUserRoute = () => {
    switch (routePath) {
      case '#/': return <HomePage />;
      case '#/products': return <ProductPage />;
      case '#/collections': return <CollectionPage />;
      case '#/about': return <div className="max-w-7xl mx-auto px-4 py-20"><h2 className="text-4xl font-black mb-8">Về Unbee</h2></div>;
      default: return <HomePage />;
    }
  };

  // Admin Router
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

      {/* Switcher button để quay lại trang chủ khách hàng nếu muốn kiểm tra kết quả CMS */}
      <div className="fixed bottom-6 right-6 z-[999]">
         <a 
          href={isAdmin ? '#/' : '#/admin'} 
          className={`flex items-center gap-2 px-6 py-4 rounded-full text-xs font-black shadow-2xl transition-all border border-white/20 hover:scale-105 active:scale-95 ${
            isAdmin ? 'bg-gray-800 text-white' : 'bg-pink-500 text-white'
          }`}
         >
           {isAdmin ? (
             <>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
               Xem Trang Chủ Khách Hàng
             </>
           ) : (
             <>
               Quay lại CMS Admin
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
             </>
           )}
         </a>
      </div>
    </div>
  );
};

export default App;
