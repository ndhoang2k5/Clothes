
import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => window.location.hash = '#/'}>
            <span className="text-3xl font-black tracking-tighter text-pink-500">unbee</span>
            <div className="w-2 h-2 bg-pink-400 rounded-full ml-1"></div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#/" className="text-gray-600 hover:text-pink-500 font-medium transition-colors">Trang chủ</a>
            <div className="group relative">
                <a href="#/products" className="text-gray-600 hover:text-pink-500 font-medium transition-colors flex items-center">
                    Sản phẩm
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                </a>
                {/* Mega menu simple */}
                <div className="absolute top-full -left-4 w-48 bg-white shadow-xl rounded-xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-gray-50">
                    <a href="#/products?cat=so-sinh" className="block px-4 py-2 text-gray-600 hover:bg-pink-50 hover:text-pink-500">Đồ sơ sinh</a>
                    <a href="#/products?cat=be-trai" className="block px-4 py-2 text-gray-600 hover:bg-pink-50 hover:text-pink-500">Bé trai</a>
                    <a href="#/products?cat=be-gai" className="block px-4 py-2 text-gray-600 hover:bg-pink-50 hover:text-pink-500">Bé gái</a>
                </div>
            </div>
            <a href="#/collections" className="text-gray-600 hover:text-pink-500 font-medium transition-colors">Bộ sưu tập</a>
            <a href="#/blog" className="text-gray-600 hover:text-pink-500 font-medium transition-colors">Blog</a>
            <a href="#/about" className="text-gray-600 hover:text-pink-500 font-medium transition-colors">Về Unbee</a>
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-5">
            <button className="p-2 text-gray-500 hover:text-pink-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <a href="#/cart" className="relative p-2 text-gray-500 hover:text-pink-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="absolute top-0 right-0 bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
            </a>
            <button className="md:hidden p-2 text-gray-500">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
