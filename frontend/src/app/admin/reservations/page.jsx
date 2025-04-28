'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client'; // Added import
import { useAuth } from '@/contexts/AuthContext';
import { getAllReservationsAdmin } from '@/lib/reservationApi'; // Import from reservationApi

function AdminReservationsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    if (token) {
      const fetchReservations = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await getAllReservationsAdmin(token);
          if (response.success && Array.isArray(response.data)) {
            setReservations(response.data);
          } else {
            throw new Error(response.error || 'Failed to fetch reservations or invalid data format');
          }
        } catch (err) {
          console.error("Error fetching all reservations:", err);
          setError(err.message || 'Could not fetch reservations.');
        } finally {
          setLoading(false);
        }
      };
      fetchReservations();
    }
  }, [user, token, authLoading, router]);

  // Effect for Socket.IO
  useEffect(() => {
    if (user?.role !== 'admin' || !token) {
      return;
    }

    const socket = io('http://localhost:5003', { withCredentials: true });

    socket.on('connect', () => console.log('Socket connected (Reservations Admin):', socket.id));
    socket.on('disconnect', (reason) => console.log('Socket disconnected (Reservations Admin):', reason));
    socket.on('connect_error', (err) => console.error('Socket connection error (Reservations Admin):', err));

    // TODO: Verify event name ('new_reservation', 'updated_reservation'?)
    const handleReservationUpdate = (updatedReservation) => {
      console.log('Received reservation update via socket:', updatedReservation);
      // Update logic: Replace existing or add new?
      // For simplicity, let's just prepend new ones assuming 'new_reservation' event
      // A more robust solution would check if the ID exists and update/replace
      // Also ensure `updatedReservation` has the necessary populated fields
      setReservations((prevReservations) => [
        updatedReservation,
        ...prevReservations.filter(r => r._id !== updatedReservation._id) // Prevent duplicates if update event covers creation
      ]);
    };

    socket.on('new_reservation', handleReservationUpdate); 
    // socket.on('updated_reservation', handleReservationUpdate); // Add if needed

    return () => {
      console.log('Disconnecting reservations admin socket...');
      socket.off('new_reservation', handleReservationUpdate);
      // socket.off('updated_reservation', handleReservationUpdate);
      socket.disconnect();
    };

  }, [user, token]);

  if (authLoading || loading) {
    return <div className="p-4 text-center">Loading reservations...</div>;
  }
  if (!user || user.role !== 'admin') {
    return <div className="p-4 text-center text-red-600">Access Denied.</div>; 
  }
  if (error) {
    return <div className="p-4 text-center text-red-600">Error: {error}</div>;
  }

  // Log the state just before rendering
  console.log('>>> Rendering AdminReservationsPage with reservations state:', reservations);

  // Filter out any null/undefined entries in the reservations array before mapping
  const validReservations = reservations.filter(res => res != null);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin - All Reservations</h1>

      {validReservations.length === 0 ? (
        <p>No valid reservations found.</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Res ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slot</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment Req.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validReservations.map((res) => {
                // Log each reservation object being mapped
                console.log('>>> Mapping reservation:', res);
                // Basic check to prevent rendering if res is somehow still null/undefined here
                if (!res) return null;

                return (
                  <tr key={res._id ?? `invalid-${Math.random()}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" title={res._id}>{res._id?.slice(-6) ?? 'N/A'}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.coworkingSpace?.name ?? 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.date ? new Date(res.date).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.timeSlot ?? 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{res.status ?? 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {res.requestedEquipment && res.requestedEquipment.length > 0 ? (
                        <ul>
                          {res.requestedEquipment.map((eq, index) => {
                            // Log each equipment item
                            console.log('>>> Mapping equipment item:', eq);
                            return (
                              <li key={index}>{eq?.equipment?.name ?? 'Unknown'} x {eq?.quantityRequested ?? '?'}</li>
                            );
                          })}
                        </ul>
                      ) : (
                        'None'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{res.createdAt ? new Date(res.createdAt).toLocaleString() : 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminReservationsPage; 