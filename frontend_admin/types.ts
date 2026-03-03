
export interface Product {
  id: number;
  category_id: number | null;
  category_slug: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  base_price: number;
  discount_price: number | null;
  currency: string;
  kind: 'single' | 'combo';
  is_active: boolean;
  is_hot: boolean;
  is_new: boolean;
  is_sale: boolean;
  primary_image_url: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductImage {
  id: number;
  image_url: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  material?: string | null;
  stock: number;
  price_override?: number | null;
  discount_price_override?: number | null;
  is_active: boolean;
  images?: Array<{
    id: number;
    image_url: string;
    sort_order: number;
    is_primary: boolean;
  }>;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  icon?: string | null;
}
export interface Order {
  id: number;
  customerName: string;
  status: string;
}
