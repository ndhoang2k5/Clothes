import React, { useState } from 'react';
import { api } from '../../services/api';

type Props = {
  onSuccess?: () => void;
};

const AdminLoginPage: React.FC<Props> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.adminAuthLogin(email.trim(), password);
      window.location.hash = '#/admin';
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-y-auto bg-[#F8F3EC] px-4 py-12">
      <div className="w-full max-w-[420px] rounded-[1.75rem] bg-white border border-[#E5D6C4]/80 shadow-lg shadow-[#8B6A47]/10 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#B58A5A] text-white font-black text-2xl shadow-md mb-4">
            U
          </div>
          <h1 className="text-2xl font-black text-[#3B2C24] tracking-tight">Unbee CMS</h1>
          <p className="text-sm text-[#6B5645] mt-2">Đăng nhập quản trị</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold text-[#4B3B32] uppercase tracking-wide mb-1.5">
              Email
            </label>
            <input
              id="admin-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-[#E5D6C4] bg-[#FFFBF7] px-4 py-3 text-[#3B2C24] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B58A5A]/40 focus:border-[#B58A5A]"
              placeholder="globaladmin hoặc email"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold text-[#4B3B32] uppercase tracking-wide mb-1.5">
              Mật khẩu
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#E5D6C4] bg-[#FFFBF7] px-4 py-3 text-[#3B2C24] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#B58A5A]/40 focus:border-[#B58A5A]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#8B6A47] text-white font-black py-3.5 hover:bg-[#75583b] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md"
          >
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginPage;
