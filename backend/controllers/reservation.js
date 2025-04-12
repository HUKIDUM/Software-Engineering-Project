const Reservation = require('../models/reservation');
const CoworkingSpace = require('../models/coworkingSpace');
const Equipment = require('../models/equipment');
const { sendEmail } = require('../utils/sendEmail');
const ErrorResponse = require('../utils/errorResponse');
const User = require('../models/user');

exports.getCustomerEquipmentRequests = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            return res.status(400).json({
                success: false,
                error: 'Customer ID is required'
            });
        }

        // Find reservations with equipment requests and populate equipment details
        const reservations = await Reservation.find({
            user: customerId,
            'requestedEquipment.0': { $exists: true }
        }).populate({
            path: 'requestedEquipment.equipment',
            model: 'Equipment',
            select: 'name description quantityAvailable'
        });

        // Check if any reservations were found
        if (!reservations || reservations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No equipment requests found for this customer'
            });
        }

        // Format the response data
        const formattedRequests = reservations.map(reservation => ({
            reservationId: reservation._id,
            date: reservation.date,
            timeSlot: reservation.timeSlot,
            equipment: reservation.requestedEquipment.map(eq => ({
                name: eq.equipment?.name || 'Equipment not found',
                description: eq.equipment?.description,
                quantityRequested: eq.quantityRequested
            }))
        }));

        res.status(200).json({
            success: true,
            count: formattedRequests.length,
            data: formattedRequests
        });

    } catch (error) {
        console.error('❌ Error fetching customer equipment requests:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// ✅ Get all reservations (Admin Only)
exports.getReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find()
            .populate('user', 'name email')
            .populate('coworkingSpace');

        res.status(200).json({ success: true, count: reservations.length, data: reservations });
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

// ✅ Get logged-in user's reservations
exports.getMyReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find({ user: req.user._id })
            .populate('coworkingSpace', 'name location')
            .populate('requestedEquipment.equipment', 'name description');

        res.status(200).json({ success: true, count: reservations.length, data: reservations });
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

// ✅ Get a single reservation
exports.getReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id)
            .populate('user', 'name email')
            .populate('coworkingSpace');

        if (!reservation) {
            return res.status(404).json({ success: false, error: 'Reservation not found' });
        }

        // Ensure user owns reservation or is an admin
        if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        res.status(200).json({ success: true, data: reservation });
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

// ✅ Create reservation
exports.createReservation = async (req, res, next) => {
    try {
        req.body.user = req.user._id;
        const { coworkingSpace: coworkingSpaceId, date, timeSlot, requestedEquipment } = req.body;

        if (!coworkingSpaceId || !date || !timeSlot) {
            return res.status(400).json({ success: false, error: 'Please provide all required fields: coworkingSpace, date, and timeSlot' });
        }

        // Check if coworking space exists
        const coworkingSpace = await CoworkingSpace.findById(coworkingSpaceId);
        if (!coworkingSpace) {
            return res.status(404).json({ success: false, error: 'Coworking space not found' });
        }

        // Ensure no conflicting reservation exists for the same slot
        const existingReservation = await Reservation.findOne({
            coworkingSpace: coworkingSpaceId,
            date: date,
            timeSlot: timeSlot,
            status: 'active' // Only check against active reservations
        });

        if (existingReservation) {
            return res.status(400).json({ success: false, error: 'This time slot is already booked' });
        }

        // --- Validate Requested Equipment --- 
        let validatedEquipment = [];
        let equipmentDetailsForNotification = []; // Store details for email
        if (requestedEquipment && Array.isArray(requestedEquipment) && requestedEquipment.length > 0) {
            for (const item of requestedEquipment) {
                if (!item.equipment || !item.quantityRequested) {
                    return res.status(400).json({ success: false, error: 'Each requested equipment must have an equipment ID and quantityRequested.' });
                }

                const equipmentDoc = await Equipment.findById(item.equipment);

                // Check if equipment exists
                if (!equipmentDoc) {
                    return res.status(404).json({ success: false, error: `Equipment with ID ${item.equipment} not found.` });
                }

                // Check if equipment belongs to the same coworking space
                if (equipmentDoc.coworkingSpace.toString() !== coworkingSpaceId) {
                    return res.status(400).json({ success: false, error: `Equipment ${equipmentDoc.name} does not belong to this coworking space.` });
                }

                // Check if quantity is available
                if (equipmentDoc.quantityAvailable < item.quantityRequested) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `Not enough quantity for ${equipmentDoc.name}. Available: ${equipmentDoc.quantityAvailable}, Requested: ${item.quantityRequested}.` 
                    });
                }

                validatedEquipment.push({ 
                    equipment: item.equipment,
                    quantityRequested: item.quantityRequested 
                });
                equipmentDetailsForNotification.push({ // Add details for email
                    name: equipmentDoc.name,
                    quantity: item.quantityRequested
                });
            }
        }
        // --- End Equipment Validation ---

        // Determine initial equipment preparation status
        const initialEquipmentStatus = validatedEquipment.length > 0 ? 'pending' : 'not_required';

        const reservationData = {
            user: req.body.user,
            coworkingSpace: coworkingSpaceId,
            date: date,
            timeSlot: timeSlot,
            requestedEquipment: validatedEquipment,
            status: 'active',
            equipmentPreparationStatus: initialEquipmentStatus // Set the status here
        };

        const reservation = await Reservation.create(reservationData);

        // --- Update Equipment Quantities & Send Notification --- 
        if (validatedEquipment.length > 0) {
            // Send notification (existing logic)
            try {
                // Find admin users (customize this query as needed)
                const admins = await User.find({ role: 'admin' }); 
                const adminEmails = admins.map(admin => admin.email).filter(Boolean);
                
                // Add coworking space owner/manager email if available (assuming a field like 'owner' on CoworkingSpace model)
                // const spaceOwner = await User.findById(coworkingSpace.owner); // Example
                // if (spaceOwner && spaceOwner.email) adminEmails.push(spaceOwner.email);

                if (adminEmails.length > 0) {
                    const equipmentListHtml = equipmentDetailsForNotification
                        .map(eq => `<li>${eq.name} (Quantity: ${eq.quantity})</li>`)
                        .join('');
                    
                    const subject = `New Equipment Request for ${coworkingSpace.name}`;
                    const message = `
                        <p>A new reservation has been made with an equipment request:</p>
                        <ul>
                            <li>Space: ${coworkingSpace.name}</li>
                            <li>Date: ${new Date(date).toLocaleDateString()}</li>
                            <li>Time Slot: ${timeSlot}</li>
                            <li>User: ${req.user.name} (${req.user.email})</li>
                        </ul>
                        <p><strong>Requested Equipment:</strong></p>
                        <ul>
                            ${equipmentListHtml}
                        </ul>
                        <p>Please prepare the equipment.</p>
                    `;

                    await sendEmail({
                        to: adminEmails.join(','), // Send to all admins
                        subject: subject,
                        html: message
                    });
                    console.log('Notification email sent to admins for equipment request.');
                }
            } catch (emailError) {
                console.error('Error sending equipment request notification email:', emailError);
                // Decide if this should block the response or just log the error
                // Potentially add to a background job queue for retries
            }
        }
        // --- End Update Quantities & Notification ---

        res.status(201).json({
            success: true,
            data: reservation
        });

    } catch (error) {
        console.error("❌ Error creating reservation:", error);
        // If it's a validation error from the schema (e.g., quantity < 1)
        if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, error: error.message });
        }
        // Handle potential pre-save hook error (max reservations)
        if (error.message && error.message.includes('User cannot have more than 3 active reservations')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        // Use next for unhandled errors to trigger central error handler if exists
        next(error); 
        // Or fallback to generic 500 if no central handler
        // res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

// ✅ Update reservation
exports.updateReservation = async (req, res) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, error: 'Reservation not found' });
        }

        // Allow update if user owns the reservation or is admin
        if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        // Allow updates to date and timeSlot
        const allowedUpdates = {};
        if (req.body.date) allowedUpdates.date = req.body.date;
        if (req.body.timeSlot) allowedUpdates.timeSlot = req.body.timeSlot;

        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({ success: false, error: 'Please provide date or timeSlot to update' });
        }

        reservation = await Reservation.findByIdAndUpdate(req.params.id, allowedUpdates, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: reservation });
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error);
        res.status(400).json({ success: false, error: error.message });
    }
};

// ✅ Delete reservation
exports.deleteReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, error: 'Reservation not found' });
        }

        // Allow deletion if user owns the reservation or is admin
        if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        await Reservation.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Reservation deleted successfully" });
    } catch (error) {
        console.error(`❌ Error in ${req.method} ${req.originalUrl}:`, error);
        res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
    }
};

///////
exports.getBookedSlots = async (req, res) => {
    try {
        const { coworkingSpace, date } = req.params;

        // Check if coworking space exists
        const existingSpace = await CoworkingSpace.findById(coworkingSpace);
        if (!existingSpace) {
            return res.status(404).json({ success: false, error: "Coworking space not found" });
        }

        // Find all booked time slots and include 'Canceled' status if the reservation is cancelled
        const bookedSlots = await Reservation.find({ coworkingSpace, date })
            .select("timeSlot -_id");

        // Filter out null or canceled slots
        const bookedTimeSlots = bookedSlots.map(slot => slot.timeSlot).filter(Boolean);

        res.status(200).json({
            success: true,
            coworkingSpace,
            date,
            bookedTimeSlots
        });
    } catch (error) {
        console.error("❌ Error fetching booked slots:", error);
        res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
};

exports.cancelReservation = async (req, res) => {
    try {
        let reservation = await Reservation.findById(req.params.id);

        if (!reservation) {
            return res.status(404).json({ success: false, error: 'Reservation not found' });
        }

        if (reservation.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Not authorized' });
        }

        if (reservation.status === 'cancelled') {
            return res.status(400).json({ success: false, error: 'This reservation is already cancelled' });
        }

        // Update the status to 'cancelled' and set timeSlot to 'Canceled - [reservation_id]'
        reservation.status = 'cancelled';
        reservation.timeSlot = `Canceled - ${reservation._id}`;  // Add booking ID and status
        await reservation.save();

        res.status(200).json({
            success: true,
            message: "Reservation cancelled and time slot cleared successfully",
            data: reservation
        });
    } catch (error) {
        console.error("❌ Error cancelling reservation:", error);
        res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
};

exports.createCoworkingSpace = async (req, res) => {
    try {
        const { name, address, telephoneNumber, openTime, closeTime, coordinates } = req.body;

        if (!name || !address || !telephoneNumber || !openTime || !closeTime || !coordinates) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please provide all required fields: name, address, telephoneNumber, openTime, closeTime, coordinates.' 
            });
        }

        // Validate coordinates (latitude, longitude)
        if (!Array.isArray(coordinates) || coordinates.length !== 2 || 
            typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
            return res.status(400).json({ 
                success: false, 
                error: 'Coordinates must be an array with [longitude, latitude].' 
            });
        }

        const coworkingSpace = await CoworkingSpace.create({
            name,
            address,
            telephoneNumber,
            openTime,
            closeTime,
            coordinates: { type: 'Point', coordinates }
        });

        res.status(201).json({
            success: true,
            data: coworkingSpace
        });
    } catch (error) {
        console.error('Error creating coworking space:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
};

// @desc    Update requested equipment in a reservation
// @route   PUT /api/v1/reservations/:reservationId/equipment
// @access  Private (User who created the reservation)
exports.updateRequestedEquipment = async (req, res, next) => {
    const { reservationId } = req.params;
    const { requestedEquipment } = req.body;

    // Validate input
    if (!requestedEquipment || !Array.isArray(requestedEquipment)) {
        return next(new ErrorResponse('Invalid requested equipment data', 400));
    }

    // Find the reservation
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
        return next(new ErrorResponse(`Reservation not found with id of ${reservationId}`, 404));
    }

    // Ensure the user owns the reservation
    if (reservation.user.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to update this reservation', 403));
    }

    // Validate and update requested equipment
    const validatedEquipment = [];
    for (const item of requestedEquipment) {
        if (!item.equipment || !item.quantityRequested) {
            return next(new ErrorResponse('Each requested equipment must have an equipment ID and quantityRequested.', 400));
        }

        const equipmentDoc = await Equipment.findById(item.equipment);

        if (!equipmentDoc) {
            return next(new ErrorResponse(`Equipment with ID ${item.equipment} not found.`, 404));
        }

        if (equipmentDoc.quantityAvailable < item.quantityRequested) {
            return next(new ErrorResponse(`Not enough quantity for ${equipmentDoc.name}. Available: ${equipmentDoc.quantityAvailable}, Requested: ${item.quantityRequested}.`, 400));
        }

        validatedEquipment.push({
            equipment: item.equipment,
            quantityRequested: item.quantityRequested,
        });
    }

    // Update the reservation
    reservation.requestedEquipment = validatedEquipment;
    await reservation.save();

    res.status(200).json({
        success: true,
        data: reservation,
    });
};

// @desc    Update requested equipment in a reservation
// @route   PUT /api/v1/reservations/:reservationId/equipment
// @access  Private (User who created the reservation)
exports.updateRequestedEquipment = async (req, res, next) => {
    const { reservationId } = req.params;
    const { requestedEquipment } = req.body;

    // Validate input
    if (!requestedEquipment || !Array.isArray(requestedEquipment)) {
        return next(new ErrorResponse('Invalid requested equipment data', 400));
    }

    // Find the reservation
    const reservation = await Reservation.findById(reservationId);

    if (!reservation) {
        return next(new ErrorResponse(`Reservation not found with id of ${reservationId}`, 404));
    }

    // Ensure the user owns the reservation
    if (reservation.user.toString() !== req.user.id) {
        return next(new ErrorResponse('Not authorized to update this reservation', 403));
    }

    // Validate and update requested equipment
    const validatedEquipment = [];
    for (const item of requestedEquipment) {
        if (!item.equipment || !item.quantityRequested) {
            return next(new ErrorResponse('Each requested equipment must have an equipment ID and quantityRequested.', 400));
        }

        const equipmentDoc = await Equipment.findById(item.equipment);

        if (!equipmentDoc) {
            return next(new ErrorResponse(`Equipment with ID ${item.equipment} not found.`, 404));
        }

        if (equipmentDoc.quantityAvailable < item.quantityRequested) {
            return next(new ErrorResponse(`Not enough quantity for ${equipmentDoc.name}. Available: ${equipmentDoc.quantityAvailable}, Requested: ${item.quantityRequested}.`, 400));
        }

        validatedEquipment.push({
            equipment: item.equipment,
            quantityRequested: item.quantityRequested,
        });
    }

    // Update the reservation
    reservation.requestedEquipment = validatedEquipment;
    await reservation.save();

    res.status(200).json({
        success: true,
        data: reservation,
    });
};

// @desc    Remove a specific equipment item from a reservation's requested list
// @route   DELETE /api/v1/reservations/:reservationId/equipment/:requestedEquipmentId
// @access  Private (User owns reservation or Admin)
exports.removeEquipmentFromReservation = async (req, res, next) => {
    // Use the correct parameter names from the route definition (:id, :equipmentId)
    const { id: reservationId, equipmentId: requestedEquipmentId } = req.params;

    // Find the reservation
    const reservation = await Reservation.findById(reservationId); // Use reservationId (aliased from id)

    if (!reservation) {
        return next(
            new ErrorResponse(`Reservation not found with id of ${reservationId}`, 404) // Use reservationId
        );
    }

    // TODO: Authorization check: Ensure req.user.id matches reservation.user or user is admin

    // Pull the specific equipment item from the requestedEquipment array
    const updatedReservation = await Reservation.findByIdAndUpdate(
        reservationId, // Use reservationId
        { $pull: { requestedEquipment: { _id: requestedEquipmentId } } }, // Use requestedEquipmentId (aliased from equipmentId)
        { new: true, runValidators: true }
    );

    if (!updatedReservation) {
        // This might happen if the pull operation didn't find the item, though findById should have caught the reservation absence.
        return next(new ErrorResponse(`Could not update reservation ${reservationId}`, 500)); // Use reservationId
    }

    res.status(200).json({ success: true, data: updatedReservation });
};