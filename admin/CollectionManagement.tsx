
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Collection, Product } from '../types';

const CollectionManagement: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Collection> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [c, p] = await Promise.all([api.getCollections(), api.getProducts()]);
    setCollections(c);
    setProducts(p);
  };

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    if (editing.id) {
      await api.updateCollection(editing as Collection);
    } else {
      await api.addCollection({
        ...editing,
        coverImage: editing.coverImage || 'https://picsum.photos/800/400',
        products: editing.products || []
      } as Collection);
    }
    setEditing(null);
    fetchData();
  };

  const toggleProduct = (productId: string) => {
    if (!editing) return;
    const currentProds = editing.products || [];
    const newProds = currentProds.includes(productId)
      ? currentProds.filter(id => id !== productId)
      : [...currentProds, productId];
    setEditing({ ...editing, products: newProds });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black text-gray-800">Bộ Sưu Tập ({collections.length})</h2>
        <button 
          onClick={() => setEditing({ name: '', description: '', products: [] })}
          className="bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-pink-600 transition-colors"
        >
          + Tạo BST Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map(col => (
          <div key={col.id} className="group bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all">
            <div className="h-48 relative overflow-hidden">
               <img src={col.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute top-4 right-4 flex gap-2">
                 <button onClick={() => setEditing(col)} className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg hover:text-pink-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                 <button onClick={() => { if(confirm('Xóa?')) api.deleteCollection(col.id).then(fetchData) }} className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
               </div>
            </div>
            <div className="p-8">
               <h3 className="text-xl font-black text-gray-800 mb-2">{col.name}</h3>
               <p className="text-gray-500 text-sm line-clamp-2 mb-4">{col.description}</p>
               <div className="flex items-center gap-2">
                  <span className="text-pink-500 font-black text-sm">{col.products.length} Sản phẩm</span>
                  <div className="flex -space-x-2">
                    {col.products.slice(0, 3).map(pid => {
                      const p = products.find(prod => prod.id === pid);
                      return p ? <img key={pid} src={p.images[0]} className="w-8 h-8 rounded-full border-2 border-white object-cover" /> : null;
                    })}
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-12 shadow-2xl">
            <h2 className="text-3xl font-black mb-8">{editing.id ? 'Sửa' : 'Thêm'} Bộ Sưu Tập</h2>
            
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Tên bộ sưu tập</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                    value={editing.name}
                    onChange={e => setEditing({...editing, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Mô tả ngắn</label>
                  <textarea 
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500 h-32"
                    value={editing.description}
                    onChange={e => setEditing({...editing, description: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">URL Ảnh bìa</label>
                  <input 
                    type="text" 
                    className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                    value={editing.coverImage}
                    onChange={e => setEditing({...editing, coverImage: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-widest">Chọn sản phẩm ({editing.products?.length || 0})</label>
                <div className="bg-gray-50 rounded-[2rem] p-6 h-[400px] overflow-y-auto space-y-2">
                  {products.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => toggleProduct(p.id)}
                      className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                        editing.products?.includes(p.id) ? 'bg-pink-100 border border-pink-200' : 'bg-white border border-transparent hover:border-gray-200'
                      }`}
                    >
                      <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-grow">
                        <p className="text-sm font-bold text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.price.toLocaleString()}đ</p>
                      </div>
                      {editing.products?.includes(p.id) && <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button onClick={() => setEditing(null)} className="flex-grow py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-colors">Đóng</button>
              <button onClick={handleSave} className="flex-grow py-4 bg-pink-500 text-white rounded-2xl font-bold hover:bg-pink-600 transition-colors shadow-lg">Lưu Bộ Sưu Tập</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionManagement;
