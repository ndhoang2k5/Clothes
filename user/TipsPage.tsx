import React, { useEffect } from 'react';
import { navigate } from '../App';
import { blogSectionPath } from './utils/blogCategories';

const TipsPage: React.FC = () => {
  useEffect(() => {
    navigate(blogSectionPath('tram-sac-cua-me'));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-14 text-center">
      <p className="text-gray-500">Đang chuyển tới Trạm sạc của mẹ...</p>
    </div>
  );
};

export default TipsPage;
