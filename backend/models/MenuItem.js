const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Menu item name is required'],
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    price: {
        type: Number,
        required: [true, 'Menu item price is required'],
        min: [0, 'Price must be non-negative'], // Allow 0 price
    },
    category: {
        type: String,
        required: [true, 'Menu item category is required'],
        trim: true,
        // Example: enum: ['Food', 'Drink', 'Snack', 'Dessert']
    },
    isAvailable: {
        type: Boolean,
        default: true, // Default to available
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Optional: Add indexes for performance if needed
// menuItemSchema.index({ category: 1 });
// menuItemSchema.index({ isAvailable: 1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem; 