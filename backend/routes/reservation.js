const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

const {
    getReservations,
    getMyReservations,
    getReservation,
    createReservation,
    updateReservation,
    deleteReservation,
    getBookedSlots,
    getCustomerEquipmentRequests
} = require('../controllers/reservation');

// Admin can get all reservations
router.route('/')
    .get(protect, authorize('admin'), getReservations)
    .post(protect, createReservation);

// Users can get their reservations
router.get('/my', protect, getMyReservations);

// Get booked slots for a coworking space
router.get('/booked/:coworkingSpace/:date', protect, getBookedSlots);

// Both users and admins can get, update, and delete reservations
router.route('/:id')
    .get(protect, getReservation)
    .put(protect, updateReservation)
    .delete(protect, deleteReservation);

module.exports = router;
