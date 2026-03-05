import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Product, ComboItem } from '../types';
import ProductCard from '../components/ProductCard';

interface ProductDetailPageProps {
  productId: string;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [comboItems, setComboItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await api.getProductDetail(productId);
        if (cancelled) return;
        setProduct(p);
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
        }
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-[4/5] bg-gray-100 rounded-3xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded-xl w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded-xl w-1/3 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded-xl w-full animate-pulse" />
            <div className="h-4 bg-gray-100 rounded-xl w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-black mb-2">Không tìm thấy sản phẩm</h2>
        {error && <p className="text-gray-500">{error}</p>}
      </div>
    );
  }

  const actualPrice = product.discountPrice || product.price;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
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
        <div>
          <div className="bg-white rounded-[2rem] overflow-hidden border border-gray-100">
            <img src={product.images[0]} className="w-full h-[420px] object-cover" />
          </div>
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
          {product.description && (
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            {product.isNew && <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600">Hàng mới</span>}
            {product.isHot && <span className="px-3 py-1 rounded-full bg-orange-50 text-orange-600">Bán chạy</span>}
            {product.isSale && <span className="px-3 py-1 rounded-full bg-red-50 text-red-600">Đang giảm</span>}
          </div>
        </div>
      </div>

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

