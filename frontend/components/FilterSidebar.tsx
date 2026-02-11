
import React from 'react';

// Định nghĩa rõ ràng các key có kiểu dữ liệu là string[]
type FilterArrayKeys = 'sizes' | 'colors' | 'materials';

interface FilterState {
  sizes: string[];
  colors: string[];
  materials: string[];
  priceRange: [number, number];
  sort: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableOptions: {
    sizes: string[];
    colors: string[];
    materials: string[];
  };
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, onFilterChange, availableOptions }) => {
  // Hàm xử lý checkbox an toàn về kiểu dữ liệu
  const handleToggle = (key: FilterArrayKeys, value: string) => {
    const currentList = filters[key];
    const newList = currentList.includes(value)
      ? currentList.filter((item) => item !== value)
      : [...currentList, value];
    
    onFilterChange({
      ...filters,
      [key]: newList
    });
  };

  return (
    <div className="space-y-8 sticky top-24">
      {/* Sắp xếp */}
      <div>
        <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-pink-500">↕</span> Sắp xếp theo
        </h4>
        <select 
          className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none shadow-sm"
          value={filters.sort}
          onChange={(e) => onFilterChange({...filters, sort: e.target.value})}
        >
          <option value="newest">Mới nhất</option>
          <option value="price-asc">Giá: Thấp đến Cao</option>
          <option value="price-desc">Giá: Cao đến Thấp</option>
        </select>
      </div>

      {/* Khoảng giá */}
      <div>
        <h4 className="font-black text-gray-800 mb-4 flex items-center gap-2">
          <span className="text-pink-500">💰</span> Khoảng giá
        </h4>
        <input 
          type="range" 
          min="0" 
          max="1000000" 
          step="50000" 
          className="w-full accent-pink-500 cursor-pointer"
          value={filters.priceRange[1]}
          onChange={(e) => onFilterChange({...filters, priceRange: [0, Number(e.target.value)]})}
        />
        <div className="text-xs font-bold text-gray-500 mt-2 uppercase">
          Dưới {filters.priceRange[1].toLocaleString()}đ
        </div>
      </div>

      {/* Kích cỡ */}
      <div>
        <h4 className="font-black text-gray-800 mb-4">Kích cỡ</h4>
        <div className="flex flex-wrap gap-2">
          {availableOptions.sizes.map(size => (
            <button 
              key={size} 
              type="button"
              onClick={() => handleToggle('sizes', size)} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
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

      {/* Màu sắc */}
      <div>
        <h4 className="font-black text-gray-800 mb-4">Màu sắc</h4>
        <div className="grid grid-cols-2 gap-2">
          {availableOptions.colors.map(color => (
            <label key={color} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox"
                className="w-4 h-4 rounded border-gray-200 text-pink-500 focus:ring-pink-500 cursor-pointer"
                checked={filters.colors.includes(color)}
                onChange={() => handleToggle('colors', color)}
              />
              <span className={`text-sm ${filters.colors.includes(color) ? 'font-bold text-pink-500' : 'text-gray-600'}`}>
                {color}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button 
        type="button"
        onClick={() => onFilterChange({
          sizes: [],
          colors: [],
          materials: [],
          priceRange: [0, 1000000],
          sort: 'newest'
        })}
        className="w-full py-3 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-colors text-xs uppercase tracking-widest"
      >
        Xóa tất cả bộ lọc
      </button>
    </div>
  );
};

export default FilterSidebar;
