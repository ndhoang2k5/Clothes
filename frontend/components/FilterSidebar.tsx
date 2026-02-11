
import React from 'react';

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
  const handleCheckbox = (type: keyof FilterState, value: string) => {
    const list = filters[type] as string[];
    const newList = list.includes(value) ? list.filter(i => i !== value) : [...list, value];
    onFilterChange({ ...filters, [type]: newList });
  };

  return (
    <div className="space-y-8">
      <div>
        <h4 className="font-black text-gray-800 mb-4">Sắp xếp theo</h4>
        <select 
          className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 outline-none"
          value={filters.sort}
          onChange={(e) => onFilterChange({...filters, sort: e.target.value})}
        >
          <option value="newest">Mới nhất</option>
          <option value="price-asc">Giá: Thấp đến Cao</option>
          <option value="price-desc">Giá: Cao đến Thấp</option>
        </select>
      </div>

      <div>
        <h4 className="font-black text-gray-800 mb-4">Khoảng giá</h4>
        <input 
          type="range" min="0" max="1000000" step="50000" className="w-full accent-pink-500"
          value={filters.priceRange[1]}
          onChange={(e) => onFilterChange({...filters, priceRange: [0, Number(e.target.value)]})}
        />
        <div className="text-xs font-bold text-gray-500 mt-2">Dưới {filters.priceRange[1].toLocaleString()}đ</div>
      </div>

      <div>
        <h4 className="font-black text-gray-800 mb-4">Kích cỡ</h4>
        <div className="flex flex-wrap gap-2">
          {availableOptions.sizes.map(size => (
            <button key={size} onClick={() => handleCheckbox('sizes', size)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${filters.sizes.includes(size) ? 'bg-pink-500 text-white' : 'bg-white text-gray-500'}`}>{size}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterSidebar;
