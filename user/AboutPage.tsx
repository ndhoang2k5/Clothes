import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Blog } from '../types';

const AboutPage: React.FC = () => {
  const [intro, setIntro] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getIntro();
        if (!cancelled) setIntro(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !intro) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-full" />
          <div className="grid md:grid-cols-2 gap-10 mt-4">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded-full w-3/4" />
              <div className="h-4 bg-gray-200 rounded-full w-5/6" />
              <div className="h-4 bg-gray-200 rounded-full w-2/3" />
            </div>
            <div className="h-64 md:h-80 bg-gray-200 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!intro) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-black mb-4">Về Unbee</h2>
        <p className="text-gray-500">
          Nội dung giới thiệu đang được cập nhật. Vui lòng quay lại sau nhé.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="grid md:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">{intro.title}</h2>
          <div className="prose prose-pink max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
            {intro.content}
          </div>
        </div>
        <div>
          <div className="rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-sm">
            <img
              src={intro.thumbnail || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800'}
              alt={intro.title}
              className="w-full h-full max-h-[420px] object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;

