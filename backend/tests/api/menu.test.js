const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv'); // Import dotenv
// Destructure app from the server export
const { app } = require('../../server'); 
const MenuItem = require('../../models/MenuItem');

// Load .env.test variables
dotenv.config({ path: './.env.test' }); 

beforeAll(async () => {
    // Connect to the real test database
    if (mongoose.connection.readyState === 0) {
        try {
            if (!process.env.MONGODB_URI) { // Check the variable name from .env.test
                throw new Error('MONGODB_URI not found in .env.test. Cannot connect to test database.');
            }
            await mongoose.connect(process.env.MONGODB_URI); 
            console.log('Menu API Test: Connected to Test DB');
        } catch (error) {
            console.error('Menu API Test: DB connection error:', error);
            process.exit(1);
        }
    }
    // Clean collection before tests start for this file
    await MenuItem.deleteMany({});
});

afterAll(async () => {
    // Disconnect Mongoose
    await mongoose.disconnect();
    console.log('Menu API Test: Disconnected from Test DB');
});

beforeEach(async () => {
    // Clean up menu items before each test
    await MenuItem.deleteMany({});
});

describe('GET /api/v1/menu', () => {
    it('should return 200 OK and an empty array when no menu items exist', async () => {
        const res = await request(app).get('/api/v1/menu');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(0);
    });

    it('should return only available menu items', async () => {
        // Seed database with items
        await MenuItem.create([
            { name: 'Available Coffee', price: 3.50, category: 'Drink', isAvailable: true },
            { name: 'Unavailable Tea', price: 3.00, category: 'Drink', isAvailable: false },
            { name: 'Available Sandwich', price: 7.50, category: 'Food', isAvailable: true },
        ]);

        const res = await request(app).get('/api/v1/menu');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(2); // Only 2 available items
        expect(res.body.some(item => item.name === 'Unavailable Tea')).toBe(false); // Ensure unavailable item is not returned
    });

    it('should return items with the correct structure (_id, name, description, price, category)', async () => {
        // Seed database
        await MenuItem.create(
            { name: 'Test Muffin', description: 'A tasty muffin', price: 2.99, category: 'Snack', isAvailable: true }
        );

        const res = await request(app).get('/api/v1/menu');

        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBe(1);
        const returnedItem = res.body[0];

        // Check for _id (Mongoose default) or id (if transformed)
        expect(returnedItem._id || returnedItem.id).toBeDefined(); 
        expect(returnedItem.name).toBe('Test Muffin');
        expect(returnedItem.description).toBe('A tasty muffin');
        expect(returnedItem.price).toBe(2.99);
        expect(returnedItem.category).toBe('Snack');
    });

    // Add test for potential errors (e.g., database connection issue) if needed
    // it('should return 500 if database error occurs', async () => { ... });
}); 