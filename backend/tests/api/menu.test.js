const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv'); // Import dotenv
// Destructure app from the server export
const { app } = require('../../server'); 
const MenuItem = require('../../models/MenuItem');
const User = require('../../models/user');
const jwt = require('jsonwebtoken');

// Load .env.test variables
dotenv.config({ path: './.env.test' }); 

// Test user and authentication token
let testUser;
let authToken;
let testMenuItems = [];

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
    
    // Create a test user for authentication (don't delete existing users)
    testUser = await User.findOne({ email: 'menutest@example.com' });
    if (!testUser) {
        testUser = await User.create({
            name: 'Test User',
            email: 'menutest@example.com',
            password: 'password123',
            telephoneNumber: '1234567890',
            role: 'user' // Regular user role
        });
    }
    
    // Generate JWT token for the test user
    authToken = jwt.sign(
        { userId: testUser._id },
        process.env.JWT_SECRET || 'testsecret',
        { expiresIn: '1h' }
    );
});

afterAll(async () => {
    // Clean up only our test user and test menu items
    if (testUser) {
        await User.findOneAndDelete({ email: 'menutest@example.com' });
    }
    
    // Clean up only the menu items we created for this test
    if (testMenuItems.length > 0) {
        await MenuItem.deleteMany({ _id: { $in: testMenuItems.map(item => item._id) } });
    }
    
    // Disconnect Mongoose
    await mongoose.disconnect();
    console.log('Menu API Test: Disconnected from Test DB');
});

beforeEach(async () => {
    // Clean up only test menu items before each test
    if (testMenuItems.length > 0) {
        await MenuItem.deleteMany({ _id: { $in: testMenuItems.map(item => item._id) } });
        testMenuItems = [];
    }
});

describe('GET /api/v1/menu', () => {
    it('should return 200 OK when authenticated', async () => {
        const res = await request(app)
            .get('/api/v1/menu')
            .set('Authorization', `Bearer ${authToken}`);
            
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return available menu items', async () => {
        // Create test menu items
        const items = await MenuItem.create([
            { name: 'Test Available Coffee', price: 3.50, category: 'Drink', isAvailable: true },
            { name: 'Test Unavailable Tea', price: 3.00, category: 'Drink', isAvailable: false },
            { name: 'Test Available Sandwich', price: 7.50, category: 'Food', isAvailable: true },
        ]);
        testMenuItems = items; // Store for cleanup

        const res = await request(app)
            .get('/api/v1/menu')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        
        // Check if our test available items are in the response
        const availableItemNames = ['Test Available Coffee', 'Test Available Sandwich'];
        const returnedTestItems = res.body.filter(item => 
            availableItemNames.includes(item.name)
        );
        
        expect(returnedTestItems.length).toBe(2);
        expect(res.body.some(item => item.name === 'Test Unavailable Tea')).toBe(false);
    });

    it('should return items with the correct structure', async () => {
        // Create a test menu item
        const item = await MenuItem.create(
            { name: 'Test Structure Muffin', description: 'A test muffin', price: 2.99, category: 'Snack', isAvailable: true }
        );
        testMenuItems.push(item); // Store for cleanup

        const res = await request(app)
            .get('/api/v1/menu')
            .set('Authorization', `Bearer ${authToken}`);

        expect(res.statusCode).toEqual(200);
        
        // Find our test item in the response
        const returnedItem = res.body.find(i => i.name === 'Test Structure Muffin');
        expect(returnedItem).toBeDefined();
        
        // Check its structure
        expect(returnedItem._id || returnedItem.id).toBeDefined(); 
        expect(returnedItem.name).toBe('Test Structure Muffin');
        expect(returnedItem.description).toBe('A test muffin');
        expect(returnedItem.price).toBe(2.99);
        expect(returnedItem.category).toBe('Snack');
    });

    it('should return 401 if no authentication is provided', async () => {
        const res = await request(app).get('/api/v1/menu'); // No auth token
        expect(res.statusCode).toEqual(401);
    });
}); 