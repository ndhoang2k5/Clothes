
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, Banner } from '../types';
import { CATEGORIES, TRUST_FEATURES } from '../constants';
import ProductCard from '../components/ProductCard';

const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    api.getProducts().then(setProducts);
    // Since we don't have getBanners in the new separated api.ts yet, we'll use an empty array or mock
    setBanners([{ id: '1', imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200', title: 'BST Mùa Hè Rực Rỡ', link: '#/', position: 'main' }]);
  }, []);

  return (
    <div className="pb-20">
      <section className="relative h-[400px] md:h-[600px] bg-pink-50 overflow-hidden">
        {banners.length > 0 && (
          <div className="absolute inset-0">
            <img src={banners[0].imageUrl} alt={banners[0].title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent flex items-center px-12 md:px-32">
              <div className="max-w-md">
                <h1 className="text-4xl md:text-6xl font-black text-gray-800 mb-4">{banners[0].title}</h1>
                <p className="text-gray-600 text-lg mb-8">Mềm mại như vòng tay mẹ, an toàn cho làn da nhạy cảm của bé yêu.</p>
                <button className="bg-pink-500 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-pink-600 transition-all">Mua Ngay</button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.slice(0, 4).map(cat => (
            <a key={cat.id} href={`#/products?cat=${cat.slug}`} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-center flex flex-col items-center group">
              <span className="text-4xl mb-3 group-hover:scale-125 transition-transform">{cat.icon}</span>
              <span className="text-sm font-bold text-gray-700">{cat.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {TRUST_FEATURES.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-4 p-6 bg-white rounded-2xl border border-gray-100">
              <div className="text-3xl">{feature.icon}</div>
              <div>
                <h4 className="font-bold text-gray-800">{feature.title}</h4>
                <p className="text-sm text-gray-500">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">Sản phẩm Nổi bật 🔥</h2>
            <p className="text-gray-500">Những món đồ được tin dùng</p>
          </div>
          <a href="#/products" className="text-pink-500 font-bold flex items-center gap-1 hover:underline">Xem tất cả</a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
