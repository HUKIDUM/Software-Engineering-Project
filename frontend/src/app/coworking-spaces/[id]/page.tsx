'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FiMapPin, FiUsers, FiCalendar, FiClock, FiCheckCircle, FiPackage, FiMinusCircle, FiPlusCircle } from 'react-icons/fi';
import Map from '@/components/Map';

interface CoworkingSpace {
  _id: string;
  name: string;
  location: string;
  availableSeats: number;
  coordinates: {
    type: string;
    coordinates: [number, number];
  };
}

interface BookedSlot {
  timeSlot: string;
}

interface Equipment {
  _id: string;
  name: string;
  description?: string;
  quantityAvailable: number;
  coworkingSpace: string;
}

interface RequestedEquipmentState {
  [equipmentId: string]: number;
}

interface CoworkingSpaceDetailPageProps {
  params: { id: string };
}

const timeSlots: string[] = [
  '09:00 - 12:00',
  '12:00 - 15:00',
  '15:00 - 18:00',
  '18:00 - 21:00',
];

const CoworkingSpaceDetailPage: React.FC<CoworkingSpaceDetailPageProps> = ({ params }) => {
  // Cast params to any for React.use, then cast result to expected type
  const resolvedParams = React.use(params as any) as { id: string };
  const spaceId = resolvedParams.id;
  const { isAuthenticated, isLoading } = useAuth();
  const [space, setSpace] = useState<CoworkingSpace | null>(null);
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [requestedEquipment, setRequestedEquipment] = useState<RequestedEquipmentState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [equipmentError, setEquipmentError] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [reservationSuccess, setReservationSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated && spaceId) {
      setLoading(true);
      Promise.all([fetchCoworkingSpace(), fetchAvailableEquipment()])
        .catch((err) => {
          console.error("Error during initial data fetch:", err);
          setError("Failed to load page data. Please try refreshing.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isAuthenticated, isLoading, spaceId, router]);

  useEffect(() => {
    if (selectedDate && space) {
      fetchBookedSlots();
      setReservationSuccess(false);
    }
  }, [selectedDate, space]);

  const fetchCoworkingSpace = async () => {
    try {
      const response = await api.get(`/coworking-spaces/${spaceId}`);
      setSpace(response.data.data);
      const today = new Date();
      if (!selectedDate) {
      setSelectedDate(today.toISOString().split('T')[0]);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching co-working space:', err);
      setError('Failed to load co-working space details.');
      throw err;
    }
  };

  const fetchAvailableEquipment = async () => {
    if (!spaceId) return;
    try {
      setEquipmentError('');
      const response = await api.get(`/coworking-spaces/${spaceId}/equipment`);
      setAvailableEquipment(response.data.data);
    } catch (err) {
      console.error('Error fetching available equipment:', err);
      setEquipmentError('Failed to load available equipment.');
      throw err;
    }
  };

  const fetchBookedSlots = async () => {
    if (!spaceId || !selectedDate) return;
    try {
      const response = await api.get<{ success: boolean; bookedTimeSlots: string[] }>(`/reservations/booked/${spaceId}/${selectedDate}`);
      setBookedSlots(response.data.bookedTimeSlots || []);
    } catch (err) {
      console.error('Error fetching booked slots:', err);
      setError('Failed to load availability for the selected date.');
      setBookedSlots([]);
    }
  };

  const isSlotAvailable = (timeSlot: string): boolean => {
    return !bookedSlots.includes(timeSlot);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    setSelectedTimeSlot('');
    setReservationSuccess(false);
    setError('');
  };

  const handleTimeSlotSelect = (timeSlot: string) => {
    setSelectedTimeSlot(timeSlot);
    setReservationSuccess(false);
    setError('');
  };

  const handleEquipmentQuantityChange = (equipmentId: string, quantity: number, maxQuantity: number) => {
    const newQuantity = Math.max(0, Math.min(quantity, maxQuantity));
    setRequestedEquipment((prev: RequestedEquipmentState) => ({
      ...prev,
      [equipmentId]: newQuantity
    }));
  };

  const handleReservation = async () => {
    if (!selectedDate || !selectedTimeSlot) {
      setError('Please select both date and time slot');
      return;
    }
    setError('');
    setReservationSuccess(false);

    const equipmentEntries: [string, number][] = Object.entries(requestedEquipment);

    const equipmentPayload = equipmentEntries
      .filter(([, quantity]: [string, number]) => quantity > 0)
      .map(([equipmentId, quantity]: [string, number]) => ({
        equipment: equipmentId,
        quantityRequested: quantity
      }));

    try {
      await api.post('/reservations', {
        coworkingSpace: spaceId,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        requestedEquipment: equipmentPayload
      });
      
      setReservationSuccess(true);
      setSelectedTimeSlot('');
      setRequestedEquipment({});
      fetchBookedSlots();
      fetchAvailableEquipment();

    } catch (err: unknown) {
      console.error('Error making reservation:', err);
      let errorMessage = 'Failed to make reservation. Please check your selections and try again.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
          const responseError = err.response as { data?: { error?: string } };
          if (responseError.data?.error) {
              errorMessage = responseError.data.error;
          }
      }
      setError(errorMessage);
    }
  };

  const validateCoordinates = (space: CoworkingSpace): boolean => {
    if (!space?.coordinates?.coordinates) {
      return false;
    }
    const [lng, lat] = space.coordinates.coordinates;
    return (
      typeof lat === 'number' && typeof lng === 'number' &&
      !isNaN(lat) && !isNaN(lng) &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
    );
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">{error || 'Co-working space not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasValidCoordinates = validateCoordinates(space);
  const mapCenter = hasValidCoordinates 
    ? { lat: space.coordinates.coordinates[1], lng: space.coordinates.coordinates[0] }
    : { lat: 13.7563, lng: 100.5018 };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h1 className="text-2xl font-semibold text-gray-900">{space.name}</h1>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <FiMapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
              <p>{space.location}</p>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <FiUsers className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
              <p>{space.availableSeats} available seats</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Location</h2>
              {!hasValidCoordinates && (
                <div className="mb-3 text-sm text-amber-600">
                  <p>Could not display exact location on map</p>
                </div>
              )}
              <Map 
                center={mapCenter}
                markers={hasValidCoordinates ? [{
                  position: mapCenter,
                  title: space.name
                }] : []}
                height="300px"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900 flex items-center mb-6">
              <FiCalendar className="mr-2" /> Make a Reservation
            </h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-600">{error}</div>
              </div>
            )}

            {reservationSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4 flex items-center">
                <FiCheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <div className="text-sm text-green-600">
                   Reservation successful! Equipment (if any) is included.
                   You can view details in <a href="/reservations" className="font-medium underline hover:text-green-700">My Reservations</a>.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={reservationSuccess}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100"
                />
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select Time Slot
                  </label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {timeSlots.map((slot: string) => {
                    const available = isSlotAvailable(slot);
                      return (
                        <button
                        key={slot}
                          type="button"
                        disabled={!available || !selectedDate || reservationSuccess}
                        onClick={() => handleTimeSlotSelect(slot)}
                        className={`px-4 py-2 border rounded-md text-sm font-medium 
                          ${selectedTimeSlot === slot ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 text-gray-700'} 
                          ${!available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100`}
                      >
                        <FiClock className="inline mr-1 h-4 w-4" />
                        {slot}
                        {!available && <span className="text-xs ml-1">(Full)</span>}
                        </button>
                      );
                    })}
                  </div>
              </div>
            </div>

            {availableEquipment.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-md leading-6 font-medium text-gray-900 flex items-center mb-4">
                        <FiPackage className="mr-2" /> Available Equipment (Optional)
                    </h3>
                    {equipmentError && (
                        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <div className="text-sm text-yellow-600">{equipmentError}</div>
                </div>
              )}
                    <div className="space-y-4">
                        {availableEquipment.map((equip: Equipment) => (
                            <div key={equip._id} className="flex justify-between items-center p-3 border rounded-md">
                                <div>
                                    <span className="font-medium text-gray-800">{equip.name}</span>
                                    <span className="text-sm text-gray-500 ml-2">(Available: {equip.quantityAvailable})</span>
                                    {equip.description && <p className="text-xs text-gray-500 mt-1">{equip.description}</p>}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button 
                                        type="button" 
                                        onClick={() => handleEquipmentQuantityChange(equip._id, (requestedEquipment[equip._id] || 0) - 1, equip.quantityAvailable)}
                                        disabled={(requestedEquipment[equip._id] || 0) === 0 || reservationSuccess}
                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Decrease quantity of ${equip.name}`}
                                    >
                                        <FiMinusCircle className="h-5 w-5" />
                                    </button>
                                    <span className="w-8 text-center font-medium">{requestedEquipment[equip._id] || 0}</span>
                  <button
                    type="button"
                                        onClick={() => handleEquipmentQuantityChange(equip._id, (requestedEquipment[equip._id] || 0) + 1, equip.quantityAvailable)}
                                        disabled={(requestedEquipment[equip._id] || 0) >= equip.quantityAvailable || reservationSuccess}
                                        className="p-1 rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Increase quantity of ${equip.name}`}
                                    >
                                        <FiPlusCircle className="h-5 w-5" />
                  </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={handleReservation}
                disabled={!selectedDate || !selectedTimeSlot || loading || reservationSuccess}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Booking...' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoworkingSpaceDetailPage; 