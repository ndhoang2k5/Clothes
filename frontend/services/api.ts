
import { Product } from '../types';

const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Body Cotton Organic Unbee',
    description: 'Vải mềm mại 100% cotton organic.',
    price: 180000,
    discountPrice: 150000,
    category: 'so-sinh',
    material: 'Organic Cotton',
    images: ['https://picsum.photos/400/500?baby=1'],
    isHot: true, isNew: true, isSale: true,
    variants: [{ id: 'v1', size: '0-3m', color: 'Trắng', stock: 10 }]
  }
];

class UserApiService {
  // Pointing to port 8888 as mapped in docker-compose
  private baseUrl = 'http://localhost:8888/api/user';

  async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch(`${this.baseUrl}/products`);
      if (!res.ok) throw new Error('API Error');
      return await res.json();
    } catch {
      return MOCK_PRODUCTS;
    }
  }
}

export const api = new UserApiService();
