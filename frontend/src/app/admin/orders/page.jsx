// frontend/src/app/admin/orders/page.jsx

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { getAllOrdersAdmin, updateOrder, deleteOrder } from '@/lib/orderApi';
import { FiTrash2 } from 'react-icons/fi';

// Helper to format price
const formatPrice = price =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);

export default function AdminOrdersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch orders on mount
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (token) {
      (async () => {
        setLoading(true);
        try {
          const res = await getAllOrdersAdmin(token);
          if (res.success && Array.isArray(res.data)) {
            setOrders(res.data);
          } else {
            throw new Error(res.error || 'Invalid data');
          }
        } catch (err) {
          console.error(err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [user, token, authLoading, router]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (user?.role !== 'admin' || !token) return;
    const socket = io('http://localhost:5003', { withCredentials: true });

    socket.on('new_order', newOrder =>
      setOrders(prev => [newOrder, ...prev])
    );
    socket.on('order_updated', updated =>
      setOrders(prev => prev.map(o => (o._id === updated._id ? updated : o)))
    );
    socket.on('order_deleted', id =>
      setOrders(prev => prev.filter(o => o._id !== id))
    );

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  // Change order status
  const handleChangeStatus = async (orderId, newStatus) => {
    try {
      const res = await updateOrder(orderId, { status: newStatus }, token);
      if (res.success) {
        setOrders(prev =>
          prev.map(o => (o._id === orderId ? res.data : o))
        );
      } else {
        throw new Error(res.error || 'Status update failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Delete order
  const handleDeleteOrder = async orderId => {
    if (!confirm('Delete this order?')) return;
    try {
      await deleteOrder(orderId, token);
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // Filter orders by status
  const displayedOrders = orders.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  if (authLoading || loading) {
    return <div className="p-4 text-center">Loading orders...</div>;
  }

  if (!user || user.role !== 'admin') {
    return <div className="p-4 text-center text-red-600">Access Denied</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Admin - All Food Orders</h1>

      {/* Filter Dropdown */}
      <div className="mb-4">
        <label htmlFor="statusFilter" className="mr-2 font-medium">
          Filter:
        </label>
        <select
          id="statusFilter"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="done">Done</option>
        </select>
      </div>

      {displayedOrders.length === 0 ? (
        <p>No orders found for selected status.</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Ordered At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedOrders.map(order => (
                <tr key={order._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order._id.slice(-6)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.user?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.items.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatPrice(order.totalPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(order.createdAt).toLocaleString()}
                  </td>

                  {/* STATUS BADGE */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
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
                  </td>

                  {/* ACTIONS */}
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() =>
                          handleChangeStatus(order._id, 'preparing')
                        }
                        className="px-3 py-1 bg-yellow-500 text-white rounded"
                      >
                        Preparing
                      </button>
                    )}
                    {order.status === 'preparing' && (
                      <button
                        onClick={() =>
                          handleChangeStatus(order._id, 'done')
                        }
                        className="px-3 py-1 bg-green-500 text-white rounded"
                      >
                        Done
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteOrder(order._id)}
                      className="px-3 py-1 bg-red-500 text-white rounded"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
