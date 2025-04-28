const express = require('express');
const {
    placeOrder,
    getOrderById,
    getAllOrders // Import the new controller function
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth'); // Import authentication middleware and authorize

const router = express.Router();

// Apply protect middleware to all routes defined AFTER this line in this file
router.use(protect);

// Route for POST /api/v1/orders
router.route('/').post(placeOrder);

// Route for GET /api/v1/orders/:orderId (Placeholder for Step 5)
// This will also be protected because router.use(protect) is above it
router.route('/:orderId').get(getOrderById);

// Route to get all orders (requires admin role)
router.get('/admin/all', authorize('admin'), getAllOrders);

module.exports = router; 