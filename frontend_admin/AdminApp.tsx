
import React, { useState, useEffect } from 'react';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import ProductManagement from './admin/ProductManagement';
import OrderManagement from './admin/OrderManagement';
import CollectionManagement from './admin/CollectionManagement';
import BannerManagement from './admin/BannerManagement';
import IntroManagement from './admin/IntroManagement';

const AdminApp: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash || '#/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderRoute = () => {
    switch (currentHash) {
      case '#/products': return <ProductManagement />;
      case '#/orders': return <OrderManagement />;
      case '#/collections': return <CollectionManagement />;
      case '#/banners': return <BannerManagement />;
      case '#/intro': return <IntroManagement />;
      case '#/':
      default: return <Dashboard />;
    }
  };

  return (
    <AdminLayout>
      {renderRoute()}
    </AdminLayout>
  );
};

export default AdminApp;
