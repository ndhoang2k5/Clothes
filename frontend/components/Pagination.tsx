
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 rounded-xl font-bold transition-all ${
            currentPage === page
              ? 'bg-pink-500 text-white shadow-lg'
              : 'bg-white border border-gray-100 text-gray-500 hover:text-pink-500'
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
};
export default Pagination;
