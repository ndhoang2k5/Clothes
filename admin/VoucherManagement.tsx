import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type Voucher = {
  id: number;
  code: string;
  display_name?: string | null;
  image_url?: string | null;
  gift_name?: string | null;
  gift_image_url?: string | null;
  gift_product_id?: number | null;
  percent_value?: number | null;
  fixed_value?: number | null;
  auto_apply?: boolean;
  show_in_checkout?: boolean;
  type: 'percent' | 'fixed' | 'product' | 'combo';
  value: number;
  min_order_total: number;
  max_order_total?: number | null;
  max_discount?: number | null;
  usage_limit?: number | null;
  used_count: number;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active: boolean;
  show_on_homepage?: boolean;
  homepage_sort_order?: number;
  card_theme?: string;
  card_icon?: string;
  benefits?: string[];
  terms_text?: string | null;
  order_condition_mode?: string;
};

type VoucherDraft = Partial<Voucher> & {
  benefits_lines?: string;
  enable_percent?: boolean;
  enable_fixed?: boolean;
  enable_gift?: boolean;
};

type PromoCardForm = {
  show_on_homepage: boolean;
  homepage_sort_order: number;
  card_theme: string;
  card_icon: string;
  benefits_lines: string;
  terms_text: string;
  order_condition_mode: string;
  max_order_total: number | null;
};

const EMPTY_DRAFT: VoucherDraft = {
  code: '',
  display_name: '',
  image_url: '',
  gift_name: '',
  gift_image_url: '',
  type: 'fixed',
  value: 0,
  percent_value: null,
  fixed_value: 0,
  min_order_total: 0,
  max_order_total: null,
  max_discount: null,
  usage_limit: null,
  is_active: true,
  auto_apply: false,
  show_on_homepage: false,
  show_in_checkout: true,
  homepage_sort_order: 0,
  card_theme: 'amber',
  card_icon: 'gift',
  benefits_lines: '',
  terms_text: '',
  order_condition_mode: 'from',
  enable_percent: false,
  enable_fixed: true,
  enable_gift: false,
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
  const [draft, setDraft] = useState<VoucherDraft>({ ...EMPTY_DRAFT });
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const [promoEditor, setPromoEditor] = useState<Voucher | null>(null);
  const [promoForm, setPromoForm] = useState<PromoCardForm | null>(null);

  const sorted = useMemo(() => {
    return [...(data.items || [])].sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1));
  }, [data.items]);

  const promoVouchers = useMemo(() => {
    return sorted.filter((v) => {
      const giftName = String(v.gift_name || v.display_name || '').trim();
      const giftImage = String(v.gift_image_url || v.image_url || '').trim();
      return v.type === 'product' || v.type === 'combo' || !!giftName || !!giftImage;
    });
  }, [sorted]);

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

  const closeDraftEditor = () => {
    setIsAdding(false);
    setEditingVoucher(null);
    setDraft({ ...EMPTY_DRAFT });
  };

  const openCreateEditor = () => {
    setEditingVoucher(null);
    setDraft({ ...EMPTY_DRAFT });
    setIsAdding(true);
  };

  const openEditEditor = (v: Voucher) => {
    const percentValue =
      v.percent_value != null
        ? Number(v.percent_value)
        : v.type === 'percent'
          ? Number(v.value || 0)
          : 0;
    const fixedValue =
      v.fixed_value != null
        ? Number(v.fixed_value)
        : v.type === 'fixed' || v.type === 'combo'
          ? Number(v.value || 0)
          : 0;
    const enableGift =
      v.type === 'product' || v.type === 'combo' || Boolean(String(v.gift_name || v.display_name || '').trim());

    setEditingVoucher(v);
    setDraft({
      ...EMPTY_DRAFT,
      code: v.code,
      display_name: v.display_name || '',
      image_url: v.image_url || '',
      gift_name: v.gift_name || v.display_name || '',
      gift_image_url: v.gift_image_url || v.image_url || '',
      gift_product_id: v.gift_product_id ?? null,
      type: v.type,
      value: Number(v.value || 0),
      percent_value: percentValue > 0 ? percentValue : null,
      fixed_value: fixedValue > 0 ? fixedValue : null,
      min_order_total: Number(v.min_order_total || 0),
      max_order_total: v.max_order_total == null ? null : Number(v.max_order_total),
      max_discount: v.max_discount == null ? null : Number(v.max_discount),
      usage_limit: v.usage_limit == null ? null : Number(v.usage_limit),
      is_active: v.is_active !== false,
      auto_apply: Boolean(v.auto_apply),
      show_in_checkout: v.show_in_checkout !== false,
      show_on_homepage: Boolean(v.show_on_homepage),
      homepage_sort_order: Number(v.homepage_sort_order ?? 0),
      card_theme: v.card_theme || 'amber',
      card_icon: v.card_icon || 'gift',
      benefits_lines: Array.isArray(v.benefits) ? v.benefits.join('\n') : '',
      terms_text: v.terms_text || '',
      order_condition_mode: v.order_condition_mode || 'from',
      enable_percent: v.type === 'percent' || v.type === 'combo' || percentValue > 0,
      enable_fixed: v.type === 'fixed' || v.type === 'combo' || fixedValue > 0,
      enable_gift: enableGift,
    });
    setIsAdding(true);
  };

  const saveDraftVoucher = async () => {
    setError(null);
    try {
      const percentEnabled = Boolean(draft.enable_percent);
      const fixedEnabled = Boolean(draft.enable_fixed);
      const giftEnabled = Boolean(draft.enable_gift);
      const percentValue = percentEnabled ? Number(draft.percent_value || 0) : 0;
      const fixedValue = fixedEnabled ? Number(draft.fixed_value || 0) : 0;
      const giftName = giftEnabled ? String(draft.gift_name || draft.display_name || '').trim() : '';
      const giftImage = giftEnabled ? String(draft.gift_image_url || draft.image_url || '').trim() : '';
      const hasPercent = percentEnabled && percentValue > 0;
      const hasFixed = fixedEnabled && fixedValue > 0;
      const hasGift = giftEnabled && !!giftName;
      const inferredType: Voucher['type'] = hasGift && (hasPercent || hasFixed)
        ? 'combo'
        : hasGift
          ? 'product'
          : hasPercent
            ? 'percent'
            : 'fixed';

      const payload: any = {
        code: String(draft.code || '').trim(),
        display_name: giftName || null,
        image_url: giftImage || null,
        gift_name: giftName || null,
        gift_image_url: giftImage || null,
        gift_product_id: draft.gift_product_id ?? null,
        auto_apply: Boolean(draft.auto_apply),
        show_in_checkout: draft.show_in_checkout !== false,
        type: inferredType,
        value: inferredType === 'percent' ? percentValue : inferredType === 'fixed' ? fixedValue : 0,
        percent_value: hasPercent ? percentValue : null,
        fixed_value: hasFixed ? fixedValue : null,
        min_order_total: Number(draft.min_order_total || 0),
        max_discount:
          hasPercent && draft.max_discount !== null && draft.max_discount !== undefined
            ? Number(draft.max_discount)
            : null,
        usage_limit: draft.usage_limit === null || draft.usage_limit === undefined ? null : Number(draft.usage_limit),
        is_active: draft.is_active !== false,
        show_on_homepage: Boolean(draft.show_on_homepage),
        homepage_sort_order: Number(draft.homepage_sort_order ?? 0),
        card_theme: (draft.card_theme || 'amber').trim() || 'amber',
        card_icon: (draft.card_icon || 'gift').trim() || 'gift',
        terms_text: (draft.terms_text || '').trim() || null,
        order_condition_mode: (draft.order_condition_mode || 'from').trim() || 'from',
        max_order_total:
          draft.max_order_total === null || draft.max_order_total === undefined || draft.max_order_total === ('' as unknown as number)
            ? null
            : Number(draft.max_order_total),
      };
      const lines = String(draft.benefits_lines || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      if (lines.length) payload.benefits = lines;

      if (editingVoucher) {
        await api.adminUpdateVoucher(editingVoucher.id, payload);
      } else {
        await api.adminCreateVoucher(payload);
      }
      closeDraftEditor();
      await load(editingVoucher ? data.page || 1 : 1);
    } catch (e: any) {
      setError(e?.message || (editingVoucher ? 'Cập nhật voucher thất bại' : 'Tạo voucher thất bại'));
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

  const deleteVoucher = async (voucher: Voucher) => {
    const confirmed = window.confirm(`Xóa vĩnh viễn mã "${voucher.code}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;
    setError(null);
    try {
      await api.adminDeleteVoucher(voucher.id);
      const currentPage = Number(data.page || 1);
      const currentCount = Array.isArray(data.items) ? data.items.length : 0;
      const nextPage = currentPage > 1 && currentCount <= 1 ? currentPage - 1 : currentPage;
      await load(nextPage);
    } catch (e: any) {
      setError(e?.message || 'Xóa voucher thất bại');
    }
  };

  const openPromoEditor = (v: Voucher) => {
    setPromoEditor(v);
    setPromoForm({
      show_on_homepage: !!v.show_on_homepage,
      homepage_sort_order: Number(v.homepage_sort_order ?? 0),
      card_theme: (v.card_theme || 'amber').trim(),
      card_icon: (v.card_icon || 'gift').trim(),
      benefits_lines: (v.benefits || []).join('\n'),
      terms_text: v.terms_text || '',
      order_condition_mode: (v.order_condition_mode || 'from').trim(),
      max_order_total: v.max_order_total != null && v.max_order_total !== undefined ? Number(v.max_order_total) : null,
    });
  };

  const savePromoEditor = async () => {
    if (!promoEditor || !promoForm) return;
    setError(null);
    try {
      const lines = promoForm.benefits_lines.split('\n').map((s) => s.trim()).filter(Boolean);
      await api.adminUpdateVoucher(promoEditor.id, {
        show_on_homepage: promoForm.show_on_homepage,
        homepage_sort_order: Number(promoForm.homepage_sort_order || 0),
        card_theme: promoForm.card_theme || 'amber',
        card_icon: promoForm.card_icon || 'gift',
        benefits: lines,
        terms_text: promoForm.terms_text.trim() || null,
        order_condition_mode: promoForm.order_condition_mode || 'from',
        max_order_total:
          promoForm.max_order_total === null || promoForm.max_order_total === undefined
            ? null
            : Number(promoForm.max_order_total),
      });
      setPromoEditor(null);
      setPromoForm(null);
      await load(data.page || 1);
    } catch (e: any) {
      setError(e?.message || 'Lưu thẻ thất bại');
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Quản lý mã giảm giá</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tạo/sửa mã để khách áp dụng tại giỏ hàng. Thẻ “vé” trang chủ bật trong từng mã (mục Thẻ trang chủ).
          </p>
        </div>
        <button
          className="px-5 py-2.5 rounded-xl font-black text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200"
          onClick={() => {
            if (isAdding) closeDraftEditor();
            else openCreateEditor();
          }}
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
          <div className="font-black text-gray-900 mb-4">
            {editingVoucher ? `Chỉnh sửa mã giảm giá · ${editingVoucher.code}` : 'Tạo mã giảm giá'}
          </div>
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
            <div className="text-sm font-bold text-gray-700 md:col-span-3">
              Cấu hình ưu đãi (có thể bật cùng lúc)
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.enable_percent)}
                    onChange={(e) => setDraft((p) => ({ ...p, enable_percent: e.target.checked }))}
                  />
                  Giảm theo %
                </label>
                <label className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.enable_fixed)}
                    onChange={(e) => setDraft((p) => ({ ...p, enable_fixed: e.target.checked }))}
                  />
                  Giảm theo tiền
                </label>
                <label className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.enable_gift)}
                    onChange={(e) => setDraft((p) => ({ ...p, enable_gift: e.target.checked }))}
                  />
                  Tặng sản phẩm
                </label>
              </div>
            </div>
            <label className="text-sm font-bold text-gray-700">
              Giá trị giảm %
              <input
                type="number"
                value={draft.percent_value == null ? '' : Number(draft.percent_value)}
                onChange={(e) => setDraft((p) => ({ ...p, percent_value: e.target.value === '' ? null : Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black disabled:opacity-50"
                disabled={!draft.enable_percent}
                placeholder="VD: 10"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Giá trị giảm tiền (VNĐ)
              <input
                type="number"
                value={draft.fixed_value == null ? '' : Number(draft.fixed_value)}
                onChange={(e) => setDraft((p) => ({ ...p, fixed_value: e.target.value === '' ? null : Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black disabled:opacity-50"
                disabled={!draft.enable_fixed}
                placeholder="VD: 50000"
              />
            </label>
            <div className="text-xs font-bold text-gray-500 flex items-end">
              Nếu bật cả % và tiền, hệ thống sẽ tự lấy mức giảm lớn hơn khi áp mã.
            </div>
            <label className="text-sm font-bold text-gray-700">
              Đơn tối thiểu (VNĐ)
              <input
                type="number"
                value={Number(draft.min_order_total || 0)}
                onChange={(e) => setDraft((p) => ({ ...p, min_order_total: Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
              />
            </label>
            <label className="text-sm font-bold text-gray-700">
              Đơn tối đa (tuỳ chọn, VNĐ)
              <input
                type="number"
                value={draft.max_order_total == null || draft.max_order_total === undefined ? '' : Number(draft.max_order_total)}
                onChange={(e) => setDraft((p) => ({ ...p, max_order_total: e.target.value === '' ? null : Number(e.target.value) }))}
                className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                placeholder="VD: 300000 (đơn ≤ 300k mới áp được)"
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
            <label className="text-sm font-bold text-gray-700 flex items-center gap-3">
              <input
                type="checkbox"
                checked={draft.show_in_checkout !== false}
                onChange={(e) => setDraft((p) => ({ ...p, show_in_checkout: e.target.checked }))}
              />
              Hiển thị đề xuất ở checkout
            </label>
          </div>

          <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Thẻ khuyến mãi trên trang chủ
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Hiển thị dạng vé thay cho banner promo. Nhãn “Giảm …%” và điều kiện đơn lấy từ kiểu giảm / đơn tối thiểu / tối đa bên trên; phần gạch đầu dòng nhập bên dưới.
            </p>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
              <input
                type="checkbox"
                checked={Boolean(draft.show_on_homepage)}
                onChange={(e) => setDraft((p) => ({ ...p, show_on_homepage: e.target.checked }))}
              />
              Hiển thị thẻ này trên trang chủ
            </label>
            {draft.show_on_homepage && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="text-sm font-bold text-gray-700">
                  Thứ tự hiển thị
                  <input
                    type="number"
                    value={Number(draft.homepage_sort_order ?? 0)}
                    onChange={(e) => setDraft((p) => ({ ...p, homepage_sort_order: Number(e.target.value) }))}
                    className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  />
                </label>
                <label className="text-sm font-bold text-gray-700">
                  Cách hiển thị điều kiện đơn
                  <select
                    value={draft.order_condition_mode || 'from'}
                    onChange={(e) => setDraft((p) => ({ ...p, order_condition_mode: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  >
                    <option value="from">Đơn hàng từ … (theo đơn tối thiểu)</option>
                    <option value="under">Đơn hàng dưới … (theo đơn tối đa)</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-gray-700">
                  Màu chủ đề thẻ
                  <select
                    value={draft.card_theme || 'amber'}
                    onChange={(e) => setDraft((p) => ({ ...p, card_theme: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  >
                    <option value="amber">Cam / nâu</option>
                    <option value="blue">Xanh dương</option>
                    <option value="rose">Hồng đỏ</option>
                    <option value="violet">Tím</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-gray-700 md:col-span-1">
                  Icon góc thẻ
                  <select
                    value={draft.card_icon || 'gift'}
                    onChange={(e) => setDraft((p) => ({ ...p, card_icon: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  >
                    <option value="teddy">🧸 Gấu</option>
                    <option value="truck">🚚 Xe / giao hàng</option>
                    <option value="ribbon">🎀 Nơ</option>
                    <option value="bottle">🍼 Bình sữa</option>
                    <option value="gift">🎁 Quà</option>
                  </select>
                </label>
                <label className="text-sm font-bold text-gray-700 md:col-span-3">
                  Lợi ích kèm theo (mỗi dòng một ý, hiển thị gạch đầu dòng)
                  <textarea
                    value={String(draft.benefits_lines || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, benefits_lines: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm min-h-[100px]"
                    placeholder={'Miễn phí vận chuyển\nTặng gối lõm trị giá 99k'}
                  />
                </label>
                <label className="text-sm font-bold text-gray-700 md:col-span-3">
                  Điều kiện áp dụng (hiện khi khách bấm “Điều kiện áp dụng”)
                  <textarea
                    value={String(draft.terms_text || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, terms_text: e.target.value }))}
                    className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm min-h-[80px]"
                    placeholder="Không trùng mã; không đổi tiền mặt;…"
                  />
                </label>
              </div>
            )}
          </div>

          {Boolean(draft.enable_gift) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Thông tin sản phẩm tặng kèm</div>
            <p className="text-xs text-gray-500 mb-3">Khi khách áp mã này, họ sẽ nhận được sản phẩm bên dưới kèm theo đơn hàng.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm font-bold text-gray-700">
                Tên hiển thị
                <input
                  value={String(draft.gift_name || draft.display_name || '')}
                  onChange={(e) => setDraft((p) => ({ ...p, gift_name: e.target.value, display_name: e.target.value }))}
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  placeholder="VD: Body cotton organic size 0-3m"
                />
              </label>
              <div className="text-sm font-bold text-gray-700">
                Ảnh khuyến mãi
                <div className="mt-2 flex gap-3 items-center">
                  <input
                    value={String(draft.gift_image_url || draft.image_url || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, gift_image_url: e.target.value, image_url: e.target.value }))}
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
                          setDraft((p) => ({ ...p, gift_image_url: url, image_url: url }));
                        } catch (err: any) {
                          setError(err?.message || 'Upload ảnh thất bại');
                        } finally {
                          setDraftUploading(false);
                        }
                      }}
                    />
                  </label>
                </div>
                {(draft.gift_image_url || draft.image_url) && (
                  <div className="mt-3 w-24 h-24 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
                    <img src={String(draft.gift_image_url || draft.image_url)} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              onClick={saveDraftVoucher}
              className="px-6 py-3 rounded-2xl font-black text-white bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-200"
              disabled={
                !String(draft.code || '').trim()
                || (!draft.enable_percent && !draft.enable_fixed && !draft.enable_gift)
                || (Boolean(draft.enable_gift)
                  && (!String(draft.gift_name || '').trim() || !String(draft.gift_image_url || draft.image_url || '').trim()))
              }
            >
                {editingVoucher ? 'Lưu chỉnh sửa' : 'Tạo mã'}
            </button>
            <button
              onClick={closeDraftEditor}
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
              <div key={v.id} className="p-6 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                <div className="md:col-span-2">
                  <div className="text-[11px] text-gray-400 font-black uppercase">Mã</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-gray-900">{v.code}</span>
                    {v.show_on_homepage && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Trang chủ
                      </span>
                    )}
                  </div>
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
                    <option value="combo">Combo (giảm + quà)</option>
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
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-sm font-black bg-pink-50 text-pink-700 border border-pink-200 hover:bg-pink-100"
                    onClick={() => openEditEditor(v)}
                  >
                    Chỉnh sửa chi tiết
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-sm font-black bg-[#FFF7EC] text-[#7A4E2C] border border-[#E5D6C4] hover:bg-[#FFF0DC]"
                    onClick={() => openPromoEditor(v)}
                  >
                    Thẻ trang chủ
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-xl text-sm font-black border ${
                      v.show_in_checkout !== false
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => updateVoucher(v.id, { show_in_checkout: !(v.show_in_checkout !== false) })}
                  >
                    {v.show_in_checkout !== false ? 'Đề xuất checkout: Bật' : 'Đề xuất checkout: Tắt'}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    onClick={() => { void deleteVoucher(v); }}
                  >
                    Xóa mã
                  </button>
                  <span className="text-xs text-gray-400">
                    Sửa hiển thị vé, lợi ích, điều kiện, màu &amp; icon
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {promoEditor && promoForm && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8"
          onClick={() => {
            setPromoEditor(null);
            setPromoForm(null);
          }}
          role="presentation"
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="promo-editor-title"
          >
            <h3 id="promo-editor-title" className="text-lg font-black text-gray-900 mb-4">
              Thẻ trang chủ · {promoEditor.code}
            </h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={promoForm.show_on_homepage}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, show_on_homepage: e.target.checked } : s))}
                />
                Hiển thị trên trang chủ
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Thứ tự
                <input
                  type="number"
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  value={promoForm.homepage_sort_order}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, homepage_sort_order: Number(e.target.value) } : s))}
                />
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Điều kiện hiển thị (nhãn)
                <select
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  value={promoForm.order_condition_mode}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, order_condition_mode: e.target.value } : s))}
                >
                  <option value="from">Đơn hàng từ … (đơn tối thiểu)</option>
                  <option value="under">Đơn hàng dưới … (đơn tối đa)</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Đơn tối đa (VNĐ, tuỳ chọn)
                <input
                  type="number"
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  value={promoForm.max_order_total == null ? '' : promoForm.max_order_total}
                  onChange={(e) =>
                    setPromoForm((s) =>
                      s
                        ? {
                            ...s,
                            max_order_total: e.target.value === '' ? null : Number(e.target.value),
                          }
                        : s,
                    )
                  }
                  placeholder="Áp kèm đơn tối thiểu trong danh sách"
                />
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Màu chủ đề
                <select
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  value={promoForm.card_theme}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, card_theme: e.target.value } : s))}
                >
                  <option value="amber">Cam / nâu</option>
                  <option value="blue">Xanh dương</option>
                  <option value="rose">Hồng đỏ</option>
                  <option value="violet">Tím</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Icon
                <select
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-black"
                  value={promoForm.card_icon}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, card_icon: e.target.value } : s))}
                >
                  <option value="teddy">🧸 Gấu</option>
                  <option value="truck">🚚 Xe</option>
                  <option value="ribbon">🎀 Nơ</option>
                  <option value="bottle">🍼 Bình</option>
                  <option value="gift">🎁 Quà</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Lợi ích (mỗi dòng một ý)
                <textarea
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm min-h-[100px]"
                  value={promoForm.benefits_lines}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, benefits_lines: e.target.value } : s))}
                />
              </label>
              <label className="block text-sm font-bold text-gray-700">
                Điều kiện áp dụng (đầy đủ)
                <textarea
                  className="mt-2 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm min-h-[88px]"
                  value={promoForm.terms_text}
                  onChange={(e) => setPromoForm((s) => (s ? { ...s, terms_text: e.target.value } : s))}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void savePromoEditor()}
                className="px-6 py-3 rounded-2xl font-black text-white bg-pink-500 hover:bg-pink-600"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => {
                  setPromoEditor(null);
                  setPromoForm(null);
                }}
                className="px-6 py-3 rounded-2xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tóm tắt: mã tặng sản phẩm */}
      {promoVouchers.length > 0 && (
        <div className="mt-8 bg-amber-50 border border-amber-100 rounded-[2rem] p-6">
          <h3 className="text-lg font-black text-gray-800 mb-3">Mã tặng sản phẩm đang hoạt động</h3>
          <div className="space-y-3">
            {promoVouchers.map((v) => (
              <div key={v.id} className="flex items-center gap-4 bg-white rounded-2xl p-3 border border-gray-100">
                {v.image_url && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <img src={v.gift_image_url || v.image_url || ''} alt={v.gift_name || v.display_name || v.code} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-grow min-w-0">
                  <div className="font-black text-gray-900 truncate">{v.gift_name || v.display_name || v.code}</div>
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

