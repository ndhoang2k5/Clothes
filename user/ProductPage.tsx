
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import { CATEGORIES } from '../constants';

const SERVER_PER_PAGE = 24;

const ProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    sizes: [] as string[],
    colors: [] as string[],
    materials: [] as string[],
    priceRange: [0, 1000000] as [number, number],
    sort: 'newest'
  });

  // Get active category from URL
  const queryParams = new URLSearchParams(window.location.hash.split('?')[1]);
  const activeCategory = queryParams.get('cat');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.getProductsPage({ category: activeCategory, page: currentPage, per_page: SERVER_PER_PAGE, useCache: true });
        if (cancelled) return;
        setProducts(r.items);
        setServerTotal(r.total);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, currentPage]);

  // Reset to page 1 when filters or category change and scroll user back to top of list
  useEffect(() => {
    setCurrentPage(1);
    try {
      const el = document.getElementById('product-list-top');
      const top = el ? el.offsetTop - 80 : 0;
      window.scrollTo({ top, behavior: 'smooth' });
    } catch {
      // ignore scroll errors (SSR / tests)
    }
  }, [filters, activeCategory]);

  // Compute available filter options from actual product variants (dynamic)
  const availableOptions = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const materials = new Set<string>();

    products.forEach(p => {
      (p.variants || []).forEach(v => {
        if (v.size && String(v.size).trim()) sizes.add(String(v.size).trim());
        if (v.color && String(v.color).trim()) colors.add(String(v.color).trim());
      });
      if (p.material && String(p.material).trim()) materials.add(String(p.material).trim());
    });

    return {
      sizes: Array.from(sizes).sort(),
      colors: Array.from(colors).sort(),
      materials: Array.from(materials).sort()
    };
  }, [products]);

  // Apply filtering and sorting
  const filteredProducts = useMemo(() => {
    let result = products;

    // Custom filters
    if (filters.sizes.length > 0) {
      result = result.filter(p => (p.variants || []).some(v => v.size && filters.sizes.includes(v.size)));
    }
    if (filters.colors.length > 0) {
      result = result.filter(p => (p.variants || []).some(v => v.color && filters.colors.includes(v.color)));
    }
    if (filters.materials.length > 0) {
      result = result.filter(p => filters.materials.includes(p.material));
    }
    result = result.filter(p => {
      const actualPrice = p.discountPrice || p.price;
      return actualPrice >= filters.priceRange[0] && actualPrice <= filters.priceRange[1];
    });

    // Sorting
    return [...result].sort((a, b) => {
      const priceA = a.discountPrice || a.price;
      const priceB = b.discountPrice || b.price;
      
      switch (filters.sort) {
        case 'price-asc': return priceA - priceB;
        case 'price-desc': return priceB - priceA;
        case 'bestseller': return (a.isHot ? -1 : 1) - (b.isHot ? -1 : 1);
        case 'newest': 
        default: return (a.isNew ? -1 : 1) - (b.isNew ? -1 : 1);
      }
    });
  }, [products, filters, activeCategory]);

  const totalPages = useMemo(() => {
    if (serverTotal == null) return 1;
    return Math.max(1, Math.ceil(serverTotal / SERVER_PER_PAGE));
  }, [serverTotal]);

  const currentCategoryName = CATEGORIES.find(c => c.slug === activeCategory)?.name || 'Tất cả sản phẩm';

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-10 md:py-12 mb-8 md:mb-10">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <nav className="flex items-center gap-2 text-sm text-gray-400 font-medium mb-4">
                        <a href="#/" className="hover:text-pink-500">Trang chủ</a>
                        <span>/</span>
                        <span className="text-gray-800 font-bold">{currentCategoryName}</span>
                    </nav>
                    <h1 className="text-4xl font-black text-gray-800 tracking-tight">{currentCategoryName}</h1>
                </div>
                <div className="bg-pink-50 px-6 py-4 rounded-3xl flex items-center gap-4">
                    <span className="text-pink-600 font-black text-xl">{serverTotal ?? filteredProducts.length}</span>
                    <span className="text-pink-400 font-bold text-sm uppercase tracking-wider">Sản phẩm được tìm thấy</span>
                </div>
            </div>
        </div>
      </div>

      <div id="product-list-top" className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:basis-[20%] lg:max-w-[240px] xl:max-w-[260px] flex-shrink-0">
            <FilterSidebar 
              filters={filters} 
              onFilterChange={setFilters} 
              availableOptions={availableOptions}
            />
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-[260px] md:h-[320px] animate-pulse border border-gray-100"></div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <div className="bg-white rounded-[2rem] p-20 text-center border border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">Không tìm thấy sản phẩm</h3>
                <p className="text-gray-500 mb-8 max-w-sm mx-auto">Chúng tôi không tìm thấy sản phẩm nào khớp với bộ lọc của bạn. Thử thay đổi các tùy chọn nhé!</p>
                <button 
                  onClick={() => setFilters({ sizes: [], colors: [], materials: [], priceRange: [0, 1000000], sort: 'newest' })}
                  className="bg-pink-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-pink-600 transition-all shadow-lg"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
