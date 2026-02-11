
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product, Collection } from '../types';
import ProductCard from '../components/ProductCard';

const CollectionPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock collections for now since api doesn't support yet
    setCollections([{
      id: 'c1',
      name: 'BST Cotton Organic Mùa Hè',
      description: 'Sự lựa chọn hoàn hảo cho làn da nhạy cảm của bé.',
      coverImage: 'https://images.unsplash.com/photo-1515488442805-95967b7751e0?auto=format&fit=crop&q=80&w=800',
      products: ['1']
    }]);
    setLoading(false);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-black text-gray-800 mb-12">Bộ Sưu Tập Nổi Bật</h1>
      <div className="grid md:grid-cols-2 gap-10">
        {collections.map(col => (
          <div key={col.id} className="group relative h-[500px] rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500">
            <img src={col.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={col.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-12 flex flex-col justify-end text-white">
                <h3 className="text-3xl font-black mb-4">{col.name}</h3>
                <p className="text-gray-200 line-clamp-2 mb-8">{col.description}</p>
                <div className="font-bold flex items-center gap-2">Xem bộ sưu tập →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionPage;
