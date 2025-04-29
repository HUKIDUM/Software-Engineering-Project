// frontend/src/app/order-history/page.jsx

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserOrders } from '@/lib/orderApi';

export default function OrderHistoryPage() {
  const { token } = useAuth();
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState('all');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserOrders(token);
        if (res.success) setOrders(res.data);
        else throw new Error(res.error || 'Could not load orders');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="p-6 text-center">Loading order history...</div>;
  if (error)   return <div className="p-6 text-center text-red-600">Error: {error}</div>;

  // If user has never placed any order
  if (orders.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Your Order History</h1>
        <p className="text-center text-gray-600">No orders have been placed yet.</p>
      </div>
    );
  }

  // Apply filters
  const displayed = orders.filter(order => {
    if (filterStatus !== 'all' && order.status !== filterStatus) {
      return false;
    }
    const created = new Date(order.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      if (created < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      if (created >= end) return false;
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Your Order History</h1>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-start md:items-end gap-4 mb-6">
        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-1"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            From
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            To
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="mt-1 block w-full border rounded px-2 py-1"
          />
        </div>
      </div>

      {/* No orders match filters */}
      {displayed.length === 0 ? (
        <p className="text-center text-gray-600">No orders match the selected filters.</p>
      ) : (
        <ul className="space-y-4">
          {displayed.map(order => (
            <li key={order._id}>
              <Link
                href={`/orders/${order._id}`}
                className="block p-4 border rounded-lg hover:shadow transition-shadow duration-200"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">Order #{order._id.slice(-6)}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 text-sm flex items-center">
                  <span>Status:</span>
                  <span
                    className={`ml-2 inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                      order.status === 'pending'
                        ? 'bg-red-100 text-red-800'
                        : order.status === 'preparing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'done'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
