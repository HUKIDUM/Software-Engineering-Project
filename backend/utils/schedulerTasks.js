const Reservation = require('../models/reservation');

// Function to parse time slot end time (e.g., "18:00 - 21:00" -> 21)
const parseTimeSlotEndTime = (timeSlot) => {
  try {
    const endTimeString = timeSlot.split(' - ')[1]; // "21:00"
    const endHour = parseInt(endTimeString.split(':')[0], 10); // 21
    if (isNaN(endHour)) {
      console.error(`[Scheduler] Invalid time slot format for parsing end time: ${timeSlot}`);
      return 24; // Default to end of day if parsing fails
    }
    return endHour;
  } catch (error) {
    console.error(`[Scheduler] Error parsing time slot: ${timeSlot}`, error);
    return 24; // Default to end of day on error
  }
};

const updatePastReservations = async () => {
  console.log('[Scheduler] Running task: updatePastReservations...');
  const now = new Date();

  try {
    // Find active reservations where the date is in the past OR
    // the date is today, but the time slot's end time has passed.
    const reservationsToUpdate = await Reservation.find({
      status: 'active',
      // We need to check date and time slot combination
    });

    let updatedCount = 0;
    const promises = [];

    for (const reservation of reservationsToUpdate) {
      const reservationDate = new Date(reservation.date);
      const reservationDateEnd = new Date(reservationDate);
      const slotEndHour = parseTimeSlotEndTime(reservation.timeSlot);
      
      // Set the time to the end of the time slot on the reservation date
      reservationDateEnd.setHours(slotEndHour, 0, 0, 0);

      // If the end of the reservation slot is before the current time
      if (reservationDateEnd < now) {
        console.log(`[Scheduler] Found past reservation to update: ${reservation._id}`);
        promises.push(
          Reservation.findByIdAndUpdate(reservation._id, { status: 'done' })
        );
        updatedCount++;
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(`[Scheduler] Successfully updated ${updatedCount} past reservations to 'done'.`);
    } else {
      console.log('[Scheduler] No past reservations found to update.');
    }

  } catch (error) {
    console.error('[Scheduler] Error updating past reservations:', error);
  }
};

module.exports = { updatePastReservations }; 