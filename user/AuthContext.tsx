import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export type Customer = {
  id: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  default_address?: string | null;
};

export type OrderSummary = {
  id: number;
  order_code?: string | null;
  status?: string | null;
  total_amount?: number | null;
  created_at?: string | null;
  items?: any[];
};

type AuthContextValue = {
  customer: Customer | null;
  lastOrders: OrderSummary[];
  loading: boolean;
  login: (args: { emailOrPhone: string; password: string }) => Promise<void>;
  register: (args: { name?: string; email: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lastOrders, setLastOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const me = await api.userMe();
      setCustomer(me?.customer ?? null);
      setLastOrders(Array.isArray(me?.last_orders) ? me.last_orders : []);
    } catch {
      setCustomer(null);
      setLastOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (args: { emailOrPhone: string; password: string }) => {
    await api.userLogin(args);
    await refreshMe();
  };

  const register = async (args: { name?: string; email: string; phone?: string; password: string }) => {
    await api.userRegister(args);
    await refreshMe();
  };

  const logout = () => {
    api.userLogout();
    setCustomer(null);
    setLastOrders([]);
  };

  const value = useMemo<AuthContextValue>(() => ({
    customer,
    lastOrders,
    loading,
    login,
    register,
    logout,
    refreshMe,
  }), [customer, lastOrders, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

