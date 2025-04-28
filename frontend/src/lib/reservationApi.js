// Get All Reservations (Admin)
export const getAllReservationsAdmin = async (token) => {
  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    // Note the API path: /api/v1/reservations (handled by router.route('/').get(...))
    const response = await fetch('/api/v1/reservations', {
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
           throw new Error(`Failed to fetch all reservations: ${response.status} ${errorMessage}`);
      }
    }

    return await response.json(); // Return the { success, count, data: reservations }
  } catch (error) {
    console.error('Error fetching all reservations (admin):', error);
    throw error;
  }
};

// Add other reservation-related API functions here later if needed 