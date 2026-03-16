
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Category, Product, ProductVariant } from '../types';

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [editingDraft, setEditingDraft] = useState<Partial<Product>>({});
  const [editingVariants, setEditingVariants] = useState<ProductVariant[]>([]);
  const [editingImages, setEditingImages] = useState<
    { id: string; url: string; alt: string; isPrimary: boolean }[]
  >([]);
  const [editingImageUploading, setEditingImageUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'so-sinh',
    images: ['https://picsum.photos/400/500'],
    variants: [],
    isActive: true,
    isHot: false,
    isNew: true,
    isSale: false,
  });

  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [isMerging, setIsMerging] = useState(false);
  const [mergeName, setMergeName] = useState('');
  const [mergeCategorySlug, setMergeCategorySlug] = useState<string>('so-sinh');
  const [mergeDescription, setMergeDescription] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    created_products: number;
    updated_variants: number;
    errors: string[];
  } | null>(null);
  const [clearanceSuccess, setClearanceSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async (page: number, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const [cats, res] = await Promise.all([
          api.adminListCategories(true),
          api.adminListProductsPage({ page, per_page: 30, q }),
        ]);
        setCategories(cats);
        setProducts(res.items);
        setTotalProducts(res.total);
        setCurrentPage(res.page);
      } catch (e: any) {
        setError(e?.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    void load(1, '');
  }, []);

  const reloadPage = async (page: number = currentPage, q: string = search) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListProductsPage({ page, per_page: 30, q });
      setProducts(res.items);
      setTotalProducts(res.total);
      setCurrentPage(res.page);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reloadPage(1, search);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const handleSave = async () => {
    if (!newProduct.name || !newProduct.price) return;
    setError(null);
    try {
      await api.adminCreateProduct(newProduct as any);
      await reloadPage(1, search);
    } catch (e: any) {
      setError(e?.message || 'Lưu thất bại');
      return;
    }
    setIsAdding(false);
  };

  const handleToggleActive = async (p: Product) => {
    setError(null);
    try {
      await api.adminUpdateProduct(p.id, { isActive: !(p.isActive ?? true) });
      await reloadPage(currentPage, search);
    } catch (e: any) {
      setError(e?.message || 'Cập nhật trạng thái thất bại');
    }
  };

  const handleMoveToClearance = async (p: Product) => {
    setError(null);
    setClearanceSuccess(null);
    const clearanceCat = categories.find((c) => c.slug === 'uu-dai-cuoi-mua');
    // Luôn gửi category (slug) để backend tự resolve; gửi thêm category_id nếu có
    const payload: Partial<Product> = {
      category: 'uu-dai-cuoi-mua',
      isActive: true,
      ...(clearanceCat?.id ? ({ category_id: Number(clearanceCat.id) } as unknown as Partial<Product>) : {}),
    };
    try {
      const updated = await api.adminUpdateProduct(p.id, payload);
      const catSlug = updated?.category ?? 'uu-dai-cuoi-mua';
      setClearanceSuccess(`Đã chuyển "${p.name}" vào Ưu đãi cuối mùa (danh mục: ${catSlug}). Sản phẩm sẽ hiển thị trên trang chủ.`);
      setTimeout(() => setClearanceSuccess(null), 6000);
      setProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, category: catSlug, isActive: updated.isActive ?? true } : item))
      );
      await reloadPage(currentPage, search);
    } catch (e: any) {
      setError(e?.message || 'Đưa vào Ưu đãi cuối mùa thất bại');
    }
  };

  const DEFAULT_EXIT_CLEARANCE_SLUG = 'so-sinh';
  const handleRemoveFromClearance = async (p: Product) => {
    setError(null);
    setClearanceSuccess(null);
    const exitCat = categories.find((c) => c.slug === DEFAULT_EXIT_CLEARANCE_SLUG) || categories.find((c) => c.slug !== 'uu-dai-cuoi-mua');
    const payload: Partial<Product> = exitCat?.id
      ? ({ category_id: Number(exitCat.id), category: exitCat.slug } as unknown as Partial<Product>)
      : { category: DEFAULT_EXIT_CLEARANCE_SLUG };
    try {
      const updated = await api.adminUpdateProduct(p.id, payload);
      setClearanceSuccess(`Đã đưa "${p.name}" ra khỏi Ưu đãi cuối mùa.`);
      setTimeout(() => setClearanceSuccess(null), 5000);
      setProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, category: updated.category } : item))
      );
      await reloadPage(currentPage, search);
    } catch (e: any) {
      setError(e?.message || 'Đưa ra khỏi Ưu đãi cuối mùa thất bại');
    }
  };

  const toggleSelectForMerge = (productId: string) => {
    setSelectedForMerge((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const openMergeModal = () => {
    const ids = Array.from(selectedForMerge);
    if (ids.length < 2) {
      setError('Hãy chọn ít nhất 2 sản phẩm để gộp.');
      return;
    }
    const selected = products.filter((p) => ids.includes(p.id));
    const first = selected[0];
    setMergeName(first?.name || '');
    setMergeCategorySlug(first?.category || (categories[0]?.slug ?? 'so-sinh'));
    setMergeDescription(first?.description || '');
    setIsMerging(true);
  };

  const handleMergeProducts = async () => {
    const ids = Array.from(selectedForMerge);
    if (!mergeName.trim()) {
      setError('Tên sản phẩm sau khi gộp là bắt buộc.');
      return;
    }
    const cat = categories.find((c) => c.slug === mergeCategorySlug);
    try {
      setSaving(true);
      setError(null);

      const variantAssignments: { variantId: string; size?: string; color?: string }[] = [];
      products
        .filter((p) => ids.includes(p.id))
        .forEach((p) => {
          (p.variants || []).forEach((v) => {
            variantAssignments.push({
              variantId: v.id,
              size: v.size,
              color: v.color,
            });
          });
        });

      const merged = await api.adminMergeProducts({
        productIds: ids,
        name: mergeName.trim(),
        categoryId: cat ? Number(cat.id) : null,
        description: mergeDescription || undefined,
        variantAssignments,
      });

      const updated = await api.adminListProducts(true);
      setProducts(updated);
      setSelectedForMerge(new Set());
      setIsMerging(false);
      // mở luôn modal chỉnh sửa sản phẩm mới gộp
      openEdit(merged);
    } catch (e: any) {
      setError(e?.message || 'Gộp sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncSalework = async () => {
    setError(null);
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.adminSaleworkSync();
      setSyncResult(result);
      const updated = await api.adminListProducts(true);
      setProducts(updated);
    } catch (e: any) {
      setError(e?.message || 'Đồng bộ Salework thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await api.adminUploadImage(file);
      setNewProduct((s) => ({ ...s, images: [url] }));
    } catch (e: any) {
      setError(e?.message || 'Upload thất bại');
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (p: Product) => {
    void (async () => {
      try {
        const [fresh, raw] = await Promise.all([
          api.adminGetProduct(p.id),
          api.adminGetProductRaw(p.id),
        ]);
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
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Không tải được dữ liệu sản phẩm');
      }
    })();
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (!editingDraft.name || !editingDraft.price) return;

    // kiểm tra trùng size/màu trước khi gửi lên server (tránh lỗi unique constraint)
    const seen = new Set<string>();
    for (const v of editingVariants) {
      const key = `${String(v.size || '').trim().toLowerCase()}|${String(
        v.color || '',
      ).trim().toLowerCase()}`;
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
      const originalIds = new Set((editing.variants || []).map((v) => v.id));
      const currentIds = new Set(editingVariants.map((v) => v.id));

      // cập nhật + thêm mới
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

      // xoá những variants không còn trong bảng
      for (const id of originalIds) {
        if (!currentIds.has(id)) {
          await api.adminDeleteVariant(id);
        }
      }
      await reloadPage(currentPage, search);
      setEditing(null);
    } catch (e: any) {
      setError(e?.message || 'Cập nhật sản phẩm thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-800">
            Danh sách Sản phẩm ({products.length})
          </h2>
          {syncResult && (
            <div className="mt-3 text-xs text-gray-500">
              Đã đồng bộ Salework: <span className="font-bold text-gray-700">{syncResult.synced}</span>{' '}
              mã · tạo mới <span className="font-bold text-gray-700">{syncResult.created_products}</span>{' '}
              sản phẩm · cập nhật{' '}
              <span className="font-bold text-gray-700">{syncResult.updated_variants}</span> variants
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={handleSyncSalework}
            className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl font-bold text-sm hover:bg-yellow-200 border border-yellow-200"
            disabled={syncing}
          >
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ Salework'}
          </button>
          <button
            onClick={() => {
              // tạo Box quà: slug qua-tang
              setNewProduct((s) => ({ ...s, category: 'qua-tang' }));
              setIsAdding(true);
            }}
            className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-100 border border-purple-200"
          >
            + Tạo Box quà
          </button>
          <button
            onClick={() => {
              // tạo Combo đi sinh: slug di-sinh
              setNewProduct((s) => ({ ...s, category: 'di-sinh' }));
              setIsAdding(true);
            }}
            className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-teal-100 border border-teal-200"
          >
            + Tạo Combo đi sinh
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-pink-600 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Thêm sản phẩm mới
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-xs text-gray-500">
          Tổng <span className="font-bold text-gray-800">{totalProducts}</span> sản phẩm
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Tìm kiếm</span>
          <input
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 outline-none w-64"
            placeholder="Tên hoặc SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selectedForMerge.size >= 2 && (
        <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
          <div>
            Đã chọn <span className="font-bold text-gray-800">{selectedForMerge.size}</span> sản
            phẩm để gộp.
          </div>
          <button
            onClick={openMergeModal}
            className="px-3 py-1.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black text-xs"
            disabled={saving}
          >
            Gộp thành 1 sản phẩm
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 font-bold text-sm">
          {error}
        </div>
      )}
      {clearanceSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-2xl px-5 py-4 font-bold text-sm">
          {clearanceSuccess}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-sm font-bold uppercase tracking-wider">
              <th className="py-4 px-4 w-10">Gộp</th>
              <th className="py-4 px-4">Sản phẩm</th>
              <th className="py-4 px-4">Danh mục</th>
              <th className="py-4 px-4">Giá bán</th>
              <th className="py-4 px-4">Trạng thái</th>
              <th className="py-4 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {products.map((p) => (
              <tr key={p.id} className="group hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 align-top">
                  {(p.variants?.length || 0) > 0 ? (
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                      checked={selectedForMerge.has(p.id)}
                      onChange={() => toggleSelectForMerge(p.id)}
                    />
                  ) : (
                    <span className="text-gray-300 text-xs">-</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images[0]}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    />
                    <div>
                      <div className="font-bold text-gray-800 flex items-center gap-2">
                        {p.name}
                        {p.kind === 'combo' && (
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                            Combo
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(p.variants || []).length} size/màu · {(p.images || []).length} ảnh
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-gray-500">{categories.find((c) => c.slug === p.category)?.name ?? (p.category && p.category !== 'unknown' ? p.category : 'Chưa chọn')}</td>
                <td className="py-4 px-4">
                  <span className="font-bold text-pink-500">
                    {p.discountPrice
                      ? `${p.discountPrice.toLocaleString()}đ`
                      : `${p.price.toLocaleString()}đ`}
                  </span>
                  {p.discountPrice && (
                    <div className="text-xs text-gray-400 line-through">
                      {p.price.toLocaleString()}đ
                    </div>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="flex gap-1 items-center flex-wrap">
                    <button
                      onClick={() => void handleToggleActive(p)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        (p.isActive ?? true)
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                      title="Bật/tắt hiển thị"
                    >
                      {(p.isActive ?? true) ? 'Active' : 'Off'}
                    </button>
                    {p.isHot && (
                      <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        Hot
                      </span>
                    )}
                    {p.isSale && (
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        Sale
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {p.category === 'uu-dai-cuoi-mua' ? (
                      <button
                        onClick={() => void handleRemoveFromClearance(p)}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 border border-gray-300"
                        title="Đưa sản phẩm ra khỏi danh mục Ưu đãi cuối mùa"
                      >
                        Đưa ra khỏi Ưu đãi
                      </button>
                    ) : (
                      <button
                        onClick={() => void handleMoveToClearance(p)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs hover:bg-amber-100 border border-amber-200"
                        title="Chuyển sản phẩm vào danh mục Ưu đãi cuối mùa (hiển thị trên trang chủ)"
                      >
                        Ưu đãi cuối mùa
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(p)}
                      className="text-gray-400 hover:text-pink-500 p-2"
                      title="Chỉnh sửa sản phẩm"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalProducts > 30 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            Trang <span className="font-bold text-gray-800">{currentPage}</span> /{' '}
            {Math.max(1, Math.ceil(totalProducts / 30))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-bold disabled:opacity-50"
              disabled={currentPage <= 1 || loading}
              onClick={() => void reloadPage(currentPage - 1, search)}
            >
              Trước
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 font-bold disabled:opacity-50"
              disabled={currentPage >= Math.ceil(totalProducts / 30) || loading}
              onClick={() => void reloadPage(currentPage + 1, search)}
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Thêm Sản phẩm</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên sản phẩm</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none" 
                  value={newProduct.name}
                  onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Giá gốc</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                  <select 
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả</label>
                <textarea 
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none h-24"
                  value={newProduct.description}
                  onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Ảnh sản phẩm</label>
                <div className="flex gap-3 items-center">
                  <label className="px-4 py-3 bg-gray-900 text-white rounded-xl font-bold cursor-pointer">
                    {uploading ? 'Đang up...' : 'Upload ảnh'}
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
                  {newProduct.images?.[0] && <span className="text-xs text-gray-500 truncate">{newProduct.images[0]}</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input type="checkbox" checked={!!newProduct.isHot} onChange={(e) => setNewProduct({ ...newProduct, isHot: e.target.checked })} />
                  Hot
                </label>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input type="checkbox" checked={!!newProduct.isSale} onChange={(e) => setNewProduct({ ...newProduct, isSale: e.target.checked })} />
                  Sale
                </label>
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsAdding(false)}
                className="flex-grow py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button 
                onClick={handleSave}
                className="flex-grow py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600"
              >
                Lưu sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Chỉnh sửa sản phẩm</h3>
            <div className="space-y-8 mb-8">
              {/* Khối thông tin + trạng thái + ảnh */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Tên sản phẩm
                  </label>
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
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, price: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Giá khuyến mãi
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                      value={editingDraft.discountPrice ?? ''}
                      onChange={(e) =>
                        setEditingDraft({
                          ...editingDraft,
                          discountPrice:
                            e.target.value === '' ? undefined : Number(e.target.value),
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
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        category: e.target.value,
                      })
                    }
                  >
                    {categories.map((c) => (
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
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!editingDraft.isActive}
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, isActive: e.target.checked })
                      }
                    />
                    Hiển thị (Active)
                  </label>
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!editingDraft.isHot}
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, isHot: e.target.checked })
                      }
                    />
                    Hot
                  </label>
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!editingDraft.isSale}
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, isSale: e.target.checked })
                      }
                    />
                    Sale
                  </label>
                  <label className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!editingDraft.isNew}
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, isNew: e.target.checked })
                      }
                    />
                    New
                  </label>
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
                      Chưa có ảnh nào. Upload ảnh để hiển thị trên trang sản phẩm; hệ thống sẽ tự
                      ghép với màu/size phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {editingImages.map((img, idx) => (
                        <div
                          key={img.id}
                          className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50"
                        >
                          <div className="relative">
                            <img
                              src={img.url}
                              className="w-full h-32 object-cover"
                              alt={img.alt}
                            />
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
                                  img.isPrimary
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-white text-gray-600 border-gray-200'
                                }`}
                                onClick={() =>
                                  setEditingImages((list) =>
                                    list.map((it) => ({
                                      ...it,
                                      isPrimary: it.id === img.id,
                                    })),
                                  )
                                }
                              >
                                Đặt làm ảnh chính
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-500 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    await api.adminDeleteProductImage(img.id);
                                    setEditingImages((list) =>
                                      list.filter((it) => it.id !== img.id),
                                    );
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
              </div>

              {/* Cột phải: bảng size/màu */}
              <div>
                <h4 className="text-sm font-black text-gray-800 mb-2">Size / Màu / Ảnh / Tồn kho</h4>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">
                    Dữ liệu size/màu và tồn kho được lấy từ Salework sau khi đồng bộ.
                  </span>
                  <button
                    type="button"
                    className="px-3 py-1 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200"
                    onClick={() =>
                      setEditingVariants((list) => [
                        ...list,
                        {
                          id: `new-${Date.now()}-${list.length}`,
                          size: '',
                          color: '',
                          stock: 0,
                          sku: '',
                          price: undefined,
                          image: undefined,
                        },
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
                            <td
                              className="px-4 py-3 text-center text-gray-400 italic"
                              colSpan={6}
                            >
                              Sản phẩm chưa có size/màu. Thêm trực tiếp trong Salework rồi đồng bộ
                              lại sẽ hiện ở đây.
                            </td>
                          </tr>
                        ) : (
                          editingVariants.map((v, idx) => {
                            const selectedImage = editingImages.find((img) => img.url === v.image);
                            return (
                              <tr key={v.id} className="border-t border-gray-50">
                                <td className="px-4 py-2 font-mono text-[11px] text-gray-500">
                                  {v.sku || '-'}
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                    value={v.size}
                                    onChange={(e) =>
                                      setEditingVariants((list) => {
                                        const next = [...list];
                                        next[idx] = { ...next[idx], size: e.target.value };
                                        return next;
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                    value={v.color}
                                    onChange={(e) =>
                                      setEditingVariants((list) => {
                                        const next = [...list];
                                        next[idx] = { ...next[idx], color: e.target.value };
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
                                      const img = editingImages.find(
                                        (it) => it.id === e.target.value,
                                      );
                                      if (!img || !editing) {
                                        setEditingVariants((list) => {
                                          const next = [...list];
                                          next[idx] = { ...next[idx], image: undefined };
                                          return next;
                                        });
                                        return;
                                      }
                                      try {
                                        await api.adminAddVariantImage(v.id, img.url, true, img.alt);
                                        setEditingVariants((list) => {
                                          const next = [...list];
                                          next[idx] = { ...next[idx], image: img.url };
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
                                    value={v.stock}
                                    onChange={(e) =>
                                      setEditingVariants((list) => {
                                        const next = [...list];
                                        next[idx] = {
                                          ...next[idx],
                                          stock: Number(e.target.value || 0),
                                        };
                                        return next;
                                      })
                                    }
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input
                                    type="number"
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-pink-500 outline-none"
                                    value={v.price ?? ''}
                                    onChange={(e) =>
                                      setEditingVariants((list) => {
                                        const next = [...list];
                                        next[idx] = {
                                          ...next[idx],
                                          price:
                                            e.target.value === ''
                                              ? undefined
                                              : Number(e.target.value),
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
                                    onClick={() =>
                                      setEditingVariants((list) =>
                                        list.filter((_, index) => index !== idx),
                                      )
                                    }
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
            <div className="flex gap-4">
              <button
                onClick={() => setEditing(null)}
                className="flex-grow py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
                disabled={saving}
              >
                Hủy
              </button>
              <button
                onClick={handleEditSave}
                className="flex-grow py-3 bg-pink-500 text-white rounded-xl font-bold hover:bg-pink-600 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isMerging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Gộp sản phẩm thành 1</h3>
            <p className="text-sm text-gray-500 mb-4">
              {Array.from(selectedForMerge).length} sản phẩm sẽ được gộp thành 1 sản phẩm có nhiều
              size/màu. Tồn kho từng mã size/màu được giữ nguyên.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Tên sản phẩm sau khi gộp
                </label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none"
                    value={mergeCategorySlug}
                    onChange={(e) => setMergeCategorySlug(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Mô tả (tuỳ chọn)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none h-24"
                  value={mergeDescription}
                  onChange={(e) => setMergeDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsMerging(false)}
                className="flex-grow py-3 border border-gray-200 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
                disabled={saving}
              >
                Hủy
              </button>
              <button
                onClick={handleMergeProducts}
                className="flex-grow py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black disabled:opacity-60"
                disabled={saving}
              >
                {saving ? 'Đang gộp...' : 'Gộp sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
