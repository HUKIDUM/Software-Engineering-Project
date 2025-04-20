const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    coworkingSpace: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CoworkingSpace',
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    timeSlot: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'cancelled'],
        default: 'active',
    },
    requestedEquipment: [
        {
            equipment: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Equipment',
            },
            quantityRequested: {
                type: Number,
                required: true,
            },
        },
    ],
});

// ✅ Prevent user from submitting more than 3 active reservations
ReservationSchema.pre('save', async function(next) {
    if (this.isNew || this.isModified('status')) {
        const activeReservations = await this.constructor.countDocuments({
            user: this.user,
            status: 'active',
            _id: { $ne: this._id } // Exclude the current reservation
        });

        if (activeReservations >= 3 && this.status === 'active') {
            throw new Error('User cannot have more than 3 active reservations');
        }
    }
    next();
});

module.exports = mongoose.model('Reservation', ReservationSchema);
