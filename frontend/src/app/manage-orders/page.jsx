'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllOrdersAdmin, updateOrder } from '@/lib/orderApi';
import { useAuth } from '@/contexts/AuthContext';

function ManageOrdersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [itemQuantities, setItemQuantities] = useState({});

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        const data = await getAllOrdersAdmin(token);
        setOrders(data.data);
        // Initialize quantities with original values
        const initialQuantities = {};
        data.data.forEach(order => {
          order.items.forEach(item => {
            initialQuantities[`${order._id}-${item.menuItem._id}`] = item.quantity;
          });
        });
        setItemQuantities(initialQuantities);
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
      }
    };

    fetchOrders();
  }, [router]);

  const handleQuantityChange = (orderId, itemId, change) => {
    setItemQuantities(prev => {
      const key = `${orderId}-${itemId}`;
      const newQuantity = Math.max(0, (prev[key] || 0) + change);
      return { ...prev, [key]: newQuantity };
    });
  };

  const handleUpdateOrder = async (orderId) => {
    if (!token) return;

    setIsUpdating(true);
    setError(null);

    try {
      const order = orders.find(o => o._id === orderId);
      const updatedItems = order.items.map(item => ({
        menuItem: item.menuItem._id,
        quantity: itemQuantities[`${orderId}-${item.menuItem._id}`]
      }));

      const response = await updateOrder(orderId, { items: updatedItems }, token);
      
      if (response && response.data) {
        setOrders(prev => prev.map(order => 
          order._id === orderId ? response.data : order
        ));
        // Show success message
        alert('Order updated successfully!');
      } else {
        throw new Error('Failed to update order');
      }
    } catch (err) {
      console.error("Error updating order:", err);
      setError(err.message || 'Could not update order. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  if (loading) {
    return <div className="p-4">Loading orders...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Update Order Quantities</h1>
      
      {orders.length === 0 ? (
        <p className="text-gray-600">No orders found.</p>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order._id} className="bg-white shadow-md rounded px-8 pt-6 pb-8">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Order #{order._id}</h2>
                <p className="text-gray-600">Total: {formatPrice(order.totalPrice)}</p>
                <p className="text-sm text-gray-500">
                  Ordered on: {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Menu Items:</h3>
                <ul className="space-y-4">
                  {order.items.map((item, index) => (
                    <li key={index} className="border-b py-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{item.menuItem?.name || 'Item unavailable'}</span>
                          <span className="text-sm text-gray-600 block">
                            Original Quantity: {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(order._id, item.menuItem._id, -1)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                            aria-label={`Decrease quantity of ${item.menuItem.name}`}
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">
                            {itemQuantities[`${order._id}-${item.menuItem._id}`] || item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(order._id, item.menuItem._id, 1)}
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            aria-label={`Increase quantity of ${item.menuItem.name}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleUpdateOrder(order._id)}
                disabled={isUpdating}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isUpdating ? 'Updating...' : 'Update Order'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ManageOrdersPage; 