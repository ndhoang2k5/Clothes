
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import { CATEGORIES } from '../constants';

// Định nghĩa interface để đồng bộ với FilterSidebar
interface FilterState {
  sizes: string[];
  colors: string[];
  materials: string[];
  priceRange: [number, number];
  sort: string;
}

const ITEMS_PER_PAGE = 6;

const ProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    sizes: [],
    colors: [],
    materials: [],
    priceRange: [0, 1000000],
    sort: 'newest'
  });

  const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const activeCategory = queryParams.get('cat');

  useEffect(() => {
    setLoading(true);
    api.getProducts().then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const availableOptions = useMemo(() => {
    return {
      sizes: ['0-3m', '3-6m', '6-12m', '12-18m', '2y', '3y'],
      colors: ['Trắng', 'Hồng', 'Xanh dương', 'Vàng', 'Xám'],
      materials: ['Cotton', 'Organic Cotton', 'Linen', 'Voan']
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory) result = result.filter(p => p.category === activeCategory);
    
    // Áp dụng thêm filter nếu cần (logic đã có trong ProductPage gốc)
    if (filters.sizes.length > 0) {
      // Ví dụ: result = result.filter(...)
    }

    return result;
  }, [products, activeCategory, filters]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const currentCategoryName = CATEGORIES.find(c => c.slug === activeCategory)?.name || 'Tất cả sản phẩm';

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-100 py-12 mb-10">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div>
            <nav className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase mb-2">
              <a href="#/" className="hover:text-pink-500">Trang chủ</a>
              <span>/</span>
              <span className="text-gray-800">{currentCategoryName}</span>
            </nav>
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">{currentCategoryName}</h1>
          </div>
          <div className="bg-pink-50 px-6 py-2 rounded-full text-pink-500 font-bold">{filteredProducts.length} sản phẩm</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-20 flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <FilterSidebar filters={filters} onFilterChange={setFilters} availableOptions={availableOptions} />
        </aside>
        <div className="flex-grow">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-white rounded-2xl aspect-[4/5]" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {paginatedProducts.map(product => <ProductCard key={product.id} product={product} />)}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
