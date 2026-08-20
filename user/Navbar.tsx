
import React, { useEffect, useRef, useState } from 'react';
import { useCart } from './CartContext';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { navigate as navigatePath } from '../App';
import { buildProductPath } from './utils/urls';
import { BLOG_NAV_SECTIONS, blogSectionPath } from './utils/blogCategories';

type SearchSuggestion = {
  id: string;
  name: string;
  image: string;
  price: number;
  discountPrice?: number;
};

const BACKEND_PORT = 8888;
const getLogoUrl = (): string => {
  const env = typeof (import.meta as any)?.env !== 'undefined' ? (import.meta as any).env?.VITE_API_ORIGIN : '';
  const origin = env && String(env).trim()
    ? String(env).trim().replace(/\/+$/, '')
    : `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  return `${origin}/static/images/${encodeURIComponent('Logo Unbee-01.png')}`;
};

const Navbar: React.FC = () => {
  const { totalQuantity } = useCart();
  const { customer, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [mobileProductMenuOpen, setMobileProductMenuOpen] = useState(false);
  const [mobileProductOpenSection, setMobileProductOpenSection] = useState<string>('so-sinh');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const closeMobile = () => setMobileOpen(false);
  const navigate = (path: string) => {
    navigatePath(path);
    setMobileOpen(false);
  };

  const getCatFromCurrentUrl = (): string | null => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      return params.get('cat');
    } catch {
      return null;
    }
  };

  const openSearch = () => {
    try {
      const params = new URLSearchParams(window.location.search || '');
      setSearchText(params.get('q') || '');
    } catch {
      setSearchText('');
    }
    setActiveSuggestionIndex(-1);
    setSearchOpen(true);
  };

  const submitSearch = (q: string) => {
    const trimmed = q.trim();
    const params = new URLSearchParams();
    const cat = getCatFromCurrentUrl();
    if (cat) params.set('cat', cat);
    if (trimmed) params.set('q', trimmed);
    const qs = params.toString();
    navigate(`/products${qs ? '?' + qs : ''}`);
    setActiveSuggestionIndex(-1);
    setSearchOpen(false);
  };

  const openProductDetail = (productId: string) => {
    navigate(buildProductPath({ id: productId }));
    setActiveSuggestionIndex(-1);
    setSearchOpen(false);
  };

  const mobileProductSections: Array<{
    key: string;
    title: string;
    items: Array<{ label: string; href: string }>;
  }> = [
    {
      key: 'so-sinh',
      title: 'Sơ sinh 0-12M',
      items: [
        { label: 'Nhộng chũn & túi ngủ', href: '/products?cat=nhong-chun' },
        { label: 'Body & quần áo sơ sinh', href: '/products?cat=so-sinh&q=body' },
        { label: 'Combo sơ sinh', href: '/products?cat=combo-di-sinh-kem-qua' },
      ],
    },
    {
      key: 'be-lon',
      title: 'Bé 1Y-4Y',
      items: [
        { label: 'Quần áo thời trang', href: '/products?cat=be' },
        { label: 'Đồ ngủ', href: '/products?cat=be&q=m%E1%BA%B7c%20nh%C3%A0' },
        { label: 'Set outfit', href: '/products?cat=be&q=set' },
      ],
    },
    {
      key: 'phu-kien',
      title: 'Phụ kiện',
      items: [
        { label: 'Gối', href: '/products?cat=phu-kien&q=g%E1%BB%91i' },
        { label: 'Chăn ủ', href: '/products?cat=phu-kien&q=ch%C4%83n' },
        { label: 'Khăn yếm', href: '/products?cat=phu-kien&q=kh%C4%83n%20y%E1%BA%BFm' },
        { label: 'Túi mẹ bỉm sữa', href: '/products?q=t%C3%BAi%20b%E1%BB%89m' },
        { label: 'Địu', href: '/products?cat=phu-kien&q=%C4%91%E1%BB%8Bu' },
      ],
    },
    {
      key: 'xem-them',
      title: 'Xem thêm',
      items: [
        { label: 'Đồ chip bé gái', href: '/products?cat=do-chip-be-gai' },
        { label: 'Best Seller', href: '/products?sort=bestseller' },
        { label: 'Combo đi sinh', href: '/products?cat=combo-di-sinh-kem-qua' },
        { label: 'Box quà cho mẹ', href: '/products?cat=combo-di-sinh-kem-qua' },
        { label: 'Giảm giá', href: '/products?cat=giam-gia' },
      ],
    },
  ];

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

  useEffect(() => {
    if (!searchOpen) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    const keyword = searchText.trim();
    if (keyword.length < 2) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(() => {
      setSearchLoading(true);
      void api
        .getProductsPage({ q: keyword, page: 1, per_page: 6, useCache: true })
        .then((res) => {
          if (cancelled) return;
          const mapped: SearchSuggestion[] = (res.items || []).map((p: any) => ({
            id: String(p.id),
            name: String(p.name || ''),
            image: api.toListThumbApiUrl(
              (Array.isArray(p.images) && p.images[0]) ? String(p.images[0]) : '',
              240,
            ) || 'https://picsum.photos/120/120?product',
            price: Number(p.price || 0),
            discountPrice: p.discountPrice != null ? Number(p.discountPrice) : undefined,
          }));
          setSearchSuggestions(mapped);
        })
        .catch(() => {
          if (cancelled) return;
          setSearchSuggestions([]);
          setActiveSuggestionIndex(-1);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [searchOpen, searchText]);

  return (
    <nav className="sticky top-0 z-50 bg-[#F8F3EC]/90 backdrop-blur-md border-b border-[#E5D6C4]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between h-16 md:h-[72px] items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer h-14 md:h-[72px] w-[132px] md:w-[164px] overflow-hidden" onClick={() => navigate('/')}>
            <img
              src={getLogoUrl()}
              alt="Unbee"
              className="h-full w-auto max-w-none object-contain object-left origin-left scale-[1.65] md:scale-[1.8]"
              loading="eager"
              decoding="async"
            />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
              Trang chủ
            </a>
            <div className="group relative">
                <a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }} className="text-[#6B5645] font-medium transition-all flex items-center hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
                    Sản phẩm
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                </a>
                {/* Mega menu (UI-first). Links reuse current cat/q filters; no DB changes. */}
                <div className="absolute top-full mt-2 left-[58%] -translate-x-1/2 w-[900px] max-w-[calc(100vw-2rem)] bg-[#FFF9F1] shadow-2xl rounded-2xl p-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-[#E5D6C4]">
                  <div className="grid grid-cols-12 gap-5">
                    <div className="col-span-4">
                      <div className="text-sm font-black text-[#4B3B32] mb-2.5">Sơ sinh 0-12M</div>
                      <div className="space-y-1">
                        <a href="/products?cat=nhong-chun" onClick={(e) => { e.preventDefault(); navigate('/products?cat=nhong-chun'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Nhộng chũn &amp; túi ngủ
                        </a>
                        <a href="/products?cat=so-sinh&q=body" onClick={(e) => { e.preventDefault(); navigate('/products?cat=so-sinh&q=body'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Body &amp; quần áo sơ sinh
                        </a>
                        <a href="/products?cat=combo-di-sinh-kem-qua" onClick={(e) => { e.preventDefault(); navigate('/products?cat=combo-di-sinh-kem-qua'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Combo sơ sinh
                        </a>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <div className="text-sm font-black text-[#4B3B32] mb-2.5">Bé 1Y-4Y</div>
                      <div className="space-y-1">
                        <a href="/products?cat=be" onClick={(e) => { e.preventDefault(); navigate('/products?cat=be'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Quần áo thời trang
                        </a>
                        <a href="/products?cat=be&q=m%E1%BA%B7c%20nh%C3%A0" onClick={(e) => { e.preventDefault(); navigate('/products?cat=be&q=m%E1%BA%B7c%20nh%C3%A0'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Đồ ngủ
                        </a>
                        <a href="/products?cat=be&q=set" onClick={(e) => { e.preventDefault(); navigate('/products?cat=be&q=set'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Set outfit
                        </a>
                      </div>
                    </div>

                    <div className="col-span-3">
                      <div className="text-sm font-black text-[#4B3B32] mb-2.5">Phụ kiện</div>
                      <div className="space-y-1">
                        <a href="/products?cat=phu-kien&q=g%E1%BB%91i" onClick={(e) => { e.preventDefault(); navigate('/products?cat=phu-kien&q=g%E1%BB%91i'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Gối
                        </a>
                        <a href="/products?cat=phu-kien&q=ch%C4%83n" onClick={(e) => { e.preventDefault(); navigate('/products?cat=phu-kien&q=ch%C4%83n'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Chăn Ủ
                        </a>
                        <a href="/products?cat=phu-kien&q=kh%C4%83n%20y%E1%BA%BFm" onClick={(e) => { e.preventDefault(); navigate('/products?cat=phu-kien&q=kh%C4%83n%20y%E1%BA%BFm'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Khăn yếm
                        </a>
                        <a href="/products?q=t%C3%BAi%20b%E1%BB%89m" onClick={(e) => { e.preventDefault(); navigate('/products?q=t%C3%BAi%20b%E1%BB%89m'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Túi mẹ bỉm sữa
                        </a>
                        <a href="/products?cat=phu-kien&q=%C4%91%E1%BB%8Bu" onClick={(e) => { e.preventDefault(); navigate('/products?cat=phu-kien&q=%C4%91%E1%BB%8Bu'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Địu
                        </a>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <div className="text-sm font-black text-[#4B3B32] mb-2.5">Xem thêm</div>
                      <div className="space-y-1">
                        <a href="/products?cat=do-chip-be-gai" onClick={(e) => { e.preventDefault(); navigate('/products?cat=do-chip-be-gai'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Đồ chip bé gái
                        </a>
                        <a href="/products?sort=bestseller" onClick={(e) => { e.preventDefault(); navigate('/products?sort=bestseller'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Best Seller
                        </a>
                        <a href="/products?cat=combo-di-sinh-kem-qua" onClick={(e) => { e.preventDefault(); navigate('/products?cat=combo-di-sinh-kem-qua'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Combo đi sinh
                        </a>
                        <a href="/products?cat=combo-di-sinh-kem-qua" onClick={(e) => { e.preventDefault(); navigate('/products?cat=combo-di-sinh-kem-qua'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Box quà cho mẹ
                        </a>
                        <a href="/products?cat=giam-gia" onClick={(e) => { e.preventDefault(); navigate('/products?cat=giam-gia'); }} className="block rounded-xl px-3 py-1.5 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A]">
                          Giảm giá
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            <a href="/collections" onClick={(e) => { e.preventDefault(); navigate('/collections'); }} className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
              Bộ sưu tập
            </a>
            <div className="group relative">
              <a href={blogSectionPath('tin-tuc')} onClick={(e) => { e.preventDefault(); navigate(blogSectionPath('tin-tuc')); }} className="text-[#6B5645] font-medium transition-all flex items-center hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
                Blog
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
              </a>
              <div className="absolute top-full -left-6 w-64 bg-[#FFF9F1] shadow-xl rounded-xl py-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-[#E5D6C4]">
                {BLOG_NAV_SECTIONS.map((section) => (
                  <a
                    key={section.slug}
                    href={blogSectionPath(section.slug)}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(blogSectionPath(section.slug));
                    }}
                    className="block px-4 py-2 text-[#6B5645] hover:bg-[#F2E3D4] hover:text-[#B58A5A] text-sm"
                  >
                    {section.label}
                  </a>
                ))}
              </div>
            </div>
            <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} className="text-[#6B5645] font-medium transition-all hover:text-[#B58A5A] hover:-translate-y-0.5 hover:scale-[1.02] hover:underline underline-offset-4 decoration-[#B58A5A]/60">
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
            <a href="/cart" onClick={(e) => { e.preventDefault(); navigate('/cart'); }} className="relative p-2 text-[#8B7765] hover:text-[#B58A5A] transition-colors">
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
              href={customer ? '/account' : '/login'}
              onClick={(e) => { e.preventDefault(); navigate(customer ? '/account' : '/login'); }}
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-white shadow-lg shadow-pink-200"
              style={{ backgroundColor: '#B58A5A' }}
            >
              <span className="text-sm">{customer ? (customer.name || 'Tài khoản') : 'Đăng nhập'}</span>
            </a>
            {customer && (
              <button
                onClick={() => { logout(); navigate('/'); }}
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
              <div className="flex items-center h-14 w-[140px] overflow-hidden">
                <img
                  src={getLogoUrl()}
                  alt="Unbee"
                  className="h-full w-auto max-w-none object-contain object-left origin-left scale-[1.85]"
                  loading="eager"
                  decoding="async"
                />
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
                onClick={() => navigate(customer ? '/account' : '/login')}
                className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70 font-black"
              >
                {customer ? 'Tài khoản' : 'Đăng nhập'}
              </button>
              <button onClick={() => navigate('/')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Trang chủ
              </button>
              <button onClick={() => navigate('/products')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Sản phẩm
              </button>
              <div className="border-b border-[#E5D6C4]/70">
                <button
                  type="button"
                  onClick={() => setMobileProductMenuOpen((v) => !v)}
                  className="w-full py-2.5 flex items-center justify-between text-left font-semibold text-[#4B3B32]"
                  aria-expanded={mobileProductMenuOpen}
                >
                  <span>Danh mục sản phẩm</span>
                  <span className="text-xl leading-none text-[#9B7248]">
                    {mobileProductMenuOpen ? '−' : '+'}
                  </span>
                </button>
                {mobileProductMenuOpen && (
                  <div className="pb-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => navigate('/products')}
                      className="w-full text-left rounded-lg px-3 py-2 text-sm font-bold text-[#6B5645] bg-[#F7EFE4]"
                    >
                      Xem tất cả sản phẩm
                    </button>
                    {mobileProductSections.map((section) => {
                      const expanded = mobileProductOpenSection === section.key;
                      return (
                        <div key={section.key} className="rounded-lg border border-[#EADACA] bg-[#FFF9F1]">
                          <button
                            type="button"
                            onClick={() =>
                              setMobileProductOpenSection((prev) => (prev === section.key ? '' : section.key))
                            }
                            className="w-full px-3 py-2 flex items-center justify-between text-left text-sm font-black text-[#4B3B32]"
                            aria-expanded={expanded}
                          >
                            <span>{section.title}</span>
                            <span className="text-lg leading-none text-[#9B7248]">{expanded ? '−' : '+'}</span>
                          </button>
                          {expanded && (
                            <div className="pb-2 px-2 space-y-1">
                              {section.items.map((item) => (
                                <button
                                  key={item.href}
                                  type="button"
                                  onClick={() => navigate(item.href)}
                                  className="w-full text-left rounded-md px-2.5 py-1.5 text-sm text-[#6B5645] hover:bg-[#F2E3D4]"
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/collections')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Bộ sưu tập
              </button>
              {BLOG_NAV_SECTIONS.map((section) => (
                <button
                  key={section.slug}
                  onClick={() => navigate(blogSectionPath(section.slug))}
                  className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70 pl-3"
                >
                  {section.label}
                </button>
              ))}
              <button onClick={() => navigate('/about')} className="w-full text-left py-2.5 border-b border-[#E5D6C4]/70">
                Về Unbee
              </button>
              <button onClick={() => navigate('/cart')} className="w-full text-left py-2.5">
                Giỏ hàng {totalQuantity > 0 && <span className="ml-1 text-xs text-pink-600 font-bold">({totalQuantity})</span>}
              </button>
              {customer && (
                <button
                  onClick={() => { logout(); navigate('/'); }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchOpen(false);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (searchSuggestions.length === 0) return;
                    setActiveSuggestionIndex((prev) => {
                      if (prev < 0) return 0;
                      return prev >= searchSuggestions.length - 1 ? 0 : prev + 1;
                    });
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (searchSuggestions.length === 0) return;
                    setActiveSuggestionIndex((prev) => {
                      if (prev < 0) return searchSuggestions.length - 1;
                      return prev <= 0 ? searchSuggestions.length - 1 : prev - 1;
                    });
                    return;
                  }
                  if (e.key === 'Enter') {
                    if (
                      activeSuggestionIndex >= 0 &&
                      activeSuggestionIndex < searchSuggestions.length
                    ) {
                      e.preventDefault();
                      openProductDetail(searchSuggestions[activeSuggestionIndex].id);
                    }
                  }
                }}
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
              <div className="text-xs text-gray-500">↑ ↓ để chọn • Enter để mở/tìm</div>
            </div>

            {searchText.trim().length >= 2 && (
              <div className="mt-3 border border-[#E5D6C4]/80 rounded-xl bg-white/90 max-h-80 overflow-auto">
                {searchLoading ? (
                  <div className="px-3 py-3 text-sm text-gray-500 font-medium">Đang gợi ý sản phẩm...</div>
                ) : searchSuggestions.length > 0 ? (
                  <div className="divide-y divide-[#EFE4D8]">
                    {searchSuggestions.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openProductDetail(p.id)}
                        onMouseEnter={() => setActiveSuggestionIndex(idx)}
                        className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-3 ${
                          idx === activeSuggestionIndex ? 'bg-[#FFF0DE]' : 'hover:bg-[#FFF7EC]'
                        }`}
                      >
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-800 truncate">{p.name}</div>
                          <div className="text-xs text-gray-500">
                            {p.discountPrice != null ? (
                              <>
                                <span className="font-bold text-pink-600 mr-1">{p.discountPrice.toLocaleString()}đ</span>
                                <span className="line-through">{p.price.toLocaleString()}đ</span>
                              </>
                            ) : (
                              <span className="font-bold text-gray-700">{p.price.toLocaleString()}đ</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => submitSearch(searchText)}
                      className="w-full text-center px-3 py-2 text-xs font-bold text-[#8B6A47] hover:bg-[#FFF7EC]"
                    >
                      Xem tất cả kết quả cho "{searchText.trim()}"
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-3 text-sm text-gray-500">Không có sản phẩm phù hợp</div>
                )}
              </div>
            )}
          </form>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
