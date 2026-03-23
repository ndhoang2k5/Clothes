import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Product, ComboItem } from '../types';
import ProductCard from '../components/ProductCard';
import { useCart } from './CartContext';

interface ProductDetailPageProps {
  productId: string;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [comboItems, setComboItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addItem } = useCart();
  const [addedMessage, setAddedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!productId || productId.trim() === '') {
      setLoading(false);
      setProduct(null);
      setError('Thiếu mã sản phẩm');
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setSelectedVariantId(null);
      setQuantity(1);
      try {
        const p = await api.getProductDetail(productId);
        if (cancelled) return;
        setProduct(p);
        setSelectedImageIndex(0);
        if (p.kind === 'combo') {
          try {
            const items = await api.getComboItems(productId);
            if (cancelled) return;
            setComboItems(items);
          } catch {
            setComboItems([]);
          }
        } else {
          setComboItems(null);
          const vars = p.variants || [];
          if (vars.length === 1) setSelectedVariantId(String(vars[0].id));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Không tải được sản phẩm');
        if (!cancelled) setProduct(null);
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
    () => [...new Set(variants.map((v) => (v && v.size) || '').filter(Boolean))],
    [variants],
  );
  const uniqueColors = useMemo(
    () => [...new Set(variants.map((v) => (v && v.color) || '').filter(Boolean))],
    [variants],
  );
  const actualPrice = product ? Number(product.discountPrice ?? product.price ?? 0) || 0 : 0;
  const isSingleProduct = !!product && product.kind !== 'combo';
  const showVariantPicker = isSingleProduct && variants.length > 0 && (uniqueSizes.length > 0 || uniqueColors.length > 0);
  const showSingleProductActions = isSingleProduct;

  const galleryImages = useMemo(() => {
    const baseImages =
      product && product.images && product.images.length > 0
        ? product.images
        : ['https://picsum.photos/800/1000?product'];
    const vImg = (selectedVariant as any)?.image as string | undefined;
    if (vImg) {
      return [vImg, ...baseImages.filter((u) => u !== vImg)];
    }
    return baseImages;
  }, [product, selectedVariant]);
  const clampedImageIndex =
    galleryImages.length > 0 ? Math.min(selectedImageIndex, galleryImages.length - 1) : 0;

  // Khi đổi variant, quay về ảnh đầu tiên
  React.useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedVariantId]);

  const handleAddToCart = () => {
    if (!product) return;

    if (product.kind === 'combo') {
      addItem({
        product,
        quantity,
      });
      setAddedMessage('Đã thêm combo vào giỏ hàng');
      window.setTimeout(() => setAddedMessage(null), 3000);
      return;
    }

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
    setAddedMessage('Đã thêm vào giỏ hàng');
    window.setTimeout(() => setAddedMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 bg-white min-h-[60vh]">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-[4/5] rounded-3xl skeleton" />
          <div className="space-y-4">
            <div className="h-8 rounded-xl w-1/2 skeleton" />
            <div className="h-4 rounded-xl w-1/3 skeleton" />
            <div className="h-4 rounded-xl w-full skeleton" />
            <div className="h-4 rounded-xl w-2/3 skeleton" />
            <div className="h-12 rounded-2xl w-40 skeleton mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center bg-white min-h-[60vh]">
        <h2 className="text-2xl font-black text-gray-800 mb-2">Không tìm thấy sản phẩm</h2>
        {error && <p className="text-gray-500 mb-4">{error}</p>}
        <a href="#/products" className="text-pink-500 font-bold hover:underline">Quay lại danh sách sản phẩm</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 bg-white min-h-[60vh]">
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <a href="#/" className="hover:text-pink-500">
          Trang chủ
        </a>
        <span>/</span>
        <a href="#/products" className="hover:text-pink-500">
          Sản phẩm
        </a>
        <span>/</span>
        <span className="text-gray-700 font-bold truncate max-w-[200px] md:max-w-[300px]">
          {product.name}
        </span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mb-16">
        <div className="space-y-3">
          <div className="relative bg-white rounded-[2rem] overflow-hidden border border-gray-100">
            <div
              className="w-full h-[420px] bg-gray-100 overflow-hidden"
            >
              <div
                className="flex h-full w-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${clampedImageIndex * 100}%)` }}
              >
                {galleryImages.map((src, idx) => (
                  <img
                    key={idx}
                    src={src || 'https://picsum.photos/800/1000?product'}
                    alt={`${product.name} - ảnh ${idx + 1}`}
                    className="w-full h-full object-cover flex-shrink-0"
                  />
                ))}
              </div>
            </div>
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((i) =>
                      i <= 0 ? galleryImages.length - 1 : i - 1,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-all"
                  aria-label="Ảnh trước"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImageIndex((i) =>
                      i >= galleryImages.length - 1 ? 0 : i + 1,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-gray-700 hover:bg-white active:scale-95 transition-all"
                  aria-label="Ảnh sau"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs font-bold">
                  {clampedImageIndex + 1} / {galleryImages.length}
                </span>
              </>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImageIndex === idx ? 'border-pink-500 ring-2 ring-pink-200' : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
            {product.name}
            {product.kind === 'combo' && (
              <span className="text-xs uppercase px-2 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                Combo / Box
              </span>
            )}
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-pink-600">
              {actualPrice.toLocaleString()}đ
            </span>
            {product.discountPrice && (
              <span className="text-gray-400 line-through font-semibold">
                {product.price.toLocaleString()}đ
              </span>
            )}
          </div>
          {isOutOfStock && (
            <div className="text-sm font-bold text-red-500">Đã hết hàng</div>
          )}
          {product.description && (
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {product.isNew && <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600">Hàng mới</span>}
            {product.isHot && <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600">Bán chạy</span>}
            {product.isSale && <span className="px-3 py-1 rounded-full bg-red-50 text-red-600">Đang giảm</span>}
          </div>

          {showSingleProductActions && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <span className="block text-sm font-bold text-gray-700 mb-2">Size / Màu</span>
              {showVariantPicker ? (
                <>
                  {uniqueSizes.length > 0 && (
                    <div>
                      <span className="block text-xs font-bold text-gray-500 mb-1">Chọn size</span>
                      <div className="flex flex-wrap gap-2">
                        {uniqueSizes.map((size) => {
                          const hasStock = variants.some(
                            (v) => v.size === size && v.stock > 0 && (!selectedVariant?.color || v.color === selectedVariant.color),
                          );
                          const isSelected = selectedVariant?.size === size;
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                const sameColor = selectedVariant?.color;
                                const next = variants.find((v) => v.size === size && (sameColor ? v.color === sameColor : true));
                                if (next && next.stock > 0) setSelectedVariantId(String(next.id));
                              }}
                              disabled={!hasStock}
                              className={`min-w-[3rem] px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
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
                            (v) => v.color === color && v.stock > 0 && (!selectedVariant?.size || v.size === selectedVariant.size),
                          );
                          const isSelected = selectedVariant?.color === color;
                          return (
                            <button
                              key={color}
                              type="button"
                              onClick={() => {
                                const sameSize = selectedVariant?.size;
                                const next = variants.find((v) => v.color === color && (sameSize ? v.size === sameSize : true));
                                if (next && next.stock > 0) setSelectedVariantId(String(next.id));
                              }}
                              disabled={!hasStock}
                              className={`min-w-[3rem] px-4 py-2 rounded-xl text-sm font-bold border-2 transition-colors ${
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
                    <p className="text-sm text-gray-500">
                      {selectedVariant.stock > 0 ? (
                        <>
                          Còn lại:{' '}
                          <span className="font-bold text-gray-800">{selectedVariant.stock}</span> sản phẩm
                        </>
                      ) : (
                        <span className="font-bold text-red-500">
                          Size / màu này đã hết hàng
                        </span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  Sản phẩm này chưa cấu hình size/màu. Bạn vẫn có thể thêm vào giỏ (liên hệ shop để xác nhận).
                </p>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">Số lượng</span>
                  <input
                    type="number"
                    min={1}
                    max={selectedVariant ? selectedVariant.stock : 99}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(selectedVariant?.stock ?? 99, Number(e.target.value) || 1)))}
                    className="w-20 rounded-xl border-2 border-gray-200 px-3 py-2 text-center font-bold outline-none focus:border-pink-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={
                    !!(
                      isOutOfStock ||
                      (showVariantPicker &&
                        (!selectedVariantId || (selectedVariant && selectedVariant.stock < quantity)))
                    )
                  }
                  className="px-8 py-3 rounded-2xl bg-pink-500 text-white font-black hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Thêm vào giỏ
                </button>
                {addedMessage && (
                  <p className="text-sm font-semibold text-green-600">
                    {addedMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {product.kind === 'combo' && (
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => console.log('Add combo to cart', product.id)}
                className="px-8 py-3 rounded-2xl bg-pink-500 text-white font-black hover:bg-pink-600 transition-colors"
              >
                Thêm vào giỏ
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sản phẩm tặng kèm – để lại sau khi có dữ liệu */}
      <section className="mb-16">
        <h2 className="text-xl font-black text-gray-900 mb-4">Sản phẩm tặng kèm</h2>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-gray-500 text-sm">Phần sản phẩm tặng kèm đang được phát triển.</p>
        </div>
      </section>

      {/* Sản phẩm mua kèm – để lại sau khi có dữ liệu */}
      <section className="mb-16">
        <h2 className="text-xl font-black text-gray-900 mb-4">Sản phẩm mua kèm</h2>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
          <p className="text-gray-500 text-sm">Phần sản phẩm mua kèm đang được phát triển.</p>
        </div>
      </section>

      {product.kind === 'combo' && (
        <section className="mb-16">
          <h2 className="text-2xl font-black text-gray-900 mb-4">Combo này gồm</h2>
          {comboItems && comboItems.length > 0 ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 space-y-3">
              {comboItems.map((ci: any) => {
                const v = ci.variant;
                const p = ci.product;
                const unitPrice =
                  (v?.discount_price_override ??
                    v?.price_override ??
                    ci.base_price ??
                    product.price) || 0;
                return (
                  <div
                    key={`${ci.combo_product_id}-${ci.component_variant_id}`}
                    className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0 border-gray-50"
                  >
                    <div>
                      <div className="font-bold text-gray-800">
                        {p?.name || 'Sản phẩm'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {v?.size && <span>Size {v.size}</span>}
                        {v?.color && (
                          <span>{v.size ? ' · ' : ''}Màu {v.color}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-500">x{ci.quantity}</div>
                      <div className="font-bold text-gray-800">
                        {(unitPrice * ci.quantity).toLocaleString()}đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Combo này hiện chưa cấu hình danh sách sản phẩm chi tiết.
            </p>
          )}
        </section>
      )}

      {/* Gợi ý thêm sản phẩm */}
      <section className="mb-10">
        <h2 className="text-xl font-black text-gray-900 mb-4">Có thể bạn sẽ thích</h2>
        {/* Đơn giản: dùng lại list sản phẩm chính, lấy từ localstorage cũ nếu cần */}
        {/* Ở đây mình dùng lại api.getProducts, lọc bỏ sản phẩm hiện tại */}
        <RelatedProducts currentId={product.id} />
      </section>
    </div>
  );
};

const RelatedProducts: React.FC<{ currentId: string }> = ({ currentId }) => {
  const [list, setList] = useState<Product[]>([]);

  useEffect(() => {
    api.getProducts().then((all) => {
      setList(all.filter((p) => p.id !== currentId).slice(0, 4));
    });
  }, [currentId]);

  if (list.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {list.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
};

export default ProductDetailPage;

