import React from 'react';

const Navbar: React.FC = () => (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
      <div className="flex items-center cursor-pointer" onClick={() => window.location.hash = '#/'}>
        <span className="text-3xl font-black text-pink-500">unbee</span>
        <div className="w-2 h-2 bg-pink-400 rounded-full ml-1"></div>
      </div>
      <div className="hidden md:flex space-x-8">
        <a href="#/" className="text-gray-600 hover:text-pink-500 font-medium">Trang chủ</a>
        <a href="#/products" className="text-gray-600 hover:text-pink-500 font-medium">Sản phẩm</a>
        <a href="#/collections" className="text-gray-600 hover:text-pink-500 font-medium">Bộ sưu tập</a>
      </div>
      <div className="flex space-x-4">
        <button className="text-gray-500 hover:text-pink-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></button>
      </div>
    </div>
  </nav>
);
export default Navbar;