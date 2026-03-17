
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

  useEffect(() => {
    Promise.all([api.adminListOrders({ page: 1, per_page: 50 }), api.getProducts()]).then(([o, p]) => {
      const items: AdminOrder[] = Array.isArray((o as any)?.items) ? (o as any).items : [];
      setOrders(items);
      setProducts(p);
    }).catch(() => {
      setOrders([]);
      setProducts([]);
    });
  }, []);

  const totalRevenue = useMemo(() => {
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const lowStockProducts = products.filter(p => p.variants.some(v => v.stock < 10)).length;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100">
          <p className="text-pink-500 font-bold text-sm mb-1 uppercase tracking-wider">Doanh thu tổng</p>
          <h3 className="text-3xl font-black text-pink-900">{totalRevenue.toLocaleString()}đ</h3>
        </div>
        <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
          <p className="text-blue-500 font-bold text-sm mb-1 uppercase tracking-wider">Đơn hàng mới</p>
          <h3 className="text-3xl font-black text-blue-900">{pendingOrders}</h3>
        </div>
        <div className="bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
          <p className="text-orange-500 font-bold text-sm mb-1 uppercase tracking-wider">Sắp hết hàng</p>
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
