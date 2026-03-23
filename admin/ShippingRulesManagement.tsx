import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type ShippingRule = {
  id: number;
  min_order_total: number;
  base_fee: number;
  discount_type: 'percent' | 'fixed' | 'free';
  discount_value: number;
  is_active: boolean;
  sort_order: number;
};

const ShippingRulesManagement: React.FC = () => {
  const [rules, setRules] = useState<ShippingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<ShippingRule>>({
    min_order_total: 0,
    base_fee: 30000,
    discount_type: 'fixed',
    discount_value: 0,
    is_active: true,
    sort_order: 0,
  });

  const sorted = useMemo(() => {
    return [...rules].sort((a, b) => (a.min_order_total - b.min_order_total) || (a.sort_order - b.sort_order) || (a.id - b.id));
  }, [rules]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListShippingRules();
      setRules(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải shipping rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createRule = async () => {
    setError(null);
    try {
      const payload = {
        min_order_total: Number(draft.min_order_total || 0),
        base_fee: Number(draft.base_fee || 0),
        discount_type: draft.discount_type || 'fixed',
        discount_value: Number(draft.discount_value || 0),
        is_active: draft.is_active !== false,
        sort_order: Number(draft.sort_order || 0),
      };
      await api.adminCreateShippingRule(payload);
      setIsAdding(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Tạo rule thất bại');
    }
  };

  const updateRule = async (id: number, patch: Partial<ShippingRule>) => {
    setError(null);
    try {
      await api.adminUpdateShippingRule(id, patch);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Cập nhật thất bại');
    }
  };

  const deleteRule = async (id: number) => {
    if (!confirm('Xóa rule này?')) return;
    setError(null);
    try {
      await api.adminDeleteShippingRule(id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Xóa thất bại');
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Quản lý phí vận chuyển</h2>
          <p className="text-sm text-gray-500 mt-1">Hệ thống tự chọn mức phù hợp theo tổng tiền đơn.</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-xl font-black text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200"
          onClick={() => setIsAdding((v) => !v)}
        >
          {isAdding ? 'Đóng' : 'Thêm mức phí'}
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold">{error}</div>}

      {isAdding && (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mb-6">
          <div className="font-black text-gray-900 mb-4">Tạo mức phí vận chuyển</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm font-bold text-gray-700">
              Ngưỡng áp dụng (đơn từ)
              <input
                type="number"
                value={Number(draft.min_order_total || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, min_order_total: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Phí vận chuyển gốc
              <input
                type="number"
                value={Number(draft.base_fee || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, base_fee: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Cách giảm phí
              <select
                value={draft.discount_type || 'fixed'}
                onChange={(e) => setDraft((p) => ({ ...p, discount_type: e.target.value as any }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold"
              >
                <option value="fixed">Giảm theo số tiền</option>
                <option value="percent">Giảm theo phần trăm (%)</option>
                <option value="free">Miễn phí vận chuyển (freeship)</option>
              </select>
            </label>
            <label className="text-sm font-bold text-gray-700 md:col-span-2">
              Giá trị giảm
              <input
                type="number"
                value={Number(draft.discount_value || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, discount_value: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold"
              />
              <div className="text-[11px] text-gray-400 font-bold mt-1">
                Theo tiền: nhập số tiền; Theo %: nhập %; Freeship: để 0.
              </div>
            </label>
            <label className="text-sm font-bold text-gray-700">
              Thứ tự hiển thị
              <input
                type="number"
                value={Number(draft.sort_order || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, sort_order: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold"
              />
            </label>
            <label className="text-sm font-bold text-gray-700 flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.is_active !== false}
                onChange={(e) => setDraft((p) => ({ ...p, is_active: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={createRule}
              className="px-6 py-3 rounded-2xl font-black text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200"
            >
              Tạo mức phí
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="px-6 py-3 rounded-2xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="font-black text-gray-900">Danh sách mức phí</div>
          <button onClick={load} className="text-sm font-black text-pink-500 hover:underline">Tải lại</button>
        </div>

        {loading ? (
          <div className="p-10 text-gray-500 font-bold">Đang tải...</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-gray-400 italic">Chưa có rule nào.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map((r) => (
              <div key={r.id} className="p-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Áp dụng từ</div>
                  <div className="font-black text-gray-900">{Number(r.min_order_total || 0).toLocaleString()}đ</div>
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Phí Ship</div>
                  <input
                    type="number"
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 font-black"
                    defaultValue={Number(r.base_fee || 0)}
                    onBlur={(e) => updateRule(r.id, { base_fee: Number((e.target as HTMLInputElement).value) } as any)}
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Cách giảm</div>
                  <select
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 font-black"
                    value={r.discount_type}
                    onChange={(e) => updateRule(r.id, { discount_type: e.target.value } as any)}
                  >
                    <option value="fixed">Theo tiền</option>
                    <option value="percent">Theo %</option>
                    <option value="free">Freeship</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Giá trị giảm</div>
                  <input
                    type="number"
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 font-black"
                    defaultValue={Number(r.discount_value || 0)}
                    onBlur={(e) => updateRule(r.id, { discount_value: Number((e.target as HTMLInputElement).value) } as any)}
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Trạng thái</div>
                  <button
                    className={`px-3 py-2 rounded-xl font-black text-sm ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => updateRule(r.id, { is_active: !r.is_active } as any)}
                  >
                    {r.is_active ? 'Bật' : 'Tắt'}
                  </button>
                </div>
                <div className="md:col-span-1 flex justify-end gap-2">
                  <button
                    className="px-3 py-2 rounded-xl font-black text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                    onClick={() => updateRule(r.id, { min_order_total: r.min_order_total, sort_order: r.sort_order } as any)}
                    title="Lưu nhanh"
                  >
                    Lưu
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl font-black text-sm bg-red-50 text-red-600 hover:bg-red-100"
                    onClick={() => deleteRule(r.id)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingRulesManagement;

