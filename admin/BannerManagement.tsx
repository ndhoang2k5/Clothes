
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AdminBanner, BannerSlot } from '../types';

const SLOT_OPTIONS: Array<{ value: BannerSlot; label: string; desc: string }> = [
  { value: 'home_hero', label: 'Ảnh bìa trang chủ', desc: 'Ảnh bìa lớn đầu trang (carousel)' },
  { value: 'home_promo', label: 'Banner khuyến mãi', desc: 'Banner ưu đãi giữa trang' },
  { value: 'home_product_promo', label: 'Khuyến mãi sản phẩm (tên + ảnh)', desc: 'Grid card ưu đãi sản phẩm' },
  { value: 'home_category_feature', label: 'Danh mục nổi bật', desc: 'Banner/ảnh cho danh mục nổi bật' },
  { value: 'footer_banner', label: 'Banner chân trang', desc: 'Banner cuối trang' },
];

/** Kích thước ảnh khuyến nghị (px) cho từng slot — khớp với tỉ lệ hiển thị trên giao diện user. */
export const BANNER_IMAGE_SIZES: Record<BannerSlot, { width: number; height: number; note?: string }> = {
  home_hero: { width: 1920, height: 600, note: 'Bìa full ngang, cao 400–600px trên màn hình' },
  home_promo: { width: 1920, height: 400, note: 'Banner khuyến mãi giữa trang, cao ~240–280px' },
  home_product_promo: { width: 800, height: 800, note: 'Card vuông (phù hợp hiển thị grid 3 cột)' },
  home_category_feature: { width: 800, height: 352, note: 'Mỗi ô 1/3 cột, hiển thị ~400×176px' },
  footer_banner: { width: 1920, height: 220, note: 'Dải ngang trước footer, cao ~180–220px' },
};

const getSlotLabel = (value: string) => SLOT_OPTIONS.find((o) => o.value === value)?.label ?? value;
const getBannerSizeHint = (slot: string) => {
  const s = BANNER_IMAGE_SIZES[slot as BannerSlot];
  return s ? `${s.width} × ${s.height} px` : '';
};

const BannerManagement: React.FC = () => {
  const [slot, setSlot] = useState<BannerSlot>('home_hero');
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBanner | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<{
    slot: BannerSlot;
    sort_order: number;
    image_url: string;
    title: string;
    subtitle: string;
    link_url: string;
    is_active: boolean;
  }>({
    slot: 'home_hero',
    sort_order: 0,
    image_url: '',
    title: '',
    subtitle: '',
    link_url: '',
    is_active: true,
  });

  useEffect(() => {
    fetchBanners();
  }, [slot, activeOnly]);

  const fetchBanners = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListBanners({ slot, active_only: activeOnly });
      setBanners(data);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải banners');
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      slot,
      sort_order: 0,
      image_url: '',
      title: '',
      subtitle: '',
      link_url: '',
      is_active: true,
    });
    setModalOpen(true);
    setError(null);
  };

  const openEdit = (b: AdminBanner) => {
    setEditing(b);
    setForm({
      slot: (b.slot as BannerSlot) || slot,
      sort_order: b.sort_order ?? 0,
      image_url: b.image_url || '',
      title: b.title || '',
      subtitle: b.subtitle || '',
      link_url: b.link_url || '',
      is_active: b.is_active ?? true,
    });
    setModalOpen(true);
    setError(null);
  };

  const toImagePath = (url: string) => {
    if (!url?.trim()) return url || '';
    const u = url.trim();
    if (u.startsWith('http://') || u.startsWith('https://')) {
      try { return new URL(u).pathname; } catch { return u; }
    }
    return u.startsWith('/') ? u : `/${u}`;
  };

  const handleSave = async () => {
    if (!form.image_url?.trim()) {
      setError('Bạn cần upload hoặc nhập URL ảnh.');
      return;
    }
    const imagePath = toImagePath(form.image_url);
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.adminUpdateBanner(editing.id, {
          slot: form.slot,
          sort_order: form.sort_order,
          image_url: imagePath,
          title: form.title || null,
          subtitle: form.subtitle || null,
          link_url: form.link_url || null,
          is_active: form.is_active,
        });
      } else {
        await api.adminCreateBanner({
          slot: form.slot,
          sort_order: form.sort_order,
          image_url: imagePath,
          title: form.title || null,
          subtitle: form.subtitle || null,
          link_url: form.link_url || null,
          is_active: form.is_active,
        });
      }
      setModalOpen(false);
      await fetchBanners();
    } catch (e: any) {
      setError(e?.message || 'Lưu banner thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa banner này?')) return;
    setError(null);
    try {
      await api.adminDeleteBanner(id);
      await fetchBanners();
    } catch (e: any) {
      setError(e?.message || 'Xóa banner thất bại');
    }
  };

  const handleToggleActive = async (b: AdminBanner) => {
    setError(null);
    try {
      await api.adminUpdateBanner(b.id, { is_active: !b.is_active });
      await fetchBanners();
    } catch (e: any) {
      setError(e?.message || 'Đổi trạng thái thất bại');
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await api.adminUploadImage(file);
      setForm((s) => ({ ...s, image_url: url }));
    } catch (e: any) {
      setError(e?.message || 'Upload ảnh thất bại');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Quản lý Banner theo Slot</h2>
          <p className="text-gray-500 text-sm mt-1">
            Admin upload ảnh → lấy URL → gán vào slot hiển thị ở trang user.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-pink-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-pink-600 transition-colors"
        >
          + Thêm Banner
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Vị trí banner</label>
            <select
              className="w-full bg-gray-50 rounded-2xl px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-pink-500"
              value={slot}
              onChange={(e) => setSlot(e.target.value as BannerSlot)}
            >
              {SLOT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.desc}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-1">Trạng thái:</span>
            <div className="inline-flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveOnly(false)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${!activeOnly ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setActiveOnly(true)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeOnly ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Chỉ đang hiển thị
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500 lg:text-right">
            {loading ? 'Đang tải...' : `Có ${banners.length} banner`}
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-50 text-red-700 border border-red-100 rounded-2xl px-4 py-3 font-bold text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {!loading &&
          banners.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-gray-100 rounded-[2rem] p-6 flex flex-col md:flex-row gap-8 items-center"
            >
              <div className="w-full md:w-72 h-36 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 bg-gray-50">
                <img src={b.image_url} className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow w-full">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                    {getSlotLabel(String(b.slot))}
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-pink-100 text-pink-600 rounded">
                    Thứ tự {b.sort_order}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {b.is_active ? 'Đang hiển thị' : 'Đang ẩn'}
                  </span>
                  <h3 className="font-black text-gray-900">{b.title || '(Không tiêu đề)'}</h3>
                </div>
                {b.subtitle && <p className="text-sm text-gray-500 mb-1">{b.subtitle}</p>}
                <p className="text-xs text-gray-400 truncate">{b.image_url}</p>
                {b.link_url && (
                  <p className="text-xs text-pink-500 font-bold mt-1 truncate">Link: {b.link_url}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex p-0.5 bg-gray-100 rounded-xl mr-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(b)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${b.is_active ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    title={b.is_active ? 'Tắt hiển thị' : 'Bật hiển thị'}
                  >
                    Bật
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(b)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${!b.is_active ? 'bg-gray-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                    title={!b.is_active ? 'Bật hiển thị' : 'Ẩn banner'}
                  >
                    Tắt
                  </button>
                </div>
                <button
                  onClick={() => openEdit(b)}
                  className="p-3 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-xl transition-all"
                  title="Sửa"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="Xóa"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

        {!loading && banners.length === 0 && (
          <div className="py-16 text-center text-gray-400 italic">Chưa có banner cho slot này.</div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-4 p-6 md:p-8 shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
            <h3 className="text-xl font-black mb-4 flex-shrink-0">{editing ? 'Sửa Banner' : 'Tạo Banner'}</h3>
            <div className="space-y-3 overflow-y-auto min-h-0 flex-1 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-1">Vị trí hiển thị</label>
                  <select
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                    value={form.slot}
                    onChange={(e) => setForm((s) => ({ ...s, slot: e.target.value as BannerSlot }))}
                  >
                    {SLOT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} — {o.desc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-1">Thứ tự</label>
                  <input
                    type="number"
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                    value={form.sort_order}
                    onChange={(e) => setForm((s) => ({ ...s, sort_order: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-1">Trạng thái</label>
                  <div className="inline-flex p-0.5 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, is_active: true }))}
                      className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${form.is_active ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      Hiển thị
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((s) => ({ ...s, is_active: false }))}
                      className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${!form.is_active ? 'bg-gray-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                    >
                      Ẩn
                    </button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-1">Tiêu đề</label>
                  <input
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    value={form.title}
                    onChange={e => setForm((s) => ({ ...s, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase mb-1">Subtitle (tuỳ chọn)</label>
                  <input
                    className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    value={form.subtitle}
                    onChange={e => setForm((s) => ({ ...s, subtitle: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <label className="block text-[11px] font-black text-gray-400 uppercase">Ảnh banner</label>
                  <span className="text-[11px] text-gray-500 whitespace-nowrap">
                    Khuyến nghị: <strong className="text-gray-700">{getBannerSizeHint(form.slot)}</strong>
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="min-w-[180px] sm:min-w-[240px] w-48 sm:w-64 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {form.image_url ? (
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">Chưa có ảnh</div>
                    )}
                  </div>
                  <input
                    className="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                    value={form.image_url}
                    onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
                    placeholder="URL ảnh (dán link hoặc bấm Upload)"
                  />
                  <label className="flex-shrink-0 inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-gray-800">
                    {uploading ? 'Đang up...' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleUpload(f);
                        e.currentTarget.value = '';
                      }}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-black text-gray-400 uppercase mb-1">Link URL (tuỳ chọn)</label>
                <input
                  className="w-full bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                  value={form.link_url}
                  onChange={(e) => setForm((s) => ({ ...s, link_url: e.target.value }))}
                  placeholder="#/products hoặc https://..."
                />
              </div>
            </div>
            {error && (
              <div className="mt-3 flex-shrink-0 bg-red-50 text-red-700 border border-red-100 rounded-xl px-3 py-2 text-sm font-bold">
                {error}
              </div>
            )}
            <div className="flex gap-3 mt-4 flex-shrink-0">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-grow py-2.5 text-sm font-bold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
                disabled={saving || uploading}
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="flex-grow py-2.5 text-sm font-bold rounded-xl bg-pink-500 text-white shadow-lg hover:bg-pink-600 disabled:opacity-60"
                disabled={saving || uploading}
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannerManagement;
