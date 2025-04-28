'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getOrderById } from '@/lib/orderApi'; // Adjust path as needed
import { useAuth } from '@/contexts/AuthContext'; // Adjust path as needed

function OrderStatusPage() {
  const params = useParams(); // Get the whole params object
  const orderId = params?.orderId; // Extract orderId safely
  console.log(`>>> OrderStatusPage rendered. Params:`, params);
  console.log(`>>> Extracted orderId: ${orderId}`); // <-- ADD LOG
  const { token } = useAuth(); // Assuming useAuth provides the token
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId || !token) {
        // Don't fetch if orderId or token is missing
        // You might want to handle this case more robustly
        setLoading(false);
        if (!orderId) setError('Order ID not found.');
        // If no token, you might redirect to login or show an auth error
        // For now, we assume token exists if useAuth() doesn't throw
        return;
    }

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getOrderById(orderId, token);
        console.log('>>> Received order data from API:', response); // Log the full response
        // Set the nested data object into the order state
        if (response && response.data) {
          setOrder(response.data);
        } else {
            // Handle case where response doesn't have the expected .data structure
            console.error('Unexpected data structure received:', response);
            throw new Error('Received invalid order data structure from server.');
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]); // Re-fetch if orderId or token changes

  if (loading) {
    return <div className="p-4">Loading order details...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error fetching order: {error}</div>;
  }

  if (!order) {
    return <div className="p-4">Order not found or could not be loaded.</div>;
  }

  // Basic formatting for currency
  const formatPrice = (price) => {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Order Status: {order._id}</h1>

      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <p><strong>Status:</strong> <span className="capitalize">{order.status}</span></p>
        </div>
        <div className="mb-4">
          <p><strong>Total Price:</strong> {formatPrice(order.totalPrice)}</p>
        </div>
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Items:</h2>
          <ul>
            {order.items.map((item, index) => (
              <li key={index} className="border-b py-2">
                {item.menuItem?.name || 'Item unavailable'} x {item.quantity}
              </li>
            ))}
          </ul>
        </div>
         <div className="text-sm text-gray-600">
            Ordered on: {new Date(order.createdAt).toLocaleString()}
         </div>
      </div>
    </div>
  );
}

export default OrderStatusPage; 