
import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Category, Product, ProductVariant, ComboItem } from '../types';

const ProductManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
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

  // Ảnh tạm khi tạo mới sản phẩm (chưa lưu vào DB)
  const [draftImages, setDraftImages] = useState<{ image_url: string }[]>([]);

  // Danh sách size/màu tạm để tạo nhiều biến thể cùng lúc khi tạo mới
  const [draftSizes, setDraftSizes] = useState<string[]>([]);
  const [draftColors, setDraftColors] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState('');
  const [colorInput, setColorInput] = useState('');
  const [comboDraft, setComboDraft] = useState<{ variantId: number | null; quantity: number }>({
    variantId: null,
    quantity: 1,
  });

  // Chọn sản phẩm cho Box quà / Combo (giống Bộ sưu tập) – chỉ dùng khi đang tạo mới combo
  const [selectedComboProductIds, setSelectedComboProductIds] = useState<string[]>([]);

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

  const isComboCategory = (category_id: number | null) => {
    if (!category_id) return false;
    const cat = categoryById.get(category_id);
    if (!cat) return false;
    return cat.slug === 'qua-tang' || cat.slug === 'di-sinh';
  };

  // Sản phẩm đơn có variant – dùng để chọn vào Box/Combo (giống Bộ sưu tập)
  const productsAvailableForCombo = useMemo(
    () =>
      products.filter(
        (p) =>
          p.kind === 'single' &&
          p.id !== editing?.id &&
          (p.variants?.length ?? 0) > 0,
      ),
    [products, editing?.id],
  );

  // Khi đang sửa combo: danh sách product ID đã có trong combo (từ combo_items)
  const selectedComboProductIdsFromCombo = useMemo(() => {
    if (!editing || editing.kind !== 'combo' || !(editing.combo_items as ComboItem[] | undefined)?.length)
      return [];
    const variantIds = new Set((editing.combo_items as ComboItem[]).map((ci) => ci.component_variant_id));
    const ids: string[] = [];
    products.forEach((p) => {
      if (p.variants?.some((v) => variantIds.has(v.id))) ids.push(String(p.id));
    });
    return ids;
  }, [editing, products]);

  const isProductSelectedForCombo = (productId: string) =>
    editing?.kind === 'combo'
      ? selectedComboProductIdsFromCombo.includes(productId)
      : selectedComboProductIds.includes(productId);

  const selectedComboCount =
    editing?.kind === 'combo'
      ? selectedComboProductIdsFromCombo.length
      : selectedComboProductIds.length;

  // Tổng giá box/combo: khi tạo = tổng giá sản phẩm đã chọn, khi sửa = giá từ server
  const comboTotalPrice = useMemo(() => {
    if (editing?.kind === 'combo') return editing.base_price ?? 0;
    return selectedComboProductIds.reduce((sum, pid) => {
      const p = products.find((x) => String(x.id) === pid);
      if (!p) return sum;
      return sum + Math.round(p.discount_price ?? p.base_price);
    }, 0);
  }, [editing?.kind, editing?.base_price, selectedComboProductIds, products]);

  const toggleProductForCombo = async (productId: string) => {
    if (editing?.kind === 'combo') {
      const p = products.find((x) => String(x.id) === productId);
      if (!p?.variants?.length) return;
      const variantIdsInCombo = new Set(
        (editing.combo_items as ComboItem[] | undefined)?.map((ci) => ci.component_variant_id) ?? [],
      );
      const isSelected = p.variants.some((v) => variantIdsInCombo.has(v.id));
      setSaving(true);
      setError(null);
      try {
        if (isSelected) {
          for (const v of p.variants) {
            if (variantIdsInCombo.has(v.id))
              await api.deleteComboItem(editing.id, v.id);
          }
        } else {
          await api.addComboItem(editing.id, p.variants[0].id, 1);
        }
        const refreshed = (await api.getProducts(true)).find((x) => x.id === editing.id) ?? null;
        if (refreshed) setEditing(refreshed);
      } catch (e: any) {
        setError(e?.message ?? 'Cập nhật combo thất bại');
      } finally {
        setSaving(false);
      }
    } else {
      setSelectedComboProductIds((prev) =>
        prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
      );
    }
  };

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

  const openCreateWithCategorySlug = (slug?: string | null) => {
    const cat = slug ? categories.find((c) => c.slug === slug) : categories[0];
    setEditing(null);
    setForm({
      category_id: cat?.id ?? null,
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
    setDraftImages([]);
    setDraftSizes([]);
    setDraftColors([]);
    setSizeInput('');
    setColorInput('');
    setSelectedComboProductIds([]);
    setModalOpen(true);
    setError(null);
  };

  const openCreate = () => openCreateWithCategorySlug(null);
  const openCreateGiftBox = () => openCreateWithCategorySlug('qua-tang');
  const openCreateBirthCombo = () => openCreateWithCategorySlug('di-sinh');

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
    setDraftImages([]);
    setDraftSizes([]);
    setDraftColors([]);
    setSizeInput('');
    setColorInput('');
    setSelectedComboProductIds([]);
    setModalOpen(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Tên sản phẩm là bắt buộc.');
      return;
    }
    const isCombo = isComboCategory(form.category_id);
    if (!isCombo && (!form.base_price || form.base_price <= 0)) {
      setError('Giá gốc phải > 0.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const desiredKind: 'single' | 'combo' = isCombo ? 'combo' : 'single';
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
          kind: desiredKind,
        });
      } else {
        const payload: any = {
          category_id: form.category_id,
          name: form.name,
          slug: form.slug || null,
          description: form.description || null,
          base_price: isCombo ? 0 : form.base_price,
          discount_price: form.discount_price,
          is_active: form.is_active,
          is_hot: form.is_hot,
          is_new: form.is_new,
          is_sale: form.is_sale,
          kind: desiredKind,
        };
        // Ảnh: ưu tiên danh sách ảnh đã thêm, nếu không có thì fallback 1 ảnh đang nhập
        if (draftImages.length > 0) {
          payload.images = draftImages.map((img, idx) => ({
            image_url: img.image_url,
            sort_order: idx,
            is_primary: idx === 0,
          }));
        } else if (imageUrlDraft.trim()) {
          payload.images = [imageUrlDraft.trim()];
        }

        // Variants: chỉ tạo khi là sản phẩm đơn (single).
        if (desiredKind === 'single') {
          const sizes = draftSizes.map((s) => s.trim()).filter(Boolean);
          const colors = draftColors.map((c) => c.trim()).filter(Boolean);
          const variants: Array<Partial<ProductVariant> & { is_active: boolean; stock: number }> = [];

          if (sizes.length && colors.length) {
            sizes.forEach((size) => {
              colors.forEach((color) => {
                variants.push({
                  size,
                  color,
                  stock: 0,
                  is_active: true,
                });
              });
            });
          } else if (sizes.length) {
            sizes.forEach((size) =>
              variants.push({
                size,
                color: null,
                stock: 0,
                is_active: true,
              }),
            );
          } else if (colors.length) {
            colors.forEach((color) =>
              variants.push({
                size: null,
                color,
                stock: 0,
                is_active: true,
              }),
            );
          }

          if (variants.length > 0) {
            payload.variants = variants;
          }
        }

        const created = await api.createProduct(payload);
        // Box/Combo: thêm từng sản phẩm đã chọn vào combo (giống Bộ sưu tập)
        if (desiredKind === 'combo' && selectedComboProductIds.length > 0) {
          for (const pid of selectedComboProductIds) {
            const p = products.find((x) => String(x.id) === String(pid));
            if (p?.variants?.length) {
              await api.addComboItem(created.id, p.variants[0].id, 1);
            }
          }
        }
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

  // Khi đang tạo sản phẩm (chưa có trong DB) – thêm ảnh vào danh sách tạm
  const handleAddDraftImage = () => {
    const url = imageUrlDraft.trim();
    if (!url) return;
    setDraftImages((prev) => [...prev, { image_url: url }]);
    setImageUrlDraft('');
  };

  const handleDeleteDraftImage = (index: number) => {
    setDraftImages((prev) => prev.filter((_, i) => i !== index));
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
    if (editing) {
      if (!newVariant.size || !newVariant.color) {
        setError('Variant cần có size và màu.');
        return;
      }
      // Nếu đang sửa product đã có trong DB -> gọi API như cũ
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
    } else {
      // Tạo mới sản phẩm: không dùng handleAddVariant, mà dùng danh sách size/màu hàng loạt
      setError('Khi tạo mới, hãy nhập danh sách size & màu ở phía trên, hệ thống sẽ tự tạo các lựa chọn.');
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
    if (!editing) return;
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
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black">Danh sách Sản phẩm</h2>
          <p className="text-gray-400 text-sm mt-1">
            Tạo/sửa/xóa + thêm ảnh + thêm size/màu (variants) · hỗ trợ cả Box quà tặng &amp; Combo đi sinh.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={openCreateGiftBox}
            className="bg-purple-50 text-purple-600 px-4 py-2 rounded-xl font-black text-sm hover:bg-purple-100"
          >
            + Tạo Box quà tặng
          </button>
          <button
            onClick={openCreateBirthCombo}
            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl font-black text-sm hover:bg-emerald-100"
          >
            + Tạo Combo đi sinh
          </button>
          <button
            onClick={openCreate}
            className="bg-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-pink-600"
          >
            + Thêm sản phẩm mới
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black text-gray-400 uppercase">Lọc theo danh mục</span>
          <select
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            value={filterCategoryId ?? ''}
            onChange={(e) =>
              setFilterCategoryId(e.target.value ? Number(e.target.value) : null)
            }
          >
            <option value="">Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-gray-400">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            Combo / Box quà tặng là sản phẩm có loại <span className="font-bold text-gray-700">combo</span>.
          </span>
        </div>
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
          {filterCategoryId && (
            <div className="text-xs text-gray-400 mb-2">
              Đang hiển thị sản phẩm thuộc danh mục{' '}
              <span className="font-bold text-gray-700">
                {categoryById.get(filterCategoryId)?.name || '—'}
              </span>
              .
            </div>
          )}
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
              {(filterCategoryId
                ? products.filter((p) => p.category_id === filterCategoryId)
                : products
              ).map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={absUrl(p.primary_image_url || p.images?.[0]?.image_url) || 'https://picsum.photos/80/80?product'}
                        className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                      />
                      <div>
                        <div className="font-black text-gray-900 flex items-center gap-2">
                          {p.name}
                          {p.kind === 'combo' && (
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                              Combo
                            </span>
                          )}
                        </div>
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
                <h3 className="text-2xl font-black">
                  {editing
                    ? 'Sửa sản phẩm'
                    : isComboCategory(form.category_id)
                    ? 'Tạo Box quà / Combo đi sinh'
                    : 'Tạo sản phẩm'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isComboCategory(form.category_id)
                    ? 'Box quà / Combo gồm nhiều sản phẩm nhỏ lẻ. Điền thông tin bên trái và chọn sản phẩm thành phần bên phải (giống tạo Bộ sưu tập), rồi bấm Lưu.'
                    : 'Lưu sản phẩm trước, sau đó thêm size/màu (variants) và nhiều ảnh.'}
                </p>
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
              {/* Layout giống Bộ sưu tập: Tên, Mô tả ngắn, URL ảnh bìa, Tổng giá, Thanh khuyến mãi */}
              {isComboCategory(form.category_id) ? (
                <>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Tên box quà / Combo</label>
                      <input
                        type="text"
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                        value={form.name}
                        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                        placeholder="VD: Box quà sơ sinh cao cấp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Mô tả ngắn</label>
                      <textarea
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500 h-32 resize-none"
                        value={form.description}
                        onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                        placeholder="Mô tả ngắn về box quà / combo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">URL ảnh bìa</label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          className="flex-1 bg-gray-50 border-none rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-pink-500"
                          value={imageUrlDraft || (editing?.images?.[0]?.image_url ?? '')}
                          onChange={(e) => setImageUrlDraft(e.target.value)}
                          placeholder="https://..."
                        />
                        <label className="px-4 py-3 bg-gray-900 text-white rounded-2xl font-bold cursor-pointer hover:bg-gray-800 self-center whitespace-nowrap">
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
                      </div>
                    </div>
                    <div className="bg-pink-50 border border-pink-100 rounded-2xl px-6 py-4">
                      <div className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-1">Tổng giá (từ sản phẩm đã chọn)</div>
                      <div className="text-2xl font-black text-pink-600">{comboTotalPrice.toLocaleString()}đ</div>
                      {selectedComboCount === 0 && (
                        <p className="text-xs text-gray-500 mt-1">Chọn sản phẩm bên phải để tính giá.</p>
                      )}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                      <div className="text-sm font-bold text-amber-800 mb-3 uppercase tracking-widest">Tạo khuyến mãi</div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Giá khuyến mãi (đ) – tuỳ chọn</label>
                          <input
                            type="number"
                            min={0}
                            className="w-full bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500 font-bold border border-amber-100"
                            value={form.discount_price ?? ''}
                            onChange={(e) => setForm((s) => ({ ...s, discount_price: e.target.value === '' ? null : Number(e.target.value) }))}
                            placeholder={comboTotalPrice > 0 ? `VD: ${Math.round(comboTotalPrice * 0.9).toLocaleString()}` : ''}
                          />
                        </div>
                        <p className="text-xs text-gray-500">Để trống nếu không giảm giá. Khi có giá KM, khách sẽ thấy giá này thay vì tổng giá.</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                          <label className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-amber-100 font-bold text-gray-700">
                            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((s) => ({ ...s, is_active: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                            Active
                          </label>
                          <label className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-amber-100 font-bold text-gray-700">
                            <input type="checkbox" checked={form.is_sale} onChange={(e) => setForm((s) => ({ ...s, is_sale: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                            Sale
                          </label>
                          <label className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-amber-100 font-bold text-gray-700">
                            <input type="checkbox" checked={form.is_hot} onChange={(e) => setForm((s) => ({ ...s, is_hot: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                            Hot
                          </label>
                          <label className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-amber-100 font-bold text-gray-700">
                            <input type="checkbox" checked={form.is_new} onChange={(e) => setForm((s) => ({ ...s, is_new: e.target.checked }))} className="w-4 h-4 accent-pink-500" />
                            New
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-widest">Chọn sản phẩm ({selectedComboCount})</label>
                    <div className="bg-gray-50 rounded-[2rem] p-4 h-[400px] overflow-y-auto space-y-2 border border-gray-100">
                      {productsAvailableForCombo.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4">Chưa có sản phẩm đơn nào (có size/màu) trong hệ thống. Hãy thêm sản phẩm đơn trước.</p>
                      ) : (
                        productsAvailableForCombo.map((p) => (
                          <div
                            key={p.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => void toggleProductForCombo(String(p.id))}
                            onKeyDown={(e) => e.key === 'Enter' && void toggleProductForCombo(String(p.id))}
                            className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all ${
                              isProductSelectedForCombo(String(p.id)) ? 'bg-pink-100 border border-pink-200' : 'bg-white border border-transparent hover:border-gray-200'
                            }`}
                          >
                            <img
                              src={absUrl(p.primary_image_url || p.images?.[0]?.image_url) || 'https://picsum.photos/80/80'}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              alt=""
                            />
                            <div className="flex-grow min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{Math.round(p.discount_price ?? p.base_price).toLocaleString()}đ</p>
                            </div>
                            {isProductSelectedForCombo(String(p.id)) && (
                              <svg className="w-5 h-5 text-pink-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                              </svg>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                      className="w-full rounded-xl px-4 py-3 outline-none font-bold bg-gray-50 focus:ring-2 focus:ring-pink-500"
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
                    {editing ? (
                      <button
                        onClick={() => void handleAttachImageToEditing()}
                        className="px-4 py-3 bg-pink-500 text-white rounded-xl font-black hover:bg-pink-600 disabled:opacity-60"
                        disabled={saving || uploading}
                        title="Gắn ảnh vào sản phẩm đang sửa"
                      >
                        Gắn
                      </button>
                    ) : (
                      <button
                        onClick={handleAddDraftImage}
                        className="px-4 py-3 bg-pink-500 text-white rounded-xl font-black hover:bg-pink-600 disabled:opacity-60"
                        disabled={uploading || !imageUrlDraft.trim()}
                        title="Thêm ảnh vào danh sách"
                      >
                        Thêm
                      </button>
                    )}
                  </div>
                  {imageUrlDraft && (
                    <div className="mt-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
                      <img src={absUrl(imageUrlDraft)} className="w-full h-44 object-cover" />
                    </div>
                  )}

                  {editing
                    ? editing.images?.length > 0 && (
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
                      )
                    : draftImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          {draftImages.map((img, index) => (
                            <div
                              key={`${img.image_url}-${index}`}
                              className="relative rounded-2xl overflow-hidden bg-white border border-gray-100 group"
                            >
                              <img src={absUrl(img.image_url)} className="w-full h-20 object-cover" />
                              <button
                                type="button"
                                onClick={() => handleDeleteDraftImage(index)}
                                className="absolute top-1 right-1 bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Xóa
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                </div>

                {!isComboCategory(form.category_id) && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="font-black text-gray-900 mb-3">Size / Màu (Variants)</div>

                  {/* Khi tạo mới: nhập nhiều size/màu một lần, hệ thống tự tạo combination */}
                  {!editing && (
                    <div className="space-y-4 mb-6">
                      <p className="text-xs text-gray-500">
                        Nhập danh sách size và màu, cách nhau bằng dấu phẩy. Khi bấm <span className="font-black">Lưu sản phẩm</span>, hệ
                        thống sẽ tự tạo tất cả combination size × màu, khách chỉ cần chọn size &amp; màu khi mua.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase mb-2">Danh sách size</label>
                          <div className="flex gap-3">
                            <input
                              className="flex-grow bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                              placeholder="Ví dụ: 0-3m, 3-6m, 6-12m"
                              value={sizeInput}
                              onChange={(e) => setSizeInput(e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-4 py-3 bg-gray-900 text-white rounded-xl font-black hover:bg-gray-800"
                              onClick={() => {
                                const parts = sizeInput
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                if (parts.length === 0) return;
                                setDraftSizes((prev) => Array.from(new Set([...prev, ...parts])));
                                setSizeInput('');
                              }}
                            >
                              Thêm size
                            </button>
                          </div>
                          {draftSizes.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {draftSizes.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-bold flex items-center gap-2"
                                  onClick={() => setDraftSizes((prev) => prev.filter((x) => x !== s))}
                                >
                                  <span>{s}</span>
                                  <span className="text-gray-400 text-[10px]">×</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase mb-2">Danh sách màu</label>
                          <div className="flex gap-3">
                            <input
                              className="flex-grow bg-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-500"
                              placeholder="Ví dụ: Trắng, Đen, Hồng"
                              value={colorInput}
                              onChange={(e) => setColorInput(e.target.value)}
                            />
                            <button
                              type="button"
                              className="px-4 py-3 bg-gray-900 text-white rounded-xl font-black hover:bg-gray-800"
                              onClick={() => {
                                const parts = colorInput
                                  .split(',')
                                  .map((c) => c.trim())
                                  .filter(Boolean);
                                if (parts.length === 0) return;
                                setDraftColors((prev) => Array.from(new Set([...prev, ...parts])));
                                setColorInput('');
                              }}
                            >
                              Thêm màu
                            </button>
                          </div>
                          {draftColors.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {draftColors.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-bold flex items-center gap-2"
                                  onClick={() => setDraftColors((prev) => prev.filter((x) => x !== c))}
                                >
                                  <span>{c}</span>
                                  <span className="text-gray-400 text-[10px]">×</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {(draftSizes.length > 0 || draftColors.length > 0) && (
                          <div className="text-xs text-gray-500">
                            Sẽ tạo khoảng{' '}
                            <span className="font-black text-gray-700">
                              {Math.max(1, draftSizes.length || 1) * Math.max(1, draftColors.length || 1)}
                            </span>{' '}
                            combination size × màu với tồn kho mặc định 0.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!editing && isComboCategory(form.category_id) && (
                    <p className="text-xs text-gray-500 mb-2">
                      Box quà / Combo không dùng size/màu riêng. Chọn sản phẩm thành phần ở khối <span className="font-black">Chọn sản phẩm</span> bên trên.
                    </p>
                  )}

                  {/* Khi sửa sản phẩm đã có: giữ UI chi tiết cho từng variant để chỉnh tồn kho */}
                  {editing && (
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
                                            variants: p.variants.map((x) =>
                                              x.id === v.id ? { ...x, size: e.target.value } : x,
                                            ),
                                          }
                                        : p,
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
                                            variants: p.variants.map((x) =>
                                              x.id === v.id ? { ...x, color: e.target.value } : x,
                                            ),
                                          }
                                        : p,
                                    );
                                  }}
                                />
                                <input
                                  type="number"
                                  className="bg-gray-50 rounded-xl px-3 py-2 outline-none"
                                  value={v.stock}
                                  onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setEditing((p) =>
                                      p
                                        ? {
                                            ...p,
                                            variants: p.variants.map((x) =>
                                              x.id === v.id ? { ...x, stock: value } : x,
                                            ),
                                          }
                                        : p,
                                    );
                                  }}
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() =>
                                      void handleUpdateVariant(v.id, {
                                        size: v.size,
                                        color: v.color,
                                        stock: v.stock,
                                      })
                                    }
                                    className="px-3 py-2 rounded-xl bg-pink-50 text-pink-600 font-black text-xs hover:bg-pink-100 disabled:opacity-60"
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
                )}

            </div>
                </>
              )}

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
