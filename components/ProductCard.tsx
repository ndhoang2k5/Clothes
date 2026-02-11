
import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {product.isSale && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">
            Sale
          </span>
        )}
        {product.isHot && (
          <span className="absolute top-3 right-3 bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">
            Hot
          </span>
        )}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button className="bg-white p-2 rounded-full shadow-lg hover:bg-pink-50 transition-colors">
                <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
            </button>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-gray-800 font-semibold mb-2 group-hover:text-pink-500 transition-colors truncate">
          {product.name}
        </h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-pink-500 font-bold text-lg">
            {product.discountPrice ? product.discountPrice.toLocaleString() : product.price.toLocaleString()}đ
          </span>
          {product.discountPrice && (
            <span className="text-gray-400 text-sm line-through">
              {product.price.toLocaleString()}đ
            </span>
          )}
        </div>
        
        <button
          onClick={() => onAddToCart?.(product)}
          className="mt-auto w-full bg-pink-50 text-pink-600 font-bold py-2.5 rounded-xl hover:bg-pink-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Thêm giỏ hàng
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
