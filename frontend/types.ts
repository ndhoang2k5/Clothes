
// Fix: Added missing properties (description, material, isHot, isNew, isSale) to Product interface
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
  variants: any[];
}

// Fix: Exported Banner interface needed by frontend services
export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
  position: 'main' | 'promo' | 'footer';
}

// Fix: Exported Collection interface needed by frontend services
export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  products: string[]; // List of product IDs
}

export interface Order {
  id: string;
  customerName: string;
  total: number;
  status: string;
}
