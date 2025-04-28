// backend/tests/models/menuItem.test.js
const MenuItem = require('../../models/MenuItem'); // Import the actual model

// Placeholder: In a real setup, you'd connect to a test DB here
// const mongoose = require('mongoose');
// const { MongoMemoryServer } = require('mongodb-memory-server');
// let mongoServer;
// beforeAll(async () => {
//   mongoServer = await MongoMemoryServer.create();
//   const uri = mongoServer.getUri();
//   await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// });
// afterAll(async () => {
//   await mongoose.disconnect();
//   await mongoServer.stop();
// });
// beforeEach(async () => {
//    // Clean up data before each test
//    await MenuItem.deleteMany({});
// });


describe('MenuItem Model', () => {

    it('should be invalid if required fields are missing', async () => {
        const menuItem = new MenuItem({}); // No data provided
        let err;
        try {
            // Using Mongoose's validate method
            await menuItem.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        // Check for specific validation errors
        expect(err.errors.name).toBeDefined();
        expect(err.errors.price).toBeDefined();
        expect(err.errors.category).toBeDefined();
    });

    it('should create a valid menu item with all fields', () => {
        const menuItemData = {
            name: 'Test Coffee',
            description: 'A hot cup of coffee',
            price: 3.50,
            category: 'Drink',
            isAvailable: true,
        };
        const menuItem = new MenuItem(menuItemData);

        expect(menuItem.name).toBe('Test Coffee');
        expect(menuItem.description).toBe('A hot cup of coffee');
        expect(menuItem.price).toBe(3.50);
        expect(menuItem.category).toBe('Drink');
        expect(menuItem.isAvailable).toBe(true);
        expect(menuItem.createdAt).toBeInstanceOf(Date);
    });

    it('should default isAvailable to true if not provided', () => {
         const menuItemData = {
            name: 'Test Muffin',
            price: 2.75,
            category: 'Food',
        };
        const menuItem = new MenuItem(menuItemData);
        expect(menuItem.isAvailable).toBe(true);
    });

     it('should be invalid if price is negative', async () => {
        const menuItemData = {
            name: 'Invalid Item',
            price: -5.00, // Negative price
            category: 'Snack',
        };
        const menuItem = new MenuItem(menuItemData);
        let err;
        try {
            await menuItem.validate();
        } catch (error) {
            err = error;
        }
        expect(err).toBeDefined();
        expect(err.errors.price).toBeDefined();
        expect(err.errors.price.kind).toBe('min'); // Check if it's a min value error
    });

     it('should allow price to be zero', async () => {
        const menuItemData = {
            name: 'Free Item',
            price: 0, // Zero price
            category: 'Promo',
        };
        const menuItem = new MenuItem(menuItemData);
        let err;
        try {
            await menuItem.validate();
        } catch (error) {
            err = error;
        }
        // Expect no validation error for price being zero
        expect(err).toBeUndefined();
    });


    // Add more tests if specific validation rules are added (e.g., category enum)
}); 