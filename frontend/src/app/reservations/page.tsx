'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface Reservation {
  _id: string;
  coworkingSpace: {
    name: string;
    location: string;
  };
  date: string;
  timeSlot: string;
  status: string;
  requestedEquipment: {
    equipment: {
      name: string;
      description: string;
    };
    quantityRequested: number;
  }[];
}

const ReservationsPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (isAuthenticated) {
      fetchReservations();
    }
  }, [isAuthenticated, isLoading, router]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold leading-7 text-gray-900 sm:text-3xl sm:truncate">
          My Reservations
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          View all your reservations and requested equipment
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {reservations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500">No reservations found.</p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {reservations.map((reservation) => (
                <li key={reservation._id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {reservation.coworkingSpace.name}
                      </p>
                      <p className="ml-2 flex-shrink-0 font-normal text-gray-500">
                        {formatDate(reservation.date)} - {reservation.timeSlot}
                      </p>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          {reservation.coworkingSpace.location}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            reservation.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {reservation.status === 'active' ? 'Active' : 'Cancelled'}
                        </span>
                      </div>
                    </div>
                    {reservation.requestedEquipment.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-900">Requested Equipment:</h4>
                        <ul className="mt-2 text-sm text-gray-500">
                          {reservation.requestedEquipment.map((item, index) => (
                            <li key={index}>
                              {item.equipment.name} (Quantity: {item.quantityRequested})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReservationsPage;