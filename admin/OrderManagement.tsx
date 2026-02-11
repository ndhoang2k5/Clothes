
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Order } from '../types';

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const data = await api.getOrders();
    setOrders(data);
    setLoading(false);
  };

  const handleStatusChange = async (id: string, status: Order['status']) => {
    await api.updateOrderStatus(id, status);
    fetchOrders();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black text-gray-800">Quản lý Đơn hàng</h2>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">Lọc theo ngày</button>
           <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">Xuất Excel</button>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-[2rem] p-8 hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-4">
                  <span className="text-xl font-black text-gray-800">{order.id}</span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Khách hàng</p>
                    <p className="font-bold text-gray-800">{order.customerName}</p>
                    <p className="text-sm text-gray-500">{order.phone}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Địa chỉ</p>
                    <p className="text-sm text-gray-600">{order.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Tổng tiền</p>
                    <p className="text-xl font-black text-pink-500">{order.total.toLocaleString()}đ</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 min-w-[150px]">
                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Cập nhật trạng thái</p>
                <select 
                  className="bg-gray-50 border-none rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-pink-500"
                  value={order.status}
                  onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                >
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang chuẩn bị</option>
                  <option value="shipped">Đang giao</option>
                  <option value="delivered">Đã giao</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
                <button className="mt-2 text-pink-500 font-bold text-sm hover:underline">Xem chi tiết items</button>
              </div>
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div className="py-20 text-center text-gray-400 italic">Chưa có đơn hàng nào.</div>
        )}
      </div>
    </div>
  );
};

export default OrderManagement;
