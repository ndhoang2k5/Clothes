import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { COLORS } from './designTokens';

const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login({ emailOrPhone: emailOrPhone.trim(), password });
      } else {
        await register({ name: name.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined, password });
      }
      window.location.hash = '#/';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-black mb-2" style={{ color: COLORS.textMain }}>
        {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
      </h1>
      <p className="text-gray-600 mb-8">
        {mode === 'login' ? 'Đăng nhập để theo dõi đơn hàng và lưu thông tin mua sắm.' : 'Tạo tài khoản để xem lại lịch sử đơn hàng.'}
      </p>

      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            className={`flex-1 py-2.5 rounded-2xl font-black ${mode === 'login' ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
            style={mode === 'login' ? { backgroundColor: COLORS.ctaPrimary } : {}}
            onClick={() => setMode('login')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            className={`flex-1 py-2.5 rounded-2xl font-black ${mode === 'register' ? 'text-white' : 'bg-gray-100 text-gray-700'}`}
            style={mode === 'register' ? { backgroundColor: COLORS.ctaPrimary } : {}}
            onClick={() => setMode('register')}
          >
            Đăng ký
          </button>
        </div>

        {mode === 'login' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email hoặc Số điện thoại</label>
              <input
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                placeholder="email@example.com hoặc 090..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                placeholder="Nhập mật khẩu"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Họ tên (tùy chọn)</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Email *</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Số điện thoại (tùy chọn)</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                placeholder="090..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mật khẩu *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 outline-none focus:border-pink-500"
                placeholder="Tối thiểu 6 ký tự"
              />
            </div>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-red-600 font-bold">{error}</div>}

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="w-full mt-6 py-3 rounded-2xl text-white font-black shadow-lg shadow-pink-200 disabled:opacity-50"
          style={{ backgroundColor: COLORS.ctaPrimary }}
        >
          {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

