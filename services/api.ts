
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
  /** Backend port: khớp với docker-compose backend ports "8888:8000" (host:container) */
  private readonly backendPort = 8888;
  private getBackendOrigin(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:${this.backendPort}`;
    }
    return `http://localhost:${this.backendPort}`;
  }
  private get adminBaseUrl() { return `${this.getBackendOrigin()}/api/admin`; }
  private get userBaseUrl() { return `${this.getBackendOrigin()}/api/user`; }

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
      material: variants[0]?.material || p.material || '',
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

  async getProductsPage(params?: { category?: string | null; page?: number; per_page?: number; useCache?: boolean }) {
    const category = params?.category ?? null;
    const page = params?.page ?? 1;
    const per_page = params?.per_page ?? 24;
    const useCache = params?.useCache ?? true;
    const key = `${category || 'all'}|${page}|${per_page}`;

    if (useCache) {
      const cached = this.productListCache.get(key);
      if (cached && Date.now() - cached.fetchedAt < 2 * 60 * 1000) {
        return { ...cached, fromCache: true as const };
      }
    }

    const qs = new URLSearchParams();
    if (category) qs.set('category', category);
    qs.set('page', String(page));
    qs.set('per_page', String(per_page));

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
    page?: number;
    per_page?: number;
  }): Promise<{ items: Product[]; total: number; page: number; per_page: number }> {
    const qs = new URLSearchParams();
    qs.set('include_inactive', params?.include_inactive === false ? 'false' : 'true');
    if (params?.q) qs.set('q', params.q);
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
    // category update: resolve slug -> id
    if (patch.category !== undefined) {
      const categories = await this.adminListCategories(true);
      const categoryId = categories.find((c) => c.slug === patch.category)?.id;
      payload.category_id = categoryId ? Number(categoryId) : null;
    }
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
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

  async userListBannersBySlot(slot: BannerSlot): Promise<AdminBanner[]> {
    const res = await fetch(`${this.userBaseUrl}/banners?slot=${encodeURIComponent(slot)}`);
    if (!res.ok) throw new Error('API Error');
    const data: AdminBanner[] = await res.json();
    return data
      .filter((b) => b.is_active)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((b) => {
        const pathOrUrl = (b as { image_url?: string }).image_url ?? (b as { imageUrl?: string }).imageUrl ?? '';
        return { ...b, image_url: this.toAbsoluteUrl(pathOrUrl) };
      });
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
      // cache to localStorage for faster subsequent loads
      this.collections = mapped;
      this.save();
      return mapped;
    } catch {
      // fallback to local cache if backend not available
      return this.collections;
    }
  }
  async addCollection(collection: Collection) {
    const newCol = { ...collection, id: Date.now().toString() };
    this.collections.push(newCol);
    this.save();
    return newCol;
  }
  async updateCollection(collection: Collection) {
    const idx = this.collections.findIndex(c => c.id === collection.id);
    if (idx !== -1) {
      this.collections[idx] = collection;
      this.save();
    }
  }
  async deleteCollection(id: string) {
    this.collections = this.collections.filter(c => c.id !== id);
    this.save();
  }

  // Blogs / Intro / Tips
  async adminListBlogs(params?: { category?: string }): Promise<Blog[]> {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    const url = `${this.adminBaseUrl}/blogs${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API Error');
    const data: any[] = await res.json();
    return data.map((b) => ({
      id: String(b.id),
      title: b.title || '',
      content: b.content || '',
      thumbnail: this.toAbsoluteUrl(b.thumbnail || ''),
      author: b.author || '',
      createdAt: b.created_at || b.published_at || '',
      category: (b.category || 'tips') as Blog['category'],
    }));
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
      author: b.author || '',
      createdAt: b.created_at || b.published_at || '',
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
      author: b.author || '',
      createdAt: b.created_at || b.published_at || '',
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
      return data.map((b) => ({
        id: String(b.id),
        title: b.title || '',
        content: b.content || '',
        thumbnail: this.toAbsoluteUrl(b.thumbnail || ''),
        author: b.author || '',
        createdAt: b.created_at || b.published_at || '',
        category: (b.category || 'tips') as Blog['category'],
      }));
    } catch {
      return [];
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
        author: b.author || '',
        createdAt: b.created_at || b.published_at || '',
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
}

export const api = new ApiService();
