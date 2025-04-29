'use client'; // Indicate this is a Client Component

import React, { useState, useEffect } from 'react';
import { FiEdit2 } from 'react-icons/fi';

// Helper function for formatting price (optional)
const formatPrice = (price) => {
  // Handle potential null/undefined price
  if (price == null) return 'N/A'; 
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD', // Adjust currency as needed
  }).format(price);
};

// Accept onAddToCart prop
export default function Menu({ onAddToCart }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itemQuantities, setItemQuantities] = useState({});

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/menu');
        if (!response.ok) {
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch(e) {}
          throw new Error(errorMsg);
        }
        const data = await response.json();
        setMenuItems(Array.isArray(data) ? data : []);
        // Initialize quantities to 0 for all items
        const initialQuantities = {};
        data.forEach(item => {
          initialQuantities[item._id] = 0;
        });
        setItemQuantities(initialQuantities);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError(`Error fetching menu: ${err.message || 'Please try again later.'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  const handleQuantityChange = (itemId, change) => {
    setItemQuantities(prev => {
      const newQuantity = Math.max(0, (prev[itemId] || 0) + change);
      return { ...prev, [itemId]: newQuantity };
    });
  };

  const handleAddToCart = (item) => {
    if (itemQuantities[item._id] > 0) {
      onAddToCart({ ...item, quantity: itemQuantities[item._id] });
      setItemQuantities(prev => ({ ...prev, [item._id]: 0 }));
    }
  };

  // --- Render Logic ---
  if (loading) {
    // Added aria-live for screen readers
    return <div role="status" aria-live="polite" aria-label="Loading menu items">Loading menu...</div>;
  }

  if (error) {
    // Added role="alert" for screen readers
    return <div role="alert" style={{ color: 'red' }}>{error}</div>;
  }

  if (menuItems.length === 0) {
    return <div>No menu items currently available.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {menuItems.map((item) => (
        <div key={item._id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
          <div className="p-6">
            <h3 className="text-2xl font-bold mb-3 text-gray-800">{item.name}</h3>
            <p className="text-gray-600 mb-6 text-lg">{item.description}</p>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">{formatPrice(item.price)}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleQuantityChange(item._id, -1)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    aria-label={`Decrease quantity of ${item.name}`}
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-xl font-medium">{itemQuantities[item._id] || 0}</span>
                  <button
                    onClick={() => handleQuantityChange(item._id, 1)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                    aria-label={`Increase quantity of ${item.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleAddToCart(item)}
                  disabled={!itemQuantities[item._id]}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
                  aria-label={`Add ${itemQuantities[item._id]} ${item.name} to order`}
                >
                  Add to Order
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}