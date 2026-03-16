import React from 'react';
import { useCart } from './CartContext';
import { COLORS } from './designTokens';

const CartPage: React.FC = () => {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-black mb-2" style={{ color: COLORS.textMain }}>
          Giỏ hàng
        </h1>
        <p className="text-gray-500">Giỏ hàng của bạn đang trống.</p>
        <a
          href="#/products"
          className="inline-flex mt-6 px-6 py-3 rounded-full font-black text-white shadow-lg shadow-pink-200"
          style={{ backgroundColor: COLORS.ctaPrimary }}
        >
          Tiếp tục mua sắm
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black" style={{ color: COLORS.textMain }}>
            Giỏ hàng
          </h1>
          <p className="text-gray-500 text-sm">{items.length} sản phẩm</p>
        </div>
        <button
          onClick={clearCart}
          className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
        >
          Xóa giỏ hàng
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {items.map((it) => {
            const price = Number((it.product as any).discountPrice ?? (it.product as any).price ?? 0) || 0;
            const image =
              (it.product as any).images && (it.product as any).images.length > 0
                ? (it.product as any).images[0]
                : 'https://picsum.photos/600/800?product';
            return (
              <div key={it.key} className="bg-white rounded-3xl p-4 md:p-5 border border-gray-100 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-24 h-28 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={image} alt={(it.product as any).name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black text-gray-900 truncate">{(it.product as any).name}</div>
                        {it.variant && (
                          <div className="text-xs text-gray-500 mt-1">
                            {it.variant.size ? `Size: ${it.variant.size}` : ''}
                            {it.variant.size && it.variant.color ? ' • ' : ''}
                            {it.variant.color ? `Màu: ${it.variant.color}` : ''}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(it.key)}
                        className="text-xs font-bold text-gray-500 hover:text-red-500"
                      >
                        Xóa
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">SL</span>
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => updateQuantity(it.key, Number(e.target.value) || 1)}
                          className="w-20 rounded-xl border border-gray-200 px-3 py-2 text-center font-bold outline-none focus:border-pink-500"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {price.toLocaleString()}đ x {it.quantity}
                        </div>
                        <div className="text-lg font-black text-pink-600">
                          {(price * it.quantity).toLocaleString()}đ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit">
          <div className="font-black text-lg text-gray-900 mb-4">Tóm tắt</div>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Tạm tính</span>
            <span className="font-bold">{totalPrice.toLocaleString()}đ</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
            <span>Phí vận chuyển</span>
            <span className="font-bold">Tính khi thanh toán</span>
          </div>
          <button
            type="button"
            className="w-full py-3 rounded-2xl text-white font-black shadow-lg shadow-pink-200"
            style={{ backgroundColor: COLORS.ctaPrimary }}
          >
            Thanh toán
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;

