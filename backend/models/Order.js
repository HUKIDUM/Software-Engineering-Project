const mongoose = require('mongoose');

// Define the schema for items within an order
const orderItemSchema = new mongoose.Schema({
    menuItem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem', // Reference to the MenuItem model
        required: [true, 'Menu item ID is required for an order item.'],
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required for an order item.'],
        min: [1, 'Quantity must be at least 1.'],
        // Ensure quantity is an integer
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value for quantity.'
        }
    },
    // You might want to store price per item at the time of order
    // priceAtOrder: {
    //     type: Number,
    //     required: true
    // }
}, { _id: false }); // Don't create separate IDs for subdocuments unless needed

// Define the main Order schema
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: [true, 'User ID is required for the order.'],
        index: true, // Index for faster querying by user
    },
    items: {
        type: [orderItemSchema], // Array of the subdocument schema
        required: true,
        // Validate that the items array is not empty
        validate: [
            { validator: (val) => val.length > 0, msg: 'Order must contain at least one item.' }
        ]
    },
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required for the order.'],
        min: [0, 'Total price must be a non-negative number.'],
    },
    status: {
        type: String,
        required: true,
        enum: {
            values: ['pending', 'confirmed', 'preparing', 'ready', 'cancelled', 'delivered'],
            message: '{VALUE} is not a supported order status.'
        },
        default: 'pending',
    },
    estimatedPreparationTime: { // In minutes, perhaps?
        type: Number,
        min: [0, 'Estimated preparation time cannot be negative.']
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    // You might add other fields like delivery address, notes, payment status, etc.
    // paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 