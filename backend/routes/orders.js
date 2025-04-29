const express = require('express');
const router  = express.Router();
const {
  placeOrder,
  getUserOrders,
  getOrderById,
  getAllOrders,
  updateOrder,
  deleteOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

// All routes below require authentication
router.use(protect);

// Publicly: Place a new order or list your own orders
router
  .route('/')
  .get(getUserOrders)
  .post(placeOrder);

// Fetch a specific order by ID
router.route('/:orderId')
  .get(getOrderById);

// Admin: get all orders
router.get('/admin/all', authorize('admin'), getAllOrders);

// Admin: update or delete any order
router.route('/:orderId')
  .put(authorize('admin'), updateOrder)
  .delete(authorize('admin'), deleteOrder);

module.exports = router;
