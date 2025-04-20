const Reservation = require('../models/reservation');
const CoworkingSpace = require('../models/coworkingSpace');
const Equipment = require('../models/equipment');
const { sendEmail } = require('../utils/sendEmail');
const User = require('../models/user');

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

