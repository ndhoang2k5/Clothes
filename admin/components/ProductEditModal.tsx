import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import type { Category, Product, ProductVariant } from '../../types';

type Props = {
  productId: string;
  categories: Category[];
  onClose: () => void;
  onSaved?: () => void;
};

type EditingImage = { id: string; url: string; alt: string; isPrimary: boolean };

const ProductEditModal: React.FC<Props> = ({ productId, categories, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingImageUploading, setEditingImageUploading] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<Product>>({});
  const [editingVariants, setEditingVariants] = useState<ProductVariant[]>([]);
  const [editingImages, setEditingImages] = useState<EditingImage[]>([]);

  const categoryOptions = useMemo(() => (Array.isArray(categories) ? categories : []), [categories]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [fresh, raw] = await Promise.all([api.adminGetProduct(productId), api.adminGetProductRaw(productId)]);
        if (cancelled) return;
        setEditing(fresh);
        setEditingDraft({
          name: fresh.name,
          price: fresh.price,
          discountPrice: fresh.discountPrice,
          category: fresh.category,
          description: fresh.description,
          isActive: fresh.isActive ?? true,
          isHot: fresh.isHot,
          isNew: fresh.isNew,
          isSale: fresh.isSale,
        });
        setEditingVariants(fresh.variants || []);
        const rawImages: any[] = Array.isArray(raw.images) ? raw.images : [];
        setEditingImages(
          rawImages.map((img) => ({
            id: String(img.id),
            url: api.getImageUrl(img.image_url),
            alt: img.alt_text || '',
            isPrimary: !!img.is_primary,
          })),
        );
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message || 'Không tải được dữ liệu sản phẩm');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editingDraft.name || !editingDraft.price) return;

    // tránh trùng size/màu (unique constraint)
    const seen = new Set<string>();
    for (const v of editingVariants) {
      const key = `${String(v.size || '').trim().toLowerCase()}|${String(v.color || '').trim().toLowerCase()}`;
      if (!key.trim()) continue;
      if (seen.has(key)) {
        setError('Mỗi dòng size/màu phải là duy nhất. Vui lòng gộp lại hoặc xoá dòng trùng.');
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    setError(null);
    try {
      await api.adminUpdateProduct(editing.id, editingDraft);

      // Ảnh: sync primary (nếu có)
      const primary = editingImages.find((x) => x.isPrimary);
      if (primary) {
        try {
          await api.adminSetPrimaryProductImage(primary.id);
        } catch {
          // ignore
        }
      }

      const originalIds = new Set((editing.variants || []).map((v) => v.id));
      const currentIds = new Set(editingVariants.map((v) => v.id));

      // update + add
      for (const v of editingVariants) {
        if (v.id.startsWith('new-')) {
          await api.adminAddVariant(editing.id, {
            size: v.size,
            color: v.color,
            stock: v.stock,
            price: v.price,
          });
        } else {
          await api.adminUpdateVariant(v.id, {
            size: v.size,
            color: v.color,
            stock: v.stock,
            price: v.price,
          });
        }
      }

      // delete removed
      for (const id of originalIds) {
        if (!currentIds.has(id)) {
          await api.adminDeleteVariant(id);
        }
      }

      onSaved?.();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Cập nhật sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-black">Chỉnh sửa sản phẩm</h3>
            {editing?.name && <div className="text-xs text-gray-500 font-bold mt-1">{editing.name}</div>}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-black text-xs hover:bg-gray-200"
            disabled={saving}
          >
            Đóng
          </button>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold">{error}</div>}

        {loading ? (
          <div className="p-10 text-gray-500 font-bold">Đang tải...</div>
        ) : !editing ? (
          <div className="p-10 text-gray-400 italic">Không tìm thấy sản phẩm.</div>
        ) : (
          <div className="space-y-8 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên sản phẩm</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                  value={editingDraft.name || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Giá gốc</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={editingDraft.price ?? 0}
                    onChange={(e) => setEditingDraft({ ...editingDraft, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Giá khuyến mãi</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={editingDraft.discountPrice ?? ''}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        discountPrice: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                <select
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                  value={editingDraft.category || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, category: e.target.value })}
                >
                  {categoryOptions.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none h-24"
                  value={editingDraft.description || ''}
                  onChange={(e) => setEditingDraft({ ...editingDraft, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!editingDraft.isActive}
                    onChange={(e) => setEditingDraft({ ...editingDraft, isActive: e.target.checked })}
                  />
                  Hiển thị (Active)
                </label>
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!editingDraft.isHot}
                    onChange={(e) => setEditingDraft({ ...editingDraft, isHot: e.target.checked })}
                  />
                  Hot
                </label>
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!editingDraft.isSale}
                    onChange={(e) => setEditingDraft({ ...editingDraft, isSale: e.target.checked })}
                  />
                  Sale
                </label>
                <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={!!editingDraft.isNew}
                    onChange={(e) => setEditingDraft({ ...editingDraft, isNew: e.target.checked })}
                  />
                  New
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-gray-800">Ảnh sản phẩm</h4>
                <label className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-black">
                  {editingImageUploading ? 'Đang up...' : 'Upload ảnh'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.currentTarget.value = '';
                      if (!file || !editing) return;
                      try {
                        setEditingImageUploading(true);
                        const url = await api.adminUploadImage(file);
                        const img = await api.adminAttachProductImage(editing.id, url, false);
                        setEditingImages((list) => [
                          ...list,
                          {
                            id: String(img.id),
                            url: api.getImageUrl(img.image_url),
                            alt: img.alt_text || '',
                            isPrimary: !!img.is_primary,
                          },
                        ]);
                      } catch (err: any) {
                        setError(err?.message || 'Upload ảnh thất bại');
                      } finally {
                        setEditingImageUploading(false);
                      }
                    }}
                    disabled={editingImageUploading}
                  />
                </label>
              </div>

              {editingImages.length === 0 ? (
                <div className="text-xs text-gray-400 italic border border-dashed border-gray-200 rounded-2xl px-4 py-6 text-center">
                  Chưa có ảnh nào. Upload ảnh để hiển thị trên trang sản phẩm.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {editingImages.map((img) => (
                    <div key={img.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                      <div className="relative">
                        <img src={img.url} className="w-full h-32 object-cover" alt={img.alt} />
                        {img.isPrimary && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-pink-500 text-white text-[10px] font-black uppercase">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-bold border ${
                              img.isPrimary ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600 border-gray-200'
                            }`}
                            onClick={() => setEditingImages((list) => list.map((it) => ({ ...it, isPrimary: it.id === img.id })))}
                          >
                            Đặt làm ảnh chính
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50"
                            onClick={async () => {
                              try {
                                await api.adminDeleteProductImage(img.id);
                                setEditingImages((list) => list.filter((it) => it.id !== img.id));
                              } catch (err: any) {
                                setError(err?.message || 'Xoá ảnh thất bại');
                              }
                            }}
                          >
                            Xoá
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-gray-800">Size / Màu / Ảnh / Tồn kho</h4>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black"
                  onClick={() =>
                    setEditingVariants((list) => [
                      ...list,
                      {
                        id: `new-${Date.now()}`,
                        sku: '',
                        size: '',
                        color: '',
                        stock: 0,
                        price: undefined,
                      } as any,
                    ])
                  }
                >
                  + Thêm size / màu
                </button>
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-80">
                <div className="overflow-y-auto max-h-80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-400 uppercase">
                      <tr>
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Size</th>
                        <th className="px-4 py-2">Màu</th>
                        <th className="px-4 py-2">Ảnh</th>
                        <th className="px-4 py-2">Tồn kho</th>
                        <th className="px-4 py-2">Giá riêng</th>
                        <th className="px-4 py-2 text-right">Xoá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingVariants.length === 0 ? (
                        <tr>
                          <td className="px-4 py-3 text-center text-gray-400 italic" colSpan={7}>
                            Sản phẩm chưa có size/màu.
                          </td>
                        </tr>
                      ) : (
                        editingVariants.map((v, idx) => {
                          const selectedImage = editingImages.find((img) => img.url === (v as any).image);
                          return (
                            <tr key={v.id} className="border-t border-gray-50">
                              <td className="px-4 py-2 font-mono text-[11px] text-gray-500">{(v as any).sku || '-'}</td>
                              <td className="px-4 py-2">
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                  value={(v as any).size || ''}
                                  onChange={(e) =>
                                    setEditingVariants((list) => {
                                      const next = [...list];
                                      (next[idx] as any) = { ...(next[idx] as any), size: e.target.value };
                                      return next;
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                  value={(v as any).color || ''}
                                  onChange={(e) =>
                                    setEditingVariants((list) => {
                                      const next = [...list];
                                      (next[idx] as any) = { ...(next[idx] as any), color: e.target.value };
                                      return next;
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-pink-500 outline-none"
                                  value={selectedImage?.id ?? ''}
                                  onChange={async (e) => {
                                    const img = editingImages.find((it) => it.id === e.target.value);
                                    if (!img || !editing) {
                                      setEditingVariants((list) => {
                                        const next = [...list];
                                        (next[idx] as any) = { ...(next[idx] as any), image: undefined };
                                        return next;
                                      });
                                      return;
                                    }
                                    try {
                                      await api.adminAddVariantImage(v.id, img.url, true, img.alt);
                                      setEditingVariants((list) => {
                                        const next = [...list];
                                        (next[idx] as any) = { ...(next[idx] as any), image: img.url };
                                        return next;
                                      });
                                    } catch (err: any) {
                                      setError(err?.message || 'Gán ảnh cho size/màu thất bại');
                                    }
                                  }}
                                >
                                  <option value="">—</option>
                                  {editingImages.map((img) => (
                                    <option key={img.id} value={img.id}>
                                      {img.alt || img.url}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                  value={Number((v as any).stock || 0)}
                                  onChange={(e) =>
                                    setEditingVariants((list) => {
                                      const next = [...list];
                                      (next[idx] as any) = { ...(next[idx] as any), stock: Number(e.target.value || 0) };
                                      return next;
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  type="number"
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                  value={(v as any).price ?? ''}
                                  onChange={(e) =>
                                    setEditingVariants((list) => {
                                      const next = [...list];
                                      (next[idx] as any) = {
                                        ...(next[idx] as any),
                                        price: e.target.value === '' ? undefined : Number(e.target.value),
                                      };
                                      return next;
                                    })
                                  }
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50"
                                  onClick={() => setEditingVariants((list) => list.filter((_, index) => index !== idx))}
                                >
                                  Xoá
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-grow py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
            disabled={saving}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            className="flex-grow py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 disabled:opacity-60"
            disabled={saving || loading || !editing}
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;

