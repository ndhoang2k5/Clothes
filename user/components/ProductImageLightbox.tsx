import React, { useEffect, useRef } from 'react';

export interface ProductImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  imageAlt?: string;
}

export function ProductImageLightbox(props: ProductImageLightboxProps) {
  const { isOpen, onClose, images, index, onIndexChange, imageAlt = 'Ảnh sản phẩm' } = props;
  const touchStartXRef = useRef<number | null>(null);
  const count = images.length;
  const clampedIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const currentSrc = images[clampedIndex] || 'https://picsum.photos/800/1000?product';

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (count <= 1) return;
      if (e.key === 'ArrowLeft') {
        onIndexChange(clampedIndex <= 0 ? count - 1 : clampedIndex - 1);
      }
      if (e.key === 'ArrowRight') {
        onIndexChange(clampedIndex >= count - 1 ? 0 : clampedIndex + 1);
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, count, clampedIndex, onClose, onIndexChange]);

  if (!isOpen) return null;

  const goPrev = () => onIndexChange(clampedIndex <= 0 ? count - 1 : clampedIndex - 1);
  const goNext = () => onIndexChange(clampedIndex >= count - 1 ? 0 : clampedIndex + 1);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh phóng to"
    >
      <div className="absolute inset-0 bg-black/85" onClick={onClose} aria-hidden="true" />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 w-10 h-10 flex items-center justify-center text-white/90 hover:text-white transition-colors"
        aria-label="Đóng"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className="relative z-10 w-full h-full flex items-center justify-center min-w-0"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (count <= 1) return;
          const startX = touchStartXRef.current;
          const endX = e.changedTouches[0]?.clientX ?? null;
          touchStartXRef.current = null;
          if (startX == null || endX == null) return;
          const delta = endX - startX;
          if (Math.abs(delta) < 45) return;
          if (delta < 0) goNext();
          else goPrev();
        }}
      >
        <img
          src={currentSrc}
          alt={`${imageAlt} - ảnh ${clampedIndex + 1}`}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain select-none"
          draggable={false}
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Ảnh trước"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Ảnh sau"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold">
              {clampedIndex + 1} / {count}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
