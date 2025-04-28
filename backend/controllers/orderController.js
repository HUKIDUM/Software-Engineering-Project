const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');

// @desc    Place a new order
// @route   POST /api/v1/orders
// @access  Private (User must be logged in)
exports.placeOrder = async (req, res, next) => {
    const { items } = req.body;
    const userId = req.user._id; // User ID from protect middleware

    // Basic validation: Check if items array exists and is not empty
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: 'Order must contain at least one item.' });
    }

    try {
        let calculatedTotalPrice = 0;
        const itemsToProcess = []; // Store items with fetched details

        // 1. Validate items, check availability, and calculate price
        for (const item of items) {
            // Validate incoming item structure
            if (!item.menuItem || !mongoose.Types.ObjectId.isValid(item.menuItem) || item.quantity == null || item.quantity < 1 || !Number.isInteger(item.quantity)) {
                return res.status(400).json({ success: false, error: `Invalid item data: ${JSON.stringify(item)}. Ensure menuItem (valid ObjectId) and quantity (integer >=1) are provided.` });
            }

            const menuItemDetails = await MenuItem.findById(item.menuItem);

            // Check if item exists
            if (!menuItemDetails) {
                // Use 400 for consistency as it's bad input from client perspective
                return res.status(400).json({ success: false, error: `Menu item with ID ${item.menuItem} not found.` }); 
            }

            // Check availability
            if (!menuItemDetails.isAvailable) {
                 return res.status(400).json({ success: false, error: `Menu item '${menuItemDetails.name}' (ID: ${item.menuItem}) is currently unavailable.` });
            }

            // Add to total price
            calculatedTotalPrice += menuItemDetails.price * item.quantity;

            // Add details needed for order creation
            itemsToProcess.push({
                menuItem: menuItemDetails._id,
                quantity: item.quantity
                // Optionally add priceAtOrder: menuItemDetails.price here
            });
        }

        // Round total price to 2 decimal places to avoid floating point issues
        calculatedTotalPrice = Math.round(calculatedTotalPrice * 100) / 100;

        // 2. Create and save the order
        const newOrder = await Order.create({
            user: userId,
            items: itemsToProcess,
            totalPrice: calculatedTotalPrice,
            // Status defaults to 'pending'
        });

        // --- Emit Socket Event ---
        const io = req.app.get('io'); // Get io instance from app settings
        if (io) {
             // Populate necessary details before emitting if needed, or send the basic order
             // const populatedOrder = await newOrder.populate('user', 'name'); // Example population
            io.emit('new_order', newOrder); // Emit the newly created order object
             console.log(`Socket event 'new_order' emitted for order ${newOrder._id}`);
        } else {
             console.error('Socket.io instance not found on app settings.');
        }
        // --- End Emit Socket Event ---

        // 3. Respond with success
        res.status(201).json({ success: true, data: newOrder });

        // TODO: Step 6 - Trigger notification here if implemented
        // notificationService.notifyNewOrder(newOrder);

    } catch (err) {
        console.error('Error placing order:', err);
         // Handle potential Mongoose validation errors specifically
        if (err.name === 'ValidationError') {
            // Return a structured error object instead of just joined messages
            const errors = Object.values(err.errors).reduce((acc, { path, message }) => {
                acc[path] = message;
                return acc;
            }, {});
            return res.status(400).json({ success: false, error: 'Validation Failed', details: errors });
        }
         // Handle CastError (e.g., invalid ObjectId format during DB query if not caught earlier)
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
             return res.status(400).json({ success: false, error: `Invalid ID format: ${err.value}` });
        }
        // Generic server error
        res.status(500).json({ success: false, error: 'Server Error placing order' });
        // next(err); // Or pass to error middleware
    }
};

// @desc    Get a single order by ID
// @route   GET /api/v1/orders/:orderId
// @access  Private (Owner or Admin)
exports.getOrderById = async (req, res, next) => {
    const { orderId } = req.params;
    const userId = req.user._id; // From protect middleware
    const userRole = req.user.role; // Get user role

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(404).json({ success: false, error: `Order not found with id: ${orderId}` }); // Treat invalid format as Not Found
    }

    try {
        const order = await Order.findById(orderId)
                                 .populate('user', 'name email') // Populate user details (optional)
                                 .populate('items.menuItem', 'name price'); // Populate item details (optional)

        // Check if order exists
        if (!order) {
            return res.status(404).json({ success: false, error: `Order not found with id: ${orderId}` });
        }

        // Authorization Check: Allow access if user is the owner OR if the user is an admin
        // Convert ObjectId to string for comparison
        if (order.user._id.toString() !== userId.toString() && userRole !== 'admin') {
            // Return 404 instead of 403 to avoid revealing order existence to unauthorized users
            return res.status(404).json({ success: false, error: `Order not found with id: ${orderId}` });
            // Alternatively, return 403 if revealing existence isn't a concern:
            // return res.status(403).json({ success: false, error: 'User not authorized to view this order' });
        }

        // Return the order details
        res.status(200).json({ success: true, data: order });

    } catch (err) {
        console.error(`Error fetching order ${orderId}:`, err);
        // Handle potential CastError again just in case (though validation above should catch it)
         if (err.name === 'CastError' && err.kind === 'ObjectId') {
             return res.status(404).json({ success: false, error: `Order not found with id: ${orderId}` });
        }
        res.status(500).json({ success: false, error: 'Server Error fetching order' });
        // next(err);
    }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/v1/orders/admin/all
// @access  Private (Admin)
exports.getAllOrders = async (req, res, next) => {
    try {
        // Fetch all orders, sort by newest first (optional)
        const orders = await Order.find()
                                .sort({ createdAt: -1 }) // Sort by creation date, descending
                                .populate('user', 'name email') // Populate user details
                                .populate('items.menuItem', 'name'); // Populate basic item details

        res.status(200).json({
            success: true,
            count: orders.length,
            data: orders
        });

    } catch (err) {
        console.error('Error fetching all orders:', err);
        res.status(500).json({ success: false, error: 'Server Error fetching orders' });
        // next(err);
    }
}; 