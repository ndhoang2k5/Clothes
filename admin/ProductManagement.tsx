
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product } from '../types';

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'so-sinh',
    images: ['https://picsum.photos/400/500'],
    variants: []
  });

  useEffect(() => {
    api.getProducts().then(setProducts);
  }, []);

  const handleSave = async () => {
    if (!newProduct.name || !newProduct.price) return;
    await api.addProduct(newProduct as Product);
    const updated = await api.getProducts();
    setProducts(updated);
    setIsAdding(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-black text-gray-800">Danh sách Sản phẩm ({products.length})</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-pink-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          Thêm sản phẩm mới
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-sm font-bold uppercase tracking-wider">
              <th className="py-4 px-4">Sản phẩm</th>
              <th className="py-4 px-4">Danh mục</th>
              <th className="py-4 px-4">Giá bán</th>
              <th className="py-4 px-4">Trạng thái</th>
              <th className="py-4 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map(p => (
              <tr key={p.id} className="group hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover" />
                    <span className="font-bold text-gray-800">{p.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-gray-500">{p.category}</td>
                <td className="py-4 px-4">
                    <span className="font-bold text-pink-500">{p.price.toLocaleString()}đ</span>
                </td>
                <td className="py-4 px-4">
                   <div className="flex gap-1">
                     {p.isHot && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Hot</span>}
                     {p.isSale && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Sale</span>}
                   </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <button className="text-gray-400 hover:text-pink-500 p-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Thêm Sản phẩm</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên sản phẩm</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none" 
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Giá gốc</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                  <select 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    <option value="so-sinh">Đồ sơ sinh</option>
                    <option value="be-trai">Bé trai</option>
                    <option value="be-gai">Bé gái</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                <textarea 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none h-24"
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-grow py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="flex-grow py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600"
              >
                Lưu sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
