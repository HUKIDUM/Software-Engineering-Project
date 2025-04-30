const mongoose = require('mongoose');
const Order = require('../../models/Order');
const User = require('../../models/user');
const MenuItem = require('../../models/MenuItem');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;
let testUser;
let testMenuItem;
let testOrderIds = [];

// Test database setup
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    // Ensure mongoose connects only once
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }

    // Look for existing test user first instead of deleting all users
    testUser = await User.findOne({ email: 'testorder@example.com' });
    if (!testUser) {
        // Create test user only if it doesn't exist
        testUser = new User({ 
            name: 'Test User',
            email: 'testorder@example.com', 
            password: 'password123',
            telephoneNumber: '1234567890'
        });
        await testUser.save();
    }

    // Create test menu item
    testMenuItem = await MenuItem.findOne({ name: 'Test Item for Order' });
    if (!testMenuItem) {
        testMenuItem = new MenuItem({ 
            name: 'Test Item for Order', 
            price: 10.00, 
            category: 'Test' 
        });
        await testMenuItem.save();
    }
});

// Test database teardown
afterAll(async () => {
    // Clean up only test orders
    if (testOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: testOrderIds } });
    }
    
    // DON'T delete the test user or menu item as they might be used by other tests
    
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Clean up Order data before each test (only test orders)
beforeEach(async () => {
    if (testOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: testOrderIds } });
        testOrderIds = [];
    }
});

describe('Order Model', () => {
    // Test for successful order creation
    it('should create an order with valid data', async () => {
        const orderData = {
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 2 }],
            totalPrice: 20.00
        };
        const order = new Order(orderData);
        await order.save();
        testOrderIds.push(order._id);

        const savedOrder = await Order.findOne({ _id: order._id });
        expect(savedOrder).toBeTruthy();
        expect(savedOrder.user).toEqual(testUser._id);
        expect(savedOrder.items.length).toBe(1);
        expect(savedOrder.items[0].menuItem).toEqual(testMenuItem._id);
        expect(savedOrder.items[0].quantity).toBe(2);
        expect(savedOrder.totalPrice).toBe(20.00);
        expect(savedOrder.status).toBe('pending'); // Default status
        expect(savedOrder.createdAt).toBeInstanceOf(Date);
    });

    // Test for order with multiple items
    it('should create an order with multiple items', async () => {
        // Check if second test item already exists
        let menuItem2 = await MenuItem.findOne({ name: 'Second Test Item' });
        if (!menuItem2) {
            menuItem2 = new MenuItem({ name: 'Second Test Item', price: 5.00, category: 'Test' });
            await menuItem2.save();
        }

        const orderData = {
            user: testUser._id,
            items: [
                { menuItem: testMenuItem._id, quantity: 1 },
                { menuItem: menuItem2._id, quantity: 3 }
            ],
            totalPrice: 25.00
        };
        const order = new Order(orderData);
        await order.save();
        testOrderIds.push(order._id);

        const savedOrder = await Order.findOne({ _id: order._id });
        expect(savedOrder).toBeTruthy();
        expect(savedOrder.items.length).toBe(2);
        expect(savedOrder.items[0].menuItem).toEqual(testMenuItem._id);
        expect(savedOrder.items[0].quantity).toBe(1);
        expect(savedOrder.items[1].menuItem).toEqual(menuItem2._id);
        expect(savedOrder.items[1].quantity).toBe(3);
        expect(savedOrder.totalPrice).toBe(25.00);
    });

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

    // Test for user validation
    it('should be invalid if user is missing', async () => {
        const order = new Order({
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.user).toBeDefined();
    });

    // Test for items validation
    it('should be invalid if items are missing', async () => {
        const order = new Order({
            user: testUser._id,
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

    // Test for totalPrice validation
    it('should be invalid if totalPrice is missing', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }]
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

    // Test for menuItem validation in items
    it('should be invalid if menuItem is missing in an order item', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ quantity: 2 }], // MenuItem missing
            totalPrice: 20.00
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors['items.0.menuItem']).toBeDefined();
    });

    // Test for quantity validation in items
    it('should be invalid if quantity is missing in an order item', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id }], // Quantity missing
            totalPrice: 10.00
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors['items.0.quantity']).toBeDefined();
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
        expect(err.errors['items.0.quantity']).toBeDefined();
    });

    it('should be invalid if item quantity is not an integer', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 2.5 }], // Fractional quantity
            totalPrice: 25.00
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
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
        
        // Save and verify
        await order.save();
        testOrderIds.push(order._id);
        
        const savedOrder = await Order.findOne({ _id: order._id });
        expect(savedOrder).toBeTruthy();
        expect(savedOrder.totalPrice).toBe(0);
    });

    // Test for status enum and default
    it('should default status to "pending"', async () => {
        const order = new Order({ // Status not provided
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00
        });
        expect(order.status).toBe('pending');
        
        // Save and verify
        await order.save();
        testOrderIds.push(order._id);
        
        const savedOrder = await Order.findOne({ _id: order._id });
        expect(savedOrder.status).toBe('pending');
    });

    // Test each status value in the enum
    it('should accept all valid status values', async () => {
        // Test all allowed statuses
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'cancelled', 'delivered'];
        
        for (const status of validStatuses) {
            const order = new Order({
                user: testUser._id,
                items: [{ menuItem: testMenuItem._id, quantity: 1 }],
                totalPrice: 10.00,
                status: status
            });
            
            let err;
            try {
                await order.validate();
            } catch (error) {
                err = error;
            }
            expect(err).toBeUndefined(); // Should be valid
            
            // Also test saving to the database
            await order.save();
            testOrderIds.push(order._id);
            
            const savedOrder = await Order.findOne({ _id: order._id, status: status });
            expect(savedOrder).toBeTruthy();
            expect(savedOrder.status).toBe(status);
        }
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

    // Test for estimatedPreparationTime
    it('should accept a valid estimatedPreparationTime', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00,
            estimatedPreparationTime: 15 // In minutes
        });
        
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeUndefined();
        
        // Test saving
        await order.save();
        testOrderIds.push(order._id);
        
        const savedOrder = await Order.findOne({ _id: order._id });
        expect(savedOrder).toBeTruthy();
        expect(savedOrder.estimatedPreparationTime).toBe(15);
    });

    it('should be invalid if estimatedPreparationTime is negative', async () => {
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00,
            estimatedPreparationTime: -5 // Negative time
        });
        let err;
        try {
            await order.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.estimatedPreparationTime).toBeDefined();
    });

    // Test for createdAt default
    it('should set createdAt to current date by default', async () => {
        const now = Date.now();
        const order = new Order({
            user: testUser._id,
            items: [{ menuItem: testMenuItem._id, quantity: 1 }],
            totalPrice: 10.00
        });
        await order.save();
        testOrderIds.push(order._id);
        
        const savedOrder = await Order.findOne({ _id: order._id });
        expect(savedOrder.createdAt).toBeInstanceOf(Date);
        expect(savedOrder.createdAt.getTime()).toBeGreaterThanOrEqual(now - 1000); // Within 1 second
        expect(savedOrder.createdAt.getTime()).toBeLessThanOrEqual(now + 1000);
    });
}); 