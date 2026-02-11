
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
        {product.isSale && <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">Sale</span>}
        {product.isHot && <span className="absolute top-3 right-3 bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">Hot</span>}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-gray-800 font-semibold mb-2 group-hover:text-pink-500 transition-colors truncate">{product.name}</h3>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-pink-500 font-bold text-lg">{(product.discountPrice || product.price).toLocaleString()}đ</span>
          {product.discountPrice && <span className="text-gray-400 text-sm line-through">{product.price.toLocaleString()}đ</span>}
        </div>
        <button
          onClick={() => onAddToCart?.(product)}
          className="mt-auto w-full bg-pink-50 text-pink-600 font-bold py-2.5 rounded-xl hover:bg-pink-500 hover:text-white transition-all duration-300"
        >
          Thêm giỏ hàng
        </button>
      </div>
    </div>
  );
};
export default ProductCard;
