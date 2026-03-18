import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { Category, Product } from '../types';
import ProductEditModal from './components/ProductEditModal';

const CLEARANCE_SLUG = 'uu-dai-cuoi-mua';
const DEFAULT_EXIT_SLUG = 'so-sinh';

const ClearanceManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [exitCategorySlug, setExitCategorySlug] = useState<string>(DEFAULT_EXIT_SLUG);

  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ items: Product[]; total: number; page: number; per_page: number }>({
    items: [],
    total: 0,
    page: 1,
    per_page: 30,
  });

  // For adding products into clearance
  const [addQ, setAddQ] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addItems, setAddItems] = useState<Product[]>([]);

  // Edit modal (shared component)
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const exitCategoryId = useMemo(() => {
    const found = categories.find((c) => c.slug === exitCategorySlug) || categories.find((c) => c.slug !== CLEARANCE_SLUG);
    return found?.id ? Number(found.id) : null;
  }, [categories, exitCategorySlug]);

  const loadCategories = async () => {
    const cats = await api.adminListCategories(true);
    setCategories(cats);
    if (!cats.find((c) => c.slug === exitCategorySlug)) {
      const fallback = cats.find((c) => c.slug === DEFAULT_EXIT_SLUG) || cats.find((c) => c.slug !== CLEARANCE_SLUG);
      if (fallback?.slug) setExitCategorySlug(fallback.slug);
    }
  };

  const loadClearance = async (p: number = page, term: string = q) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.adminListProductsPage({
        page: p,
        per_page: perPage,
        q: term.trim() || undefined,
        category: CLEARANCE_SLUG,
        include_inactive: true,
      });
      setData(res);
      setPage(res.page || p);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách Ưu đãi cuối mùa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await loadCategories();
      await loadClearance(1, '');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void loadClearance(1, q), 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const term = addQ.trim();
      if (!term) {
        setAddItems([]);
        return;
      }
      setAddLoading(true);
      setError(null);
      void api
        .adminListProductsPage({ page: 1, per_page: 10, q: term, include_inactive: true })
        .then((res) => {
          const items = (res.items || []).filter((p) => p.category !== CLEARANCE_SLUG);
          setAddItems(items);
        })
        .catch((e: any) => setError(e?.message || 'Không thể tìm sản phẩm'))
        .finally(() => setAddLoading(false));
    }, 350);
    return () => window.clearTimeout(t);
  }, [addQ]);

  const totalStock = (p: Product) => (p.variants || []).reduce((sum, v: any) => sum + (Number(v?.stock || 0) || 0), 0);

  const openEdit = (p: Product) => setEditingProductId(String(p.id));

  const moveIntoClearance = async (p: Product) => {
    setError(null);
    try {
      await api.adminUpdateProduct(p.id, { category: CLEARANCE_SLUG, isActive: true });
      await loadClearance(1, q);
      setAddItems((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      setError(e?.message || 'Thêm vào Ưu đãi cuối mùa thất bại');
    }
  };

  const moveOutOfClearance = async (p: Product) => {
    setError(null);
    try {
      const payload: any = exitCategoryId
        ? { category_id: Number(exitCategoryId), category: exitCategorySlug }
        : { category: exitCategorySlug };
      await api.adminUpdateProduct(p.id, payload);
      await loadClearance(1, q);
    } catch (e: any) {
      setError(e?.message || 'Đưa ra khỏi Ưu đãi cuối mùa thất bại');
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Ưu đãi cuối mùa</h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý danh mục “Ưu đãi cuối mùa” như một mục riêng: thêm/bớt sản phẩm để hiển thị trên trang chủ.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="text-xs font-black text-gray-500 uppercase tracking-wider sm:text-right">
            Đưa ra khỏi ưu đãi về
            <div className="mt-1">
              <select
                value={exitCategorySlug}
                onChange={(e) => setExitCategorySlug(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-800"
              >
                {categories
                  .filter((c) => c.slug !== CLEARANCE_SLUG)
                  .map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 font-bold">{error}</div>}

      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm trong Ưu đãi cuối mùa (tên/slug/SKU)..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-bold"
          />
          <button onClick={() => void loadClearance(1, q)} className="px-5 py-3 rounded-xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200">
            Tải lại
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="font-black text-gray-900">Danh sách sản phẩm ưu đãi</div>
          <div className="text-sm text-gray-500 font-bold">{data.total} sản phẩm</div>
        </div>

        {loading ? (
          <div className="p-10 text-gray-500 font-bold">Đang tải...</div>
        ) : (data.items || []).length === 0 ? (
          <div className="p-10 text-gray-400 italic">Chưa có sản phẩm nào trong Ưu đãi cuối mùa.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(data.items || []).map((p) => (
              <div key={p.id} className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <img src={p.images?.[0]} className="w-14 h-14 rounded-2xl object-cover bg-gray-100 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">
                      {(p.variants || []).length} size/màu · Tồn kho tổng: {totalStock(p).toLocaleString()} · {(p.discountPrice ?? p.price).toLocaleString()}đ
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="px-3 py-2 rounded-xl bg-pink-50 text-pink-700 font-black text-xs hover:bg-pink-100 border border-pink-100"
                    title="Chỉnh sửa sản phẩm ngay tại đây"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={() => void moveOutOfClearance(p)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-black text-xs hover:bg-gray-200 border border-gray-200"
                    title="Đưa sản phẩm ra khỏi Ưu đãi cuối mùa"
                  >
                    Đưa ra khỏi ưu đãi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
          <div className="text-xs text-gray-500 font-bold">
            Trang {data.page} / {Math.max(1, Math.ceil((data.total || 0) / (data.per_page || perPage)))}
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-xl font-black text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              disabled={(data.page || 1) <= 1 || loading}
              onClick={() => void loadClearance(Math.max(1, (data.page || 1) - 1), q)}
            >
              Trang trước
            </button>
            <button
              className="px-3 py-2 rounded-xl font-black text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              disabled={(data.page || 1) >= Math.max(1, Math.ceil((data.total || 0) / (data.per_page || perPage))) || loading}
              onClick={() => void loadClearance((data.page || 1) + 1, q)}
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-[2rem] p-6">
        <div className="font-black text-gray-900 mb-2">Thêm sản phẩm vào Ưu đãi cuối mùa</div>
        <div className="text-sm text-gray-500 mb-4">
          Nhập từ khóa để tìm sản phẩm, sau đó bấm “Thêm vào ưu đãi”.
        </div>
        <div className="flex gap-3 flex-col md:flex-row">
          <input
            value={addQ}
            onChange={(e) => setAddQ(e.target.value)}
            placeholder="Tìm sản phẩm theo tên/slug/SKU..."
            className="flex-1 bg-gray-50 rounded-xl px-4 py-3 font-bold"
          />
          <button
            type="button"
            onClick={() => setAddQ('')}
            className="px-5 py-3 rounded-xl font-black bg-gray-100 text-gray-700 hover:bg-gray-200"
            disabled={!addQ.trim()}
          >
            Xóa ô tìm
          </button>
        </div>

        {addLoading ? (
          <div className="mt-4 text-gray-500 font-bold">Đang tìm...</div>
        ) : addQ.trim() && addItems.length === 0 ? (
          <div className="mt-4 text-gray-400 italic">Không tìm thấy sản phẩm phù hợp.</div>
        ) : addItems.length > 0 ? (
          <div className="mt-4 divide-y divide-gray-50 border border-gray-100 rounded-2xl overflow-hidden">
            {addItems.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={p.images?.[0]} className="w-12 h-12 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 font-bold mt-1">
                      {(p.variants || []).length} size/màu · Tồn kho tổng: {totalStock(p).toLocaleString()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => void moveIntoClearance(p)}
                  className="px-3 py-2 rounded-xl bg-amber-50 text-amber-700 font-black text-xs hover:bg-amber-100 border border-amber-200 flex-shrink-0"
                >
                  Thêm vào ưu đãi
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {editingProductId && (
        <ProductEditModal
          productId={editingProductId}
          categories={categories}
          onClose={() => setEditingProductId(null)}
          onSaved={() => void loadClearance(1, q)}
        />
      )}
    </div>
  );
};

export default ClearanceManagement;

