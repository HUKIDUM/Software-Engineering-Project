'use client';

import React from 'react';

// Helper function for formatting price (reuse if moved to utils)
const formatPrice = (price) => {
  if (price == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

// Accept cartItems prop and potentially onPlaceOrder later
function Cart({ cartItems = [], onPlaceOrder }) {

  // Calculate total price
  const totalPrice = cartItems.reduce((sum, item) => {
    // Ensure price and quantity are valid numbers before calculation
    const price = typeof item.price === 'number' ? item.price : 0;
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    return sum + price * quantity;
  }, 0);

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="cart-container p-4 border rounded shadow-sm"> {/* Example styling */}
        <h2 className="text-xl font-semibold mb-3">Your Cart</h2>
        <p>Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="cart-container p-4 border rounded shadow-sm"> {/* Example styling */}
      <h2 className="text-xl font-semibold mb-3">Your Cart</h2>
      <ul className="space-y-3 mb-4">
        {cartItems.map((item) => (
          <li key={item._id} className="flex justify-between items-center border-b pb-2">
            <div>
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-600 block">
                Qty: {item.quantity} @ {formatPrice(item.price)} each
              </span>
            </div>
            <span className="font-medium">
              {formatPrice(item.price * item.quantity)} {/* Item subtotal */}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-right font-bold text-lg mb-4">
        Total: {formatPrice(totalPrice)}
      </div>
      {/* Add Place Order button */}
      <button
        onClick={onPlaceOrder} // Add handler later in Step 4
        disabled={!onPlaceOrder || cartItems.length === 0} // Disable if no handler or empty cart
        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        aria-label="Place your order"
      >
        Place Order
      </button>
    </div>
  );
}

export default Cart; 