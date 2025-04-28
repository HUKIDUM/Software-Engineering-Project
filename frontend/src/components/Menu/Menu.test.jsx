import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Use standard import - let Jest handle module resolution/errors
import Menu from '@/components/Menu/Menu';

// Mock the global fetch function
global.fetch = jest.fn();

// Helper to mock fetch responses
const mockFetch = (status, data) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status: status,
    json: async () => data,
  });
};

// Helper to mock fetch rejection
const mockFetchReject = (error = new Error('Fetch failed')) => {
    global.fetch.mockRejectedValueOnce(error);
};

describe('Menu Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    global.fetch.mockClear();
  });

  describe('Menu Component Functional Tests', () => {
        it('attempts to fetch menu items on mount', async () => {
            mockFetch(200, []); // Mock a successful empty response
            render(<Menu />);
            // Expect fetch to have been called with the correct URL
            await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
            expect(global.fetch).toHaveBeenCalledWith('/api/v1/menu');
        });

        it('displays a loading indicator initially', () => {
            // Mock fetch so it doesn't resolve instantly
            global.fetch.mockImplementation(() => new Promise(() => {}));
            render(<Menu />);
            expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument(); // Use role for better accessibility
        });

        it('displays menu items on successful fetch', async () => {
            const mockItems = [
            { _id: '1', name: 'Espresso', description: 'Strong coffee', price: 3.00, category: 'Drink' },
            { _id: '2', name: 'Croissant', description: 'Flaky pastry', price: 2.50, category: 'Food' },
            ];
            mockFetch(200, mockItems);
            render(<Menu />);

            // Wait for items to appear
            expect(await screen.findByText('Espresso')).toBeInTheDocument();
            expect(screen.getByText('Croissant')).toBeInTheDocument();
            // Check for formatted price (adjust selector as needed)
            expect(screen.getByText(('$3.00'))).toBeInTheDocument();
            expect(screen.getByText(('$2.50'))).toBeInTheDocument();
            // Loading indicator should be gone
            expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
        });

        it('displays an error message on fetch failure (network error)', async () => {
            mockFetchReject(); // Mock a network error
            render(<Menu />);
            // Wait for error message
            expect(await screen.findByText(/error fetching menu/i)).toBeInTheDocument();
            expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
        });

         it('displays an error message on fetch failure (server error)', async () => {
            mockFetch(500, { error: 'Internal Server Error' }); // Mock a server error response
            render(<Menu />);
            // Wait for error message
            expect(await screen.findByText(/error fetching menu/i)).toBeInTheDocument();
            expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
        });
    });

  // --- Add to Order Tests (Step 2) ---
  describe('Add to Order Functionality', () => {
    // Mock userEvent setup
    let user;
    beforeEach(() => {
        user = userEvent.setup();
        // Need to re-mock fetch for these tests too
        global.fetch.mockClear();
    });

    it('calls onAddToCart prop with item ID when "Add to Order" button is clicked', async () => {
      // Mock successful fetch with items
      const mockItems = [
        { _id: 'item-1', name: 'Coffee', price: 3.50, category: 'Drink' },
        { _id: 'item-2', name: 'Muffin', price: 2.75, category: 'Food' },
      ];
      mockFetch(200, mockItems);

      // Create a mock callback function
      const handleAddToCart = jest.fn();

      // Render the component with the mock callback
      render(<Menu onAddToCart={handleAddToCart} />);

      // Wait for items to render and find the button for the first item
      const addButton = await screen.findByRole('button', { name: /add coffee to order/i });

      // Simulate user click
      await user.click(addButton);

      // Assert the callback was called correctly
      expect(handleAddToCart).toHaveBeenCalledTimes(1);
      expect(handleAddToCart).toHaveBeenCalledWith('item-1'); // Expecting item ID
    });

     // Add more tests here if needed, e.g., for quantity adjustment
  });

}); 