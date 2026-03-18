
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';
import { CATEGORIES } from '../constants';
import { QuickAddToCartModal } from './QuickAddToCartModal';

const SERVER_PER_PAGE = 24;

const ProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [facetSourceProducts, setFacetSourceProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [quickAddProductId, setQuickAddProductId] = useState<string | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    sizes: [] as string[],
    colors: [] as string[],
    materials: [] as string[],
    priceRange: [0, 1000000] as [number, number],
    sort: 'newest'
  });

  // Get active category from URL
  const hashQuery = window.location.hash.split('?')[1] || '';
  const queryParams = new URLSearchParams(hashQuery);
  const activeCategory = queryParams.get('cat');
  const activeQ = queryParams.get('q') || '';
  const [searchText, setSearchText] = useState(activeQ);

  useEffect(() => {
    setSearchText(activeQ);
  }, [activeQ]);

  // Load current page with filters (server-side filtering)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.getProductsPage({
          category: activeCategory,
          q: activeQ && activeQ.trim() ? activeQ.trim() : undefined,
          page: currentPage,
          per_page: SERVER_PER_PAGE,
          useCache: true,
          sizes: filters.sizes,
          colors: filters.colors,
          materials: filters.materials,
          priceRange: filters.priceRange,
          sort: filters.sort as any,
        });
        if (cancelled) return;
        setProducts(r.items);
        setServerTotal(r.total);
      } catch {
        if (!cancelled) {
          setProducts([]);
          setServerTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, activeQ, currentPage, filters]);

  // Load full product list ONCE per category to build facet options
  useEffect(() => {
    let cancelled = false;
    const loadAllForFacets = async () => {
      try {
        const r = await api.getProductsPage({
          category: activeCategory,
          page: 1,
          per_page: 0,
          useCache: true,
        });
        if (cancelled) return;
        setFacetSourceProducts(r.items);
      } catch {
        if (!cancelled) setFacetSourceProducts([]);
      }
    };
    void loadAllForFacets();
    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

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
  }, [filters, activeCategory, activeQ]);

  // Compute available filter options from ALL products in category (facetSourceProducts)
  const availableOptions = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const materials = new Set<string>();

    (facetSourceProducts.length > 0 ? facetSourceProducts : products).forEach(p => {
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
  }, [facetSourceProducts, products]);

  const totalPages = useMemo(() => {
    if (serverTotal == null) return 1;
    return Math.max(1, Math.ceil(serverTotal / SERVER_PER_PAGE));
  }, [serverTotal]);

  const currentCategoryName = CATEGORIES.find(c => c.slug === activeCategory)?.name || 'Tất cả sản phẩm';

  const setSearchQueryInHash = (nextQ: string) => {
    const trimmed = nextQ.trim();
    const params = new URLSearchParams();
    if (activeCategory) params.set('cat', activeCategory);
    if (trimmed) params.set('q', trimmed);
    const qs = params.toString();
    window.location.hash = `#/products${qs ? '?' + qs : ''}`;
  };

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
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="bg-pink-50 px-6 py-4 rounded-3xl flex items-center gap-4">
                      <span className="text-pink-600 font-black text-xl">{serverTotal ?? products.length}</span>
                      <span className="text-pink-400 font-bold text-sm uppercase tracking-wider">Sản phẩm được tìm thấy</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSearchQueryInHash(searchText);
                    }}
                    className="w-full md:w-auto flex items-center gap-3"
                  >
                    <input
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Tìm theo tên hoặc SKU..."
                      className="bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#B58A5A]/40 w-full md:w-[320px]"
                    />
                    <button
                      type="submit"
                      className="bg-[#B58A5A] text-white px-5 py-3 rounded-2xl font-bold hover:bg-[#A3784E] transition-colors whitespace-nowrap"
                    >
                      Tìm
                    </button>
                  </form>
                </div>
            </div>
        </div>
      </div>

      <div id="product-list-top" className="max-w-7xl mx-auto px-4 pb-20">
        {/* Mobile filter bar */}
        <div className="lg:hidden mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm font-bold text-sm text-gray-700"
          >
            <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18l-7 8v6l-4 2v-8L3 4z" />
            </svg>
            Lọc
          </button>
          <div className="text-xs text-gray-500 font-bold">
            {serverTotal ?? products.length} sản phẩm
          </div>
        </div>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileFiltersOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
                <div className="font-black text-lg text-gray-800">
                  Bộ lọc
                </div>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-50"
                  aria-label="Đóng bộ lọc"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-5 py-5">
                <FilterSidebar
                  filters={filters}
                  onFilterChange={setFilters}
                  availableOptions={availableOptions}
                />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFilters({ sizes: [], colors: [], materials: [], priceRange: [0, 1000000], sort: 'newest' })}
                    className="py-3 rounded-2xl bg-gray-100 text-gray-600 font-black"
                  >
                    Xóa bộ lọc
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    className="py-3 rounded-2xl font-black text-white shadow-lg shadow-pink-200 bg-pink-500"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-full lg:basis-[20%] lg:max-w-[240px] xl:max-w-[260px] flex-shrink-0">
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
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {products.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={() => setQuickAddProductId(String(product.id))}
                    />
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
      {quickAddProductId && (
        <QuickAddToCartModal
          productId={quickAddProductId}
          onClose={() => setQuickAddProductId(null)}
        />
      )}
    </div>
  );
};

export default ProductPage;
