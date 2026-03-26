
import React, { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import ProductManagement from './pages/ProductManagement';
import OrderManagement from './pages/OrderManagement';
import CollectionManagement from './pages/CollectionManagement';
import BannerManagement from './pages/BannerManagement';
import VoucherManagement from './pages/VoucherManagement';
import ShippingRulesManagement from './pages/ShippingRulesManagement';
import ClearanceManagement from './pages/ClearanceManagement';
import BlogsManagement from './pages/BlogsManagement';
import AdminLoginPage from './pages/AdminLoginPage';
import { api } from '../services/api';

const AdminApp: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/admin');
  const [authTick, setAuthTick] = useState(0);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || '#/admin');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const path = (currentHash || '#/admin').split('?')[0];
  const isLoginPath = path === '#/admin/login';

  useEffect(() => {
    if (isLoginPath) return;
    if (!api.adminAuthHasToken()) {
      window.location.hash = '#/admin/login';
    }
  }, [currentHash, isLoginPath, authTick]);

  if (isLoginPath) {
    if (api.adminAuthHasToken()) {
      window.location.hash = '#/admin';
      return (
        <div className="flex h-full min-h-0 items-center justify-center bg-[#F8F3EC] text-[#6B5645] text-sm font-bold">
          Đang chuyển…
        </div>
      );
    }
    return (
      <AdminLoginPage
        onSuccess={() => {
          setAuthTick((v) => v + 1);
        }}
      />
    );
  }

  if (!api.adminAuthHasToken()) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[#F8F3EC] text-[#6B5645] text-sm font-bold">
        Đang chuyển đến đăng nhập…
      </div>
    );
  }

  const renderRoute = () => {
    switch (path) {
      case '#/admin/products': return <ProductManagement />;
      case '#/admin/clearance': return <ClearanceManagement />;
      case '#/admin/orders': return <OrderManagement />;
      case '#/admin/collections': return <CollectionManagement />;
      case '#/admin/vouchers': return <VoucherManagement />;
      case '#/admin/shipping-rules': return <ShippingRulesManagement />;
      case '#/admin/banners': return <BannerManagement />;
      case '#/admin/intro': return <BlogsManagement />;
      case '#/admin/blogs': return <BlogsManagement />;
      case '#/admin':
      default: return <Dashboard />;
    }
  };

  return (
    <AdminLayout>
      <div className="animate-in fade-in duration-500">
        {renderRoute()}
      </div>
    </AdminLayout>
  );
};

export default AdminApp;
