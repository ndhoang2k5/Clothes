
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

const ITEMS_PER_PAGE = 12;

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

  // Reset page khi filter / category đổi và cuộn mượt về đầu danh sách
  useEffect(() => {
    setCurrentPage(1);
    try {
      const el = document.getElementById('product-list-top');
      const top = el ? el.offsetTop - 80 : 0;
      window.scrollTo({ top, behavior: 'smooth' });
    } catch {
      // ignore
    }
  }, [filters, activeCategory]);

  // Khi đổi trang, cũng cuộn về đầu danh sách để tiếp tục xem các dòng kế tiếp
  useEffect(() => {
    try {
      const el = document.getElementById('product-list-top');
      const top = el ? el.offsetTop - 80 : 0;
      window.scrollTo({ top, behavior: 'smooth' });
    } catch {
      // ignore
    }
  }, [currentPage]);

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
      <div className="bg-white border-b border-gray-100 py-10 md:py-12 mb-8 md:mb-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <nav className="flex items-center gap-2 text-xs text-gray-400 font-bold uppercase mb-2">
              <a href="#/" className="hover:text-pink-500">Trang chủ</a>
              <span>/</span>
              <span className="text-gray-800">{currentCategoryName}</span>
            </nav>
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">{currentCategoryName}</h1>
          </div>
          <div className="bg-pink-50 px-6 py-3 rounded-3xl flex items-center gap-3">
            <span className="text-pink-600 font-black text-xl">{filteredProducts.length}</span>
            <span className="text-pink-400 font-bold text-xs md:text-sm uppercase tracking-wider">Sản phẩm được tìm thấy</span>
          </div>
        </div>
      </div>

      <div id="product-list-top" className="max-w-7xl mx-auto px-4 pb-20 flex flex-col lg:flex-row gap-6 lg:gap-8">
        <aside className="w-full lg:basis-[20%] lg:max-w-[240px] xl:max-w-[260px] flex-shrink-0">
          <FilterSidebar filters={filters} onFilterChange={setFilters} availableOptions={availableOptions} />
        </aside>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                <div key={i} className="bg-white rounded-2xl aspect-[4/5]" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
