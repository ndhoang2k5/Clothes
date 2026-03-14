import React, { useEffect, useState } from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!hovered || product.images.length <= 1) return;
    const id = window.setInterval(() => {
      setImageIndex((prev) => (prev + 1) % product.images.length);
    }, 1200);
    return () => window.clearInterval(id);
  }, [hovered, product.images.length]);

  useEffect(() => {
    setImageIndex(0);
  }, [product.id]);

  return (
    <a
      href={`#/product/${product.id}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setImageIndex(0);
      }}
    >
      <div className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden">
        <div className="w-full h-full">
          <div
            className="flex h-full w-full transition-transform duration-500 ease-in-out group-hover:scale-110"
            style={{ transform: `translateX(-${imageIndex * 100}%)` }}
          >
            {(product.images.length > 0 ? product.images : ['https://picsum.photos/600/800?product']).map(
              (src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={product.name}
                  className="w-full h-full object-cover flex-shrink-0"
                />
              ),
            )}
          </div>
        </div>
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
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-gray-800 font-semibold mb-1 group-hover:text-pink-500 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-pink-500 font-bold text-base md:text-lg">
            {product.discountPrice ? product.discountPrice.toLocaleString() : product.price.toLocaleString()}đ
          </span>
          {product.discountPrice && (
            <span className="text-gray-400 text-xs md:text-sm line-through">
              {product.price.toLocaleString()}đ
            </span>
          )}
        </div>
        {(product.variants?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-xs text-gray-500">
            {(() => {
              const sizes = [...new Set((product.variants || []).map(v => v.size).filter(Boolean))];
              const totalStock = (product.variants || []).reduce((s, v) => s + (v.stock ?? 0), 0);
              if (sizes.length > 0) {
                return (
                  <>
                    <span>Size: {sizes.slice(0, 3).join(', ')}{sizes.length > 3 ? ` +${sizes.length - 3}` : ''}</span>
                    <span className="text-gray-300">·</span>
                    <span className={totalStock > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {totalStock > 0 ? `Còn ${totalStock}` : 'Hết hàng'}
                    </span>
                  </>
                );
              }
              return (
                <span className={totalStock > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                  {totalStock > 0 ? `Còn ${totalStock}` : 'Hết hàng'}
                </span>
              );
            })()}
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCart?.(product);
          }}
          className="mt-auto w-full bg-pink-50 text-pink-600 font-bold py-2.5 rounded-xl hover:bg-pink-500 hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Thêm giỏ hàng
        </button>
      </div>
    </a>
  );
};

export default ProductCard;

