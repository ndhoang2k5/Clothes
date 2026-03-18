
import React, { useEffect, useRef, useState } from 'react';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';

const Navbar: React.FC = () => {
  const { totalQuantity } = useCart();
  const { customer, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const closeMobile = () => setMobileOpen(false);
  const navigate = (hash: string) => {
    window.location.hash = hash;
    setMobileOpen(false);
  };

  const getCatFromCurrentHash = (): string | null => {
    try {
      const hash = String(window.location.hash || '');
      const [, query] = hash.split('?');
      const params = new URLSearchParams(query || '');
      return params.get('cat');
    } catch {
      return null;
    }
  };

  const openSearch = () => {
    try {
      const hash = String(window.location.hash || '');
      const [, query] = hash.split('?');
      const params = new URLSearchParams(query || '');
      setSearchText(params.get('q') || '');
    } catch {
      setSearchText('');
    }
    setSearchOpen(true);
  };

  const submitSearch = (q: string) => {
    const trimmed = q.trim();
    const params = new URLSearchParams();
    const cat = getCatFromCurrentHash();
    if (cat) params.set('cat', cat);
    if (trimmed) params.set('q', trimmed);
    const qs = params.toString();
    navigate(`#/products${qs ? '?' + qs : ''}`);
    setSearchOpen(false);
  };

  useEffect(() => {
    if (!searchOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(target)) return;
      setSearchOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [searchOpen]);

  return (
    <nav className="sticky top-0 z-50 bg-[#F8F3EC]/90 backdrop-blur-md border-b border-[#E5D6C4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
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
                    <a href="#/products?cat=uu-dai-cuoi-mua" className="block px-4 py-2 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">Ưu đãi cuối mùa</a>
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
            <button
              className="p-2 text-[#8B7765] hover:text-[#B58A5A] transition-colors"
              onClick={openSearch}
              aria-label="Tìm kiếm sản phẩm"
              type="button"
            >
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
            <a
              href={customer ? '#/account' : '#/login'}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-white shadow-lg shadow-pink-200"
              style={{ backgroundColor: '#B58A5A' }}
            >
              <span className="text-sm">{customer ? (customer.name || 'Tài khoản') : 'Đăng nhập'}</span>
            </a>
            {customer && (
              <button
                onClick={() => { logout(); navigate('#/'); }}
                className="hidden md:inline-flex px-3 py-2 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
                title="Đăng xuất"
              >
                Đăng xuất
              </button>
            )}
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
              <button
                onClick={() => navigate(customer ? '#/account' : '#/login')}
                className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70 font-black"
              >
                {customer ? 'Tài khoản' : 'Đăng nhập'}
              </button>
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
              {customer && (
                <button
                  onClick={() => { logout(); navigate('#/'); }}
                  className="w-full text-left py-2.5 text-red-600 font-black"
                >
                  Đăng xuất
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {searchOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-4 top-20 z-50 w-[330px] bg-[#FDF8F0] border border-[#E5D6C4]/70 rounded-2xl shadow-xl p-3"
        >
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="font-black text-gray-800 text-sm">Tìm kiếm</div>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-2 rounded-xl hover:bg-white/60"
              aria-label="Đóng tìm kiếm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(searchText);
            }}
          >
            <div className="flex gap-2">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Nhập tên hoặc SKU..."
                className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B58A5A]/35"
              />
              <button
                type="submit"
                className="bg-[#B58A5A] text-white px-4 py-2 rounded-xl font-bold hover:bg-[#A3784E] transition-colors whitespace-nowrap"
              >
                Tìm
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 px-1">
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  submitSearch('');
                }}
                className="text-xs font-bold text-gray-500 hover:text-gray-800"
              >
                Xóa
              </button>
              <div className="text-xs text-gray-500">Enter để tìm</div>
            </div>
          </form>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
