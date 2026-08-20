import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Product } from '../types';

type PromoRow = {
  id: number;
  name: string;
  percent_off: number;
  is_active: boolean;
  product_ids: number[];
  products: Array<{
    id: number;
    name: string;
    base_price: number;
    sale_price: number;
    primary_image_url?: string | null;
    is_active?: boolean;
  }>;
  product_count: number;
};

const PromotionManagement: React.FC = () => {
  const [items, setItems] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [percent, setPercent] = useState<string>('20');
  const [isActive, setIsActive] = useState(true);
  const [selected, setSelected] = useState<Product[]>([]);

  const [addQ, setAddQ] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addItems, setAddItems] = useState<Product[]>([]);

  const selectedIds = useMemo(() => new Set(selected.map((p) => String(p.id))), [selected]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.adminListPromotions();
      setItems(rows as PromoRow[]);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải khuyến mãi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const term = addQ.trim();
      if (!term) {
        setAddItems([]);
        return;
      }
      setAddLoading(true);
      void api
        .adminListProductsPage({ page: 1, per_page: 12, q: term, include_inactive: true })
        .then((res) => {
          setAddItems((res.items || []).filter((p) => !selectedIds.has(String(p.id))));
        })
        .catch((e: any) => setError(e?.message || 'Không tìm được sản phẩm'))
        .finally(() => setAddLoading(false));
    }, 300);
    return () => window.clearTimeout(t);
  }, [addQ, selectedIds]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPercent('20');
    setIsActive(true);
    setSelected([]);
    setAddQ('');
    setAddItems([]);
  };

  const openEdit = (row: PromoRow) => {
    setEditingId(row.id);
    setName(row.name || '');
    setPercent(String(row.percent_off || 20));
    setIsActive(!!row.is_active);
    setSelected(
      (row.products || []).map((p) => ({
        id: String(p.id),
        name: p.name,
        description: '',
        price: Number(p.base_price || 0),
        discountPrice: Number(p.sale_price || 0),
        category: '',
        material: '',
        images: p.primary_image_url ? [api.getImageUrl(p.primary_image_url)] : [],
        isHot: false,
        isNew: false,
        isSale: true,
        salePercent: row.percent_off,
        variants: [],
        isActive: p.is_active,
      })),
    );
    setAddQ('');
    setAddItems([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addProduct = (p: Product) => {
    setSelected((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
    setAddItems((prev) => prev.filter((x) => x.id !== p.id));
  };

  const removeProduct = (id: string) => {
    setSelected((prev) => prev.filter((p) => p.id !== id));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const pct = Number(percent);
      if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
        throw new Error('Phần trăm khuyến mãi phải từ 1 đến 99');
      }
      if (selected.length === 0) {
        throw new Error('Hãy chọn ít nhất 1 sản phẩm');
      }
      const payload = {
        name: name.trim() || `Giảm ${pct}%`,
        percent_off: Math.round(pct),
        product_ids: selected.map((p) => p.id),
        is_active: isActive,
      };
      if (editingId) {
        await api.adminUpdatePromotion(editingId, payload);
      } else {
        await api.adminCreatePromotion(payload);
      }
      // Clear shop list cache so % hiển thị ngay
      try {
        (api as any).productListCache?.clear?.();
      } catch {
        // ignore
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Lưu khuyến mãi thất bại');
    } finally {
      setSaving(false);
    }
  };

  const removePromo = async (row: PromoRow) => {
    if (!window.confirm(`Xóa khuyến mãi "${row.name}" (${row.percent_off}%)?`)) return;
    setError(null);
    try {
      await api.adminDeletePromotion(row.id);
      if (editingId === row.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Xóa thất bại');
    }
  };

  const previewPrice = (base: number, pct: number) =>
    Math.round(Number(base || 0) * (100 - pct) / 100);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Sản phẩm khuyến mãi</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tạo nhóm theo % giảm (ví dụ 20% / 15%), chọn sản phẩm — giá sale tính trên giá gốc. Hiện trên menu &quot;Giảm giá&quot;.
          </p>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="px-5 py-3 rounded-xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            + Tạo khuyến mãi mới
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold">{error}</div>
      )}

      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mb-8">
        <h3 className="text-lg font-black text-gray-800 mb-4">
          {editingId ? `Sửa khuyến mãi #${editingId}` : 'Thêm khuyến mãi'}
        </h3>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <label className="block">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Tên (tuỳ chọn)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sale cuối tuần 20%"
              className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 font-bold"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">% khuyến mãi</span>
            <input
              type="number"
              min={1}
              max={99}
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="mt-1 w-full bg-gray-50 rounded-xl px-4 py-3 font-black text-pink-600 text-xl"
            />
          </label>
          <label className="flex items-end gap-3 pb-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="font-bold text-gray-700">Đang áp dụng (hiển thị trên web)</span>
          </label>
        </div>

        <div className="mb-3">
          <div className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
            Sản phẩm trong nhóm ({selected.length})
          </div>
          {selected.length === 0 ? (
            <div className="text-sm text-gray-400 font-bold py-4">Chưa chọn sản phẩm.</div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              {selected.map((p) => {
                const pct = Number(percent) || 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 bg-pink-50 border border-pink-100 rounded-2xl px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate max-w-[220px]">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        <span className="line-through mr-1">{p.price.toLocaleString()}đ</span>
                        <span className="text-pink-600 font-black">
                          {previewPrice(p.price, pct).toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(String(p.id))}
                      className="text-red-500 font-black px-2"
                      title="Bỏ"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <input
            value={addQ}
            onChange={(e) => setAddQ(e.target.value)}
            placeholder="Tìm sản phẩm để thêm (tên / SKU)..."
            className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold mb-3"
          />
          {addLoading && <div className="text-sm text-gray-400 font-bold mb-2">Đang tìm…</div>}
          {addItems.length > 0 && (
            <div className="border border-gray-100 rounded-2xl overflow-hidden mb-4">
              {addItems.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.price.toLocaleString()}đ</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProduct(p)}
                    className="px-4 py-2 rounded-xl font-black bg-pink-500 text-white hover:bg-pink-600"
                  >
                    Thêm
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="px-6 py-3 rounded-xl font-black bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-60"
        >
          {saving ? 'Đang lưu…' : editingId ? 'Cập nhật khuyến mãi' : 'Tạo khuyến mãi'}
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-black text-gray-800">Các nhóm khuyến mãi</h3>
          <button type="button" onClick={() => void load()} className="text-sm font-bold text-pink-500">
            Tải lại
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-gray-400 font-bold">Đang tải…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-gray-400 font-bold">Chưa có khuyến mãi nào.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((row) => (
              <div key={row.id} className="p-6 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-2xl font-black text-red-500">{row.percent_off}%</span>
                    <span className="font-black text-gray-800">{row.name}</span>
                    {!row.is_active && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                        Tắt
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 font-bold">
                    {row.product_count} sản phẩm
                    {(row.products || []).slice(0, 3).map((p) => ` · ${p.name}`).join('')}
                    {row.product_count > 3 ? '…' : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="px-4 py-2 rounded-xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => void removePromo(row)}
                    className="px-4 py-2 rounded-xl font-black bg-red-50 text-red-600 hover:bg-red-100"
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

export default PromotionManagement;
