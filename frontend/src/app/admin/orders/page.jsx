'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client'; // Import socket.io client
import { useAuth } from '@/contexts/AuthContext';
import { getAllOrdersAdmin } from '@/lib/orderApi';

// Helper to format price (consider moving to utils)
const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

function AdminOrdersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Wait for auth state to load
    if (authLoading) {
      return; 
    }

    // Redirect if not logged in or not an admin
    if (!user || user.role !== 'admin') {
      router.push('/'); // Or to a login page / unauthorized page
      return;
    }

    // Fetch orders if user is admin
    if (token) {
      const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await getAllOrdersAdmin(token);
          if (response.success && Array.isArray(response.data)) {
            setOrders(response.data);
          } else {
            throw new Error(response.error || 'Failed to fetch orders or invalid data format');
          }
        } catch (err) {
          console.error("Error fetching all orders:", err);
          setError(err.message || 'Could not fetch orders.');
        } finally {
          setLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user, token, authLoading, router]);

  // Effect for Socket.IO connection and real-time updates
  useEffect(() => {
    // Only establish connection if user is an admin
    if (user?.role !== 'admin' || !token) {
      return; // Don't connect if not admin or no token
    }

    // Connect to the Socket.IO server
    // IMPORTANT: Use the correct URL for your backend
    const socket = io('http://localhost:5003', {
       withCredentials: true // Important if your backend CORS requires it
    });

    socket.on('connect', () => {
      console.log('Socket connected to server:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      // Optionally update UI state to show connection error
    });

    // Listen for new orders emitted from the backend
    socket.on('new_order', (newOrder) => {
      console.log('Received new order via socket:', newOrder);
      // Add the new order to the beginning of the list
      // Ensure data format matches initial fetch if needed
      // Consider adding population on backend emission if needed here
      setOrders((prevOrders) => [newOrder, ...prevOrders]);
    });

    // Cleanup function: Disconnect socket when component unmounts
    return () => {
      console.log('Disconnecting socket...');
      socket.disconnect();
    };

  }, [user, token]); // Re-run effect if user or token changes

  if (authLoading || loading) {
    return <div className="p-4 text-center">Loading orders...</div>;
  }

  // This check might be redundant due to redirect, but good practice
  if (!user || user.role !== 'admin') {
    return <div className="p-4 text-center text-red-600">Access Denied.</div>; 
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin - All Food Orders</h1>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th> */}
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" title={order._id}>{order._id.slice(-6)}...</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.user?.name || 'N/A'} ({order.user?.email || 'N/A'})</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <ul>
                      {order.items.map((item, index) => (
                        <li key={index}>{item.menuItem?.name || 'Unknown Item'} x {item.quantity}</li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatPrice(order.totalPrice)}</td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{order.status}</td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminOrdersPage; 