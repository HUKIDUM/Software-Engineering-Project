const request = require('supertest');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { app, io } = require('../../server');
const Order = require('../../models/Order');
const MenuItem = require('../../models/MenuItem');
const User = require('../../models/user');

let testUser, testAdminUser;
let availableItem1, availableItem2, unavailableItem;
let userToken, adminToken, otherUserToken;

// Increase timeout for potentially long setup
// jest.setTimeout(30000); // Uncomment if setup takes longer

beforeAll(async () => {
    // Remove MongoMemoryServer creation and uri lines
    // mongoServer = await MongoMemoryServer.create();
    // const uri = mongoServer.getUri();

    // Connect to the real test database (ensure this part is correct)
    if (mongoose.connection.readyState === 0) {
        try {
            if (!process.env.MONGODB_URI) { 
                throw new Error('MONGODB_URI not found in .env.test. Cannot connect to test database.');
            }
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Order API Test: Connected to Test DB');
        } catch (error) {
            console.error('Order API Test: DB connection error:', error);
            process.exit(1);
        }
    }

    // Clean previous data
    await User.deleteMany({});
    await MenuItem.deleteMany({});
    await Order.deleteMany({});

    // Create ALL users here
    testUser = new User({ name: 'Test Order User', email: 'orderuser@test.com', password: 'password123', telephoneNumber: '1112223333' });
    testAdminUser = new User({ name: 'Test Order Admin', email: 'orderadmin@test.com', password: 'password123', telephoneNumber: '4445556666', role: 'admin' });
    otherUser = new User({ name: 'Other Order User', email: 'other@test.com', password: 'password123', telephoneNumber: '7778889999' });
    await Promise.all([testUser.save(), testAdminUser.save(), otherUser.save()]);

    // Generate ALL tokens here
    userToken = testUser.getSignedJwtToken();
    adminToken = testAdminUser.getSignedJwtToken();
    otherUserToken = otherUser.getSignedJwtToken();

    // Create menu items
    availableItem1 = new MenuItem({ name: 'Orderable Pizza', price: 12.99, category: 'Food', isAvailable: true });
    availableItem2 = new MenuItem({ name: 'Orderable Drink', price: 2.50, category: 'Drink', isAvailable: true });
    unavailableItem = new MenuItem({ name: 'Sold Out Cake', price: 5.00, category: 'Dessert', isAvailable: false });
    await Promise.all([availableItem1.save(), availableItem2.save(), unavailableItem.save()]);
});

afterAll(async () => {
    await mongoose.disconnect();
    console.log('Order API Test: Disconnected from Test DB');
    // Remove mongoServer.stop()
    // await mongoServer.stop(); 
});

beforeEach(async () => {
    // Clean up orders before each test (might be redundant with afterAll dropDatabase, but safe)
    await Order.deleteMany({});
});

describe('GET /api/v1/orders/:orderId', () => {
    let createdOrder; // To store an order created for testing GET

    beforeEach(async () => {
        // Re-ensure clean state for orders just before each GET test
        await Order.deleteMany({}); 
        // Create an order owned by testUser
        const orderData = {
            user: testUser._id,
            items: [{ menuItem: availableItem1._id, quantity: 1 }],
            totalPrice: availableItem1.price,
        };
        createdOrder = await Order.create(orderData);
    });

    // --- Authentication Tests --- (Should run immediately)
    it('should return 401 if no token is provided', async () => {
        const validOrderId = createdOrder?._id || new mongoose.Types.ObjectId(); 
        const res = await request(app)
            .get(`/api/v1/orders/${validOrderId}`);
        expect(res.statusCode).toEqual(401);
        console.log("RED Test (GET Order No Auth): Expecting 401.");
    });

    // --- Enable functional tests now that controller is implemented ---
    describe('Get Order By ID Functionality (Auth Required)', () => {

        // --- Authorization Test ---
        it('should return 403 or 404 if user tries to get another user\'s order', async () => {
             const res = await request(app)
                .get(`/api/v1/orders/${createdOrder._id}`)
                .set('Authorization', `Bearer ${otherUserToken}`); // Token for a different user
            expect([403, 404]).toContain(res.statusCode); // Expect Forbidden or Not Found by policy
        });

        // --- ID Format/Existence Tests ---
        it('should return 400 or 404 if orderId format is invalid', async () => {
            const res = await request(app)
                .get('/api/v1/orders/invalid-id-format')
                .set('Authorization', `Bearer ${userToken}`);
            expect([400, 404]).toContain(res.statusCode); // Expect Bad Request or Not Found
        });

        it('should return 404 if orderId does not exist', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .get(`/api/v1/orders/${nonExistentId}`)
                .set('Authorization', `Bearer ${userToken}`);
            expect(res.statusCode).toEqual(404);
        });

        // --- Happy Path Test ---
        it('should return 200 and the order details if requested by the owner', async () => {
            const res = await request(app)
                .get(`/api/v1/orders/${createdOrder._id}`)
                .set('Authorization', `Bearer ${userToken}`); // Correct user token

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data._id).toEqual(createdOrder._id.toString());
            expect(res.body.data.user._id).toEqual(testUser._id.toString());
            expect(res.body.data.totalPrice).toEqual(createdOrder.totalPrice);
            expect(res.body.data.items.length).toEqual(createdOrder.items.length);
        });
         // Test admin access (if applicable by design)
        // it('should return 200 and the order details if requested by an admin', async () => { ... });
    }); // End previously skipped describe
});

describe('POST /api/v1/orders', () => {

    // --- Authentication Tests --- (These should run immediately)
    it('should return 401 if no token is provided', async () => {
        const orderData = { items: [{ menuItem: availableItem1._id.toString(), quantity: 1 }] };
        const res = await request(app)
            .post('/api/v1/orders') // Use the correct path /api/v1/orders
            .send(orderData);
        expect(res.statusCode).toEqual(401); 
        console.log("RED Test (POST Order No Auth): Expecting 401 - confirms route isn't set up or requires auth.");
    });

     // --- Enable functional tests now that route/controller exist --- 
    describe('Order Placement Functionality (Auth Required)', () => {

        // --- Validation Tests ---
        it('should return 400 if items array is missing', async () => {
            const orderData = {}; // Missing items
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
            expect(res.statusCode).toEqual(400);
            // Optionally check error message if controller provides it
            // expect(res.body.error).toMatch(/items/i);
        });

        it('should return 400 if items array is empty', async () => {
            const orderData = { items: [] }; // Empty items array
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
            expect(res.statusCode).toEqual(400);
        });

        it('should return 400 if item object is missing menuItem', async () => {
            const orderData = { items: [{ quantity: 1 }] }; // Missing menuItem
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
            expect(res.statusCode).toEqual(400);
        });

         it('should return 400 if item object is missing quantity', async () => {
            const orderData = { items: [{ menuItem: availableItem1._id.toString() }] }; // Missing quantity
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
            expect(res.statusCode).toEqual(400);
        });

        it('should return 400 if item quantity is zero', async () => {
            const orderData = { items: [{ menuItem: availableItem1._id.toString(), quantity: 0 }] };
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
            expect(res.statusCode).toEqual(400);
        });

         it('should return 400 if menuItem ID is invalid format', async () => {
            const orderData = { items: [{ menuItem: 'invalid-object-id', quantity: 1 }] };
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
             // Expect validation error from controller/mongoose for invalid ID format
             expect(res.statusCode).toEqual(400); 
        });

         it('should return 404 (or 400) if menuItem ID does not exist in DB', async () => {
             const nonExistentId = new mongoose.Types.ObjectId(); // Generate a valid format but non-existent ID
             const orderData = { items: [{ menuItem: nonExistentId.toString(), quantity: 1 }] };
             const res = await request(app)
                 .post('/api/v1/orders')
                 .set('Authorization', `Bearer ${userToken}`)
                 .send(orderData);
             // Controller should check if item exists
             expect([400, 404]).toContain(res.statusCode); 
         });

        // --- Availability Test ---
        it('should return 400 if attempting to order an unavailable item', async () => {
            const orderData = { items: [{ menuItem: unavailableItem._id.toString(), quantity: 1 }] };
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);
            expect(res.statusCode).toEqual(400);
            // Optionally check specific error message about availability
            // expect(res.body.error).toMatch(/not available/i);
        });

        // --- Happy Path Test ---
        it('should return 201 and create the order successfully with valid data', async () => {
            const orderData = {
                items: [
                    { menuItem: availableItem1._id.toString(), quantity: 1 }, // 12.99
                    { menuItem: availableItem2._id.toString(), quantity: 2 }  // 2 * 2.50 = 5.00
                ]
                // Total price should be calculated by the backend: 12.99 + 5.00 = 17.99
            };
            const res = await request(app)
                .post('/api/v1/orders')
                .set('Authorization', `Bearer ${userToken}`)
                .send(orderData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toBeDefined();
            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeDefined();
            expect(res.body.data._id).toBeDefined(); // Check if order ID exists
            expect(res.body.data.user).toEqual(testUser._id.toString());
            expect(res.body.data.items.length).toBe(2);
            expect(res.body.data.totalPrice).toBeCloseTo(17.99); // Use toBeCloseTo for floating point
            expect(res.body.data.status).toBe('pending');

            // Verify in DB
            const orderInDb = await Order.findById(res.body.data._id);
            expect(orderInDb).not.toBeNull();
            expect(orderInDb.user.toString()).toEqual(testUser._id.toString());
            expect(orderInDb.totalPrice).toBeCloseTo(17.99);
            expect(orderInDb.items.length).toBe(2);
        });
    }); // End of previously skipped describe block
}); 