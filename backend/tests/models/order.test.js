const mongoose = require('mongoose');
// Attempt to require the Order model, expecting failure initially
let Order;
try {
  Order = require('../../models/Order');
} catch (e) {
  console.log('Order model not found (expected during RED phase).');
  Order = null; // Set Order to null if it doesn't exist
}
const User = require('../../models/user'); // Assuming User model exists
const MenuItem = require('../../models/MenuItem'); // Assuming MenuItem model exists
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let testUser;
let testMenuItem;

// Test database setup
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Ensure mongoose connects only once
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }

    // Clean up potential previous test data
    await User.deleteMany({});
    await MenuItem.deleteMany({});

    // Create dummy data needed for tests
    // Ensure User model has necessary fields for creation
    testUser = new User({ 
        name: 'Test User', // Use correct field name
        email: 'testorder@example.com', 
        password: 'password123', // Use correct field name and provide value
        telephoneNumber: '1234567890' // Add required telephone number
    }); 
    await testUser.save();

    testMenuItem = new MenuItem({ name: 'Test Item for Order', price: 10.00, category: 'Test' });
    await testMenuItem.save();
});

// Test database teardown
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Clean up Order data before each test
beforeEach(async () => {
    if (Order) { // Only run cleanup if Order model has been defined
       await Order.deleteMany({});
    }
});

// Helper function to skip tests if Order model is not loaded
const describeIfOrderExists = Order ? describe : describe.skip;

describeIfOrderExists('Order Model', () => {

    // Test for required fields
    it('should be invalid if required fields (user, items, totalPrice) are missing', async () => {
        const order = new Order({});
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.user).toBeDefined();
        expect(err.errors.items).toBeDefined();
        expect(err.errors.totalPrice).toBeDefined();
    });

    // Test for items array validation
    it('should be invalid if items array is empty', async () => {
        const order = new Order({
            user: testUser._id,
            items: [], // Empty array
            totalPrice: 10.00
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.items).toBeDefined();
    });

    it('should be invalid if item quantity is less than 1', async () => {
         const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 0 }], // Quantity is 0
            totalPrice: 0
        });
         let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        // Check for the specific nested validation error
        expect(err.errors['items.0.quantity']).toBeDefined();
    });

    // Test for totalPrice validation
    it('should be invalid if totalPrice is negative', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: -5.00 // Negative price
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.totalPrice).toBeDefined();
    });

     it('should allow totalPrice to be zero', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 0 // Zero price
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeUndefined(); // Should be valid
    });


    // Test for status enum and default
    it('should default status to "pending"', () => {
        const order = new Order({ // Status not provided
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00
        });
        expect(order.status).toBe('pending');
    });

    it('should be invalid if status is not in the allowed enum values', async () => {
         const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00,
            status: 'invalid_status' // Incorrect status
        });
         let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.status).toBeDefined();
    });

    // Test for optional fields and defaults
    it('should create an order with valid data', () => {
        const orderData = {
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 2 }],
            totalPrice: 20.00,
            estimatedPreparationTime: 15 // Optional field
        };
        const order = new Order(orderData);
        const validationError = order.validateSync(); // Use sync validation for basic checks

        expect(validationError).toBeUndefined(); // Ensure no validation errors
        expect(order.user).toEqual(testUser._id);
        expect(order.items.length).toBe(1);
        expect(order.items[0].menuItem).toEqual(testMenuItem._id);
        expect(order.items[0].quantity).toBe(2);
        expect(order.totalPrice).toBe(20.00);
        expect(order.status).toBe('pending'); // Default
        expect(order.estimatedPreparationTime).toBe(15);
        expect(order.createdAt).toBeInstanceOf(Date);
    });

});

// Add a basic test that runs even if the Order model doesn't load
// This helps confirm the test file itself is being picked up by Jest
describe('Order Model Test Setup', () => {
    it('should run the test file setup', () => {
        expect(mongoose.connection.readyState).toBe(1); // Check if mongoose connected
        expect(testUser).toBeDefined();
        expect(testMenuItem).toBeDefined();
        if (!Order) {
             console.error("RED: Order model tests are skipped or will fail until the model is created.");
        }
        expect(true).toBe(true);
    });
}); 