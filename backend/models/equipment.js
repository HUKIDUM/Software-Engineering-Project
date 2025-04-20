const mongoose = require('mongoose');

const EquipmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add an equipment name'],
        trim: true,
        maxlength: [100, 'Name cannot be more than 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    quantityAvailable: {
        type: Number,
        required: [true, 'Please add the quantity available'],
        min: [0, 'Quantity cannot be less than 0'],
        default: 1
    },
    coworkingSpace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CoworkingSpace',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Equipment', EquipmentSchema); 