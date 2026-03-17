import React from 'react';
import { COLORS } from './designTokens';

const OrderSuccessPage: React.FC = () => {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.hash.split('?')[1] || '' : '');
  const code = params.get('code') || '';
  const total = params.get('total') || '0';
  const date = params.get('date') || '';

  const totalNum = Number(total);
  const displayDate = date ? new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="inline-flex w-16 h-16 rounded-full items-center justify-center text-3xl mb-6" style={{ backgroundColor: 'rgba(181, 138, 90, 0.2)' }}>
        ✓
      </div>
      <h1 className="text-3xl font-black mb-2" style={{ color: COLORS.textMain }}>
        Đặt hàng thành công
      </h1>
      <p className="text-gray-600 mb-8">
        Cảm ơn bạn đã mua sắm. Chúng tôi sẽ liên hệ xác nhận đơn hàng sớm.
      </p>

      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm text-left mb-8">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-600">Mã đơn hàng</span>
          <span className="font-black text-gray-900">{code || '—'}</span>
        </div>
        {displayDate && (
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-600">Ngày đặt</span>
            <span className="font-bold text-gray-900">{displayDate}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <span className="text-gray-600">Tổng thanh toán</span>
          <span className="text-xl font-black" style={{ color: COLORS.ctaPrimary }}>
            {Number.isFinite(totalNum) ? totalNum.toLocaleString() : total}đ
          </span>
        </div>
      </div>

      <a
        href="#/products"
        className="inline-flex px-8 py-3 rounded-full font-black text-white shadow-lg"
        style={{ backgroundColor: COLORS.ctaPrimary }}
      >
        Tiếp tục mua sắm
      </a>
    </div>
  );
};

export default OrderSuccessPage;
