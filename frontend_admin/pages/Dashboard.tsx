
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order, Product } from '../types';

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.getOrders().then(setOrders);
  }, []);

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
          <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2">Đơn hàng mới</p>
          <h3 className="text-4xl font-black text-gray-800">{orders.length}</h3>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 font-black text-xl">Đơn hàng gần đây</div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-xs font-bold uppercase text-gray-400">
              <th className="px-8 py-4">Mã đơn</th>
              <th className="px-8 py-4">Khách hàng</th>
              <th className="px-8 py-4">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-8 py-4 font-bold">{o.id}</td>
                <td className="px-8 py-4">{o.customerName}</td>
                <td className="px-8 py-4"><span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-600 text-[10px] font-black">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default Dashboard;
