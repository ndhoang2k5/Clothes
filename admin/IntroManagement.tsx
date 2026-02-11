
import React, { useState } from 'react';

const IntroManagement: React.FC = () => {
  const [story, setStory] = useState({
    title: 'Câu chuyện thương hiệu Unbee',
    content: 'Shop ra đời từ tình yêu vô bờ bến của ba mẹ dành cho bé yêu. Chúng tôi cam kết mang đến những sản phẩm an toàn nhất.',
    imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800'
  });

  const handleSave = () => {
    alert('Đã cập nhật câu chuyện thương hiệu!');
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-black text-gray-800 mb-8">Nội dung trang Giới thiệu</h2>
      
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 space-y-8 shadow-sm">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tiêu đề chính</label>
              <input 
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                value={story.title}
                onChange={e => setStory({...story, title: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nội dung câu chuyện</label>
              <textarea 
                className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500 h-64 resize-none"
                value={story.content}
                onChange={e => setStory({...story, content: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ảnh minh họa (Story Image)</label>
            <div className="aspect-[3/4] rounded-[2rem] overflow-hidden bg-gray-50 mb-4 border-2 border-dashed border-gray-200 flex items-center justify-center relative group">
              {story.imageUrl ? (
                <img src={story.imageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-300">Chưa có ảnh</div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <button className="bg-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">Thay đổi ảnh</button>
              </div>
            </div>
            <input 
              className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-xs outline-none focus:ring-1 focus:ring-pink-500"
              value={story.imageUrl}
              placeholder="Dán link ảnh vào đây..."
              onChange={e => setStory({...story, imageUrl: e.target.value})}
            />
          </div>
        </div>

        <div className="pt-8 border-t border-gray-50 flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-pink-500 text-white px-10 py-4 rounded-2xl font-black shadow-lg shadow-pink-200 hover:bg-pink-600 transition-all hover:scale-105"
          >
            Cập nhật nội dung
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntroManagement;
