import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Product } from '../types';
import { navigate } from '../App';
import { buildProductPath } from '../user/utils/urls';
import { api } from '../services/api';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (p: Product) => void;
  /**
   * Ưu tiên tải ảnh ngay (hàng đầu viewport).
   * Các thẻ không priority chỉ gắn src khi gần vào màn hình.
   */
  priority?: boolean;
  /** Thứ tự trong lưới: 0,1 = ưu tiên cao nhất trong nhóm priority */
  priorityRank?: number;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  priority = false,
  priorityRank = 0,
}) => {
  const cardRef = useRef<HTMLAnchorElement | null>(null);
  const prefetchTimerRef = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageReady, setImageReady] = useState(false);
  const [allowLoad, setAllowLoad] = useState(priority);
  /** 0 = static cache, 1 = thumbs API, 2 = original upload */
  const [srcTier, setSrcTier] = useState(0);

  const galleryImages = useMemo(
    () => (product.images.length > 0 ? product.images : ['https://picsum.photos/600/800?product']),
    [product.images],
  );
  const galleryCount = galleryImages.length;
  const currentSrc = galleryImages[Math.min(imageIndex, galleryCount - 1)] || galleryImages[0];
  // Card ~25vw desktop / 50vw mobile — dùng 480–640 để sắc trên màn Retina (2x DPR).
  const thumbWidth = priority ? 640 : 480;

  const displaySrc = useMemo(() => {
    if (srcTier <= 0) return api.toListImageUrl(currentSrc, thumbWidth);
    if (srcTier === 1) return api.toListThumbApiUrl(currentSrc, thumbWidth);
    return api.getImageUrl(currentSrc) || currentSrc;
  }, [currentSrc, srcTier, thumbWidth]);

  // Below-the-fold: chỉ tải khi gần viewport (trên trước, dưới sau).
  useEffect(() => {
    if (priority) {
      setAllowLoad(true);
      return;
    }
    const el = cardRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setAllowLoad(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting || entry.intersectionRatio > 0)) {
          setAllowLoad(true);
          io.disconnect();
        }
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [priority, product.id]);

  useEffect(() => {
    if (!hovered || galleryCount <= 1 || !allowLoad) return;
    const id = window.setInterval(() => {
      setImageIndex((prev) => (prev + 1) % galleryCount);
    }, 1200);
    return () => window.clearInterval(id);
  }, [hovered, galleryCount, allowLoad]);

  useEffect(() => {
    setImageIndex(0);
    setImageReady(false);
    setSrcTier(0);
  }, [product.id]);

  useEffect(() => {
    setImageReady(false);
    setSrcTier(0);
  }, [currentSrc]);

  useEffect(() => {
    if (!hovered || galleryCount <= 1 || !allowLoad) return;
    const next = galleryImages[(imageIndex + 1) % galleryCount];
    if (!next) return;
    const img = new Image();
    img.decoding = 'async';
    // Prefetch via API so hover swap is ready even if static cache miss.
    img.src = api.toListThumbApiUrl(next, 480);
  }, [hovered, imageIndex, galleryCount, galleryImages, allowLoad]);

  const prefetchDetail = () => {
    api.prefetchProductDetail(String(product.id));
  };

  const cancelPrefetch = () => {
    if (prefetchTimerRef.current !== null) {
      window.clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  };

  const schedulePrefetch = () => {
    cancelPrefetch();
    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      prefetchDetail();
    }, 220);
  };

  useEffect(() => () => cancelPrefetch(), [product.id]);

  const fetchPriority: 'high' | 'low' | 'auto' = priority
    ? priorityRank < 4
      ? 'high'
      : 'low'
    : 'auto';

  return (
    <a
      ref={cardRef}
      href={buildProductPath(product)}
      onClick={(e) => {
        e.preventDefault();
        navigate(buildProductPath(product));
      }}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full border border-gray-100"
      onMouseEnter={() => {
        setHovered(true);
        schedulePrefetch();
      }}
      onFocus={schedulePrefetch}
      onBlur={cancelPrefetch}
      onMouseLeave={() => {
        cancelPrefetch();
        setHovered(false);
        setImageIndex(0);
      }}
    >
      <div className="relative aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-[#F3EEE6]">
        {!imageReady && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#F3EEE6] via-[#EDE6DB] to-[#F3EEE6]" aria-hidden="true" />
        )}
        {allowLoad && (
          <img
            key={`${product.id}-${imageIndex}-${srcTier}`}
            src={displaySrc}
            alt={product.name}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={fetchPriority}
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
            onLoad={() => setImageReady(true)}
            onError={() => {
              setSrcTier((t) => Math.min(2, t + 1));
            }}
            className="relative z-[1] w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        )}
        {product.isSale && (
          <span className="absolute top-3 left-3 z-[2] bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">
            Sale
          </span>
        )}
        {product.isHot && (
          <span className="absolute top-3 right-3 z-[2] bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full uppercase">
            Hot
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-gray-800 font-semibold mb-1 group-hover:text-pink-500 transition-colors line-clamp-2">
          {product.name}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="text-red-500 font-bold text-base md:text-lg">
            {(product.discountPrice ?? product.price).toLocaleString()}đ
          </span>
          {product.discountPrice != null && product.discountPrice < product.price && (
            <>
              <span className="text-gray-800 text-xs md:text-sm line-through">
                {product.price.toLocaleString()}đ
              </span>
              {product.salePercent != null && product.salePercent > 0 && (
                <span className="inline-flex items-center rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
                  {Math.round(product.salePercent)}%
                </span>
              )}
            </>
          )}
        </div>
        {(product.variants?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-3 text-xs text-gray-500">
            {(() => {
              const sizes = [...new Set((product.variants || []).map((v) => v.size).filter(Boolean))];
              const totalStock = (product.variants || []).reduce((s, v) => s + (v.stock ?? 0), 0);
              if (sizes.length > 0) {
                return (
                  <>
                    <span>
                      Size: {sizes.slice(0, 3).join(', ')}
                      {sizes.length > 3 ? ` +${sizes.length - 3}` : ''}
                    </span>
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
