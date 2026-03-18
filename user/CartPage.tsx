import React, { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import { COLORS } from './designTokens';
import { api } from '../services/api';

const CartPage: React.FC = () => {
  const { items, totalPrice, updateQuantity, removeItem, clearCart, appliedVoucher, applyVoucher, removeVoucher } = useCart();

  const [voucherInput, setVoucherInput] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [shippingFee, setShippingFee] = useState<number>(0);
  const [shippingLoading, setShippingLoading] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0 || totalPrice <= 0) {
      setShippingFee(0);
      return;
    }
    setShippingLoading(true);
    api
      .userCalculateShipping(totalPrice)
      .then((r) => setShippingFee(r.finalFee ?? 0))
      .catch(() => setShippingFee(0))
      .finally(() => setShippingLoading(false));
  }, [items.length, totalPrice]);

  const voucherDiscount = appliedVoucher?.discountAmount ?? 0;
  const totalPay = Math.max(0, totalPrice - voucherDiscount + shippingFee);

  const handleApplyVoucher = async () => {
    setVoucherError(null);
    setVoucherLoading(true);
    try {
      await applyVoucher(voucherInput);
      setVoucherInput('');
    } catch (e) {
      setVoucherError(e instanceof Error ? e.message : 'Mã không hợp lệ');
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleSubmitOrder = async () => {
    const trimName = name.trim();
    const trimPhone = phone.trim();
    const trimAddress = address.trim();
    if (!trimName || !trimPhone || !trimAddress) {
      setSubmitError('Vui lòng điền đủ Họ tên, Số điện thoại và Địa chỉ.');
      return;
    }
    if (items.length === 0) {
      setSubmitError('Giỏ hàng trống.');
      return;
    }
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      const payload = {
        customer: {
          name: trimName,
          phone: trimPhone,
          email: email.trim() || undefined,
          address: trimAddress,
        },
        items: items.map((it) => ({
          productId: Number(it.productId),
          variantId: it.variant?.id ? Number(it.variant.id) : undefined,
          quantity: it.quantity,
        })),
        voucherCode: appliedVoucher?.code || undefined,
        note: note.trim() || undefined,
      };
      const result = await api.userCreateOrder(payload);
      clearCart();
      const params = new URLSearchParams({
        code: result.orderCode,
        total: String(result.totalAmount),
        date: result.createdAt || '',
      });
      window.location.hash = `#/order-success?${params.toString()}`;
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Đặt hàng thất bại');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formValid = name.trim() && phone.trim() && address.trim() && items.length > 0;

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

          {/* Mã giảm giá */}
          <div className="bg-white rounded-3xl p-4 md:p-5 border border-gray-100 shadow-sm">
            <div className="font-black text-gray-900 mb-3">Mã giảm giá</div>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={voucherInput}
                onChange={(e) => { setVoucherInput(e.target.value); setVoucherError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyVoucher()}
                placeholder="Nhập mã"
                className="flex-1 min-w-[120px] rounded-xl border border-gray-200 px-4 py-2.5 font-medium outline-none focus:border-pink-500"
                disabled={voucherLoading || items.length === 0}
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={voucherLoading || !voucherInput.trim() || items.length === 0}
                className="px-5 py-2.5 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ backgroundColor: COLORS.ctaPrimary }}
              >
                {voucherLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
              </button>
            </div>
            {voucherError && <p className="mt-2 text-sm text-red-600">{voucherError}</p>}
            {appliedVoucher && (
              <p className="mt-2 text-sm text-green-700 font-medium">
                {appliedVoucher.isAuto ? 'Đã tự áp dụng ưu đãi ' : 'Đã áp dụng mã '}
                <strong>{appliedVoucher.code}</strong> (−{appliedVoucher.discountAmount.toLocaleString()}đ)
                <button type="button" onClick={removeVoucher} className="ml-2 text-gray-500 hover:text-red-600 font-bold">
                  {appliedVoucher.isAuto ? 'Bỏ áp' : 'Gỡ'}
                </button>
              </p>
            )}
          </div>

          {/* Thông tin giao hàng */}
          <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm">
            <div className="font-black text-lg text-gray-900 mb-4">Thông tin giao hàng</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Email (tùy chọn)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ giao hàng <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 mb-1">Ghi chú (tùy chọn)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú cho đơn hàng"
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-fit">
            <div className="font-black text-lg text-gray-900 mb-4">Tóm tắt</div>
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Tạm tính</span>
              <span className="font-bold">{totalPrice.toLocaleString()}đ</span>
            </div>
            {appliedVoucher && (
              <div className="flex items-center justify-between text-sm text-green-700 mb-2">
                <span>Giảm giá (mã)</span>
                <span className="font-bold">−{voucherDiscount.toLocaleString()}đ</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Phí vận chuyển</span>
              <span className="font-bold">
                {shippingLoading ? 'Đang tính...' : `${shippingFee.toLocaleString()}đ`}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4 flex items-center justify-between">
              <span className="font-black text-gray-900">Tổng thanh toán</span>
              <span className="text-xl font-black" style={{ color: COLORS.ctaPrimary }}>
                {totalPay.toLocaleString()}đ
              </span>
            </div>
            {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={!formValid || submitLoading}
              className="w-full mt-4 py-3 rounded-2xl text-white font-black shadow-lg shadow-pink-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: COLORS.ctaPrimary }}
            >
              {submitLoading ? 'Đang đặt hàng...' : 'Đặt hàng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
