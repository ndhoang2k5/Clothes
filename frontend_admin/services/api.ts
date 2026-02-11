
import { Product, Order } from '../types';

class AdminApiService {
  async getOrders(): Promise<Order[]> {
    try {
      const res = await fetch('http://localhost:8000/api/orders');
      return await res.json();
    } catch {
      // Fallback local storage for preview
      return JSON.parse(localStorage.getItem('unbee_orders') || '[]');
    }
  }

  async updateProduct(product: Product) {
    console.log('Updating product:', product);
    // Real implementation would use fetch()
  }
}

export const api = new AdminApiService();
