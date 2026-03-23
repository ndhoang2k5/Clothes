
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  material: string;
  images: string[];
  isActive?: boolean;
  isHot: boolean;
  isNew: boolean;
  isSale: boolean;
  variants: ProductVariant[];
  kind?: 'single' | 'combo';
  comboItems?: ComboItem[];
}

export interface ProductVariant {
  id: string;
  size: string;
  color: string;
  stock: number;
  sku?: string;
  price?: number; // Override base price if specific
  image?: string; // Primary image for this variant (if any)
  imageId?: string; // optional: variant-specific image mapping id
}

export interface ComboItem {
  combo_product_id: number | string;
  component_variant_id: number | string;
  quantity: number;
  // Optional extra info for displaying combo contents
  variantLabel?: string;
  productName?: string;
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
  products: string[]; // List of product IDs
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  variantId: string;
  quantity: number;
  price: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  link: string;
  position: 'main' | 'promo' | 'footer';
}

export type BannerSlot =
  | 'home_hero'
  | 'home_promo'
  | 'home_product_promo'
  | 'home_category_feature'
  | 'footer_banner';

export interface AdminBanner {
  id: number;
  slot: BannerSlot | (string & {});
  sort_order: number;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  thumbnail: string;
  author: string;
  createdAt: string;
  category: 'news' | 'tips' | 'charity' | 'intro';
  workflowStatus?: 'draft' | 'review' | 'scheduled' | 'published';
  scheduledAt?: string;
  reviewedAt?: string;
  isPublished?: boolean;
  // Optional fields used by frontend `BlogPage`
  image?: string;
  excerpt?: string;
  publishedAt?: string;
}
