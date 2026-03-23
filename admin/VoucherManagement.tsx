import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Voucher = {
  id: number;
  code: string;
  display_name?: string | null;
  image_url?: string | null;
  auto_apply?: boolean;
  type: 'percent' | 'fixed' | 'product';
  value: number;
  min_order_total: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active: boolean;
};

const VoucherManagement: React.FC = () => {
  const [q, setQ] = useState('');
  const [activeOnly, setActiveOnly] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ items: Voucher[]; total: number; page: number; per_page: number }>({
    items: [],
    total: 0,
    page: 1,
    per_page: 30,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [draftUploading, setDraftUploading] = useState(false);
  const [draft, setDraft] = useState<Partial<Voucher>>({
    code: '',
    display_name: '',
    image_url: '',
    type: 'fixed',
    value: 0,
    min_order_total: 0,
    max_discount: null,
    usage_limit: null,
    is_active: true,
    auto_apply: false,
  });

  const sorted = useMemo(() => {
    return [...(data.items || [])].sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
  }, [data.items]);

  const promoVouchers = useMemo(
    () => sorted.filter((v) => v.type === 'product'),
    [sorted],
  );

  const load = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListVouchers({
        q: q.trim() || undefined,
        is_active: activeOnly === null ? undefined : activeOnly,
        page,
        per_page: 30,
      });
      setData({
        items: Array.isArray(res.items) ? res.items : Array.isArray(res) ? res : [],
        total: Number(res.total ?? (Array.isArray(res) ? res.length : 0)),
        page: Number(res.page ?? page),
        per_page: Number(res.per_page ?? 30),
      });
    } catch (e: any) {
      setError(e?.message || 'Không thể tải vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(1); }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(1), 300);
    return () => window.clearTimeout(t);
  }, [q, activeOnly]);

  const createVoucher = async () => {
    setError(null);
    try {
      const payload: any = {
        code: String(draft.code || '').trim(),
        display_name: (draft.display_name || '').trim() || null,
        image_url: (draft.image_url || '').trim() || null,
        auto_apply: Boolean(draft.auto_apply),
        type: draft.type || 'fixed',
        value: Number(draft.value || 0),
        min_order_total: Number(draft.min_order_total || 0),
        max_discount: draft.max_discount === null || draft.max_discount === undefined ? null : Number(draft.max_discount),
        usage_limit: draft.usage_limit === null || draft.usage_limit === undefined ? null : Number(draft.usage_limit),
        is_active: draft.is_active !== false,
      };
      await api.adminCreateVoucher(payload);
      setIsAdding(false);
      setDraft({ code: '', display_name: '', image_url: '', auto_apply: false, type: 'fixed', value: 0, min_order_total: 0, max_discount: null, usage_limit: null, is_active: true });
      await load(1);
    } catch (e: any) {
      setError(e?.message || 'Tạo voucher thất bại');
    }
  };

  const updateVoucher = async (id: number, patch: any) => {
    setError(null);
    try {
      await api.adminUpdateVoucher(id, patch);
      await load(data.page || 1);
    } catch (e: any) {
      setError(e?.message || 'Cập nhật thất bại');
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Quản lý mã giảm giá</h2>
          <p className="text-sm text-gray-500 mt-1">Tạo/sửa mã để khách áp dụng tại giỏ hàng.</p>
        </div>
        <button
          className="px-5 py-2.5 rounded-xl font-black text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200"
          onClick={() => setIsAdding((v) => !v)}
        >
          {isAdding ? 'Đóng' : 'Thêm mã mới'}
        </button>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold">{error}</div>}

      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã (VD: SALE50)..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-bold"
          />
          <select
            value={activeOnly === null ? 'all' : activeOnly ? 'active' : 'inactive'}
            onChange={(e) => setActiveOnly(e.target.value === 'all' ? null : e.target.value === 'active')}
            className="bg-gray-50 rounded-xl px-4 py-3 font-bold"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bật</option>
            <option value="inactive">Đang tắt</option>
          </select>
          <button onClick={() => load(1)} className="px-5 py-3 rounded-xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200">Tải lại</button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mb-6">
          <div className="font-black text-gray-900 mb-4">Tạo mã giảm giá</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="text-sm font-bold text-gray-700">
              Mã giảm giá
              <input
                value={String(draft.code || '')}
                onChange={(e) => setDraft((p) => ({ ...p, code: e.target.value }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black uppercase"
                placeholder="VD: SALE50"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Kiểu giảm
              <select
                value={draft.type || 'fixed'}
                onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value as any }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
              >
                <option value="fixed">Giảm theo số tiền</option>
                <option value="percent">Giảm theo phần trăm (%)</option>
                <option value="product">Tặng sản phẩm</option>
              </select>
            </label>
            <label className="text-sm font-bold text-gray-700">
              Giá trị giảm
              <input
                type="number"
                value={Number(draft.value || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, value: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Đơn tối thiểu
              <input
                type="number"
                value={Number(draft.min_order_total || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, min_order_total: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Trần giảm tối đa (chỉ áp dụng với %)
              <input
                type="number"
                value={draft.max_discount == null ? '' : Number(draft.max_discount)}
                onChange={(e) => setDraft((p) => ({ ...p, max_discount: e.target.value === '' ? null : Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                placeholder="Bỏ trống nếu không giới hạn"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Giới hạn lượt dùng
              <input
                type="number"
                value={draft.usage_limit == null ? '' : Number(draft.usage_limit)}
                onChange={(e) => setDraft((p) => ({ ...p, usage_limit: e.target.value === '' ? null : Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                placeholder="Bỏ trống nếu không giới hạn"
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
            <label className="text-sm font-bold text-gray-700 flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(draft.auto_apply)}
                onChange={(e) => setDraft((p) => ({ ...p, auto_apply: e.target.checked }))}
              />
              Tự động áp dụng (nếu khách không nhập mã)
            </label>
          </div>

          {draft.type === 'product' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Thông tin sản phẩm tặng kèm</div>
            <p className="text-xs text-gray-500 mb-3">Khi khách áp mã này, họ sẽ nhận được sản phẩm bên dưới kèm theo đơn hàng.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm font-bold text-gray-700">
                Tên hiển thị
                <input
                  value={String(draft.display_name || '')}
                  onChange={(e) => setDraft((p) => ({ ...p, display_name: e.target.value }))}
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  placeholder="VD: Giảm 30% Bộ Hè"
                />
              </label>
              <div className="text-sm font-bold text-gray-700">
                Ảnh khuyến mãi
                <div className="mt-2 flex gap-3 items-center">
                  <input
                    value={String(draft.image_url || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, image_url: e.target.value }))}
                    className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-black text-xs"
                    placeholder="Dán URL ảnh hoặc upload"
                  />
                  <label className="px-4 py-3 rounded-xl bg-gray-900 text-white text-xs font-bold cursor-pointer hover:bg-black whitespace-nowrap">
                    {draftUploading ? 'Đang up...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={draftUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.currentTarget.value = '';
                        if (!file) return;
                        setDraftUploading(true);
                        setError(null);
                        try {
                          const url = await api.adminUploadImage(file);
                          setDraft((p) => ({ ...p, image_url: url }));
                        } catch (err: any) {
                          setError(err?.message || 'Upload ảnh thất bại');
                        } finally {
                          setDraftUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
                {draft.image_url && (
                  <div className="mt-3 w-24 h-24 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img src={draft.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={createVoucher}
              className="px-6 py-3 rounded-2xl font-black text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200"
              disabled={!String(draft.code || '').trim() || (draft.type === 'product' && !String(draft.display_name || '').trim())}
            >
                Tạo mã
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
          <div className="font-black text-gray-900">Danh sách mã giảm giá</div>
          <div className="text-sm text-gray-500 font-bold">{data.total} mã</div>
        </div>

        {loading ? (
          <div className="p-10 text-gray-500 font-bold">Đang tải...</div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-gray-400 italic">Chưa có voucher nào.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map((v) => (
              <div key={v.id} className="p-6 grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                <div className="md:col-span-2">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Mã</div>
                  <div className="font-black text-gray-900">{v.code}</div>
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Tự động</div>
                  <button
                    className={`px-3 py-2 rounded-xl font-black text-sm ${
                      v.auto_apply ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}
                    onClick={() => updateVoucher(v.id, { auto_apply: !v.auto_apply })}
                    title="Nếu bật, hệ thống sẽ tự áp voucher tốt nhất khi khách không nhập mã"
                  >
                    {v.auto_apply ? 'Tự áp' : 'Thủ công'}
                  </button>
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Kiểu giảm</div>
                  <select
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 font-black"
                    value={v.type}
                    onChange={(e) => updateVoucher(v.id, { type: e.target.value })}
                  >
                    <option value="fixed">Theo tiền</option>
                    <option value="percent">Theo %</option>
                    <option value="product">Tặng SP</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Giá trị</div>
                  <input
                    type="number"
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 font-black"
                    defaultValue={Number(v.value || 0)}
                    onBlur={(e) => updateVoucher(v.id, { value: Number((e.target as HTMLInputElement).value) })}
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Đơn tối thiểu</div>
                  <input
                    type="number"
                    className="w-full bg-gray-50 rounded-xl px-3 py-2 font-black"
                    defaultValue={Number(v.min_order_total || 0)}
                    onBlur={(e) => updateVoucher(v.id, { min_order_total: Number((e.target as HTMLInputElement).value) })}
                  />
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Trạng thái</div>
                  <button
                    className={`px-3 py-2 rounded-xl font-black text-sm ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                    onClick={() => updateVoucher(v.id, { is_active: !v.is_active })}
                  >
                    {v.is_active ? 'Bật' : 'Tắt'}
                  </button>
                </div>
                <div className="md:col-span-1">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Đã dùng / Giới hạn</div>
                  <div className="font-bold text-gray-700 text-sm">
                    {Number(v.used_count || 0)} / {v.usage_limit == null ? '∞' : Number(v.usage_limit)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tóm tắt: mã tặng sản phẩm */}
      {promoVouchers.length > 0 && (
        <div className="mt-8 bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
          <h3 className="text-lg font-black text-gray-800 mb-3">Mã tặng sản phẩm đang hoạt động</h3>
          <div className="space-y-3">
            {promoVouchers.map((v) => (
              <div key={v.id} className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-gray-100">
                {v.image_url && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <img src={v.image_url} alt={v.display_name || v.code} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <div className="font-black text-gray-900 truncate">{v.display_name || v.code}</div>
                  <div className="text-xs text-gray-500">
                    Mã: {v.code} · Đơn từ {Number(v.min_order_total).toLocaleString()}đ
                    {' · '}{v.is_active ? 'Đang bật' : 'Đã tắt'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherManagement;

