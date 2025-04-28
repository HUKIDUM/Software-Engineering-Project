'use client'; // Indicate this is a Client Component

import React, { useState, useEffect } from 'react';

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
function Menu({ onAddToCart }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true);
      setError(null); // Clear previous errors
      try {
        const response = await fetch('/api/v1/menu'); // Fetch from backend endpoint

        if (!response.ok) {
          // Handle HTTP errors like 4xx, 5xx
          let errorMsg = `HTTP error! status: ${response.status}`;
          try {
             const errorData = await response.json();
             errorMsg = errorData.error || errorData.message || errorMsg;
          } catch(e) { /* Ignore if response body isn't json */ }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setMenuItems(Array.isArray(data) ? data : []); // Ensure data is an array
      } catch (err) {
        console.error("Error fetching menu:", err);
        // Set a user-friendly error message
        setError(`Error fetching menu: ${err.message || 'Please try again later.'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []); // Empty dependency array means this runs once on mount

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
    <div className="menu-container"> {/* Added a class for potential styling */}
      <h2 className="text-2xl font-bold mb-4">Menu</h2> {/* Example Tailwind class */}
      <ul className="space-y-4"> {/* Example Tailwind class */}
        {menuItems.map((item) => (
          <li key={item._id} className="border-b pb-4"> {/* Example Tailwind class */}
            <h3 className="text-xl font-semibold">{item.name}</h3>
            {item.description && <p className="text-gray-600 italic">{item.description}</p>} {/* Conditional description */}
            <p><span className="font-medium">Category:</span> {item.category}</p>
            <p><span className="font-medium">Price:</span> {formatPrice(item.price)}</p>
            {/* Add the button and onClick handler */}
            <button 
              onClick={() => onAddToCart ? onAddToCart(item) : console.warn('onAddToCart prop not provided to Menu component')} 
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              // Optional: Add disabled state if needed
              // disabled={!onAddToCart} 
              aria-label={`Add ${item.name} to order`} // Accessible name for the button
            >
              Add to Order
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Menu; 