
import React from 'react';

const BACKEND_PORT = 8888;
const getStaticImageUrl = (fileName: string): string => {
  const env = typeof (import.meta as any)?.env !== 'undefined' ? (import.meta as any).env?.VITE_API_ORIGIN : '';
  const origin = env && String(env).trim()
    ? String(env).trim().replace(/\/+$/, '')
    : (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`
      : `http://localhost:${BACKEND_PORT}`);
  return `${origin}/static/images/${encodeURIComponent(fileName)}`;
};

export const CATEGORIES = [
  {
    id: '1',
    name: 'Đồ sơ sinh',
    slug: 'so-sinh',
    icon: (
      <img
        src={getStaticImageUrl('sosinh.png')}
        alt="Đồ sơ sinh"
        className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    id: '2',
    name: 'Quần áo bé trai',
    slug: 'be-trai',
    icon: (
      <img
        src={getStaticImageUrl('boy.png')}
        alt="Quần áo bé trai"
        className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    id: '3',
    name: 'Quần áo bé gái',
    slug: 'be-gai',
    icon: (
      <img
        src={getStaticImageUrl('girl.png')}
        alt="Quần áo bé gái"
        className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    id: '4',
    name: 'Body',
    slug: 'body',
    icon: (
      <img
        src={getStaticImageUrl('body.png')}
        alt="Body"
        className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    id: '5',
    name: 'Phụ kiện',
    slug: 'phu-kien',
    icon: (
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-100 to-sky-100 flex items-center justify-center">
        <span className="text-2xl">🎀</span>
      </div>
    ),
  },
  {
    id: '6',
    name: 'Box quà tặng',
    slug: 'qua-tang',
    icon: (
      <img
        src={getStaticImageUrl('giftbox.png')}
        alt="Box quà tặng"
        className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    id: '7',
    name: 'Combo đi sinh',
    slug: 'di-sinh',
    icon: (
      <img
        src={getStaticImageUrl('combo.png')}
        alt="Combo đi sinh"
        className="w-8 h-8 md:w-9 md:h-9 object-contain transition-transform group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />
    ),
  },
  {
    id: '8',
    name: 'Ưu đãi cuối mùa',
    slug: 'uu-dai-cuoi-mua',
    icon: (
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center">
        <span className="text-2xl">🏷️</span>
      </div>
    ),
  },
];

export const TRUST_FEATURES = [
  {
    title: 'Chất liệu An Toàn',
    desc: 'Vải cotton organic mềm mại cho da bé',
    icon: (
      <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Đổi trả linh hoạt',
    desc: 'Đổi trả miễn phí trong vòng 7 ngày',
    icon: (
      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: 'Giao hàng nhanh',
    desc: 'Ship COD toàn quốc, hỏa tốc nội thành',
    icon: (
      <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];
