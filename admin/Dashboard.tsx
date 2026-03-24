
import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';
import { Product } from '../types';

type AdminOrder = {
  id: number;
  order_code?: string | null;
  customer_name: string;
  status: string;
  total_amount: number;
  created_at?: string | null;
};

type OrderKpis = {
  total_orders: number;
  status_counts: {
    pending: number;
    confirmed: number;
    paid: number;
    shipped: number;
    completed: number;
    cancelled: number;
  };
  orders_this_month: number;
  cancelled_this_month: number;
  revenue_this_month: number;
  revenue_by_month: Array<{ month: string; orders: number; revenue: number }>;
};

function statusBadge(status: string) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'confirmed': return 'bg-blue-100 text-blue-700';
    case 'paid': return 'bg-purple-100 text-purple-700';
    case 'shipped': return 'bg-orange-100 text-orange-700';
    case 'completed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending': return 'Chờ xác nhận';
    case 'confirmed': return 'Đã xác nhận';
    case 'paid': return 'Đã thanh toán';
    case 'shipped': return 'Đang giao';
    case 'completed': return 'Hoàn tất';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
}

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [kpis, setKpis] = useState<OrderKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.adminGetOrderKpis(),
      api.adminListOrders({ page: 1, per_page: 10 }),
      api.getProducts(),
    ])
      .then(([k, o, p]) => {
        const items: AdminOrder[] = Array.isArray((o as any)?.items) ? (o as any).items : [];
        setKpis(k);
        setOrders(items);
        setProducts(p);
      })
      .catch(() => {
        setKpis(null);
        setOrders([]);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const lowStockProducts = products.filter(p => p.variants.some(v => v.stock < 10)).length;
  const statusSummary = useMemo(() => {
    if (!kpis) {
      return [
        { key: 'pending', label: 'Chờ xác nhận', count: 0 },
        { key: 'confirmed', label: 'Đã xác nhận', count: 0 },
        { key: 'paid', label: 'Đã thanh toán', count: 0 },
        { key: 'shipped', label: 'Đang giao', count: 0 },
        { key: 'completed', label: 'Hoàn tất', count: 0 },
        { key: 'cancelled', label: 'Đã hủy', count: 0 },
      ];
    }
    return [
      { key: 'pending', label: 'Chờ xác nhận', count: kpis.status_counts.pending || 0 },
      { key: 'confirmed', label: 'Đã xác nhận', count: kpis.status_counts.confirmed || 0 },
      { key: 'paid', label: 'Đã thanh toán', count: kpis.status_counts.paid || 0 },
      { key: 'shipped', label: 'Đang giao', count: kpis.status_counts.shipped || 0 },
      { key: 'completed', label: 'Hoàn tất', count: kpis.status_counts.completed || 0 },
      { key: 'cancelled', label: 'Đã hủy', count: kpis.status_counts.cancelled || 0 },
    ];
  }, [kpis]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100">
          <p className="text-pink-500 font-bold text-sm mb-1 uppercase tracking-wider">Tổng đơn hàng</p>
          <h3 className="text-3xl font-black text-pink-900">{loading ? '...' : (kpis?.total_orders ?? 0)}</h3>
        </div>
        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
          <p className="text-blue-500 font-bold text-sm mb-1 uppercase tracking-wider">Đơn chờ xác nhận</p>
          <h3 className="text-3xl font-black text-blue-900">{loading ? '...' : (kpis?.status_counts.pending ?? 0)}</h3>
        </div>
        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
          <p className="text-orange-500 font-bold text-sm mb-1 uppercase tracking-wider">Đơn trong tháng</p>
          <h3 className="text-3xl font-black text-orange-900">{loading ? '...' : (kpis?.orders_this_month ?? 0)}</h3>
        </div>
        <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-100">
          <p className="text-purple-500 font-bold text-sm mb-1 uppercase tracking-wider">Hủy / hoàn tháng</p>
          <h3 className="text-3xl font-black text-purple-900">{loading ? '...' : (kpis?.cancelled_this_month ?? 0)}</h3>
        </div>
        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
          <p className="text-emerald-500 font-bold text-sm mb-1 uppercase tracking-wider">Doanh thu tháng</p>
          <h3 className="text-3xl font-black text-emerald-900">{loading ? '...' : `${Number(kpis?.revenue_this_month || 0).toLocaleString()}đ`}</h3>
        </div>
      </div>

      {/* Order status summary */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-black text-gray-800">Trạng thái đơn hàng</h2>
          <a href="#/admin/orders" className="text-pink-500 font-bold text-sm hover:underline">
            Quản lý đơn hàng
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {statusSummary.map((s) => (
            <div key={s.key} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wider font-bold text-gray-500">{s.label}</div>
              <div className="text-2xl font-black text-gray-800 mt-1">{s.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly revenue */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-black text-gray-800">Doanh thu theo tháng (6 tháng gần nhất)</h2>
        </div>
        {(kpis?.revenue_by_month || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {(kpis?.revenue_by_month || []).map((m) => (
              <div key={m.month} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                <div className="text-xs font-bold text-emerald-700">
                  {(() => {
                    const [y, mo] = String(m.month).split('-');
                    return `${mo}/${y}`;
                  })()}
                </div>
                <div className="text-base font-black text-emerald-900 mt-1">
                  {Number(m.revenue || 0).toLocaleString()}đ
                </div>
                <div className="text-[11px] text-emerald-700/80 font-semibold mt-1">
                  {m.orders} đơn
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Chưa có dữ liệu doanh thu theo tháng.</p>
        )}
      </div>

      {/* Existing stock/product quick numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
          <p className="text-orange-500 font-bold text-sm mb-1 uppercase tracking-wider">Sản phẩm sắp hết hàng</p>
          <h3 className="text-3xl font-black text-orange-900">{lowStockProducts}</h3>
        </div>
        <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-100">
          <p className="text-purple-500 font-bold text-sm mb-1 uppercase tracking-wider">Sản phẩm</p>
          <h3 className="text-3xl font-black text-purple-900">{products.length}</h3>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-black text-gray-800">Đơn hàng gần đây</h2>
          <a href="#/admin/orders" className="text-pink-500 font-bold text-sm hover:underline">Xem tất cả</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-xs font-bold uppercase tracking-widest border-b border-gray-50">
                <th className="px-8 py-4">Mã đơn</th>
                <th className="px-8 py-4">Khách hàng</th>
                <th className="px-8 py-4">Tổng cộng</th>
                <th className="px-8 py-4">Trạng thái</th>
                <th className="px-8 py-4">Ngày đặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.slice(0, 5).map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-4 font-bold text-gray-800">
                    <div className="flex items-center gap-3">
                      <span>{order.order_code || `#${order.id}`}</span>
                      <a
                        href={`#/admin/orders?order_id=${order.id}`}
                        className="text-pink-500 font-black text-xs hover:underline"
                        title="Mở chi tiết đơn hàng"
                      >
                        Xem chi tiết
                      </a>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-gray-600">{order.customer_name}</td>
                  <td className="px-8 py-4 font-black text-pink-500">{Number(order.total_amount || 0).toLocaleString()}đ</td>
                  <td className="px-8 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      statusBadge(String(order.status))
                    }`}>
                      {statusLabel(String(order.status))}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-gray-400 text-sm">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
