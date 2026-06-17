
import React, { useState, useEffect, Component, Suspense, lazy } from 'react';
import Navbar from './user/Navbar';
import { CartProvider } from './user/CartContext';
import { AuthProvider } from './user/AuthContext';
import { api } from './services/api';
import { PageLoadingFallback } from './user/components/PageLoadingFallback';

const HomePage = lazy(() => import('./user/HomePage'));
const ProductPage = lazy(() => import('./user/ProductPage'));
const CollectionPage = lazy(() => import('./user/CollectionPage'));
const ProductDetailPage = lazy(() => import('./user/ProductDetailPage'));
const AboutPage = lazy(() => import('./user/AboutPage'));
const BlogPage = lazy(() => import('./user/BlogPage'));
const TipsPage = lazy(() => import('./user/TipsPage'));
const BlogPostPage = lazy(() => import('./user/BlogPostPage'));
const CartPage = lazy(() => import('./user/CartPage'));
const OrderSuccessPage = lazy(() => import('./user/OrderSuccessPage'));
const LoginPage = lazy(() => import('./user/LoginPage'));
const AccountPage = lazy(() => import('./user/AccountPage'));

function parseIdFromSlug(segment: string): string {
  const s = String(segment || '').trim();
  const m = s.match(/^(\d+)(?:-|$)/);
  return m ? m[1] : '';
}

function notifyRouteChange() {
  try {
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    // ignore
  }
}

export function navigate(path: string) {
  const next = String(path || '').trim() || '/';
  if (typeof window === 'undefined') return;
  if (next === window.location.pathname + window.location.search) return;
  window.history.pushState({}, '', next);
  notifyRouteChange();
}

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
          <a href="/" className="text-pink-500 font-bold hover:underline">Về trang chủ</a>
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
  email: 'info@unbee.vn',
  messengerUrl: 'https://www.facebook.com/messages/t/115598328165203',
  facebookUrl: 'https://www.facebook.com/thoitrangunbee/',
  zaloUrl: 'https://zalo.me/0984493905',
} as const;

const MobileQuickContacts: React.FC = () => (
  <div className="md:hidden fixed right-3 bottom-24 z-50 flex flex-col gap-2">
    <a
      href={COMPANY_INFO.facebookUrl}
      target="_blank"
      rel="noreferrer"
      className="group w-11 h-11 rounded-full bg-white/85 backdrop-blur-sm text-[#1877F2] shadow-[0_8px_18px_rgba(24,119,242,0.25)] flex items-center justify-center opacity-85 hover:opacity-100 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-200"
      aria-label="Liên hệ Facebook"
      title="Facebook"
    >
      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M22 12a10 10 0 10-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.5-3.88 3.79-3.88 1.1 0 2.25.2 2.25.2v2.46h-1.27c-1.25 0-1.64.78-1.64 1.58V12h2.79l-.45 2.89h-2.34v6.99A10 10 0 0022 12z" />
      </svg>
    </a>
    <a
      href={COMPANY_INFO.zaloUrl}
      target="_blank"
      rel="noreferrer"
      className="group w-11 h-11 rounded-full bg-white/85 backdrop-blur-sm text-[#0A7CFF] shadow-[0_8px_18px_rgba(10,124,255,0.25)] flex items-center justify-center opacity-85 hover:opacity-100 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-200 font-black text-[10px] tracking-wide"
      aria-label="Liên hệ Zalo"
      title="Zalo"
    >
      <span className="group-hover:scale-110 transition-transform">Zalo</span>
    </a>
    <a
      href={`tel:${COMPANY_INFO.hotlineTel}`}
      className="group w-11 h-11 rounded-full bg-white/85 backdrop-blur-sm text-[#22A559] shadow-[0_8px_18px_rgba(34,165,89,0.25)] flex items-center justify-center opacity-85 hover:opacity-100 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-200"
      aria-label="Gọi hotline"
      title="Gọi hotline"
    >
      <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2.28a2 2 0 011.94 1.515l.92 3.68a2 2 0 01-.55 1.94l-1.2 1.2a16 16 0 006.27 6.27l1.2-1.2a2 2 0 011.94-.55l3.68.92A2 2 0 0121 16.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    </a>
  </div>
);

const Footer: React.FC = () => (
  <footer className="bg-[#3B2C24] text-white pb-10">
    <ErrorBoundary>
      <NewsletterSignupBlock />
    </ErrorBoundary>
    <div className="max-w-7xl mx-auto px-4 pt-10 md:pt-14 grid grid-cols-1 md:grid-cols-4 gap-7 md:gap-10">
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
          <li><a href="/about" className="hover:text-white transition-colors">Giới thiệu</a></li>
          <li><a href="#" className="hover:text-white transition-colors">Tuyển dụng</a></li>
        </ul>
      </details>
      <div className="hidden md:block">
        <h4 className="font-bold text-lg mb-6">Về Unbee</h4>
        <ul className="space-y-4 text-[#E5D6C4]">
          <li><a href="/about" className="hover:text-white transition-colors">Giới thiệu</a></li>
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
              <a href={COMPANY_INFO.zaloUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-colors text-sm">
                Zalo
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
          <p className="text-sm leading-relaxed">Mã số thuế: {COMPANY_INFO.taxCode}</p>
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
              <a href={COMPANY_INFO.zaloUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/40 hover:text-white transition-colors text-sm">
                Zalo
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

const NewsletterSignupBlock: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) {
      setNotice({ type: 'error', text: 'Vui lòng nhập email trước khi gửi.' });
      return;
    }
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await api.userSubscribeNewsletter(value);
      setNotice({
        type: 'success',
        text: result.already_exists
          ? 'Email này đã đăng ký trước đó. Cảm ơn bạn đã quan tâm!'
          : 'Đăng ký nhận tin thành công. Unbee sẽ gửi ưu đãi mới sớm nhất cho bạn.',
      });
      if (!result.already_exists) setEmail('');
    } catch (err: any) {
      setNotice({
        type: 'error',
        text: String(err?.message || 'Không thể đăng ký nhận tin, vui lòng thử lại.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="w-full mb-10 bg-[#F8F3EC]" aria-label="Đăng ký nhận tin">
      <div className="max-w-7xl mx-auto px-4 py-7 md:py-10">
        <div className="rounded-2xl border border-[#E5D6C4] bg-[#F4E8DA] px-5 py-6 md:px-8 md:py-7 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="md:max-w-xl">
              <p className="text-xl md:text-3xl font-extrabold text-[#506B80]">Đăng ký nhận tin</p>
              <p className="text-[#5A7387] mt-1.5 text-sm md:text-base">
                Để lại email để nhận ưu đãi mới, tin ra mắt sản phẩm và cẩm nang chăm bé từ Unbee.
              </p>
            </div>
            <form className="w-full md:w-auto md:min-w-[430px]" onSubmit={onSubmit}>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  className="flex-1 rounded-xl border border-[#BFD4E8] bg-white px-4 py-3 text-[#243A4B] placeholder:text-[#8FA8BA] focus:outline-none focus:ring-2 focus:ring-[#8DB5D4]"
                  disabled={submitting}
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#6F8FA9] px-5 md:px-6 py-3 font-bold text-white hover:bg-[#5E7D97] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi'}
                </button>
              </div>
              {notice && (
                <p className={`mt-2 text-sm ${notice.type === 'success' ? 'text-[#2E6D49]' : 'text-[#A33C3C]'}`}>
                  {notice.text}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/',
  );

  useEffect(() => {
    const handleRouteChange = () => {
      setCurrentPath(`${window.location.pathname}${window.location.search}`);
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handleRouteChange);

    // Backward-compat: convert old hash URLs to clean paths (best-effort).
    const hash = String(window.location.hash || '');
    if (hash && hash.startsWith('#/')) {
      const [hashPath, hashQuery] = hash.split('?');
      const params = new URLSearchParams(hashQuery || '');

      // #/products?... -> /products?...
      if (hashPath === '#/products') {
        const qs = params.toString();
        window.history.replaceState({}, '', `/products${qs ? `?${qs}` : ''}`);
      }
      // #/product/:id -> /products/:id (slug part can be appended later)
      else if (hashPath.startsWith('#/product/')) {
        const id = String(hashPath.split('/')[2] || '').trim();
        window.history.replaceState({}, '', `/products/${encodeURIComponent(id)}`);
      }
      // #/blog/post/:id -> /blogs/:category/:id (category best-effort via query param)
      else if (hashPath.startsWith('#/blog/post/')) {
        const id = String(hashPath.split('/').slice(-1)[0] || '').trim();
        const cat = String(params.get('category') || 'tin-tuc');
        window.history.replaceState({}, '', `/blogs/${encodeURIComponent(cat)}/${encodeURIComponent(id)}`);
      }
      // #/blog?... -> /blogs?...
      else if (hashPath === '#/blog') {
        const qs = params.toString();
        window.history.replaceState({}, '', `/blogs${qs ? `?${qs}` : ''}`);
      }
      // #/tips -> /tips
      else if (hashPath === '#/tips') {
        window.history.replaceState({}, '', `/tips`);
      }
      // #/collections?... -> /collections?...
      else if (hashPath === '#/collections') {
        const qs = params.toString();
        window.history.replaceState({}, '', `/collections${qs ? `?${qs}` : ''}`);
      }
      // #/cart -> /cart, #/about -> /about, etc.
      else if (hashPath === '#/cart') {
        window.history.replaceState({}, '', `/cart`);
      } else if (hashPath === '#/about') {
        window.history.replaceState({}, '', `/about`);
      } else if (hashPath === '#/login') {
        window.history.replaceState({}, '', `/login`);
      } else if (hashPath === '#/account') {
        window.history.replaceState({}, '', `/account`);
      } else if (hashPath === '#/order-success') {
        const qs = params.toString();
        window.history.replaceState({}, '', `/order-success${qs ? `?${qs}` : ''}`);
      } else {
        window.history.replaceState({}, '', `/`);
      }

      // Clear hash after migration
      try {
        window.location.hash = '';
      } catch {
        // ignore
      }
    }

    // Sync initial state after potential migration
    handleRouteChange();

    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  const renderRoute = () => {
    const [path] = currentPath.split('?');

    // Product detail: /products/:id-:slug (slug optional). Also accept /products/:id.
    if (path.startsWith('/products/') && path !== '/products/') {
      const segment = decodeURIComponent(path.split('/')[2] || '');
      const id = parseIdFromSlug(segment) || segment;
      return (
        <ErrorBoundary>
          <ProductDetailPage productId={id} />
        </ErrorBoundary>
      );
    }

    // Blog post: /blogs/:category/:id-:slug (category optional, slug optional)
    if (path.startsWith('/blogs/')) {
      const parts = path.split('/').filter(Boolean);
      // parts: ['blogs', ':category', ':idSlug']
      if (parts.length >= 3) {
        const blogIdSeg = decodeURIComponent(parts[2] || '');
        const blogId = parseIdFromSlug(blogIdSeg) || blogIdSeg;
        return (
          <ErrorBoundary>
            <BlogPostPage blogId={blogId} />
          </ErrorBoundary>
        );
      }
    }

    switch (path) {
      case '/products':
        return <ProductPage />;
      case '/collections':
        return <CollectionPage />;
      case '/blogs':
        return <BlogPage />;
      case '/tips':
        return <TipsPage />;
      case '/cart':
        return <CartPage />;
      case '/login':
        return <LoginPage />;
      case '/account':
        return <AccountPage />;
      case '/order-success':
        return <OrderSuccessPage />;
      case '/about':
        return <AboutPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AuthProvider>
      <CartProvider>
        <div className="flex flex-col min-h-screen bg-[#F8F3EC]">
          <Navbar />
          <MobileQuickContacts />
          <main className="flex-grow min-h-[80vh]">
            <Suspense fallback={<PageLoadingFallback />}>
              {renderRoute()}
            </Suspense>
          </main>
          <Footer />
        </div>
      </CartProvider>
    </AuthProvider>
  );
};

export default App;
