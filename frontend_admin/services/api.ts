
import { Product, Order } from '../types';

class AdminApiService {
  // Pointing to port 8888 as mapped in docker-compose
  private baseUrl = 'http://localhost:8888/api/admin';

  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch(`${this.baseUrl}/orders`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch {
      return JSON.parse(localStorage.getItem('unbee_orders') || '[]');
    }
  }

  async createProduct(product: any) {
    const res = await fetch(`${this.baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    return res.json();
  }
}

export const api = new AdminApiService();
