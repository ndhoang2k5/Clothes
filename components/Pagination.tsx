
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const createPageItems = () => {
    const items: (number | 'ellipsis')[] = [];
    const maxVisible = 5; // số trang xung quanh current

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i += 1) items.push(i);
      return items;
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    items.push(1);
    if (start > 2) items.push('ellipsis');

    for (let i = start; i <= end; i += 1) items.push(i);

    if (end < totalPages - 1) items.push('ellipsis');
    items.push(totalPages);

    return items;
  };

  const pageItems = createPageItems();

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-pink-500 hover:border-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {pageItems.map((item, index) =>
        item === 'ellipsis' ? (
          <span key={`e-${index}`} className="px-2 text-gray-400 select-none">
            ...
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-xl text-sm md:text-base font-bold transition-all ${
              currentPage === item
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-200'
                : 'bg-white border border-gray-100 text-gray-500 hover:border-pink-200 hover:text-pink-500'
            }`}
          >
            {item}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-pink-500 hover:border-pink-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

export default Pagination;
