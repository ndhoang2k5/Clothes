
import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import HomePage from './HomePage';
import ProductPage from './ProductPage';
import CollectionPage from './CollectionPage';

const App: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      const path = window.location.hash || '#/';
      if (!path.startsWith('#/admin')) {
         setCurrentHash(path);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderRoute = () => {
    const path = currentHash.split('?')[0];
    switch (path) {
      case '#/products': return <ProductPage />;
      case '#/collections': return <CollectionPage />;
      case '#/':
      default: return <HomePage />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {renderRoute()}
      </main>
      <footer className="bg-gray-900 text-white py-12 text-center">
        <p className="font-bold text-sm">© 2024 UNBEE BABY - THỜI TRANG AN TOÀN CHO BÉ</p>
      </footer>
    </div>
  );
};

export default App;
