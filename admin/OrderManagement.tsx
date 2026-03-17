
import React, { useMemo, useState, useEffect } from 'react';
import { api } from '../services/api';

type AdminOrder = {
  id: number;
  order_code?: string | null;
  customer_name: string;
  phone: string;
  address: string;
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'completed' | 'cancelled' | (string & {});
  total_amount: number;
  created_at?: string | null;
  items?: any[];
  note?: string | null;
  email?: string | null;
  subtotal?: number | null;
  discount_total?: number | null;
  shipping_fee?: number | null;
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

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState<string>(''); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState<string>(''); // yyyy-mm-dd
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / perPage)), [total]);

  useEffect(() => {
    void fetchOrders(1, statusFilter);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce auto-apply filters (q/date/status)
  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchOrders(1, statusFilter, { q, date_from: dateFrom, date_to: dateTo });
    }, 450);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, dateFrom, dateTo, statusFilter]);

  const fetchOrders = async (p: number, status: string = statusFilter, opts?: { q?: string; date_from?: string; date_to?: string }) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.adminListOrders({
        page: p,
        per_page: perPage,
        status: status || undefined,
        q: (opts?.q ?? q).trim() || undefined,
        date_from: (opts?.date_from ?? dateFrom).trim() || undefined,
        date_to: (opts?.date_to ?? dateTo).trim() || undefined,
      });
      const items: AdminOrder[] = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setOrders(items);
      setPage(Number(res?.page ?? p));
      setTotal(Number(res?.total ?? items.length ?? 0));
    } catch (e: any) {
      setError(e?.message || 'Không thể tải đơn hàng');
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const setQuickRange = (days: number) => {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (days - 1));
    const start = startDate.toISOString().slice(0, 10);
    setDateFrom(start);
    setDateTo(end);
  };

  // If navigated from dashboard link: #/admin/orders?order_id=123
  useEffect(() => {
    try {
      const qs = (window.location.hash || '').split('?')[1] || '';
      const params = new URLSearchParams(qs);
      const oid = params.get('order_id');
      if (oid) void openDetail(Number(oid));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (orderId: number) => {
    setError(null);
    setDetailLoading(true);
    try {
      const o = await api.adminGetOrder(orderId);
      setSelected(o as AdminOrder);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải chi tiết đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => setSelected(null);

  const updateStatus = async (status: string) => {
    if (!selected) return;
    setUpdatingStatus(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.adminUpdateOrderStatus(selected.id, status);
      setSelected(updated as AdminOrder);
      await fetchOrders(page);
      const msg = `Đã cập nhật trạng thái: ${statusLabel(status)}`;
      setSuccess(msg);
      window.setTimeout(() => setSuccess((cur) => (cur === msg ? null : cur)), 2500);
    } catch (e: any) {
      setError(e?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const totals = useMemo(() => {
    const subtotal = Number(selected?.subtotal ?? 0) || 0;
    const discount = Number(selected?.discount_total ?? 0) || 0;
    const ship = Number(selected?.shipping_fee ?? 0) || 0;
    const total = Number(selected?.total_amount ?? 0) || 0;
    return { subtotal, discount, ship, total };
  }, [selected]);

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black text-gray-800">Quản lý Đơn hàng</h2>
        <div className="flex gap-2">
           <button onClick={() => fetchOrders(1)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">Tải lại</button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] p-5 mb-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="text-sm font-black text-gray-800">Bộ lọc</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã đơn hoặc SĐT..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-black text-sm"
          />
          <select
            className="bg-gray-50 rounded-xl px-4 py-3 font-black text-sm"
            value={statusFilter}
            onChange={(e) => {
              const v = e.target.value;
              setStatusFilter(v);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="paid">Đã thanh toán</option>
            <option value="shipped">Đang giao</option>
            <option value="completed">Hoàn tất</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <button
            onClick={() => fetchOrders(1, statusFilter)}
            className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-black text-sm hover:bg-gray-200"
          >
            Áp dụng
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="text-sm text-gray-600 font-bold">Ngày đặt</div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-50 rounded-xl px-4 py-3 font-black text-sm"
            />
            <span className="text-gray-400 font-black">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-50 rounded-xl px-4 py-3 font-black text-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setQuickRange(1)}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-black text-sm hover:bg-gray-200"
            >
              Hôm nay
            </button>
            <button
              onClick={() => setQuickRange(7)}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-black text-sm hover:bg-gray-200"
            >
              7 ngày
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-black text-sm hover:bg-gray-200"
            >
              30 ngày
            </button>
          </div>
          <button
            onClick={() => {
              setQ('');
              setStatusFilter('');
              setDateFrom('');
              setDateTo('');
              void fetchOrders(1, '', { q: '', date_from: '', date_to: '' });
            }}
            className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-black text-sm hover:bg-gray-200"
          >
            Xóa lọc
          </button>
          <div className="text-sm text-gray-500 font-bold md:ml-auto">
            Tổng: {total.toLocaleString()} đơn
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 border border-green-100 rounded-2xl text-green-800 font-black">{success}</div>}

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center text-gray-500 font-bold">Đang tải đơn hàng...</div>
        ) : orders.map(order => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-[2rem] p-8 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-gray-800">{order.order_code || `#${order.id}`}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    statusBadge(String(order.status))
                  }`}>
                    {statusLabel(String(order.status))}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Khách hàng</p>
                    <p className="font-bold text-gray-800">{order.customer_name}</p>
                    <p className="text-sm text-gray-500">{order.phone}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Địa chỉ</p>
                    <p className="text-sm text-gray-600">{order.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Tổng tiền</p>
                    <p className="text-xl font-black text-pink-500">{Number(order.total_amount || 0).toLocaleString()}đ</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 min-w-[150px]">
                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Thao tác</p>
                <button
                  type="button"
                  onClick={() => openDetail(order.id)}
                  className="bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm text-gray-700 hover:bg-gray-100"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && (
          <div className="py-20 text-center text-gray-400 italic">Chưa có đơn hàng nào.</div>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between mt-8">
          <button
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-black disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => fetchOrders(page - 1)}
          >
            Trang trước
          </button>
          <div className="text-sm text-gray-500 font-bold">
            Trang {page} / {totalPages}
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-black disabled:opacity-50"
            disabled={orders.length < perPage}
            onClick={() => fetchOrders(page + 1)}
          >
            Trang sau
          </button>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative w-full md:max-w-3xl bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="text-sm text-gray-500 font-bold">Chi tiết đơn</div>
                <div className="text-2xl font-black text-gray-900">{selected.order_code || `#${selected.id}`}</div>
              </div>
              <button onClick={closeDetail} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="Đóng">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {detailLoading ? (
              <div className="text-gray-500 font-bold">Đang tải...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-400 font-black uppercase mb-1">Khách hàng</div>
                    <div className="font-black text-gray-900">{selected.customer_name}</div>
                    <div className="text-sm text-gray-600">{selected.phone}{selected.email ? ` • ${selected.email}` : ''}</div>
                    <div className="text-sm text-gray-600 mt-2">{selected.address}</div>
                    {selected.note && <div className="text-sm text-gray-500 mt-2">Ghi chú: {selected.note}</div>}
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="text-xs text-gray-400 font-black uppercase mb-1">Trạng thái</div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusBadge(String(selected.status))}`}>
                        {statusLabel(String(selected.status))}
                      </span>
                      <select
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 font-black text-sm"
                        value={String(selected.status)}
                        onChange={(e) => updateStatus(e.target.value)}
                        disabled={updatingStatus}
                      >
                        <option value="pending">Chờ xác nhận</option>
                        <option value="confirmed">Đã xác nhận</option>
                        <option value="paid">Đã thanh toán</option>
                        <option value="shipped">Đang giao</option>
                        <option value="completed">Hoàn tất</option>
                        <option value="cancelled">Đã hủy</option>
                      </select>
                    </div>
                    {updatingStatus && <div className="text-xs text-gray-500 font-bold mt-2">Đang cập nhật...</div>}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="font-black text-gray-900 mb-3">Sản phẩm</div>
                  <div className="space-y-3">
                    {(selected.items || []).map((it: any) => (
                      <div key={it.id} className="border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-black text-gray-900">{it.product_name}</div>
                          {it.variant_label && <div className="text-sm text-gray-500 mt-1">{it.variant_label}</div>}
                          <div className="text-sm text-gray-600 mt-2">SL: <strong>{it.quantity}</strong></div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">{Number(it.unit_price || 0).toLocaleString()}đ</div>
                          <div className="font-black text-pink-600">{Number(it.line_total || 0).toLocaleString()}đ</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="font-black text-gray-900 mb-3">Tổng tiền</div>
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                    <span>Tạm tính</span>
                    <span className="font-bold">{totals.subtotal.toLocaleString()}đ</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                    <span>Giảm giá</span>
                    <span className="font-bold">−{totals.discount.toLocaleString()}đ</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                    <span>Phí vận chuyển</span>
                    <span className="font-bold">{totals.ship.toLocaleString()}đ</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                    <span className="font-black text-gray-900">Tổng thanh toán</span>
                    <span className="text-xl font-black text-pink-600">{totals.total.toLocaleString()}đ</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
