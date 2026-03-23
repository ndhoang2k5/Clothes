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
  isAuto?: boolean;
  voucherType?: string;
  giftProductName?: string;
  giftProductImage?: string;
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
  giftVoucher: AppliedVoucher | null;
  addItem: (args: AddItemArgs) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  applyVoucher: (code: string) => Promise<void>;
  removeVoucher: (slot?: 'discount' | 'gift') => void;
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
  const [giftVoucher, setGiftVoucher] = useState<AppliedVoucher | null>(null);
  const [autoSuppressedAtTotal, setAutoSuppressedAtTotal] = useState<number | null>(null);
  const [giftSuppressedAtTotal, setGiftSuppressedAtTotal] = useState<number | null>(null);

  useEffect(() => {
    if (items.length === 0 || totalPrice <= 0) {
      if (appliedVoucher?.isAuto) setAppliedVoucher(null);
      if (giftVoucher?.isAuto) setGiftVoucher(null);
      setAutoSuppressedAtTotal(null);
      setGiftSuppressedAtTotal(null);
      return;
    }

    const hasManualDiscount = appliedVoucher && !appliedVoucher.isAuto;
    const hasManualGift = giftVoucher && !giftVoucher.isAuto;
    const discountSuppressed = autoSuppressedAtTotal !== null && autoSuppressedAtTotal === totalPrice;
    const giftSuppressed = giftSuppressedAtTotal !== null && giftSuppressedAtTotal === totalPrice;

    if (hasManualDiscount && hasManualGift) return;
    if (hasManualDiscount && giftSuppressed) return;
    if (discountSuppressed && hasManualGift) return;
    if (discountSuppressed && giftSuppressed) return;

    let cancelled = false;
    const t = window.setTimeout(() => {
      void api
        .userGetAutoVoucher(totalPrice)
        .then((r) => {
          if (cancelled) return;

          if (!hasManualDiscount && !discountSuppressed) {
            const code = r.code ? String(r.code).trim() : '';
            const discountAmount = Number(r.discountAmount || 0);
            if (code && discountAmount > 0) {
              setAppliedVoucher({ code, discountAmount, isAuto: true, voucherType: r.voucherType });
            } else if (appliedVoucher?.isAuto) {
              setAppliedVoucher(null);
            }
          }

          if (!hasManualGift && !giftSuppressed) {
            const giftCode = r.giftCode ? String(r.giftCode).trim() : '';
            if (giftCode && r.giftProductName) {
              setGiftVoucher({
                code: giftCode,
                discountAmount: 0,
                isAuto: true,
                voucherType: 'product',
                giftProductName: r.giftProductName,
                giftProductImage: r.giftProductImage,
              });
            } else if (giftVoucher?.isAuto) {
              setGiftVoucher(null);
            }
          }
        })
        .catch(() => {
          // ignore
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [items.length, totalPrice, appliedVoucher?.code, appliedVoucher?.isAuto, giftVoucher?.code, giftVoucher?.isAuto, autoSuppressedAtTotal, giftSuppressedAtTotal]);

  const clearCart = () => {
    setItems([]);
    setAppliedVoucher(null);
    setGiftVoucher(null);
    setAutoSuppressedAtTotal(null);
    setGiftSuppressedAtTotal(null);
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

    if (result.voucherType === 'product') {
      setGiftVoucher({
        code: trimmed,
        discountAmount: 0,
        isAuto: false,
        voucherType: 'product',
        giftProductName: result.giftProductName,
        giftProductImage: result.giftProductImage,
      });
      setGiftSuppressedAtTotal(null);
    } else {
      setAppliedVoucher({
        code: trimmed,
        discountAmount: result.discountAmount ?? 0,
        isAuto: false,
        voucherType: result.voucherType,
      });
      setAutoSuppressedAtTotal(null);
    }
  };

  const removeVoucher = (slot?: 'discount' | 'gift') => {
    if (!slot || slot === 'discount') {
      if (appliedVoucher?.isAuto) setAutoSuppressedAtTotal(totalPrice);
      setAppliedVoucher(null);
    }
    if (!slot || slot === 'gift') {
      if (giftVoucher?.isAuto) setGiftSuppressedAtTotal(totalPrice);
      setGiftVoucher(null);
    }
  };

  const value: CartContextValue = {
    items,
    totalQuantity,
    totalPrice,
    appliedVoucher,
    giftVoucher,
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
