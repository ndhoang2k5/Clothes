
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Collection, Product } from '../types';

const CollectionManagement: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Collection> | null>(null);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [c, p] = await Promise.all([
      api.adminListCollections(true),
      api.adminListProductsPage({ include_inactive: true, page: 1, per_page: 0 }),
    ]);
    setCollections(c);
    setProducts((p as any)?.items || []);
  };

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    if (editing.id) {
      await api.adminUpdateCollection(editing as Collection);
    } else {
      await api.adminAddCollection({
        name: editing.name,
        description: editing.description || '',
        coverImage: editing.coverImage || 'https://picsum.photos/800/400',
        products: editing.products || [],
      });
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

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const skuText = (p.variants || []).map((v) => String((v as any)?.sku || '')).join(' ');
      const haystack = `${p.id} ${p.name || ''} ${p.category || ''} ${skuText}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [products, productSearch]);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-10">
        <h2 className="text-2xl font-black text-gray-800">Bộ Sưu Tập ({collections.length})</h2>
        <button 
          onClick={() => {
            setProductSearch('');
            setEditing({ name: '', description: '', products: [] });
          }}
          className="bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-pink-600 transition-colors"
        >
          + Tạo BST Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 min-w-0">
        {collections.map(col => (
          <div key={col.id} className="group min-w-0 bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all">
            <div className="h-48 relative overflow-hidden">
               <img src={col.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
               <div className="absolute top-4 right-4 flex gap-2">
                 <button onClick={() => { setProductSearch(''); setEditing(col); }} className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg hover:text-pink-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                 <button onClick={() => { if(confirm('Xóa?')) api.adminDeleteCollection(col.id).then(fetchData) }} className="bg-white/90 backdrop-blur p-2 rounded-xl shadow-lg hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
               </div>
            </div>
            <div className="p-8 min-w-0 overflow-hidden">
               <h3 className="text-xl font-black text-gray-800 mb-2 break-words">{col.name}</h3>
               {col.description?.trim() ? (
                 <p
                   className="text-gray-500 text-sm mb-4 break-words overflow-hidden"
                   style={{
                     display: '-webkit-box',
                     WebkitBoxOrient: 'vertical' as const,
                     WebkitLineClamp: 2,
                     wordBreak: 'break-word',
                   }}
                   title={col.description}
                 >
                   {col.description}
                 </p>
               ) : null}
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
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Ảnh bìa</label>
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <input 
                        type="text" 
                        className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="https://..."
                        value={editing.coverImage}
                        onChange={e => setEditing({...editing, coverImage: e.target.value})}
                      />
                      <label className="px-4 py-3 rounded-2xl bg-gray-900 text-white text-xs font-black cursor-pointer hover:bg-gray-800 whitespace-nowrap">
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await api.adminUploadImage(file);
                              setEditing((prev) => (prev ? { ...prev, coverImage: url } : prev));
                            } finally {
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                    {editing.coverImage && (
                      <div className="h-40 rounded-2xl overflow-hidden bg-gray-50 shadow-inner">
                        <img
                          src={editing.coverImage}
                          alt={editing.name || 'Ảnh bìa bộ sưu tập'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-widest">Chọn sản phẩm ({editing.products?.length || 0})</label>
                <div className="mb-3">
                  <input
                    type="text"
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Tìm theo tên, mã sản phẩm, SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                <div className="bg-gray-50 rounded-[2rem] p-6 h-[400px] overflow-y-auto space-y-2">
                  {filteredProducts.length === 0 && (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400 font-semibold">
                      Không tìm thấy sản phẩm phù hợp.
                    </div>
                  )}
                  {filteredProducts.map(p => (
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
