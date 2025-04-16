'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { FiCalendar, FiMapPin, FiClock, FiX, FiCheckCircle, FiAlertCircle, FiArchive, FiTool, FiPackage, FiMinusCircle, FiPlusCircle } from 'react-icons/fi';

interface Equipment { // Represents the base Equipment definition
  _id: string;
  name: string;
  description?: string;
  quantityAvailable?: number; // Add quantity available, might be needed from fetch
}

interface RequestedEquipment { // Represents an equipment item within a specific reservation request
  _id: string; // Add the ID for the specific request entry
  equipment: Equipment;
  quantityRequested: number;
}

interface Reservation {
  _id: string;
  coworkingSpace: {
    _id: string;
    name: string;
    location: string;
  };
  date: string;
  timeSlot: string;
  status: string;
  requestedEquipment?: RequestedEquipment[];
}

const ReservationsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<RequestedEquipment[]>([]); // Equipment currently in the reservation being edited
  const [availableSpaceEquipment, setAvailableSpaceEquipment] = useState<Equipment[]>([]); // All equipment available at the space
  const [loadingEquipment, setLoadingEquipment] = useState(false); // Loading state for available equipment
  const router = useRouter();

  const timeSlots = [
    "09:00 - 12:00",
    "12:00 - 15:00",
    "15:00 - 18:00",
    "18:00 - 21:00"
  ];

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated) {
      fetchReservations();
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reservations/my');
      setReservations(response.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError('Failed to load your reservations. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (id: string) => {
    try {
      await api.delete(`/reservations/${id}`);
      setCancelSuccess('Reservation deleted successfully');
      // Remove the reservation from local state
      setReservations(reservations.filter(res => res._id !== id));
      setTimeout(() => setCancelSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting reservation:', err);
      setError('Failed to delete reservation. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Fetch available equipment for the specific coworking space
  const fetchAvailableEquipmentForSpace = async (spaceId: string) => {
    setLoadingEquipment(true);
    setUpdateError(''); // Clear previous errors
    try {
      const response = await api.get(`/coworking-spaces/${spaceId}/equipment`);
      const equipmentData = response.data.data || [];
      setAvailableSpaceEquipment(equipmentData);
    } catch (err) {
      console.error('Error fetching available equipment:', err);
      setAvailableSpaceEquipment([]); // Clear equipment on error
      setUpdateError('Failed to load available equipment for this space.'); // Show error in modal
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleEdit = async (reservation: Reservation) => {
    setEditingReservation(reservation);
    setNewDate(reservation.date.split('T')[0]); // Format date for input
    setNewTimeSlot(reservation.timeSlot);
    // Initialize editingEquipment based on the reservation's current state
    setEditingEquipment(reservation.requestedEquipment ? [...reservation.requestedEquipment] : []);
    // Fetch all available equipment for the space
    await fetchAvailableEquipmentForSpace(reservation.coworkingSpace._id);
  };

  const handleUpdate = async () => {
    if (!editingReservation) return;

    try {
      // Update basic reservation details
      await api.put(`/reservations/${editingReservation._id}`, {
        date: newDate,
        timeSlot: newTimeSlot
      });

      // Prepare payload for equipment update - only include items with quantity > 0
      const equipmentPayload = editingEquipment
        .filter(eq => eq.quantityRequested > 0)
        .map(eq => ({
          equipment: eq.equipment._id, // Send only the equipment ID
          quantityRequested: eq.quantityRequested,
          _id: eq._id // Include the specific request entry ID if it exists (for updates/removals)
        }));

      // Update equipment requests
      await api.put(`/reservations/${editingReservation._id}/equipment`, {
        requestedEquipment: equipmentPayload, // Send the mapped payload
        reservationId: editingReservation._id
      });

      // Fetch the updated reservation data to ensure local state is accurate
      // (Alternatively, manually update local state like before, but fetching is safer)
      await fetchReservations(); // Re-fetch all reservations to get the latest data

      // Update local state (kept for immediate feedback, but fetchReservations overwrites it)
      setReservations(reservations.map(res =>
        res._id === editingReservation._id
          ? { 
              ...res, 
              date: newDate, 
              timeSlot: newTimeSlot,
              requestedEquipment: editingEquipment 
            }
          : res
      ));

      setEditingReservation(null); // Close modal
      setEditingEquipment([]); // Clear editing state
      setAvailableSpaceEquipment([]); // Clear available equipment state
      setCancelSuccess('Reservation updated successfully');
      setTimeout(() => setCancelSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating reservation:', err);
      setUpdateError('Failed to update reservation. Please try again.');
      setTimeout(() => setUpdateError(''), 3000);
    }
  };

  // Handles changing quantity for ANY available equipment item in the modal
  const handleEquipmentQuantityChange = (
    targetEquipment: Equipment, // The equipment item being changed (from availableSpaceEquipment)
    newQuantity: number
  ) => {
    setEditingEquipment(prev => {
      const existingIndex = prev.findIndex(item => item.equipment._id === targetEquipment._id);
      const updatedEquipment = [...prev];
      const quantity = Math.max(0, Math.min(newQuantity, targetEquipment.quantityAvailable || Infinity)); // Ensure quantity is valid

      if (existingIndex > -1) {
        // Equipment already in the list
        const originalQuantity = prev[existingIndex].quantityRequested; // Get original quantity

        if (quantity > 0) {
          // Update quantity if it's still positive
          updatedEquipment[existingIndex] = {
            ...updatedEquipment[existingIndex],
            quantityRequested: quantity
          };
        } else { // quantity is 0
          // Check if original quantity was > 0 before asking for confirmation
          if (originalQuantity > 0) {
            // Use targetEquipment.name for a user-friendly message
            const confirmed = window.confirm(`Are you sure you want to remove ${targetEquipment.name} from your reservation?`);
            if (confirmed) {
              // Remove it from the list only if confirmed
              updatedEquipment.splice(existingIndex, 1);
            } else {
              // If not confirmed, return the original state to prevent the change
              return prev;
            }
          } else {
            // Original quantity was already 0, just ensure it's removed if somehow still present
             updatedEquipment.splice(existingIndex, 1); // Keep the removal for consistency
          }
        }
      } else if (quantity > 0) {
        // Equipment not in the list and quantity > 0, add it
        // We need a temporary unique ID for the key prop in the map, but the backend uses equipment._id
        // For the PUT request, we only need equipment._id and quantityRequested.
        // The existing `_id` on RequestedEquipment is for the *specific request entry*, not the equipment itself.
        // Let's generate a temporary client-side ID for new items for React keys.
        updatedEquipment.push({
          _id: `temp-${targetEquipment._id}-${Date.now()}`, // Temporary ID for React key
          equipment: targetEquipment,
          quantityRequested: quantity
        });
      }
      return updatedEquipment;
    });
  };

  // This function might still be useful for explicitly removing an item via API immediately,
  // but changing quantity to 0 and updating should also work. Let's keep it for now.
  const handleRemoveEquipment = async (equipmentEntryId: string) => {
    if (!editingReservation) return;

    try {
      // Correct the API endpoint path
      await api.delete(`/reservations/${editingReservation._id}/remove-equipment/${equipmentEntryId}`);
      
      // Update local state immediately
      setEditingEquipment(prev => prev.filter(eq => eq._id !== equipmentEntryId));
      
      // Optionally show a success message (can reuse cancelSuccess state or add a new one)
      setCancelSuccess('Equipment removed successfully');
      setTimeout(() => setCancelSuccess(''), 3000);

    } catch (err) {
      console.error('Error removing equipment:', err);
      // Use updateError state for consistency in the modal
      setUpdateError('Failed to remove equipment. Please try again.');
      setTimeout(() => setUpdateError(''), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isUpcoming = (dateString: string, timeSlot: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const reservationDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (reservationDateOnly < nowDateOnly) return false;
    if (reservationDateOnly > nowDateOnly) return true;

    const currentHour = now.getHours();
    const slotEndTimeParts = timeSlot.split(' - ')[1]?.split(':');
    const slotEndHour = slotEndTimeParts ? parseInt(slotEndTimeParts[0], 10) : 24;

    return !isNaN(slotEndHour) && currentHour < slotEndHour;
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (editingReservation) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3 text-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Reservation</h3>
            <div className="mt-2 px-7 py-3">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Time Slot</label>
                <select
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                >
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4 text-left"> {/* Align content left */}
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  <FiPackage className="inline mr-1" /> Equipment
                </label>
                {loadingEquipment ? (
                  <div className="flex justify-center items-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : availableSpaceEquipment.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2"> {/* Scrollable equipment list */}
                    {availableSpaceEquipment.map((availEq, index) => { // Added index for potential key issues
                      const currentRequest = editingEquipment.find(req => req.equipment._id === availEq._id);
                      const currentQuantity = currentRequest?.quantityRequested || 0;
                      const maxQuantity = availEq.quantityAvailable ?? Infinity; // Use Infinity if undefined

                      return (
                        <div key={availEq._id} className="flex justify-between items-center p-2 border rounded-md bg-gray-50">
                          <div>
                            <span className="font-medium text-gray-800 text-sm">{availEq.name}</span>
                            <span className="text-xs text-gray-500 ml-2">(Max: {maxQuantity === Infinity ? 'N/A' : maxQuantity})</span>
                            {availEq.description && <p className="text-xs text-gray-500 mt-0.5">{availEq.description}</p>}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleEquipmentQuantityChange(availEq, currentQuantity - 1)}
                              disabled={currentQuantity === 0}
                              className="p-1 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Decrease quantity of ${availEq.name}`}
                            >
                              <FiMinusCircle className="h-5 w-5" />
                            </button>
                            <span className="w-6 text-center font-medium text-sm">{currentQuantity}</span>
                            <button
                              type="button"
                              onClick={() => handleEquipmentQuantityChange(availEq, currentQuantity + 1)}
                              disabled={currentQuantity >= maxQuantity}
                              className="p-1 rounded-full text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Increase quantity of ${availEq.name}`}
                            >
                              <FiPlusCircle className="h-5 w-5" />
                            </button>
                            {/* Optional: Keep explicit remove button if needed, maps to handleRemoveEquipment(currentRequest._id) */}
                            {/* {currentRequest && (
                              <button
                                onClick={() => handleRemoveEquipment(currentRequest._id)}
                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 ml-1"
                                aria-label={`Remove ${availEq.name} completely`}
                              >
                                <FiX size={14} />
                              </button>
                            )} */}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic mt-2">No equipment available at this location.</p>
                )}
              </div>
              {updateError && (
                <div className="mb-4 text-red-500 text-sm">{updateError}</div>
              )}
            </div>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-indigo-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Update
              </button>
              <button
                onClick={() => setEditingReservation(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              My Reservations
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage your co-working space reservations
            </p>
          </div>
          {reservations.length > 0 && (
            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              <Link
                href="/coworking-spaces"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <FiCalendar className="-ml-1 mr-2 h-5 w-5" />
                Book New Space
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
            <FiAlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {cancelSuccess && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
            <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <div className="text-sm text-green-600">{cancelSuccess}</div>
          </div>
        )}

        <div className="mt-8">
          {reservations.length === 0 ? (
            <div className="text-center py-12 bg-white shadow overflow-hidden sm:rounded-lg">
              <p className="text-gray-500">You do not have any reservations yet.</p>
              <Link
                href="/coworking-spaces"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <FiCalendar className="-ml-1 mr-2 h-5 w-5" />
                Book a Space Now
              </Link>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {reservations.map((reservation) => {
                  // Calculate isPast only on the client
                  const isPast = isClient ? !isUpcoming(reservation.date, reservation.timeSlot) : false;
                  const isDone = reservation.status === 'done';
                  const isCancelled = reservation.status === 'cancelled';
                  const isActive = reservation.status === 'active'; // Explicitly check for active

                  // Determine if actions should be allowed based on client-side check
                  const allowActions = isClient && isActive && !isPast;

                  return (
                    <li key={reservation._id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                            <FiMapPin className="h-6 w-6 text-indigo-600" />
                          </div>
                          <div className="ml-4">
                            <h4 className="text-lg font-medium text-gray-900">
                              {reservation.coworkingSpace.name}
                            </h4>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <FiMapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <p>{reservation.coworkingSpace.location}</p>
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <FiCalendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <p>{formatDate(reservation.date)}</p>
                            </div>
                            <div className="mt-1 flex items-center text-sm text-gray-500">
                              <FiClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <p>{reservation.timeSlot}</p>
                            </div>
                            {/* Equipment Section */}
                            {reservation.requestedEquipment && reservation.requestedEquipment.length > 0 && (
                              <div className="mt-1 flex items-start text-sm text-gray-500">
                                <FiTool className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                  <p className="font-medium">Equipment:</p>
                                  <ul className="mt-1 ml-4 space-y-1">
                                    {reservation.requestedEquipment.map((item, index) => (
                                      <li key={index} className="flex items-center">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                        {item.equipment.name}
                                        <span className="ml-1 text-gray-400">
                                          ({item.quantityRequested} {item.quantityRequested === 1 ? 'unit' : 'units'})
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          {/* Status Indicator */}
                          <div className={`flex items-center text-sm font-medium 
                            ${isActive && !isPast ? 'text-green-600' : ''}
                            ${isCancelled ? 'text-red-600' : ''}
                            ${isDone || (isActive && isPast) ? 'text-gray-500' : ''} // Show gray for done or active-but-past
                          `}>
                            {isActive && !isPast && (
                              <><FiCheckCircle className="h-5 w-5 mr-1" /> Active</>
                            )}
                            {isCancelled && (
                              <><FiX className="h-5 w-5 mr-1" /> Cancelled</>
                            )}
                            {(isDone || (isActive && isPast)) && (
                              <><FiArchive className="h-5 w-5 mr-1" /> Done</> // Use Done for both cases
                            )}
                          </div>
                          
                          {/* Action Buttons - Show only if client ready, active, and not past */}
                          {allowActions && (
                            <div className="space-x-2">
                              {/* Edit Button */}
                              <button
                                onClick={() => handleEdit(reservation)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                              >
                                Edit
                              </button>
                              {/* Cancel Button */}
                              <button
                                onClick={() => cancelReservation(reservation._id)}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          
                          {/* Optional: Explicitly show 'Past' text if needed, though 'Done' covers it visually */}
                          {/* {isClient && isPast && isActive && (
                            <span className="text-xs text-gray-500">Past reservation</span>
                          )} */}

                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationsPage;