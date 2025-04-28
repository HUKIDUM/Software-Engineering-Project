import { placeOrder, getOrderById } from './orderApi'; // Import both functions

// Mock the global fetch function
global.fetch = require('jest-fetch-mock');

describe('orderApi', () => {
  beforeEach(() => {
    fetch.resetMocks(); // Reset mocks before each test
  });

  describe('placeOrder', () => {
    const mockItems = [
      { menuItem: 'item1_id', quantity: 2 },
      { menuItem: 'item2_id', quantity: 1 },
    ];
    const mockToken = 'mock-auth-token';
    const mockOrderResponse = {
      _id: 'order123',
      user: 'user123',
      items: mockItems,
      totalPrice: 55.5, // Assuming backend calculates and returns this
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    it('should call POST /api/orders with correct parameters and token', async () => {
      fetch.mockResponseOnce(JSON.stringify(mockOrderResponse));

      await placeOrder(mockItems, mockToken);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockToken}`,
        },
        body: JSON.stringify({ items: mockItems }), // Assuming only items are sent
      });
    });

    it('should return the created order on success', async () => {
      fetch.mockResponseOnce(JSON.stringify(mockOrderResponse));

      const result = await placeOrder(mockItems, mockToken);

      expect(result).toEqual(mockOrderResponse);
    });

    it('should throw an error if the API call fails (non-2xx response)', async () => {
      fetch.mockResponseOnce(JSON.stringify({ message: 'Invalid order data' }), {
        status: 400,
        headers: { 'content-type': 'application/json' },
      });

      await expect(placeOrder(mockItems, mockToken)).rejects.toThrow(
        'Failed to place order: 400' // Or a more specific error message if parsed
      );
    });

    it('should throw an error if the network request fails', async () => {
      const networkError = new Error('Network failed');
      fetch.mockRejectOnce(networkError);

      await expect(placeOrder(mockItems, mockToken)).rejects.toThrow(
        networkError
      );
    });
  });

  describe('getOrderById', () => {
    const mockOrderId = 'order789';
    const mockToken = 'mock-auth-token-get';
    const mockOrderData = {
      _id: mockOrderId,
      items: [{ menuItem: 'item1', quantity: 1 }],
      totalPrice: 10.0,
      status: 'confirmed',
      // ... other fields
    };

    it('should call GET /api/v1/orders/:orderId with token', async () => {
      fetch.mockResponseOnce(JSON.stringify(mockOrderData));
      await getOrderById(mockOrderId, mockToken);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`/api/v1/orders/${mockOrderId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
    });

    it('should return order data on success', async () => {
      fetch.mockResponseOnce(JSON.stringify(mockOrderData));
      const result = await getOrderById(mockOrderId, mockToken);
      expect(result).toEqual(mockOrderData);
    });

    it('should throw "Order not found" error on 404 response', async () => {
      fetch.mockResponseOnce(JSON.stringify({ message: 'Not Found' }), { status: 404 });

      await expect(getOrderById(mockOrderId, mockToken)).rejects.toThrow(
        `Order not found: ${mockOrderId}`
      );
    });

    it('should throw generic error on other non-2xx responses', async () => {
      fetch.mockResponseOnce(JSON.stringify({ message: 'Server Error' }), { status: 500 });

      await expect(getOrderById(mockOrderId, mockToken)).rejects.toThrow(
        `Failed to fetch order ${mockOrderId}: 500 Internal Server Error`
      );
    });

    it('should throw error if orderId is missing', async () => {
      await expect(getOrderById(null, mockToken)).rejects.toThrow('Order ID is required');
    });

    it('should throw error if token is missing', async () => {
      await expect(getOrderById(mockOrderId, null)).rejects.toThrow('Authentication token is required');
    });

    it('should re-throw network errors', async () => {
      const networkError = new Error('Network connection failed');
      fetch.mockRejectOnce(networkError);

      await expect(getOrderById(mockOrderId, mockToken)).rejects.toThrow(networkError);
    });
  });
}); 