
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
  private backendOrigin = 'http://localhost:8888';
  private adminBaseUrl = `${this.backendOrigin}/api/admin`;
  private userBaseUrl = `${this.backendOrigin}/api/user`;

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
    const images: string[] = Array.isArray(p.images) ? p.images.map((i: any) => this.toAbsoluteUrl(i.image_url)).filter(Boolean) : [];
    const primary = p.primary_image_url ? this.toAbsoluteUrl(p.primary_image_url) : undefined;
    const allImages = (primary ? [primary, ...images.filter((u) => u !== primary)] : images);

    const variants = Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          id: String(v.id),
          size: v.size || '',
          color: v.color || '',
          stock: Number(v.stock || 0),
          price: v.price_override ?? undefined,
        }))
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
    };
  }

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

  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch(`${this.userBaseUrl}/products`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      return data.map((p) => this.mapBackendProductToFrontend(p));
    } catch {
      return this.products;
    }
  }

  async adminListProducts(include_inactive: boolean = true): Promise<Product[]> {
    const res = await fetch(`${this.adminBaseUrl}/products?include_inactive=${include_inactive ? 'true' : 'false'}`);
    if (!res.ok) throw new Error('API Error');
    const data: any[] = await res.json();
    return data.map((p) => this.mapBackendProductToFrontend(p));
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

  async adminAttachProductImage(productId: string, image_url: string, is_primary: boolean = false) {
    const res = await fetch(`${this.adminBaseUrl}/products/${Number(productId)}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, is_primary }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  // Banners
  private toAbsoluteUrl(url: string) {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return `${this.backendOrigin}${url}`;
    return url;
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
      .map((b) => ({ ...b, image_url: this.toAbsoluteUrl(b.image_url) }));
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
  async getCollections() { return this.collections; }
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
