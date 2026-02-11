
import React, { useState } from 'react';

const ProductManagement: React.FC = () => {
  return (
    <div className="bg-white p-10 rounded-[2rem] border border-gray-100">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black">Danh sách Sản phẩm</h2>
        <button className="bg-pink-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-pink-600">Thêm sản phẩm mới</button>
      </div>
      <div className="text-center py-20 text-gray-400 italic">Tính năng đang được hoàn thiện...</div>
    </div>
  );
};
export default ProductManagement;
