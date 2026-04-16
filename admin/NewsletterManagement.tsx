import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { NewsletterSubscriber } from '../types';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('vi-VN');
};

const escapeCsv = (value: string | number | boolean | null | undefined) => {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
};

const NewsletterManagement: React.FC = () => {
  const [items, setItems] = useState<NewsletterSubscriber[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'sent'>('all');
  const [subscribedFrom, setSubscribedFrom] = useState('');
  const [subscribedTo, setSubscribedTo] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  const fetchData = async (opts?: { page?: number; perPage?: number }) => {
    const nextPage = opts?.page ?? page;
    const nextPerPage = opts?.perPage ?? perPage;
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListNewsletterSubscribers({
        q: q.trim() || undefined,
        status,
        subscribed_from: subscribedFrom || undefined,
        subscribed_to: subscribedTo || undefined,
        page: nextPage,
        per_page: nextPerPage,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách email');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [page, perPage, status]);

  const applySearch = () => {
    setPage(1);
    void fetchData({ page: 1 });
  };

  const exportCsv = async () => {
    setExporting(true);
    setError(null);
    try {
      const rows = await api.adminListNewsletterSubscribers({
        q: q.trim() || undefined,
        status,
        subscribed_from: subscribedFrom || undefined,
        subscribed_to: subscribedTo || undefined,
        page: 1,
        per_page: 5000,
      });
      const header = ['ID', 'Email', 'Trang thai', 'Ngay dang ky', 'Ngay gui admin'];
      const csvRows = rows.items.map((it) => [
        it.id,
        it.email,
        it.is_notified ? 'Da gui admin' : 'Cho gui',
        it.subscribed_at || '',
        it.notified_at || '',
      ]);
      const content = [header, ...csvRows].map((line) => line.map((v) => escapeCsv(v)).join(',')).join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      a.href = url;
      a.download = `newsletter-subscribers-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Export CSV thất bại');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (row: NewsletterSubscriber) => {
    if (!confirm(`Xóa email "${row.email}" khỏi danh sách đăng ký?`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      await api.adminDeleteNewsletterSubscriber(row.id);
      const shouldGoPrevPage = items.length <= 1 && page > 1;
      const nextPage = shouldGoPrevPage ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      await fetchData({ page: nextPage });
    } catch (e: any) {
      setError(e?.message || 'Xóa email thất bại');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Đăng ký nhận tin</h2>
          <p className="text-sm text-gray-500 mt-1">
            Danh sách email khách đã đăng ký ở chân trang và trạng thái gửi batch về admin.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          className="px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
        >
          {exporting ? 'Đang export...' : 'Export CSV'}
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] p-5 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              Tìm email
            </label>
            <input
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="Nhập email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              Trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as 'all' | 'pending' | 'sent');
                setPage(1);
              }}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ gửi admin</option>
              <option value="sent">Đã gửi admin</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              Từ ngày
            </label>
            <input
              type="date"
              value={subscribedFrom}
              onChange={(e) => setSubscribedFrom(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              Đến ngày
            </label>
            <input
              type="date"
              value={subscribedTo}
              onChange={(e) => setSubscribedTo(e.target.value)}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
              / Trang
            </label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div>
            <button
              type="button"
              onClick={applySearch}
              className="w-full px-4 py-3 rounded-xl bg-pink-500 text-white font-bold hover:bg-pink-600"
            >
              Tìm
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-50 text-red-700 border border-red-100 rounded-xl px-4 py-3 text-sm font-bold">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-500 font-bold">
          {loading ? 'Đang tải...' : `Tổng ${total} email đăng ký`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-xs font-black uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Ngày đăng ký</th>
                <th className="px-6 py-3">Ngày gửi admin</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!loading &&
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm font-semibold text-gray-800">{row.email}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          row.is_notified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {row.is_notified ? 'Đã gửi admin' : 'Chờ gửi admin'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(row.subscribed_at)}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{formatDate(row.notified_at)}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        disabled={deletingId === row.id}
                        className="inline-flex px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-bold text-xs disabled:opacity-60"
                      >
                        {deletingId === row.id ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {!loading && items.length === 0 && (
            <div className="py-12 text-center text-gray-400 italic">Chưa có dữ liệu email đăng ký.</div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold disabled:opacity-50"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Trang trước
          </button>
          <div className="text-sm font-bold text-gray-600">
            Trang {page} / {totalPages}
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold disabled:opacity-50"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Trang sau →
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsletterManagement;
