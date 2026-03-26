
import React from 'react';
import { api } from '../services/api';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const currentHash = window.location.hash;

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const isActive = currentHash === href || (href === '#/admin' && currentHash === '');
    return (
      <a 
        href={href} 
        className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-colors duration-200 ${
          isActive 
            ? 'bg-pink-500 text-white shadow-lg shadow-pink-200' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        <span className={`${isActive ? 'text-white' : 'text-gray-400'}`}>{icon}</span>
        {label}
      </a>
    );
  };

  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar cố định theo viewport — tránh nhấp khi scrollbar nội dung xuất hiện */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-screen w-72 flex-shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r border-gray-100 bg-white lg:flex">
        <div className="p-8 border-b border-gray-50 flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-500 rounded-[1.25rem] flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-pink-100">U</div>
            <div>
                <h2 className="font-black text-gray-900 tracking-tight leading-none text-lg">UNBEE CMS</h2>
                <span className="text-[10px] text-pink-500 font-black uppercase tracking-[0.2em]">Quản trị viên</span>
            </div>
        </div>
        
        <nav className="p-6 flex-grow space-y-1.5">
          <NavLink 
            href="#/admin" 
            label="Tổng quan" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>} 
          />
          
          <div className="pt-8 pb-3 px-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">Hệ thống bán hàng</div>
          <NavLink 
            href="#/admin/products" 
            label="Sản phẩm" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 11m8 4V21M4 11v10l8 4"/></svg>} 
          />
          <NavLink 
            href="#/admin/clearance" 
            label="Ưu đãi cuối mùa" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h10M7 12h10M7 17h6M5 4h14a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z"/></svg>} 
          />
          <NavLink 
            href="#/admin/orders" 
            label="Đơn hàng" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>} 
          />
          <NavLink 
            href="#/admin/vouchers" 
            label="Mã giảm giá" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l2 2 4-4m1-7H8a2 2 0 00-2 2v3a2 2 0 000 4v3a2 2 0 002 2h8a2 2 0 002-2v-3a2 2 0 000-4V7a2 2 0 00-2-2z"/></svg>} 
          />
          <NavLink 
            href="#/admin/shipping-rules" 
            label="Phí ship" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7a2 2 0 012-2h6a2 2 0 012 2v10m-8 0h8m-8 0H7a2 2 0 01-2-2v-4a2 2 0 012-2h2"/></svg>} 
          />
          <NavLink 
            href="#/admin/collections" 
            label="Bộ sưu tập" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>} 
          />
          
          <div className="pt-8 pb-3 px-4 text-[11px] font-black text-gray-400 uppercase tracking-[0.25em]">Nội dung & Giao diện</div>
          <NavLink 
            href="#/admin/banners" 
            label="Banners trang chủ" 
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>} 
          />
          <NavLink
            href="#/admin/blogs"
            label="Blog & Câu chuyện"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V8a2 2 0 012-2h11l5 5v7a2 2 0 01-2 2zM17 4v5h5"/></svg>}
          />
        </nav>

        <div className="p-6 border-t border-gray-50">
            <button
              type="button"
              className="flex items-center gap-3 px-4 py-3 w-full text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors"
              onClick={() => {
                api.adminAuthLogout();
                window.location.hash = '#/admin/login';
              }}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                Đăng xuất
            </button>
        </div>
      </aside>

      {/* Main: chừa đúng w-72 cho sidebar cố định (desktop) */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-72">
        <header className="flex h-20 flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 md:px-10">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-black text-gray-800 tracking-tight">Hệ thống quản trị Unbee</h1>
            </div>
            <div className="flex items-center gap-6">
                <button className="relative p-2.5 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100 transition-all">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                    <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-white"></span>
                </button>
                <div className="h-8 w-px bg-gray-100"></div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 leading-none">Unbee Owner</p>
                        <p className="text-[10px] text-pink-500 font-black uppercase tracking-widest mt-1">Quản trị tối cao</p>
                    </div>
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Unbee" className="w-10 h-10 rounded-[0.75rem] bg-pink-100 p-0.5 border-2 border-white shadow-sm" />
                </div>
            </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-10 [scrollbar-gutter:stable]">
            {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
