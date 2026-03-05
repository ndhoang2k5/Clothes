
import type { Category, Order, Product, ProductVariant } from '../types';

class AdminApiService {
  // Pointing to port 8888 as mapped in docker-compose
  private baseUrl = 'http://localhost:8888/api/admin';

  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${this.baseUrl}/categories`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${this.baseUrl}/orders`);
      if (!res.ok) throw new Error('API Error');
      const data: any[] = await res.json();
      return data.map((o) => ({
        id: o.id,
        customerName: o.customer_name ?? o.customerName ?? '',
        status: o.status ?? 'pending',
      }));
    } catch {
      return JSON.parse(localStorage.getItem('unbee_orders') || '[]');
    }
  }

  async getProducts(includeInactive = true): Promise<Product[]> {
    const res = await fetch(`${this.baseUrl}/products?include_inactive=${includeInactive ? 'true' : 'false'}`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async createProduct(payload: Partial<Product> & { images?: Array<string | { image_url: string }> }): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async updateProduct(productId: number, payload: Partial<Product>): Promise<Product> {
    const res = await fetch(`${this.baseUrl}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async deleteProduct(productId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/products/${productId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  async addVariant(productId: number, payload: Partial<ProductVariant>): Promise<ProductVariant> {
    const res = await fetch(`${this.baseUrl}/products/${productId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async updateVariant(variantId: number, payload: Partial<ProductVariant>): Promise<ProductVariant> {
    const res = await fetch(`${this.baseUrl}/variants/${variantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async deleteVariant(variantId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/variants/${variantId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  async addProductImage(productId: number, payload: { image_url: string; alt_text?: string; sort_order?: number; is_primary?: boolean }) {
    const res = await fetch(`${this.baseUrl}/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async deleteProductImage(imageId: number): Promise<void> {
    const res = await fetch(`${this.baseUrl}/product-images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API Error');
  }

  async uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${this.baseUrl}/upload-image`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload failed');
    const data: { url: string } = await res.json();
    return data.url;
  }

  async listComboItems(productId: number) {
    const res = await fetch(`${this.baseUrl}/products/${productId}/combo-items`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async addComboItem(productId: number, component_variant_id: number, quantity: number) {
    const res = await fetch(`${this.baseUrl}/products/${productId}/combo-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ component_variant_id, quantity }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async updateComboItem(productId: number, component_variant_id: number, quantity: number) {
    const res = await fetch(`${this.baseUrl}/products/${productId}/combo-items/${component_variant_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }

  async deleteComboItem(productId: number, component_variant_id: number) {
    const res = await fetch(`${this.baseUrl}/products/${productId}/combo-items/${component_variant_id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  }
}

export const api = new AdminApiService();
