
import { Product, Category, Banner, Order, Blog, Collection } from '../types';

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
  async getProducts() { return this.products; }
  async addProduct(product: Product) {
    const newProduct = { ...product, id: Date.now().toString() };
    this.products.push(newProduct);
    this.save();
    return newProduct;
  }
  async updateProduct(product: Product) {
    const index = this.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      this.products[index] = product;
      this.save();
    }
  }
  async deleteProduct(id: string) {
    this.products = this.products.filter(p => p.id !== id);
    this.save();
  }

  // Banners
  async getBanners() { return this.banners; }
  async updateBanner(banner: Banner) {
    const idx = this.banners.findIndex(b => b.id === banner.id);
    if (idx !== -1) this.banners[idx] = banner;
    else this.banners.push({ ...banner, id: Date.now().toString() });
    this.save();
  }
  async deleteBanner(id: string) {
    this.banners = this.banners.filter(b => b.id !== id);
    this.save();
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
