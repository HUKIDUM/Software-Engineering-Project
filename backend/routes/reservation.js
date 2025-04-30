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
    getCustomerEquipmentRequests,
    updateRequestedEquipment,
    removeEquipmentFromReservation
} = require('../controllers/reservation');

// Admin can get all reservations

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Get all reservations (Admin only)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: coworkingSpace
 *         schema:
 *           type: string
 *         description: Filter by coworking space ID
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       # Add other potential query parameters like sort, limit, page
 *     responses:
 *       200:
 *         description: List of reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 pagination:
 *                   type: object # Define pagination object structure if used
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (User is not an admin)
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       201:
 *         description: Reservation created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Bad request (e.g., invalid data, booking conflict)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.route('/')
    .get(protect, authorize('admin'), getReservations)
    .post(protect, createReservation);

/**
 * @swagger
 * /reservations/my:
 *   get:
 *     summary: Get reservations for the logged-in user
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of the user's reservations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/my', protect, getMyReservations);

/**
 * @swagger
 * /reservations/booked/{coworkingSpace}/{date}:
 *   get:
 *     summary: Get booked time slots for a specific coworking space and date
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: [] # Or make public if needed
 *     parameters:
 *       - in: path
 *         name: coworkingSpace
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the coworking space
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: '2024-07-28'
 *         description: Date to check booked slots (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: List of booked time slots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 bookedSlots:
 *                   type: array
 *                   items:
 *                     type: string # Or a more specific time slot object
 *                     example: "09:00-10:00"
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Coworking space not found
 *       500:
 *         description: Server error
 */
router.get('/booked/:coworkingSpace/:date', protect, getBookedSlots);

/**
 * @swagger
 * /reservations/{id}/requested-equipment:
 *   put:
 *     summary: Update requested equipment for a reservation
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reservation to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               equipment:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     equipmentId:
 *                       type: string
 *                       description: ID of the equipment
 *                     quantity:
 *                       type: integer
 *                       description: Quantity requested
 *             example:
 *               equipment: [{ equipmentId: '60d0fe4f5311236168a109cb', quantity: 2 }]
 *     responses:
 *       200:
 *         description: Equipment request updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Bad request (e.g., invalid equipment ID, insufficient stock)
 *       401:
 *         description: Unauthorized (User doesn't own reservation or isn't admin)
 *       404:
 *         description: Reservation or Equipment not found
 *       500:
 *         description: Server error
 */
router.put('/:id/requested-equipment', protect, updateRequestedEquipment);

// Additional route to match the frontend's expectation
router.put('/:id/equipment', protect, updateRequestedEquipment);

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Get a specific reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reservation to retrieve
 *     responses:
 *       200:
 *         description: Reservation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       401:
 *         description: Unauthorized (User doesn't own reservation or isn't admin)
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a specific reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reservation to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationUpdateInput' # Define a schema for updatable fields
 *     responses:
 *       200:
 *         description: Reservation updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Bad request (e.g., invalid data, booking conflict)
 *       401:
 *         description: Unauthorized (User doesn't own reservation or isn't admin)
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a specific reservation by ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reservation to delete
 *     responses:
 *       200:
 *         description: Reservation deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: Unauthorized (User doesn't own reservation or isn't admin)
 *       404:
 *         description: Reservation not found
 *       500:
 *         description: Server error
 */
router.route('/:id')
    .get(protect, getReservation)
    .put(protect, updateReservation)
    .delete(protect, deleteReservation);

/**
 * @swagger
 * /reservations/{id}/remove-equipment/{equipmentId}:
 *   delete:
 *     summary: Remove a specific equipment item from a reservation's request
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reservation
 *       - in: path
 *         name: equipmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the equipment to remove from the request
 *     responses:
 *       200:
 *         description: Equipment removed successfully from reservation request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Reservation'
 *       400:
 *         description: Bad Request (e.g., equipment not found in reservation)
 *       401:
 *         description: Unauthorized (User doesn't own reservation or isn't admin)
 *       404:
 *         description: Reservation or Equipment not found
 *       500:
 *         description: Server error
 */
router.route('/:id/remove-equipment/:equipmentId')
    .delete(protect, removeEquipmentFromReservation);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     TimeSlot:
 *       type: object
 *       required:
 *         - startTime
 *         - endTime
 *       properties:
 *         startTime:
 *           type: string
 *           format: date-time
 *           example: "2024-07-28T09:00:00.000Z"
 *         endTime:
 *           type: string
 *           format: date-time
 *           example: "2024-07-28T12:00:00.000Z"
 *
 *     RequestedEquipment:
 *       type: object
 *       properties:
 *         equipmentId:
 *           type: string
 *           description: Reference to the Equipment model
 *           example: "60d0fe4f5311236168a109cb"
 *         quantity:
 *           type: integer
 *           example: 2
 *
 *     Reservation:
 *       type: object
 *       required:
 *         - user
 *         - coworkingSpace
 *         - reservationDate
 *         - timeSlots
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           example: "60d0fe4f5311236168a109cc"
 *         user:
 *           type: string # Or object if populated
 *           description: Reference to the User model
 *           example: "60d0fe4f5311236168a109ca"
 *         coworkingSpace:
 *           type: string # Or object if populated
 *           description: Reference to the CoworkingSpace model
 *           example: "60d0fe4f5311236168a109cb"
 *         reservationDate:
 *           type: string
 *           format: date
 *           example: "2024-07-28"
 *         timeSlots:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *         requestedEquipment:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RequestedEquipment'
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no-show]
 *           default: pending
 *           example: confirmed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-07-27T10:00:00.000Z"
 *
 *     ReservationInput:
 *       type: object
 *       required:
 *         - coworkingSpace
 *         - reservationDate
 *         - timeSlots
 *       properties:
 *         coworkingSpace:
 *           type: string
 *           description: ID of the coworking space
 *           example: "60d0fe4f5311236168a109cb"
 *         reservationDate:
 *           type: string
 *           format: date
 *           example: "2024-07-28"
 *         timeSlots:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *         requestedEquipment: # Optional equipment request during creation
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RequestedEquipment'
 *           example: [{ equipmentId: '60d0fe4f5311236168a109cd', quantity: 1 }]
 *
 *     ReservationUpdateInput:
 *       type: object
 *       properties:
 *         reservationDate:
 *           type: string
 *           format: date
 *           example: "2024-07-29"
 *         timeSlots:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TimeSlot'
 *         status:
 *           type: string
 *           enum: [pending, confirmed, cancelled, completed, no-show]
 *           example: confirmed
 *         # Add other fields that can be updated
 */
