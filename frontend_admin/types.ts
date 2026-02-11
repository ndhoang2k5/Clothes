
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  material: string;
  images: string[];
  isHot: boolean;
  isNew: boolean;
  isSale: boolean;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  price?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  slug: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  products: string[];
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: any[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
  position: 'main' | 'promo' | 'footer';
}
