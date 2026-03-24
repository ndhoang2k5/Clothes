
import React from 'react';

interface FilterState {
  sizes: string[];
  colors: string[];
  priceRange: [number, number];
  sort: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableOptions: {
    sizes: string[];
    colors: string[];
  };
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFilterChange, availableOptions }) => {
  const toggleItem = (list: string[], item: string) => {
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  const handleCheckbox = (type: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [type]: toggleItem(filters[type] as string[], value)
    });
  };

  return (
    <div className="space-y-8 sticky top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 soft-scrollbar">
      {/* Sort Section */}
      <div>
        <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/></svg>
            Sắp xếp theo
        </h4>
        <select 
          className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none shadow-sm transition-all"
          value={filters.sort}
          onChange={(e) => onFilterChange({...filters, sort: e.target.value})}
        >
          <option value="newest">Mới nhất</option>
          <option value="bestseller">Bán chạy nhất</option>
          <option value="price-asc">Giá: Thấp đến Cao</option>
          <option value="price-desc">Giá: Cao đến Thấp</option>
        </select>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Khoảng giá
        </h4>
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <input 
                    type="range" 
                    min="0" 
                    max="1000000" 
                    step="50000"
                    className="w-full accent-pink-500"
                    value={filters.priceRange[1]}
                    onChange={(e) => onFilterChange({...filters, priceRange: [0, Number(e.target.value)]})}
                />
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Dưới {filters.priceRange[1].toLocaleString()}đ</span>
            </div>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h4 className="font-black text-gray-800 mb-4">Kích cỡ</h4>
        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1 soft-scrollbar">
          {availableOptions.sizes.map(size => (
            <button
              key={size}
              onClick={() => handleCheckbox('sizes', size)}
              className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                filters.sizes.includes(size) 
                ? 'bg-pink-500 border-pink-500 text-white shadow-md' 
                : 'bg-white border-gray-100 text-gray-500 hover:border-pink-200'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h4 className="font-black text-gray-800 mb-4">Màu sắc</h4>
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 soft-scrollbar">
          {availableOptions.colors.map(color => (
            <label key={color} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded-md border-gray-200 text-pink-500 focus:ring-pink-500 transition-all cursor-pointer"
                checked={filters.colors.includes(color)}
                onChange={() => handleCheckbox('colors', color)}
              />
              <span className={`text-sm font-medium transition-colors ${filters.colors.includes(color) ? 'text-pink-500 font-bold' : 'text-gray-600'}`}>{color}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <button 
        onClick={() => onFilterChange({ sizes: [], colors: [], priceRange: [0, 1000000], sort: 'newest' })}
        className="w-full py-3 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
      >
        Xóa tất cả bộ lọc
      </button>
    </div>
  );
};

export default FilterSidebar;
