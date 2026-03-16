import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Product } from '../types';
import { useCart } from './CartContext';
import { COLORS } from './designTokens';

interface QuickAddToCartModalProps {
  productId: string;
  onClose: () => void;
}

export const QuickAddToCartModal: React.FC<QuickAddToCartModalProps> = ({
  productId,
  onClose,
}) => {
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setQuantity(1);
      setSelectedVariantId(null);
      try {
        const p = await api.getProductDetail(productId);
        if (cancelled) return;
        setProduct(p);
        const vars = p.variants || [];
        if (vars.length === 1) setSelectedVariantId(String(vars[0].id));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Không tải được sản phẩm');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const variants = useMemo(
    () =>
      product && Array.isArray(product.variants)
        ? product.variants.filter((v) => v && typeof v === 'object')
        : [],
    [product],
  );

  const selectedVariant = useMemo(
    () => variants.find((v) => String(v.id) === String(selectedVariantId)) ?? null,
    [variants, selectedVariantId],
  );

  const totalStock = useMemo(
    () => variants.reduce((sum, v: any) => sum + (v?.stock ?? 0), 0),
    [variants],
  );
  const isOutOfStock = totalStock <= 0;

  const uniqueSizes = useMemo(
    () => [...new Set(variants.map((v: any) => (v && v.size) || '').filter(Boolean))],
    [variants],
  );
  const uniqueColors = useMemo(
    () => [...new Set(variants.map((v: any) => (v && v.color) || '').filter(Boolean))],
    [variants],
  );

  const actualPrice = product ? Number(product.discountPrice ?? product.price ?? 0) || 0 : 0;

  const handleAdd = () => {
    if (!product) return;
    if (isOutOfStock) return;

    const variantForCart = selectedVariantId
      ? variants.find((v) => String(v.id) === String(selectedVariantId))
      : undefined;
    if (variants.length > 0 && !variantForCart) return;

    addItem({
      product,
      variant: variantForCart
        ? {
            id: String(variantForCart.id),
            size: (variantForCart as any).size,
            color: (variantForCart as any).color,
            stock: (variantForCart as any).stock,
          }
        : undefined,
      quantity,
    });
    onClose();
  };

  const galleryImage =
    product && product.images && product.images.length > 0
      ? product.images[0]
      : 'https://picsum.photos/600/800?product';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full mx-4 p-6 md:p-8 z-10">
        {loading ? (
          <div className="h-40 flex items-center justify-center text-gray-500">
            Đang tải sản phẩm...
          </div>
        ) : error || !product ? (
          <div className="space-y-4 text-center">
            <p className="text-red-500 font-bold">Không tải được sản phẩm.</p>
            {error && <p className="text-gray-500 text-sm">{error}</p>}
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-full bg-gray-100 text-gray-600 font-bold hover:bg-gray-200"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-4">
              <div className="w-32 h-40 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={galleryImage} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <h3 className="font-black text-lg" style={{ color: COLORS.textMain }}>
                  {product.name}
                </h3>
                <div className="flex items-baseline gap-3">
                  <span className="text-xl font-black text-pink-600">
                    {actualPrice.toLocaleString()}đ
                  </span>
                  {product.discountPrice && (
                    <span className="text-gray-400 line-through text-sm font-medium">
                      {product.price.toLocaleString()}đ
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Tồn kho toàn bộ: <span className="font-bold">{totalStock}</span> sản phẩm
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {variants.length > 0 && (
                <>
                  {uniqueSizes.length > 0 && (
                    <div>
                      <span className="block text-xs font-bold text-gray-500 mb-1">Chọn size</span>
                      <div className="flex flex-wrap gap-2">
                        {uniqueSizes.map((size) => {
                          const hasStock = variants.some(
                            (v: any) => v.size === size && v.stock > 0,
                          );
                          const isSelected = selectedVariant?.size === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              disabled={!hasStock}
                              onClick={() => {
                                const next = variants.find((v: any) => v.size === size && v.stock > 0);
                                if (next) setSelectedVariantId(String(next.id));
                              }}
                              className={`min-w-[3rem] px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                                isSelected
                                  ? 'border-pink-500 bg-pink-50 text-pink-700'
                                  : hasStock
                                    ? 'border-gray-200 hover:border-pink-300 text-gray-800'
                                    : 'border-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {uniqueColors.length > 0 && (
                    <div>
                      <span className="block text-xs font-bold text-gray-500 mb-1">Chọn màu</span>
                      <div className="flex flex-wrap gap-2">
                        {uniqueColors.map((color) => {
                          const hasStock = variants.some(
                            (v: any) => v.color === color && v.stock > 0,
                          );
                          const isSelected = selectedVariant?.color === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              disabled={!hasStock}
                              onClick={() => {
                                const next = variants.find(
                                  (v: any) => v.color === color && v.stock > 0,
                                );
                                if (next) setSelectedVariantId(String(next.id));
                              }}
                              className={`min-w-[3rem] px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-colors ${
                                isSelected
                                  ? 'border-pink-500 bg-pink-50 text-pink-700'
                                  : hasStock
                                    ? 'border-gray-200 hover:border-pink-300 text-gray-800'
                                    : 'border-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                            >
                              {color}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedVariant && (
                    <p className="text-xs text-gray-500">
                      Còn lại:{' '}
                      <span className="font-bold text-gray-800">
                        {(selectedVariant as any).stock ?? 0}
                      </span>{' '}
                      sản phẩm
                    </p>
                  )}
                </>
              )}

              <div className="flex items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-600">Số lượng</span>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-16 rounded-xl border border-gray-200 px-3 py-1 text-center text-sm font-bold"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={isOutOfStock || (variants.length > 0 && !selectedVariant)}
                    className="px-5 py-2 rounded-full text-xs font-black shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: COLORS.ctaPrimary, color: '#FDF8F0' }}
                  >
                    Thêm vào giỏ
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

