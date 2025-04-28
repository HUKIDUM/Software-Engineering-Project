'use client'; // Menu likely fetches data client-side

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Menu from '@/components/Menu/Menu';
import Cart from '@/components/Cart/Cart';
import { placeOrder } from '@/lib/orderApi';
import { useAuth } from '@/contexts/AuthContext';

export default function MenuPage() {
  const [cartItems, setCartItems] = useState([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const router = useRouter();
  const { token } = useAuth();

  const handleAddItem = (item) => {
      setCartItems(prevItems => {
          const existingItem = prevItems.find(i => i._id === item._id);
          if (existingItem) {
              return prevItems.map(i => 
                  i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
              );
          } else {
              return [...prevItems, { ...item, quantity: 1 }];
          }
      });
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

    const orderPayloadItems = cartItems.map(item => ({
        menuItem: item._id,
        quantity: item.quantity
    }));

    try {
      const placedOrderResponse = await placeOrder(orderPayloadItems, token);
      console.log('Order placed response:', placedOrderResponse);
      setCartItems([]);

      if (placedOrderResponse && placedOrderResponse.data && placedOrderResponse.data._id) {
          const redirectUrl = `/orders/${placedOrderResponse.data._id}`;
          console.log(`>>> Redirecting to: ${redirectUrl}`);
          router.push(redirectUrl);
      } else {
          console.error('Order placed, but response format is unexpected:', placedOrderResponse);
          setOrderError('Order placed, but could not retrieve order details for redirection.');
      }
    } catch (err) {
      console.error("Failed to place order:", err);
      setOrderError(err.message || 'Could not place order. Please try again.');
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
        <Cart cartItems={cartItems} onPlaceOrder={handlePlaceOrder} />
        {isPlacingOrder && <p className="text-center mt-2">Placing order...</p>}
        {orderError && <p className="text-red-500 text-center mt-2">{orderError}</p>}
      </div>
    </div>
  );
} 