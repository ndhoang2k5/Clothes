
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Product, Collection } from '../types';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 4;

const CollectionPage: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Simple router for individual collection or list
  const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const activeId = queryParams.get('id');

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getCollections(), api.getProducts()]).then(([colData, prodData]) => {
      setCollections(colData);
      setAllProducts(prodData);
      setLoading(false);
    });
  }, []);

  // Reset pagination when collection changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeId]);

  const activeCollection = useMemo(() => {
    if (!activeId) return null;
    return collections.find(c => c.id === activeId);
  }, [collections, activeId]);

  const collectionProducts = useMemo(() => {
    if (!activeCollection) return [];
    return allProducts.filter(p => activeCollection.products.includes(p.id));
  }, [activeCollection, allProducts]);

  // Pagination logic for collection products
  const totalPages = Math.ceil(collectionProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return collectionProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [collectionProducts, currentPage]);

  if (activeId && activeCollection) {
    return (
      <div className="pb-20">
        {/* Collection Hero */}
        <div className="relative h-[400px] overflow-hidden">
          <img 
            src={activeCollection.coverImage} 
            className="w-full h-full object-cover" 
            alt={activeCollection.name}
          />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-center px-4">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 animate-in fade-in slide-in-from-top-4 duration-700">{activeCollection.name}</h1>
              <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed">{activeCollection.description}</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl font-black text-gray-800">Sản phẩm trong bộ sưu tập</h2>
            <div className="text-pink-500 font-bold bg-pink-50 px-4 py-2 rounded-full">
              {collectionProducts.length} sản phẩm
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {paginatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="mb-16">
        <h1 className="text-4xl font-black text-gray-800 mb-4">Các Bộ Sưu Tập Nổi Bật</h1>
        <p className="text-gray-500 text-lg">Khám phá những xu hướng thời trang mới nhất dành cho bé yêu từ Unbee.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {collections.map(col => (
          <a 
            key={col.id} 
            href={`#/collections?id=${col.id}`}
            className="group relative h-[500px] rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 block"
          >
            <img src={col.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={col.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-12 flex flex-col justify-end">
                <span className="text-pink-400 font-bold uppercase tracking-widest text-sm mb-4">Collection</span>
                <h3 className="text-3xl font-black text-white mb-4 group-hover:text-pink-300 transition-colors">{col.name}</h3>
                <p className="text-gray-200 line-clamp-2 mb-8">{col.description}</p>
                <div className="flex items-center gap-2 text-white font-black group-hover:translate-x-2 transition-transform">
                    Xem bộ sưu tập
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default CollectionPage;
