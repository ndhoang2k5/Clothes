
import { Banner, AdminBanner } from '../types';
import type { Product, Category, Order, Blog, Collection, BannerSlot } from '../types';

// Mock Data initialization
const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Bộ Body Cotton Organic - Thỏ Trắng',
    description: 'Chất liệu 100% cotton organic an toàn tuyệt đối cho da bé sơ sinh.',
    price: 150000,
    discountPrice: 120000,
    category: 'so-sinh',
    material: 'Organic Cotton',
    images: ['https://picsum.photos/400/500?random=1', 'https://picsum.photos/400/500?random=11'],
    isHot: true,
    isNew: true,
    isSale: true,
    variants: [
      { id: 'v1', size: '0-3m', color: 'Trắng', stock: 50 },
      { id: 'v1b', size: '3-6m', color: 'Trắng', stock: 30 }
    ]
  },
  {
    id: '2',
    name: 'Váy Công Chúa Hồng Baby',
    description: 'Váy xinh xắn cho bé gái diện đi tiệc hoặc dạo phố.',
    price: 250000,
    category: 'be-gai',
    material: 'Voan Soft',
    images: ['https://picsum.photos/400/500?random=2'],
    isHot: true,
    isNew: false,
    isSale: false,
    variants: [{ id: 'v2', size: '12-18m', color: 'Hồng', stock: 20 }]
  },
  {
    id: '3',
    name: 'Set Đồ Bé Trai Năng Động',
    description: 'Combo áo thun và quần short năng động.',
    price: 180000,
    category: 'be-trai',
    material: 'Cotton',
    images: ['https://picsum.photos/400/500?random=3'],
    isHot: false,
    isNew: true,
    isSale: false,
    variants: [{ id: 'v3', size: '2y', color: 'Xanh dương', stock: 15 }]
  }
];

const INITIAL_BANNERS: Banner[] = [
  { id: 'b1', imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1200', title: 'BST Mùa Hè Rực Rỡ', link: '#/collections', position: 'main' }
];

const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'c1',
    name: 'BST Cotton Organic Mùa Hè',
    description: 'Sự lựa chọn hoàn hảo cho làn da nhạy cảm của bé trong những ngày hè oi bức.',
    coverImage: 'https://images.unsplash.com/photo-1515488442805-95967b7751e0?auto=format&fit=crop&q=80&w=800',
    products: ['1', '3']
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1234',
    customerName: 'Nguyễn Văn A',
    phone: '0901234567',
    address: '123 Đường ABC, Hà Nội',
    total: 370000,
    status: 'pending',
    createdAt: new Date().toISOString(),
    items: [
      { productId: '1', variantId: 'v1', quantity: 2, price: 120000 },
      { productId: '3', variantId: 'v3', quantity: 1, price: 180000 }
    ]
  }
];

class ApiService {
  /** Backend: Docker "8888:8000" → dùng 8888; nếu chạy backend riêng port 8000 thì set VITE_API_ORIGIN=http://localhost:8000 */
  private readonly backendPort = 8888;
  private getBackendOrigin(): string {
    const env = typeof (import.meta as any)?.env !== 'undefined' && (import.meta as any).env?.VITE_API_ORIGIN;
    if (env && String(env).trim()) return String(env).trim().replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:${this.backendPort}`;
    }
    return `http://localhost:${this.backendPort}`;
  }
  private get adminBaseUrl() { return `${this.getBackendOrigin()}/api/admin`; }
  private get userBaseUrl() { return `${this.getBackendOrigin()}/api/user`; }
  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('unbee_user_token');
    } catch {
      return null;
    }
  }

  private setAuthToken(token: string | null) {
    try {
      if (!token) localStorage.removeItem('unbee_user_token');
      else localStorage.setItem('unbee_user_token', token);
    } catch {
      // ignore
    }
  }

  private products: Product[] = JSON.parse(localStorage.getItem('unbee_products') || JSON.stringify(INITIAL_PRODUCTS));
  private banners: Banner[] = JSON.parse(localStorage.getItem('unbee_banners') || JSON.stringify(INITIAL_BANNERS));
  private orders: Order[] = JSON.parse(localStorage.getItem('unbee_orders') || JSON.stringify(INITIAL_ORDERS));
  private collections: Collection[] = JSON.parse(localStorage.getItem('unbee_collections') || JSON.stringify(INITIAL_COLLECTIONS));

  private save() {
    localStorage.setItem('unbee_products', JSON.stringify(this.products));
    localStorage.setItem('unbee_banners', JSON.stringify(this.banners));
    localStorage.setItem('unbee_orders', JSON.stringify(this.orders));
    localStorage.setItem('unbee_collections', JSON.stringify(this.collections));
  }

  // Products
  private mapBackendProductToFrontend(p: any): Product {
    const imageObjs: any[] = Array.isArray(p.images) ? p.images : [];
    const fromObjUrls: string[] = imageObjs.map((i: any) => i?.image_url).filter(Boolean);
    const fromListUrls: string[] = Array.isArray(p.image_urls) ? p.image_urls.filter((x: any) => !!x) : [];
    const merged = [...fromListUrls, ...fromObjUrls];
    const uniqueUrls = Array.from(new Set(merged));
    const images: string[] = uniqueUrls.map((u) => this.toAbsoluteUrl(u)).filter(Boolean);
    const primary = p.primary_image_url ? this.toAbsoluteUrl(p.primary_image_url) : undefined;
    const allImages = (primary ? [primary, ...images.filter((u) => u !== primary)] : images);

    const variants = Array.isArray(p.variants)
      ? p.variants.map((v: any) => {
          let variantImage: string | undefined;
          // 1) Ưu tiên ảnh riêng của variant (nếu có)
          if (Array.isArray(v.images) && v.images.length > 0) {
            const primaryImg = v.images.find((img: any) => img.is_primary) ?? v.images[0];
            if (primaryImg?.image_url) {
              variantImage = this.toAbsoluteUrl(primaryImg.image_url);
            }
          }
          // 2) Fallback: đoán ảnh theo màu từ ảnh product
          if (!variantImage && v.color && imageObjs.length > 0) {
            const colorTokens = String(v.color)
              .toLowerCase()
              .split(/\s+/)
              .filter(Boolean);
            const found = imageObjs.find((img: any) => {
              const text = String(img.alt_text || img.image_url || '')
                .toLowerCase();
              return colorTokens.every((tk) => text.includes(tk));
            });
            if (found?.image_url) {
              variantImage = this.toAbsoluteUrl(found.image_url);
            }
          }
          return {
            id: String(v.id),
            size: v.size || '',
            color: v.color || '',
            stock: Number(v.stock || 0),
            sku: v.sku || '',
            price: v.price_override ?? undefined,
            image: variantImage,
          };
        })
      : [];

    return {
      id: String(p.id),
      name: p.name || '',
      description: p.description || '',
      price: Number(p.base_price || 0),
      discountPrice: p.discount_price ?? undefined,
      category: p.category_slug || 'unknown',
      // `material` is not guaranteed to exist on the frontend `variants` objects,
      // so we read it from the raw backend payload first.
      material: p?.variants?.[0]?.material || p.material || '',
      images: allImages.length > 0 ? allImages : ['https://picsum.photos/400/500?product'],
      isActive: p.is_active ?? true,
      isHot: !!p.is_hot,
      isNew: !!p.is_new,
      isSale: !!p.is_sale,
      variants,
      kind: p.kind as 'single' | 'combo' | undefined,
    };
  }

  private productListCache = new Map<
    string,
    { items: Product[]; total: number; page: number; per_page: number; fetchedAt: number }
  >();

  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch(`${this.userBaseUrl}/categories`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      return data.map((c) => ({
        id: String(c.id),
        name: c.name,
        icon: c.icon || '',
        slug: c.slug,
      }));
    } catch {
      return [];
    }
  }

  async getProductsPage(params?: {
    category?: string | null;
    q?: string | null;
    page?: number;
    per_page?: number;
    useCache?: boolean;
    sizes?: string[];
    colors?: string[];
    materials?: string[];
    priceRange?: [number, number];
    sort?: 'newest' | 'price-asc' | 'price-desc' | 'bestseller';
  }) {
    const category = params?.category ?? null;
    const q = params?.q ?? null;
    const page = params?.page ?? 1;
    const per_page = params?.per_page ?? 24;
    const useCache = params?.useCache ?? true;
    const sizes = params?.sizes ?? [];
    const colors = params?.colors ?? [];
    const materials = params?.materials ?? [];
    const priceRange = params?.priceRange;
    const sort = params?.sort ?? 'newest';

    const key = `${category || 'all'}|${q || ''}|${page}|${per_page}|${sizes.join(',')}|${colors.join(',')}|${materials.join(',')}|${priceRange ? priceRange.join('-') : ''}|${sort}`;

    if (useCache) {
      const cached = this.productListCache.get(key);
      if (cached && Date.now() - cached.fetchedAt < 2 * 60 * 1000) {
        return { ...cached, fromCache: true as const };
      }
    }

    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    if (q && String(q).trim()) qs.set('q', String(q).trim());
    qs.set('page', String(page));
    qs.set('per_page', String(per_page));

    if (sizes.length > 0) qs.set('sizes', sizes.join(','));
    if (colors.length > 0) qs.set('colors', colors.join(','));
    if (materials.length > 0) qs.set('materials', materials.join(','));
    if (priceRange) {
      const [min, max] = priceRange;
      if (typeof min === 'number' && min > 0) qs.set('price_min', String(min));
      if (typeof max === 'number' && max > 0) qs.set('price_max', String(max));
    }
    if (sort && sort !== 'newest') qs.set('sort', sort);

    const res = await fetch(`${this.userBaseUrl}/products?${qs.toString()}`);
    if (!res.ok) throw new Error('API Error');
    const data: any = await res.json(); // { items, total, page, per_page }
    const items = Array.isArray(data.items) ? data.items.map((p: any) => this.mapBackendProductToFrontend(p)) : [];
    const payload = { items, total: Number(data.total || 0), page: Number(data.page || page), per_page: Number(data.per_page || per_page), fetchedAt: Date.now() };
    this.productListCache.set(key, payload);
    return { ...payload, fromCache: false as const };
  }

  /** Backward-compat: returns first page only (fast). */
  async getProducts(): Promise<Product[]> {
    try {
      const r = await this.getProductsPage({ page: 1, per_page: 24, useCache: true });
      return r.items;
    } catch {
      return this.products;
    }
  }

  async getProductDetail(id: string): Promise<Product> {
    try {
      const res = await fetch(`${this.userBaseUrl}/products/${Number(id)}`);
      if (res.status === 404) throw new Error('Product not found');
      if (!res.ok) throw new Error('API Error');
      const data: any = await res.json();
      const product = this.mapBackendProductToFrontend(data);
      // attach raw combo_items if present; detail page may enrich further
      if (Array.isArray(data.combo_items)) {
        product.comboItems = data.combo_items.map((ci: any) => ({
          combo_product_id: ci.combo_product_id,
          component_variant_id: ci.component_variant_id,
          quantity: ci.quantity,
        }));
      }
      return product;
    } catch (e: any) {
      // Only fallback to local mock data if backend is unreachable.
      // If backend says 404, don't return stale localStorage product.
      if (String(e?.message || '').toLowerCase().includes('not found')) {
        throw e;
      }
      const fallback = this.products.find((p) => p.id === id);
      if (!fallback) {
        throw new Error('Product not found');
      }
      return fallback;
    }
  }

  async getComboItems(productId: string) {
    const res = await fetch(`${this.userBaseUrl}/products/${Number(productId)}/combo-items`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async adminListProducts(include_inactive: boolean = true): Promise<Product[]> {
    const res = await fetch(
      `${this.adminBaseUrl}/products?include_inactive=${include_inactive ? 'true' : 'false'}`
    );
    if (!res.ok) throw new Error('API Error');
    const data: any = await res.json();
    const items: any[] = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
    return items.map((p) => this.mapBackendProductToFrontend(p));
  }

  async adminListProductsPage(params?: {
    include_inactive?: boolean;
    q?: string;
    category?: string;
    page?: number;
    per_page?: number;
  }): Promise<{ items: Product[]; total: number; page: number; per_page: number }> {
    const qs = new URLSearchParams();
    qs.set('include_inactive', params?.include_inactive === false ? 'false' : 'true');
    if (params?.q) qs.set('q', params.q);
    if (params?.category) qs.set('category', params.category);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const res = await fetch(`${this.adminBaseUrl}/products?${qs.toString()}`);
    if (!res.ok) throw new Error('API Error');
    const data: any = await res.json();
    const items: any[] = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
    return {
      items: items.map((p) => this.mapBackendProductToFrontend(p)),
      total: Number(data.total ?? items.length ?? 0),
      page: Number(data.page ?? params?.page ?? 1),
      per_page: Number(data.per_page ?? params?.per_page ?? items.length ?? 50),
    };
  }

  async adminSaleworkSync(): Promise<{ synced: number; created_products: number; updated_variants: number; errors: string[] }> {
    const res = await fetch(`${this.adminBaseUrl}/salework/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Không thể đồng bộ Salework');
    const data = await res.json();
    return {
      synced: Number(data.synced || data.synced_count || 0),
      created_products: Number(data.created_products || 0),
      updated_variants: Number(data.updated_variants || 0),
      errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
    };
  }

  async adminGetProductsPicker(params: { q?: string; page?: number; per_page?: number; include_inactive?: boolean }) {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.page) qs.set('page', String(params.page));
    if (params.per_page) qs.set('per_page', String(params.per_page));
    if (params.include_inactive !== undefined) {
      qs.set('include_inactive', params.include_inactive ? 'true' : 'false');
    }
    const res = await fetch(`${this.adminBaseUrl}/products/picker?${qs.toString()}`);
    if (!res.ok) throw new Error('API Error');
    const data: any = await res.json();
    const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
    return {
      items: items.map((p: any) => this.mapBackendProductToFrontend(p)),
      total: Number(data.total ?? items.length ?? 0),
      page: Number(data.page ?? params.page ?? 1),
      per_page: Number(data.per_page ?? params.per_page ?? 30),
    };
  }

  async adminMergeProducts(payload: {
    productIds: string[];
    name: string;
    categoryId: number | null;
    description?: string;
    variantAssignments: { variantId: string; size?: string; color?: string }[];
  }): Promise<Product> {
    const body: any = {
      product_ids: payload.productIds.map((id) => Number(id)),
      name: payload.name,
      category_id: payload.categoryId,
      description: payload.description ?? null,
      variant_assignments: payload.variantAssignments.map((va) => ({
        variant_id: Number(va.variantId),
        size: va.size ?? null,
        color: va.color ?? null,
      })),
    };
    const res = await fetch(`${this.adminBaseUrl}/products/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Gộp sản phẩm thất bại');
    const data = await res.json();
    return this.mapBackendProductToFrontend(data);
  }

  async adminListCategories(active_only: boolean = true): Promise<Category[]> {
    const res = await fetch(`${this.adminBaseUrl}/categories?active_only=${active_only ? 'true' : 'false'}`);
    if (!res.ok) throw new Error('API Error');
    const data: any[] = await res.json();
    return data.map((c) => ({
      id: String(c.id),
      name: c.name,
      icon: c.icon || '',
      slug: c.slug,
    }));
  }

  async adminCreateProduct(frontendProduct: Omit<Product, 'id'> & { id?: string }): Promise<Product> {
    const categories = await this.adminListCategories(true);
    const categoryId = categories.find((c) => c.slug === frontendProduct.category)?.id;

    const payload: any = {
      category_id: categoryId ? Number(categoryId) : null,
      name: frontendProduct.name,
      description: frontendProduct.description,
      base_price: frontendProduct.price,
      discount_price: frontendProduct.discountPrice ?? null,
      is_active: frontendProduct.isActive ?? true,
      is_hot: frontendProduct.isHot,
      is_new: frontendProduct.isNew,
      is_sale: frontendProduct.isSale,
      images: frontendProduct.images?.filter(Boolean) || [],
      variants: (frontendProduct.variants || []).map((v) => ({
        size: v.size,
        color: v.color,
        stock: v.stock,
        price_override: v.price ?? null,
      })),
    };
    const res = await fetch(`${this.adminBaseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const created = await res.json();
    return this.mapBackendProductToFrontend(created);
  }

  async adminUpdateProduct(productId: string, patch: Partial<Product>): Promise<Product> {
    const payload: any = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.price !== undefined) payload.base_price = patch.price;
    if (patch.discountPrice !== undefined) payload.discount_price = patch.discountPrice ?? null;
    if (patch.isActive !== undefined) payload.is_active = patch.isActive;
    if (patch.isHot !== undefined) payload.is_hot = patch.isHot;
    if (patch.isNew !== undefined) payload.is_new = patch.isNew;
    if (patch.isSale !== undefined) payload.is_sale = patch.isSale;
    // category: gửi cả category_id và category (slug) để backend cập nhật chắc chắn
    const patchAny = patch as { category_id?: number; category?: string };
    if (patchAny.category !== undefined && patchAny.category !== null && String(patchAny.category).trim()) {
      payload.category = String(patchAny.category).trim();
    }
    if (patchAny.category_id !== undefined && patchAny.category_id !== null) {
      payload.category_id = patchAny.category_id;
    }
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = 'Cập nhật thất bại';
      try {
        const errBody = await res.json();
        if (errBody?.detail) msg = Array.isArray(errBody.detail) ? errBody.detail.map((d: any) => d?.msg ?? d).join(', ') : String(errBody.detail);
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
    const updated = await res.json();
    return this.mapBackendProductToFrontend(updated);
  }

  async adminDeleteProduct(productId: string): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  async adminAddVariant(productId: string, data: { size: string; color: string; stock: number; price?: number }) {
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        size: data.size,
        color: data.color,
        stock: data.stock,
        price_override: data.price ?? null,
      }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async adminUpdateVariant(variantId: string, data: { size?: string; color?: string; stock?: number; price?: number }) {
    const body: any = {};
    if (data.size !== undefined) body.size = data.size;
    if (data.color !== undefined) body.color = data.color;
    if (data.stock !== undefined) body.stock = data.stock;
    if (data.price !== undefined) body.price_override = data.price ?? null;
    const res = await fetch(`${this.adminBaseUrl}/variants/${Number(variantId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async adminDeleteVariant(variantId: string): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/variants/${Number(variantId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('API Error');
  }

  async adminGetProduct(productId: string): Promise<Product> {
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}`);
    if (!res.ok) throw new Error('API Error');
    const data: any = await res.json();
    return this.mapBackendProductToFrontend(data);
  }

  async adminGetProductRaw(productId: string): Promise<any> {
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async adminDeleteProductImage(imageId: string): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/product-images/${Number(imageId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('API Error');
  }

  async adminAddVariantImage(
    variantId: string,
    image_url: string,
    is_primary: boolean = false,
    alt_text?: string,
  ) {
    const res = await fetch(`${this.adminBaseUrl}/variants/${Number(variantId)}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, is_primary, alt_text: alt_text ?? null }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async adminDeleteVariantImage(imageId: string): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/variant-images/${Number(imageId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('API Error');
  }

  async adminAttachProductImage(productId: string, image_url: string, is_primary: boolean = false) {
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, is_primary }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async adminSetPrimaryProductImage(imageId: string): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/product-images/${Number(imageId)}/set-primary`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('API Error');
  }

  // Banners & images: luôn trả về URL tuyệt đối để ảnh upload hiển thị đúng bên user
  private toAbsoluteUrl(url: string) {
    if (!url || typeof url !== 'string') return url || '';
    const u = String(url).trim();
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    const origin = this.getBackendOrigin();
    return `${origin}${u.startsWith('/') ? u : `/${u}`}`;
  }

  /** Dùng cho ảnh banner trên trang user: path hoặc full URL → luôn trả full URL. */
  getImageUrl(pathOrUrl: string | null | undefined): string {
    if (pathOrUrl == null || String(pathOrUrl).trim() === '') return '';
    return this.toAbsoluteUrl(String(pathOrUrl).trim());
  }

  async getBanners(): Promise<Banner[]> {
    // User-facing: fetch active home hero banners from backend, fallback to localstorage mock.
    try {
      const res = await fetch(`${this.userBaseUrl}/banners?slot=home_hero`);
      if (!res.ok) throw new Error('API Error');
      const data: AdminBanner[] = await res.json();
      return data.map((b) => ({
        id: String(b.id),
        imageUrl: this.toAbsoluteUrl(b.image_url),
        title: b.title || '',
        link: b.link_url || '#/products',
        position: 'main',
      }));
    } catch {
      return this.banners;
    }
  }

  /** Lấy banner theo slot. Nếu slot=footer_banner mà rỗng thì thử lấy tất cả rồi lọc theo slot (tránh lệch tên slot backend). */
  async userListBannersBySlot(slot: BannerSlot): Promise<AdminBanner[]> {
    const parse = (raw: any): AdminBanner[] => {
      const arr = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []);
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((b: any) => b && (b.is_active !== false))
        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((b: any) => {
          const pathOrUrl = b.image_url ?? b.imageUrl ?? '';
          return { ...b, image_url: this.toAbsoluteUrl(pathOrUrl) };
        });
    };
    try {
      const res = await fetch(`${this.userBaseUrl}/banners?slot=${encodeURIComponent(slot)}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      let list = parse(data);
      if (slot) list = list.filter((b) => (b.slot || '').toLowerCase() === slot.toLowerCase());
      if (list.length > 0) return list;
      // Fallback: lấy tất cả banner rồi lọc theo slot (phòng backend lệch tên slot)
      const resAll = await fetch(`${this.userBaseUrl}/banners`);
      if (!resAll.ok) return [];
      const all = parse(await resAll.json());
      return slot ? all.filter((b) => (b.slot || '').toLowerCase() === slot.toLowerCase()) : all;
    } catch {
      return [];
    }
  }

  async adminListBanners(params?: { slot?: BannerSlot | string; active_only?: boolean }): Promise<AdminBanner[]> {
    const qs = new URLSearchParams();
    if (params?.slot) qs.set('slot', params.slot);
    if (params?.active_only !== undefined) qs.set('active_only', String(params.active_only));
    const url = `${this.adminBaseUrl}/banners${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data: AdminBanner[] = await res.json();
    return data.map((b) => ({ ...b, image_url: this.toAbsoluteUrl(b.image_url) }));
  }

  async adminCreateBanner(payload: Omit<AdminBanner, 'id'>): Promise<AdminBanner> {
    const res = await fetch(`${this.adminBaseUrl}/banners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const b: AdminBanner = await res.json();
    return { ...b, image_url: this.toAbsoluteUrl(b.image_url) };
  }

  async adminUpdateBanner(id: number, payload: Partial<Omit<AdminBanner, 'id'>>): Promise<AdminBanner> {
    const res = await fetch(`${this.adminBaseUrl}/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const b: AdminBanner = await res.json();
    return { ...b, image_url: this.toAbsoluteUrl(b.image_url) };
  }

  async adminDeleteBanner(id: number): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/banners/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  async adminUploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${this.adminBaseUrl}/upload-image`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data: { url: string } = await res.json();
    return this.toAbsoluteUrl(data.url);
  }

  // --- Admin: Vouchers ---
  async adminListVouchers(params?: { q?: string; is_active?: boolean; page?: number; per_page?: number }) {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.is_active !== undefined) qs.set('is_active', params.is_active ? 'true' : 'false');
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    const res = await fetch(`${this.adminBaseUrl}/vouchers${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (!res.ok) throw new Error('Không thể tải vouchers');
    return res.json();
  }

  async adminCreateVoucher(payload: any) {
    const res = await fetch(`${this.adminBaseUrl}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Tạo voucher thất bại');
    return data;
  }

  async adminUpdateVoucher(id: number, payload: any) {
    const res = await fetch(`${this.adminBaseUrl}/vouchers/${Number(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Cập nhật voucher thất bại');
    return data;
  }

  // --- Admin: Shipping rules ---
  async adminListShippingRules(params?: { active_only?: boolean }) {
    const qs = new URLSearchParams();
    if (params?.active_only !== undefined) qs.set('active_only', params.active_only ? 'true' : 'false');
    const res = await fetch(`${this.adminBaseUrl}/shipping-rules${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (!res.ok) throw new Error('Không thể tải shipping rules');
    return res.json();
  }

  async adminCreateShippingRule(payload: any) {
    const res = await fetch(`${this.adminBaseUrl}/shipping-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Tạo shipping rule thất bại');
    return data;
  }

  async adminUpdateShippingRule(id: number, payload: any) {
    const res = await fetch(`${this.adminBaseUrl}/shipping-rules/${Number(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Cập nhật shipping rule thất bại');
    return data;
  }

  async adminDeleteShippingRule(id: number) {
    const res = await fetch(`${this.adminBaseUrl}/shipping-rules/${Number(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as any)?.detail || 'Xóa shipping rule thất bại');
    return data;
  }

  // --- Admin: Orders (read-only for now) ---
  async adminListOrders(params?: { page?: number; per_page?: number; status?: string; q?: string; date_from?: string; date_to?: string }) {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    if (params?.date_from) qs.set('date_from', params.date_from);
    if (params?.date_to) qs.set('date_to', params.date_to);
    const res = await fetch(`${this.adminBaseUrl}/orders${qs.toString() ? `?${qs.toString()}` : ''}`);
    if (!res.ok) throw new Error('Không thể tải danh sách đơn hàng');
    return res.json();
  }

  async adminGetOrder(orderId: number) {
    const res = await fetch(`${this.adminBaseUrl}/orders/${Number(orderId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Không thể tải chi tiết đơn hàng');
    return data;
  }

  async adminUpdateOrderStatus(orderId: number, status: string) {
    const res = await fetch(`${this.adminBaseUrl}/orders/${Number(orderId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Cập nhật trạng thái thất bại');
    return data;
  }

  // Collections
  async getCollections(): Promise<Collection[]> {
    try {
      const res = await fetch(`${this.userBaseUrl}/collections`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      const mapped: Collection[] = data.map((c) => ({
        id: String(c.id),
        name: c.name,
        description: c.description ?? '',
        coverImage: this.toAbsoluteUrl(c.cover_image || c.coverImage || ''),
        products: (c.product_ids || c.products || []).map((pid: any) => String(pid)),
      }));
      // cache to localStorage for faster subsequent loads (user-facing)
      this.collections = mapped;
      this.save();
      return mapped;
    } catch {
      // fallback to local cache if backend not available
      return this.collections;
    }
  }
  /** Admin: list collections (includes inactive by default). */
  async adminListCollections(include_inactive: boolean = true): Promise<Collection[]> {
    const res = await fetch(`${this.adminBaseUrl}/collections?include_inactive=${include_inactive ? 'true' : 'false'}`);
    if (!res.ok) throw new Error('API Error');
    const data: any[] = await res.json();
    return data.map((c) => ({
      id: String(c.id),
      name: c.name,
      description: c.description ?? '',
      coverImage: this.toAbsoluteUrl(c.cover_image || c.coverImage || ''),
      products: (c.product_ids || c.products || []).map((pid: any) => String(pid)),
    }));
  }

  async adminAddCollection(payload: { name: string; description?: string; coverImage?: string; products: string[]; isActive?: boolean; sortOrder?: number; slug?: string }): Promise<Collection> {
    const body = {
      name: payload.name,
      description: payload.description ?? '',
      cover_image: payload.coverImage ?? null,
      is_active: payload.isActive ?? true,
      sort_order: payload.sortOrder ?? 0,
      product_ids: (payload.products || []).map((id) => Number(id)),
      slug: payload.slug ?? undefined,
    };
    const res = await fetch(`${this.adminBaseUrl}/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API Error');
    const c: any = await res.json();
    return {
      id: String(c.id),
      name: c.name,
      description: c.description ?? '',
      coverImage: this.toAbsoluteUrl(c.cover_image || ''),
      products: (c.product_ids || []).map((pid: any) => String(pid)),
    };
  }

  async adminUpdateCollection(collection: Collection & { isActive?: boolean; sortOrder?: number; slug?: string }): Promise<Collection> {
    const body = {
      name: collection.name,
      description: collection.description ?? '',
      cover_image: collection.coverImage ?? null,
      is_active: (collection as any).isActive ?? true,
      sort_order: (collection as any).sortOrder ?? 0,
      product_ids: (collection.products || []).map((id) => Number(id)),
      slug: (collection as any).slug ?? undefined,
    };
    const res = await fetch(`${this.adminBaseUrl}/collections/${Number(collection.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('API Error');
    const c: any = await res.json();
    return {
      id: String(c.id),
      name: c.name,
      description: c.description ?? '',
      coverImage: this.toAbsoluteUrl(c.cover_image || ''),
      products: (c.product_ids || []).map((pid: any) => String(pid)),
    };
  }

  async adminDeleteCollection(id: string): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/collections/${Number(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  // Blogs / Intro / Tips
  async adminListBlogs(params?: { category?: string }): Promise<Blog[]> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    const url = `${this.adminBaseUrl}/blogs${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data: any[] = await res.json();
    return data.map((b) => {
      const content = b.content || '';
      const createdAt = b.created_at || b.published_at || '';
      const thumbnail = this.toAbsoluteUrl(b.thumbnail || '');
      const excerpt = b.excerpt
        ? String(b.excerpt)
        : content
          ? `${String(content).slice(0, 160).trim()}${String(content).length > 160 ? '...' : ''}`
          : '';
      return {
        id: String(b.id),
        title: b.title || '',
        content,
        thumbnail,
        // Aliases to match frontend BlogPage
        image: thumbnail,
        excerpt,
        publishedAt: createdAt || undefined,
        author: b.author || '',
        createdAt,
        category: (b.category || 'tips') as Blog['category'],
      };
    });
  }

  async adminCreateBlog(payload: {
    title: string;
    slug?: string;
    content: string;
    thumbnail?: string;
    author?: string;
    category?: string;
    is_published?: boolean;
  }): Promise<Blog> {
    const res = await fetch(`${this.adminBaseUrl}/blogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const b: any = await res.json();
    return {
      id: String(b.id),
      title: b.title || '',
      content: b.content || '',
      thumbnail: this.toAbsoluteUrl(b.thumbnail || ''),
      image: this.toAbsoluteUrl(b.thumbnail || ''),
      excerpt: b.excerpt
        ? String(b.excerpt)
        : b.content
          ? `${String(b.content).slice(0, 160).trim()}${String(b.content).length > 160 ? '...' : ''}`
          : '',
      author: b.author || '',
      createdAt: b.created_at || b.published_at || '',
      publishedAt: b.created_at || b.published_at || undefined,
      category: (b.category || 'tips') as Blog['category'],
    };
  }

  async adminUpdateBlog(
    id: number,
    payload: Partial<{
      title: string;
      slug: string;
      content: string;
      thumbnail: string;
      author: string;
      category: string;
      is_published: boolean;
    }>,
  ): Promise<Blog> {
    const res = await fetch(`${this.adminBaseUrl}/blogs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    const b: any = await res.json();
    return {
      id: String(b.id),
      title: b.title || '',
      content: b.content || '',
      thumbnail: this.toAbsoluteUrl(b.thumbnail || ''),
      image: this.toAbsoluteUrl(b.thumbnail || ''),
      excerpt: b.excerpt
        ? String(b.excerpt)
        : b.content
          ? `${String(b.content).slice(0, 160).trim()}${String(b.content).length > 160 ? '...' : ''}`
          : '',
      author: b.author || '',
      createdAt: b.created_at || b.published_at || '',
      publishedAt: b.created_at || b.published_at || undefined,
      category: (b.category || 'tips') as Blog['category'],
    };
  }

  async adminDeleteBlog(id: number): Promise<void> {
    const res = await fetch(`${this.adminBaseUrl}/blogs/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  async getTips(limit: number = 3): Promise<Blog[]> {
    try {
      const qs = new URLSearchParams({ category: 'tips', limit: String(limit) });
      const res = await fetch(`${this.userBaseUrl}/blogs?${qs.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      return data.map((b) => {
        const content = b.content || '';
        const createdAt = b.created_at || b.published_at || '';
        const thumbnail = this.toAbsoluteUrl(b.thumbnail || '');
        const excerpt = b.excerpt
          ? String(b.excerpt)
          : content
            ? `${String(content).slice(0, 160).trim()}${String(content).length > 160 ? '...' : ''}`
            : '';
        return {
          id: String(b.id),
          title: b.title || '',
          content,
          thumbnail,
          image: thumbnail,
          excerpt,
          publishedAt: createdAt || undefined,
          author: b.author || '',
          createdAt,
          category: (b.category || 'tips') as Blog['category'],
        };
      });
    } catch {
      return [];
    }
  }

  async getBlogs(category: Blog['category'], limit: number = 10, q?: string): Promise<Blog[]> {
    try {
      const qs = new URLSearchParams({ category, limit: String(limit) });
      if (q && String(q).trim()) qs.set('q', String(q).trim());
      const res = await fetch(`${this.userBaseUrl}/blogs?${qs.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      return data.map((b) => {
        const content = b.content || '';
        const createdAt = b.created_at || b.published_at || '';
        const thumbnail = this.toAbsoluteUrl(b.thumbnail || '');
        const excerpt = b.excerpt
          ? String(b.excerpt)
          : content
            ? `${String(content).slice(0, 160).trim()}${String(content).length > 160 ? '...' : ''}`
            : '';
        return {
          id: String(b.id),
          title: b.title || '',
          content,
          thumbnail,
          image: thumbnail,
          excerpt,
          author: b.author || '',
          createdAt: createdAt || '',
          publishedAt: b.published_at || undefined,
          category: (b.category || category) as Blog['category'],
        };
      });
    } catch {
      return [];
    }
  }

  async getBlogById(blogId: string | number): Promise<Blog | null> {
    try {
      const res = await fetch(`${this.userBaseUrl}/blogs/${Number(blogId)}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('API Error');
      const b: any = await res.json();
      const content = b.content || '';
      const createdAt = b.created_at || b.published_at || '';
      const thumbnail = this.toAbsoluteUrl(b.thumbnail || '');
      const excerpt = b.excerpt
        ? String(b.excerpt)
        : content
          ? `${String(content).slice(0, 160).trim()}${String(content).length > 160 ? '...' : ''}`
          : '';
      return {
        id: String(b.id),
        title: b.title || '',
        content,
        thumbnail,
        image: thumbnail,
        excerpt,
        author: b.author || '',
        createdAt: createdAt || '',
        publishedAt: b.published_at || undefined,
        category: (b.category || 'tips') as Blog['category'],
      };
    } catch {
      return null;
    }
  }

  async getIntro(): Promise<Blog | null> {
    try {
      const qs = new URLSearchParams({ category: 'intro', limit: '1' });
      const res = await fetch(`${this.userBaseUrl}/blogs?${qs.toString()}`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      const b = data[0];
      if (!b) return null;
      return {
        id: String(b.id),
        title: b.title || '',
        content: b.content || '',
        thumbnail: this.toAbsoluteUrl(b.thumbnail || ''),
        image: this.toAbsoluteUrl(b.thumbnail || ''),
        excerpt: b.excerpt
          ? String(b.excerpt)
          : b.content
            ? `${String(b.content).slice(0, 160).trim()}${String(b.content).length > 160 ? '...' : ''}`
            : '',
        author: b.author || '',
        createdAt: b.created_at || b.published_at || '',
        publishedAt: b.created_at || b.published_at || undefined,
        category: (b.category || 'intro') as Blog['category'],
      };
    } catch {
      return null;
    }
  }

  // Orders
  async getOrders() { return this.orders; }
  async updateOrderStatus(id: string, status: Order['status']) {
    const order = this.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      this.save();
    }
  }
  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'status'>) {
    const newOrder: Order = {
      ...order,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    this.orders.push(newOrder);
    this.save();
    return newOrder;
  }

  // User checkout (Phase B)
  async userValidateVoucher(code: string, cart_total: number): Promise<{ ok: boolean; discountAmount?: number; reason?: string | null }> {
    const res = await fetch(`${this.userBaseUrl}/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim(), cart_total }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, reason: (data as any)?.detail ?? 'Lỗi xác thực mã' };
    return { ok: !!data.ok, discountAmount: data.discountAmount ?? undefined, reason: data.reason ?? undefined };
  }

  async userGetAutoVoucher(cart_total: number): Promise<{ ok: boolean; code: string | null; discountAmount: number }> {
    const res = await fetch(`${this.userBaseUrl}/vouchers/auto?cart_total=${encodeURIComponent(cart_total)}`);
    const data = await res.json();
    if (!res.ok) return { ok: false, code: null, discountAmount: 0 };
    return { ok: !!data.ok, code: data.code ?? null, discountAmount: Number(data.discountAmount ?? 0) };
  }

  async userCalculateShipping(cart_total: number): Promise<{ baseFee: number; discountFromShipping: number; finalFee: number; ruleId?: number }> {
    const res = await fetch(`${this.userBaseUrl}/shipping/calculate?cart_total=${encodeURIComponent(cart_total)}`);
    if (!res.ok) return { baseFee: 0, discountFromShipping: 0, finalFee: 0 };
    return res.json();
  }

  async userCreateOrder(payload: {
    customer: { name: string; phone: string; email?: string; address: string };
    items: { productId: number; variantId?: number; quantity: number }[];
    voucherCode?: string;
    note?: string;
  }): Promise<{ orderId: number; orderCode: string; status: string; totalAmount: number; createdAt: string }> {
    const token = this.getAuthToken();
    const res = await fetch(`${this.userBaseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = typeof (data as any)?.detail === 'string' ? (data as any).detail : 'Đặt hàng thất bại';
      throw new Error(msg);
    }
    return data;
  }

  // Auth (Phase C)
  async userRegister(payload: { name?: string; email: string; phone?: string; password: string }) {
    const res = await fetch(`${this.userBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Đăng ký thất bại');
    if (data?.token) this.setAuthToken(String(data.token));
    return data;
  }

  async userLogin(payload: { emailOrPhone: string; password: string }) {
    const res = await fetch(`${this.userBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Đăng nhập thất bại');
    if (data?.token) this.setAuthToken(String(data.token));
    return data;
  }

  async userMe() {
    const token = this.getAuthToken();
    if (!token) throw new Error('Chưa đăng nhập');
    const res = await fetch(`${this.userBaseUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as any)?.detail || 'Không thể tải thông tin');
    return data;
  }

  userLogout() {
    this.setAuthToken(null);
  }
}

export const api = new ApiService();
