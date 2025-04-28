export const placeOrder = async (items, token) => {
  try {
    const response = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }), // Send only items, backend calculates total
    });

    if (!response.ok) {
      // Attempt to parse error response, otherwise use status text
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        // Ignore if response body is not JSON
      }
      const errorMessage = errorBody?.message || response.statusText;
      throw new Error(`Failed to place order: ${response.status} ${errorMessage}`);
    }

    return await response.json(); // Return the created order data
  } catch (error) {
    // Re-throw network errors or errors from the !response.ok block
    console.error("Error placing order:", error);
    throw error; 
  }
};

// Get Order By ID
export const getOrderById = async (orderId, token) => {
  if (!orderId) {
    throw new Error('Order ID is required');
  }
  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await fetch(`/api/v1/orders/${orderId}`, { // Use correct backend API path
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) { /* Ignore */ }
      const errorMessage = errorBody?.message || response.statusText;
      // Distinguish between 404 Not Found and other errors
      if (response.status === 404) {
        throw new Error(`Order not found: ${orderId}`);
      } else {
        throw new Error(`Failed to fetch order ${orderId}: ${response.status} ${errorMessage}`);
      }
    }

    return await response.json(); // Return the order data
  } catch (error) {
    console.error(`Error fetching order ${orderId}:`, error);
    throw error; // Re-throw the error for the component to handle
  }
};

// Get All Orders (Admin)
export const getAllOrdersAdmin = async (token) => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    const response = await fetch('/api/v1/orders/admin/all', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) { /* Ignore */ }
      const errorMessage = errorBody?.message || response.statusText;
      // Handle specific auth/forbidden errors
      if (response.status === 401 || response.status === 403) {
           throw new Error(`Unauthorized: ${errorMessage}`);
      } else {
           throw new Error(`Failed to fetch all orders: ${response.status} ${errorMessage}`);
      }
    }

    return await response.json(); // Return the { success, count, data: orders }
  } catch (error) {
    console.error('Error fetching all orders (admin):', error);
    throw error;
  }
}; 