
import React, { useState, useEffect } from 'react';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import ProductManagement from './pages/ProductManagement';
import OrderManagement from './pages/OrderManagement';
import CollectionManagement from './pages/CollectionManagement';
import BannerManagement from './pages/BannerManagement';
import IntroManagement from './pages/IntroManagement';
import VoucherManagement from './pages/VoucherManagement';
import ShippingRulesManagement from './pages/ShippingRulesManagement';

const AdminApp: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/admin');

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || '#/admin');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderRoute = () => {
    const [path] = (currentHash || '#/admin').split('?');
    switch (path) {
      case '#/admin/products': return <ProductManagement />;
      case '#/admin/orders': return <OrderManagement />;
      case '#/admin/collections': return <CollectionManagement />;
      case '#/admin/vouchers': return <VoucherManagement />;
      case '#/admin/shipping-rules': return <ShippingRulesManagement />;
      case '#/admin/banners': return <BannerManagement />;
      case '#/admin/intro': return <IntroManagement />;
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
