import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '../types';
import { api } from '../services/api';

export type CartVariant = {
  id: string;
  size?: string;
  color?: string;
  stock?: number;
};

export type CartItem = {
  key: string;
  productId: string;
  product: Product;
  variant?: CartVariant;
  quantity: number;
};

export type AppliedVoucher = {
  code: string;
  discountAmount: number;
};

type AddItemArgs = {
  product: Product;
  variant?: CartVariant;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  appliedVoucher: AppliedVoucher | null;
  addItem: (args: AddItemArgs) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  applyVoucher: (code: string) => Promise<void>;
  removeVoucher: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'unbee_cart_v1';

function makeKey(productId: string, variantId?: string) {
  return `${productId}::${variantId || 'no-variant'}`;
}

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const raw = safeParse<CartItem[]>(typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null);
    return Array.isArray(raw) ? raw : [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const totalQuantity = useMemo(() => items.reduce((sum, it) => sum + (it.quantity || 0), 0), [items]);
  const totalPrice = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = Number((it.product as any).discountPrice ?? (it.product as any).price ?? 0) || 0;
      return sum + price * (it.quantity || 0);
    }, 0);
  }, [items]);

  const addItem = ({ product, variant, quantity }: AddItemArgs) => {
    const q = Math.max(1, Number(quantity) || 1);
    const key = makeKey(String(product.id), variant?.id);

    setItems((prev) => {
      const idx = prev.findIndex((it) => it.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + q };
        return next;
      }
      const newItem: CartItem = {
        key,
        productId: String(product.id),
        product,
        variant,
        quantity: q,
      };
      return [newItem, ...prev];
    });
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  };

  const updateQuantity = (key: string, quantity: number) => {
    const q = Math.max(1, Number(quantity) || 1);
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity: q } : it)));
  };

  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);

  const clearCart = () => {
    setItems([]);
    setAppliedVoucher(null);
  };

  const applyVoucher = async (code: string) => {
    const trimmed = (code || '').trim();
    if (!trimmed) throw new Error('Vui lòng nhập mã giảm giá');
    const cartTotal = items.reduce((sum, it) => {
      const price = Number((it.product as any).discountPrice ?? (it.product as any).price ?? 0) || 0;
      return sum + price * (it.quantity || 0);
    }, 0);
    const result = await api.userValidateVoucher(trimmed, cartTotal);
    if (!result.ok) throw new Error(result.reason || 'Mã không hợp lệ');
    setAppliedVoucher({ code: trimmed, discountAmount: result.discountAmount ?? 0 });
  };

  const removeVoucher = () => setAppliedVoucher(null);

  const value: CartContextValue = {
    items,
    totalQuantity,
    totalPrice,
    appliedVoucher,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    applyVoucher,
    removeVoucher,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

