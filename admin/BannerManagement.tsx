
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Banner } from '../types';

const BannerManagement: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    title: '',
    imageUrl: '',
    link: '#/',
    position: 'main'
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    const data = await api.getBanners();
    setBanners(data);
  };

  const handleSave = async () => {
    if (!newBanner.imageUrl) return;
    await api.updateBanner(newBanner as Banner);
    setIsAdding(false);
    fetchBanners();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Xóa banner này?')) {
      await api.deleteBanner(id);
      fetchBanners();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black text-gray-800">Quản lý Banners & Hero Section</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-pink-600"
        >
          + Thêm Banner
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {banners.map(banner => (
          <div key={banner.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 flex flex-col md:flex-row gap-8 items-center group">
            <div className="w-full md:w-64 h-32 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
               <img src={banner.imageUrl} className="w-full h-full object-cover" />
            </div>
            <div className="flex-grow">
               <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-pink-100 text-pink-600 rounded">{banner.position}</span>
                 <h3 className="font-bold text-gray-800">{banner.title}</h3>
               </div>
               <p className="text-sm text-gray-400 truncate max-w-md">{banner.imageUrl}</p>
            </div>
            <div className="flex gap-2">
               <button onClick={() => { setNewBanner(banner); setIsAdding(true); }} className="p-3 text-gray-400 hover:text-pink-500 hover:bg-pink-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
               <button onClick={() => handleDelete(banner.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
          </div>
        ))}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Cấu hình Banner</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Tiêu đề (Hiển thị trên ảnh)</label>
                <input 
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                  value={newBanner.title}
                  onChange={e => setNewBanner({...newBanner, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">URL Hình ảnh</label>
                <input 
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                  value={newBanner.imageUrl}
                  onChange={e => setNewBanner({...newBanner, imageUrl: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">Vị trí</label>
                <select 
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                  value={newBanner.position}
                  onChange={e => setNewBanner({...newBanner, position: e.target.value as any})}
                >
                  <option value="main">Trang chủ Hero</option>
                  <option value="promo">Banner khuyến mãi</option>
                  <option value="footer">Footer Banner</option>
                </select>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsAdding(false)} className="flex-grow py-3 bg-gray-100 text-gray-500 font-bold rounded-xl">Hủy</button>
              <button onClick={handleSave} className="flex-grow py-3 bg-pink-500 text-white font-bold rounded-xl shadow-lg">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
