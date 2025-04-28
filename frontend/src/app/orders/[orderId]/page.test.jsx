'use client' // Mark test setup as client component context if needed

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import OrderStatusPage from './page'; // This import will fail initially
import { getOrderById } from '@/lib/orderApi'; // Adjust path as needed
import { useParams } from 'next/navigation'; // Mock this

// Mock dependencies
jest.mock('@/lib/orderApi');
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}));

// Mock Auth Context (assuming it provides the token)
jest.mock('@/contexts/AuthContext', () => ({ // Adjust path as needed
  useAuth: () => ({ token: 'mock-test-token' }),
}));


describe('OrderStatusPage', () => {
  const mockOrderId = 'order123';
  const mockOrderData = {
    _id: mockOrderId,
    items: [
      { menuItem: { _id: 'item1', name: 'Coffee', price: 3.5 }, quantity: 2 },
      { menuItem: { _id: 'item2', name: 'Muffin', price: 2.5 }, quantity: 1 },
    ],
    totalPrice: 9.5,
    status: 'confirmed',
    estimatedPreparationTime: 15, // minutes
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Setup mock useParams return value
    useParams.mockReturnValue({ orderId: mockOrderId });
    // Default mock for successful API call
    getOrderById.mockResolvedValue(mockOrderData);
  });

  it('should display loading state initially', () => {
    render(<OrderStatusPage />);
    expect(screen.getByText(/loading order details/i)).toBeInTheDocument();
  });

  it('should call getOrderById with correct orderId and token', async () => {
    render(<OrderStatusPage />);
    await waitFor(() => {
      expect(getOrderById).toHaveBeenCalledWith(mockOrderId, 'mock-test-token');
    });
  });

  it('should display order details on successful fetch', async () => {
    render(<OrderStatusPage />);

    // Wait for loading to disappear and data to appear
    await waitFor(() => {
        expect(screen.queryByText(/loading order details/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(`Order Status: ${mockOrderId}`)).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
    expect(screen.getByText('$9.50')).toBeInTheDocument();
    expect(screen.getByText('15 minutes')).toBeInTheDocument();
    expect(screen.getByText(/Coffee x 2/i)).toBeInTheDocument();
    expect(screen.getByText(/Muffin x 1/i)).toBeInTheDocument();
  });

  it('should display error message on fetch failure', async () => {
    const errorMessage = 'Failed to fetch order';
    getOrderById.mockRejectedValueOnce(new Error(errorMessage));

    render(<OrderStatusPage />);

    await waitFor(() => {
      expect(screen.queryByText(/loading order details/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(`Error fetching order: ${errorMessage}`)).toBeInTheDocument();
  });

   it('should display a message if estimated time is not available', async () => {
    const orderWithoutEstTime = { ...mockOrderData, estimatedPreparationTime: undefined };
    getOrderById.mockResolvedValue(orderWithoutEstTime);

    render(<OrderStatusPage />);
     await waitFor(() => {
        expect(screen.queryByText(/loading order details/i)).not.toBeInTheDocument();
    });
     expect(screen.getByText('N/A')).toBeInTheDocument();
  });

}); 