
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './frontend/App';
import AdminApp from './frontend_admin/AdminApp';

const RootSwitcher: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(window.location.hash.startsWith('#/admin'));

  useEffect(() => {
    const handleHashChange = () => {
      setIsAdmin(window.location.hash.startsWith('#/admin'));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="min-h-screen font-sans">
      {isAdmin ? <AdminApp /> : <App />}
      
      {/* Dev Switcher */}
      <div className="fixed bottom-4 right-4 z-[9999] flex gap-2">
        <button 
          onClick={() => window.location.hash = isAdmin ? '#/' : '#/admin'}
          className="bg-black/80 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-pink-500 transition-all shadow-2xl"
        >
          {isAdmin ? 'Xem Shop 🛍️' : 'Vào Admin ⚙️'}
        </button>
      </div>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<RootSwitcher />);
}
