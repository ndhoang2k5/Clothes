
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
    <div className="min-h-screen bg-gray-50">
      {isAdmin ? <AdminApp /> : <App />}
      
      {/* Dev Navigation Assist */}
      <div className="fixed bottom-4 right-4 z-[9999] group">
        <button 
          onClick={() => {
            window.location.hash = isAdmin ? '#/' : '#/admin';
          }}
          className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-2xl border border-white/10 hover:bg-pink-500 transition-all"
        >
          {isAdmin ? 'Xem giao diện Khách' : 'Vào quản trị (CMS)'}
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
