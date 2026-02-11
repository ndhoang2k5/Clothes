
import React from 'react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const currentHash = window.location.hash || '#/admin';

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const isActive = currentHash === href;
    return (
      <a 
        href={href} 
        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
          isActive ? 'bg-pink-500 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'
        }`}
      >
        <span>{icon}</span>
        {label}
      </a>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="w-72 bg-white border-r border-gray-100 p-6 flex flex-col gap-4">
        <div className="mb-10 text-2xl font-black text-pink-500">unbee CMS</div>
        <NavLink href="#/admin" label="Tổng quan" icon="📊" />
        <NavLink href="#/admin/products" label="Sản phẩm" icon="📦" />
        <NavLink href="#/admin/orders" label="Đơn hàng" icon="🛒" />
      </aside>
      <div className="flex-grow p-10">
        <header className="mb-10 flex justify-between items-center">
            <h1 className="text-2xl font-black text-gray-800">Quản trị Hệ thống</h1>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="font-bold">Admin</p>
                    <p className="text-xs text-pink-500">Owner</p>
                </div>
            </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
};
export default AdminLayout;
