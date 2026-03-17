import React, { useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { COLORS } from './designTokens';

function formatDateIso(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

const AccountPage: React.FC = () => {
  const { customer, lastOrders, loading, refreshMe, logout } = useAuth();

  useEffect(() => {
    void refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orders = useMemo(() => {
    return (lastOrders || []).map((o: any) => ({
      id: o.id,
      code: o.order_code || o.orderCode || '',
      status: o.status || '',
      total: Number(o.total_amount ?? o.totalAmount ?? 0) || 0,
      createdAt: o.created_at || o.createdAt || '',
    }));
  }, [lastOrders]);

  if (!loading && !customer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-black mb-2" style={{ color: COLORS.textMain }}>Tài khoản</h1>
        <p className="text-gray-600 mb-6">Bạn cần đăng nhập để xem thông tin tài khoản và lịch sử đơn hàng.</p>
        <a
          href="#/login"
          className="inline-flex px-8 py-3 rounded-full font-black text-white shadow-lg shadow-pink-200"
          style={{ backgroundColor: COLORS.ctaPrimary }}
        >
          Đăng nhập
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black" style={{ color: COLORS.textMain }}>Tài khoản của tôi</h1>
          <p className="text-gray-600 text-sm mt-1">Xem thông tin và lịch sử đơn hàng gần đây.</p>
        </div>
        {customer && (
          <button
            onClick={() => { logout(); window.location.hash = '#/'; }}
            className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
          >
            Đăng xuất
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm lg:col-span-1">
          <div className="font-black text-lg text-gray-900 mb-4">Thông tin khách hàng</div>
          {loading ? (
            <div className="text-gray-500 font-bold">Đang tải...</div>
          ) : (
            <>
              <div className="space-y-2 text-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Họ tên</span>
                  <span className="font-black text-gray-900">{customer?.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Email</span>
                  <span className="font-bold text-gray-900">{customer?.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Số điện thoại</span>
                  <span className="font-bold text-gray-900">{customer?.phone || '—'}</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-gray-500 mb-1">Địa chỉ mặc định</div>
                  <div className="font-bold text-gray-900">{customer?.default_address || '—'}</div>
                </div>
              </div>

              <button
                onClick={() => refreshMe()}
                className="w-full mt-5 py-3 rounded-2xl font-black text-white shadow-lg shadow-pink-200"
                style={{ backgroundColor: COLORS.ctaPrimary }}
              >
                Tải lại
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm lg:col-span-2">
          <div className="font-black text-lg text-gray-900 mb-4">Đơn hàng gần đây</div>
          {loading ? (
            <div className="text-gray-500 font-bold">Đang tải...</div>
          ) : orders.length === 0 ? (
            <div className="text-gray-500">Bạn chưa có đơn hàng nào.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black text-gray-900">{o.code || `#${o.id}`}</div>
                      <div className="text-sm text-gray-500 mt-1">{formatDateIso(o.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Trạng thái</div>
                      <div className="font-black text-gray-900">{o.status || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                    <span className="text-gray-500">Tổng tiền</span>
                    <span className="font-black" style={{ color: COLORS.ctaPrimary }}>{o.total.toLocaleString()}đ</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountPage;

