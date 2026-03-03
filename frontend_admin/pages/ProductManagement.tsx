
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Category, Product, ProductVariant } from '../types';

const ProductManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<{
    category_id: number | null;
    name: string;
    slug: string;
    description: string;
    base_price: number;
    discount_price: number | null;
    is_active: boolean;
    is_hot: boolean;
    is_new: boolean;
    is_sale: boolean;
  }>({
    category_id: null,
    name: '',
    slug: '',
    description: '',
    base_price: 0,
    discount_price: null,
    is_active: true,
    is_hot: false,
    is_new: true,
    is_sale: false,
  });

  const [imageUrlDraft, setImageUrlDraft] = useState<string>('');

  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({
    size: '',
    color: '',
    stock: 0,
    sku: '',
    material: '',
  });

  const absUrl = (u?: string | null) => {
    if (!u) return '';
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    if (u.startsWith('/')) return `http://localhost:8888${u}`;
    return u;
  };

  const categoryById = useMemo(() => {
    const m = new Map<number, Category>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, prods] = await Promise.all([api.getCategories(), api.getProducts(true)]);
      setCategories(cats);
      setProducts(prods);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleToggleActive = async (p: Product) => {
    setError(null);
    setSaving(true);
    try {
      await api.updateProduct(p.id, { is_active: !p.is_active });
      await reload();
    } catch (e: any) {
      setError(e?.message || 'Cập nhật trạng thái thất bại');
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      category_id: categories[0]?.id ?? null,
      name: '',
      slug: '',
      description: '',
      base_price: 0,
      discount_price: null,
      is_active: true,
      is_hot: false,
      is_new: true,
      is_sale: false,
    });
    setImageUrlDraft('');
    setNewVariant({ size: '', color: '', stock: 0, sku: '', material: '' });
    setModalOpen(true);
    setError(null);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      category_id: p.category_id,
      name: p.name,
      slug: p.slug || '',
      description: p.description || '',
      base_price: p.base_price,
      discount_price: p.discount_price ?? null,
      is_active: p.is_active,
      is_hot: p.is_hot,
      is_new: p.is_new,
      is_sale: p.is_sale,
    });
    setImageUrlDraft('');
    setNewVariant({ size: '', color: '', stock: 0, sku: '', material: '' });
    setModalOpen(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Tên sản phẩm là bắt buộc.');
      return;
    }
    if (!form.base_price || form.base_price <= 0) {
      setError('Giá gốc phải > 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.updateProduct(editing.id, {
          category_id: form.category_id,
          name: form.name,
          slug: form.slug || null,
          description: form.description || null,
          base_price: form.base_price,
          discount_price: form.discount_price,
          is_active: form.is_active,
          is_hot: form.is_hot,
          is_new: form.is_new,
          is_sale: form.is_sale,
        });
      } else {
        const payload: any = {
          category_id: form.category_id,
          name: form.name,
          slug: form.slug || null,
          description: form.description || null,
          base_price: form.base_price,
          discount_price: form.discount_price,
          is_active: form.is_active,
          is_hot: form.is_hot,
          is_new: form.is_new,
          is_sale: form.is_sale,
        };
        if (imageUrlDraft.trim()) payload.images = [imageUrlDraft.trim()];
        const created = await api.createProduct(payload);
        setEditing(created);
      }
      await reload();
      setModalOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Xóa sản phẩm "${p.name}"?`)) return;
    setError(null);
    try {
      await api.deleteProduct(p.id);
      await reload();
    } catch (e: any) {
      setError(e?.message || 'Xóa thất bại');
    }
  };

  const handleUploadAndSet = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await api.uploadImage(file);
      setImageUrlDraft(url);
    } catch (e: any) {
      setError(e?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const handleAttachImageToEditing = async () => {
    if (!editing) return;
    const url = imageUrlDraft.trim();
    if (!url) {
      setError('Bạn cần upload hoặc nhập URL ảnh.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.addProductImage(editing.id, { image_url: url, is_primary: editing.images.length === 0 });
      await reload();
      const refreshed = (await api.getProducts(true)).find((x) => x.id === editing.id) || null;
      if (refreshed) setEditing(refreshed);
      setImageUrlDraft('');
    } catch (e: any) {
      setError(e?.message || 'Gắn ảnh thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!editing) {
      setError('Hãy lưu sản phẩm trước khi thêm size/màu.');
      return;
    }
    if (!newVariant.size || !newVariant.color) {
      setError('Variant cần có size và màu.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.addVariant(editing.id, {
        size: newVariant.size,
        color: newVariant.color,
        stock: Number(newVariant.stock || 0),
        sku: newVariant.sku || null,
        material: newVariant.material || null,
        is_active: true,
      });
      setNewVariant({ size: '', color: '', stock: 0, sku: '', material: '' });
      await reload();
      const refreshed = (await api.getProducts(true)).find((x) => x.id === editing.id) || null;
      if (refreshed) setEditing(refreshed);
    } catch (e: any) {
      setError(e?.message || 'Thêm variant thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariant = async (variantId: number, patch: Partial<ProductVariant>) => {
    setSaving(true);
    setError(null);
    try {
      await api.updateVariant(variantId, patch);
      await reload();
      if (editing) {
        const refreshed = (await api.getProducts(true)).find((x) => x.id === editing.id) || null;
        if (refreshed) setEditing(refreshed);
      }
    } catch (e: any) {
      setError(e?.message || 'Cập nhật variant thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Xóa variant này?')) return;
    setSaving(true);
    setError(null);
    try {
      await api.deleteVariant(variantId);
      await reload();
      if (editing) {
        const refreshed = (await api.getProducts(true)).find((x) => x.id === editing.id) || null;
        if (refreshed) setEditing(refreshed);
      }
    } catch (e: any) {
      setError(e?.message || 'Xóa variant thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-[2rem] border border-gray-100">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-8">
        <div>
        <h2 className="text-xl font-black">Danh sách Sản phẩm</h2>
          <p className="text-gray-400 text-sm mt-1">Tạo/sửa/xóa + thêm ảnh + thêm size/màu (variants)</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-pink-600"
        >
          Thêm sản phẩm mới
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 font-bold text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-gray-400 italic">Đang tải...</div>
      ) : products.length === 0 ? (
        <div className="py-16 text-center text-gray-400 italic">Chưa có sản phẩm nào. Hãy thêm sản phẩm mới.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-400">
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Giá</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={absUrl(p.primary_image_url || p.images?.[0]?.image_url) || 'https://picsum.photos/80/80?product'}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                      />
                      <div>
                        <div className="font-black text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400">
                          {p.variants?.length || 0} variants · {p.images?.length || 0} ảnh
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-bold">
                    {p.category_id ? categoryById.get(p.category_id)?.name || p.category_slug || '-' : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-pink-600">{Math.round(p.discount_price ?? p.base_price).toLocaleString()}đ</div>
                    {p.discount_price && (
                      <div className="text-xs text-gray-400 line-through">{Math.round(p.base_price).toLocaleString()}đ</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(p)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          p.is_active
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                        disabled={saving}
                        title="Bật / tắt hiển thị sản phẩm trên shop"
                      >
                        {p.is_active ? 'active' : 'off'}
                      </button>
                      {p.is_hot && <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-100 text-orange-700">hot</span>}
                      {p.is_sale && <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">sale</span>}
                      {p.is_new && <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700">new</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-4 py-2 rounded-xl bg-pink-50 text-pink-600 font-black text-sm hover:bg-pink-100"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-black text-sm hover:bg-gray-200"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div>
                <h3 className="text-2xl font-black">{editing ? 'Sửa sản phẩm' : 'Tạo sản phẩm'}</h3>
                <p className="text-sm text-gray-500 mt-1">Lưu sản phẩm trước, sau đó thêm size/màu (variants) và nhiều ảnh.</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-600 font-black"
                disabled={saving || uploading}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Danh mục</label>
                    <select
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                      value={form.category_id ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, category_id: e.target.value ? Number(e.target.value) : null }))}
                    >
                      <option value="">(Không chọn)</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Slug (tuỳ chọn)</label>
                    <input
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                      value={form.slug}
                      onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
                      placeholder="bo-so-sinh-cotton"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Tên sản phẩm</label>
                  <input
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase mb-2">Mô tả</label>
                  <textarea
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 h-28"
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Giá gốc</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                      value={form.base_price}
                      onChange={(e) => setForm((s) => ({ ...s, base_price: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Giá khuyến mãi (tuỳ chọn)</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                      value={form.discount_price ?? ''}
                      onChange={(e) => setForm((s) => ({ ...s, discount_price: e.target.value === '' ? null : Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 font-black text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))}
                      className="w-5 h-5 accent-pink-500"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 font-black text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_sale}
                      onChange={(e) => setForm((s) => ({ ...s, is_sale: e.target.checked }))}
                      className="w-5 h-5 accent-pink-500"
                    />
                    Sale
                  </label>
                  <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 font-black text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_hot}
                      onChange={(e) => setForm((s) => ({ ...s, is_hot: e.target.checked }))}
                      className="w-5 h-5 accent-pink-500"
                    />
                    Hot
                  </label>
                  <label className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 font-black text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.is_new}
                      onChange={(e) => setForm((s) => ({ ...s, is_new: e.target.checked }))}
                      className="w-5 h-5 accent-pink-500"
                    />
                    New
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="font-black text-gray-900 mb-3">Ảnh sản phẩm</div>
                  <div className="flex gap-3">
                    <input
                      className="flex-grow bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                      value={imageUrlDraft}
                      onChange={(e) => setImageUrlDraft(e.target.value)}
                      placeholder="URL ảnh (hoặc upload)"
                    />
                    <label className="px-4 py-3 bg-gray-900 text-white rounded-xl font-black cursor-pointer hover:bg-gray-800 transition-colors whitespace-nowrap">
                      {uploading ? 'Đang up...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleUploadAndSet(f);
                          e.currentTarget.value = '';
                        }}
                        disabled={uploading}
                      />
                    </label>
                    {editing && (
                      <button
                        onClick={() => void handleAttachImageToEditing()}
                        className="px-4 py-3 bg-pink-500 text-white rounded-xl font-black hover:bg-pink-600 disabled:opacity-60"
                        disabled={saving || uploading}
                        title="Gắn ảnh vào sản phẩm đang sửa"
                      >
                        Gắn
                      </button>
                    )}
                  </div>
                  {imageUrlDraft && (
                    <div className="mt-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
                      <img src={absUrl(imageUrlDraft)} className="w-full h-44 object-cover" />
                    </div>
                  )}

                  {editing && editing.images?.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {editing.images.map((img) => (
                        <div key={img.id} className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 group">
                          <img src={absUrl(img.image_url)} className="w-full h-20 object-cover" />
                          <button
                            type="button"
                            onClick={async () => {
                              setSaving(true);
                              setError(null);
                              try {
                                await api.deleteProductImage(img.id);
                                await reload();
                                const refreshed = (await api.getProducts()).find((x) => x.id === editing.id) || null;
                                if (refreshed) setEditing(refreshed as any);
                              } catch (e: any) {
                                setError(e?.message || 'Xóa ảnh thất bại');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="font-black text-gray-900 mb-3">Size / Màu (Variants)</div>
                  {!editing ? (
                    <div className="text-sm text-gray-500">Lưu sản phẩm trước để thêm variants.</div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <input
                          className="bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                          placeholder="Size (vd: 0-3m)"
                          value={(newVariant.size as string) || ''}
                          onChange={(e) => setNewVariant((s) => ({ ...s, size: e.target.value }))}
                        />
                        <input
                          className="bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                          placeholder="Màu (vd: Trắng)"
                          value={(newVariant.color as string) || ''}
                          onChange={(e) => setNewVariant((s) => ({ ...s, color: e.target.value }))}
                        />
                        <input
                          type="number"
                          className="bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                          placeholder="Tồn kho"
                          value={Number(newVariant.stock || 0)}
                          onChange={(e) => setNewVariant((s) => ({ ...s, stock: Number(e.target.value) }))}
                        />
                        <button
                          onClick={() => void handleAddVariant()}
                          className="bg-gray-900 text-white rounded-xl font-black hover:bg-gray-800"
                          disabled={saving}
                        >
                          + Thêm variant
                        </button>
                      </div>

                      {editing.variants?.length === 0 ? (
                        <div className="text-sm text-gray-500">Chưa có variant nào.</div>
                      ) : (
                        <div className="space-y-2">
                          {editing.variants.map((v) => (
                            <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                                <input
                                  className="md:col-span-2 bg-gray-50 rounded-xl px-3 py-2 outline-none"
                                  value={v.size || ''}
                                  onChange={(e) => {
                                    setEditing((p) =>
                                      p
                                        ? {
                                            ...p,
                                            variants: p.variants.map((x) => (x.id === v.id ? { ...x, size: e.target.value } : x)),
                                          }
                                        : p
                                    );
                                  }}
                                />
                                <input
                                  className="md:col-span-2 bg-gray-50 rounded-xl px-3 py-2 outline-none"
                                  value={v.color || ''}
                                  onChange={(e) => {
                                    setEditing((p) =>
                                      p
                                        ? {
                                            ...p,
                                            variants: p.variants.map((x) => (x.id === v.id ? { ...x, color: e.target.value } : x)),
                                          }
                                        : p
                                    );
                                  }}
                                />
                                <input
                                  type="number"
                                  className="bg-gray-50 rounded-xl px-3 py-2 outline-none"
                                  value={v.stock}
                                  onChange={(e) => {
                                    setEditing((p) =>
                                      p
                                        ? {
                                            ...p,
                                            variants: p.variants.map((x) => (x.id === v.id ? { ...x, stock: Number(e.target.value) } : x)),
                                          }
                                        : p
                                    );
                                  }}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => void handleUpdateVariant(v.id, { size: v.size, color: v.color, stock: v.stock })}
                                    className="px-3 py-2 rounded-xl bg-pink-50 text-pink-600 font-black text-xs hover:bg-pink-100"
                                    disabled={saving}
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    onClick={() => void handleDeleteVariant(v.id)}
                                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 font-black text-xs hover:bg-gray-200"
                                    disabled={saving}
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 font-bold text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-grow py-3 bg-gray-100 text-gray-600 font-black rounded-xl"
                disabled={saving || uploading}
              >
                Đóng
              </button>
              <button
                onClick={() => void handleSave()}
                className="flex-grow py-3 bg-pink-500 text-white font-black rounded-xl shadow-lg hover:bg-pink-600 disabled:opacity-60"
                disabled={saving || uploading}
              >
                {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProductManagement;
