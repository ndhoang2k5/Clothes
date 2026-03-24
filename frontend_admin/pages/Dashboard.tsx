
import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Product } from '../../types';

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

function buildKpisFromOrders(allOrders: AdminOrder[]): OrderKpis {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const status_counts = {
    pending: 0,
    confirmed: 0,
    paid: 0,
    shipped: 0,
    completed: 0,
    cancelled: 0,
  };

  let orders_this_month = 0;
  let cancelled_this_month = 0;
  let revenue_this_month = 0;

  const monthKeys: Array<{ key: string; year: number; month: number }> = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(currentYear, currentMonth - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    monthKeys.push({
      key: `${y}-${String(m).padStart(2, '0')}`,
      year: y,
      month: m - 1,
    });
  }

  const revenueMap = new Map<string, { revenue: number; orders: number }>();
  monthKeys.forEach((m) => revenueMap.set(m.key, { revenue: 0, orders: 0 }));

  allOrders.forEach((o) => {
    const status = String(o.status || '').toLowerCase();
    if (status in status_counts) {
      (status_counts as any)[status] += 1;
    }

    const created = o.created_at ? new Date(o.created_at) : null;
    if (!created || Number.isNaN(created.getTime())) return;

    const y = created.getFullYear();
    const m = created.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const amount = Number(o.total_amount || 0);

    if (y === currentYear && m === currentMonth) {
      orders_this_month += 1;
      if (status === 'cancelled') cancelled_this_month += 1;
      if (status !== 'cancelled') revenue_this_month += amount;
    }

    const row = revenueMap.get(key);
    if (row) {
      row.orders += 1;
      if (status !== 'cancelled') row.revenue += amount;
    }
  });

  return {
    total_orders: allOrders.length,
    status_counts,
    orders_this_month,
    cancelled_this_month,
    revenue_this_month,
    revenue_by_month: monthKeys.map((m) => {
      const row = revenueMap.get(m.key) || { revenue: 0, orders: 0 };
      return {
        month: m.key,
        orders: row.orders,
        revenue: row.revenue,
      };
    }),
  };
}

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
  const [animatedHeights, setAnimatedHeights] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.adminGetOrderKpis(),
      api.adminListOrders({ page: 1, per_page: 10 }),
      api.getProducts(),
    ])
      .then(async ([kpiResult, ordersResult, productsResult]) => {
        const recentOrders: AdminOrder[] =
          ordersResult.status === 'fulfilled' && Array.isArray((ordersResult.value as any)?.items)
            ? ((ordersResult.value as any).items as AdminOrder[])
            : [];
        const loadedProducts: Product[] =
          productsResult.status === 'fulfilled' && Array.isArray(productsResult.value)
            ? productsResult.value
            : [];

        setOrders(recentOrders);
        setProducts(loadedProducts);

        if (kpiResult.status === 'fulfilled') {
          setKpis(kpiResult.value as OrderKpis);
          return;
        }

        try {
          const fallbackOrdersRes = await api.adminListOrders({ page: 1, per_page: 0 });
          const allOrders: AdminOrder[] = Array.isArray((fallbackOrdersRes as any)?.items)
            ? ((fallbackOrdersRes as any).items as AdminOrder[])
            : [];
          setKpis(buildKpisFromOrders(allOrders));
        } catch {
          // Final fallback from current list to avoid empty KPI boxes.
          setKpis(buildKpisFromOrders(recentOrders));
        }
      })
      .catch(() => {
        setKpis(buildKpisFromOrders([]));
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
  const revenueSeries = useMemo(() => {
    const rows = kpis?.revenue_by_month || [];
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const maxRevenue = rows.reduce((mx, r) => Math.max(mx, Number(r.revenue || 0)), 0);
    const safeMax = maxRevenue > 0 ? maxRevenue : 1;
    return rows.map((r) => {
      const [year, month] = String(r.month).split('-');
      const revenue = Number(r.revenue || 0);
      const ratio = Math.round((revenue / safeMax) * 100);
      const heightPercent = revenue > 0 ? Math.max(8, ratio) : 2;
      return {
        key: r.month,
        label: `${month}/${year}`,
        revenue,
        orders: Number(r.orders || 0),
        heightPercent,
        isCurrentMonth: r.month === currentMonthKey,
      };
    });
  }, [kpis]);

  useEffect(() => {
    if (revenueSeries.length === 0) {
      setAnimatedHeights([]);
      return;
    }
    setAnimatedHeights(revenueSeries.map(() => 0));
    const t = window.setTimeout(() => {
      setAnimatedHeights(revenueSeries.map((r) => r.heightPercent));
    }, 60);
    return () => window.clearTimeout(t);
  }, [revenueSeries.map((r) => `${r.key}:${r.heightPercent}`).join('|')]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 md:p-8">
        <h2 className="text-xl font-black text-gray-800 mb-5">Doanh thu theo tháng (6 tháng gần nhất)</h2>
        {revenueSeries.length > 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-emerald-50/40 to-white p-4 md:p-6">
            <div className="relative h-60 md:h-72">
              <div className="absolute left-0 top-0 bottom-9 w-9 flex flex-col justify-between text-[10px] text-gray-400 font-bold">
                <span>100%</span>
                <span>50%</span>
                <span>0</span>
              </div>
              <div className="absolute left-9 right-0 top-0 bottom-9 pointer-events-none">
                <div className="relative h-full">
                  <div className="absolute inset-x-0 top-0 border-t border-dashed border-emerald-200" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-emerald-200" />
                  <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-emerald-200" />
                </div>
              </div>

              <div className="absolute left-9 right-0 top-0 bottom-9 flex items-end gap-3 md:gap-5">
                {revenueSeries.map((m, idx) => (
                  <div key={m.key} className="flex-1 min-w-0 h-full flex items-end">
                    <div
                      className={`w-full rounded-t-xl shadow-sm transition-all duration-700 ${
                        m.isCurrentMonth
                          ? 'bg-gradient-to-t from-fuchsia-500 to-fuchsia-300 ring-2 ring-fuchsia-200'
                          : 'bg-gradient-to-t from-emerald-500 to-emerald-300 hover:from-emerald-600 hover:to-emerald-400'
                      }`}
                      style={{ height: `${animatedHeights[idx] ?? 0}%` }}
                      title={`${m.label}: ${m.revenue.toLocaleString()}đ (${m.orders} đơn)`}
                    />
                  </div>
                ))}
              </div>

              <div className="absolute left-9 right-0 bottom-0 h-8 flex items-end gap-3 md:gap-5">
                {revenueSeries.map((m) => (
                  <div key={`${m.key}-label`} className="flex-1 min-w-0 text-center">
                    <div className={`text-[11px] font-bold ${m.isCurrentMonth ? 'text-fuchsia-600' : 'text-gray-500'}`}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2">
              {revenueSeries.map((m) => (
                <div
                  key={`${m.key}-meta`}
                  className={`rounded-xl px-3 py-2 border ${
                    m.isCurrentMonth
                      ? 'bg-fuchsia-50 border-fuchsia-100'
                      : 'bg-emerald-50/60 border-emerald-100'
                  }`}
                >
                  <div className={`text-[11px] font-bold ${m.isCurrentMonth ? 'text-fuchsia-700' : 'text-emerald-700'}`}>
                    {m.revenue.toLocaleString()}đ
                  </div>
                  <div className="text-[10px] text-gray-400">{m.orders} đơn</div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-gray-400">
              * Trục Y rút gọn theo tỷ lệ 0 / 50% / 100%. Cột tím là tháng hiện tại.
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Chưa có dữ liệu doanh thu theo tháng.</p>
        )}
      </div>

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
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusBadge(String(order.status))}`}>
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
