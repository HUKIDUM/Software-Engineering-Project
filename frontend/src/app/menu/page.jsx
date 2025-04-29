'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Menu from '@/components/Menu/Menu';
import Cart from '@/components/Cart/Cart';
import { placeOrder } from '@/lib/orderApi';
import { useAuth } from '@/contexts/AuthContext';

export default function MenuPage() {
  const [cartItems, setCartItems] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const router = useRouter();
  const { token, user } = useAuth();

  const handleAddItem = (item) => {
    setCartItems(prevItems => {
      const existing = prevItems.find(i => i._id === item._id);
      if (existing) {
        return prevItems.map(i =>
          i._id === item._id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prevItems, item];
    });
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(prev => prev.filter(i => i._id !== itemId));
  };

  const handlePlaceOrder = async () => {
    if (!token) {
      setOrderError("You must be logged in to place an order.");
      return;
    }
    if (cartItems.length === 0) {
      setOrderError("Your cart is empty.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    const payload = cartItems.map(i => ({ menuItem: i._id, quantity: i.quantity }));

    try {
      const res = await placeOrder(payload, token);
      setCartItems([]);
      const orderId = res?.data?._id;
      if (orderId) {
        router.push(`/orders/${orderId}`);
      } else {
        setOrderError('Order placed, but cannot redirect.');
      }
    } catch (err) {
      setOrderError(err.message || 'Failed to place order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-8">
      <div className="flex-grow">
        <h1 className="text-3xl font-bold mb-6">Food & Drink Menu</h1>
        <Menu onAddToCart={handleAddItem} />
      </div>

      <div className="md:w-1/3 lg:w-1/4">
        <Cart
          cartItems={cartItems}
          onPlaceOrder={handlePlaceOrder}
          onRemoveItem={handleRemoveItem}
        />
        {isPlacingOrder && <p className="text-center mt-2">Placing order...</p>}
        {orderError  && <p className="text-red-500 text-center mt-2">{orderError}</p>}

        {user && (
          <Link
            href="/order-history"
            className="mt-4 block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Order History
          </Link>
        )}
      </div>
    </div>
  );
}
