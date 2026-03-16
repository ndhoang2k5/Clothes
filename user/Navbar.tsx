
import React, { useState } from 'react';
import { useCart } from './CartContext';

const Navbar: React.FC = () => {
  const { totalQuantity } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);
  const navigate = (hash: string) => {
    window.location.hash = hash;
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#F8F3EC]/90 backdrop-blur-md border-b border-[#E5D6C4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => navigate('#/')}>
            <span className="text-3xl font-black tracking-tighter text-[#B58A5A]">unbee</span>
            <div className="w-2 h-2 bg-[#D6A86A] rounded-full ml-1"></div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#/" className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
              Trang chủ
            </a>
            <div className="group relative">
                <a href="#/products" className="text-[#6B5645] font-medium transition-all flex items-center hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
                    Sản phẩm
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                </a>
                {/* Mega menu simple */}
                <div className="absolute top-full -left-4 w-48 bg-[#FFF9F1] shadow-xl rounded-xl py-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-[#E5D6C4]">
                    <a href="#/products?cat=so-sinh" className="block px-4 py-2 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">Đồ sơ sinh</a>
                    <a href="#/products?cat=be-trai" className="block px-4 py-2 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">Bé trai</a>
                    <a href="#/products?cat=be-gai" className="block px-4 py-2 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">Bé gái</a>
                </div>
            </div>
            <a href="#/collections" className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
              Bộ sưu tập
            </a>
            <a href="#/blog" className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
              Blog
            </a>
            <a href="#/about" className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
              Về Unbee
            </a>
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-5">
            <button className="p-2 text-[#8B7765] hover:text-[#B58A5A] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <a href="#/cart" className="relative p-2 text-[#8B7765] hover:text-[#B58A5A] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {totalQuantity > 0 && (
                <span className="absolute top-0 right-0 bg-[#B58A5A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalQuantity}
                </span>
              )}
            </a>
            <button
              className="md:hidden p-2 text-gray-500"
              onClick={() => setMobileOpen(true)}
              aria-label="Mở menu"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeMobile}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-0 bg-[#FDF8F0] rounded-b-3xl shadow-xl pt-4 pb-6">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="text-2xl font-black tracking-tighter text-[#B58A5A]">unbee</span>
                <div className="w-2 h-2 bg-[#D6A86A] rounded-full ml-1" />
              </div>
              <button
                className="p-2 rounded-full bg-white shadow-sm text-gray-600"
                onClick={closeMobile}
                aria-label="Đóng menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="px-4 space-y-1 text-base font-medium text-[#6B5645]">
              <button onClick={() => navigate('#/')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Trang chủ
              </button>
              <button onClick={() => navigate('#/products')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Sản phẩm
              </button>
              <button onClick={() => navigate('#/collections')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Bộ sưu tập
              </button>
              <button onClick={() => navigate('#/blog')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Blog
              </button>
              <button onClick={() => navigate('#/about')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Về Unbee
              </button>
              <button onClick={() => navigate('#/cart')} className="w-full text-left py-2.5">
                Giỏ hàng {totalQuantity > 0 && <span className="ml-1 text-xs text-pink-600 font-bold">({totalQuantity})</span>}
              </button>
            </nav>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
