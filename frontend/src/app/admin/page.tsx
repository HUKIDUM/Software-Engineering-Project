'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { FiPlus, FiMapPin, FiUsers, FiEdit2, FiEye, FiTrash2, FiCreditCard } from 'react-icons/fi';

interface CoworkingSpace {
  _id: string;
  name: string;
  location: string;
  availableSeats: number;
}

const AdminDashboardPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [spaces, setSpaces] = useState<CoworkingSpace[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      
      if (user && user.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      
      fetchCoworkingSpaces();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchCoworkingSpaces = async () => {
    try {
      setLoading(true);
      const response = await api.get('/coworking-spaces');
      setSpaces(response.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching coworking spaces:', err);
      setError('Failed to load coworking spaces. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this co-working space? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/coworking-spaces/${id}`);
      setSuccess('Co-working space deleted successfully');
      // Refresh the list
      fetchCoworkingSpaces();
    } catch (err) {
      console.error('Error deleting co-working space:', err);
      setError('Failed to delete co-working space. Please try again.');
    }
  };

  const viewAllReservations = () => {
    router.push('/admin/reservations');
  };

  const manageMembershipPrograms = () => {
    router.push('/admin/membership-programs');
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage co-working spaces, membership programs, and reservations in the system
            </p>
          </div>
          <div className="mt-5 flex lg:mt-0 lg:ml-4 space-x-3">
            <Link
              href="/admin/coworking-spaces/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <FiPlus className="-ml-1 mr-2 h-5 w-5" />
              Add Co-working Space
            </Link>
            <button
              onClick={viewAllReservations}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              View All Reservations
            </button>
            <button
              onClick={manageMembershipPrograms}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiCreditCard className="-ml-1 mr-2 h-5 w-5" />
              Manage Membership Programs
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-sm text-green-600">{success}</div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Co-working Spaces</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              A list of all the co-working spaces available in the system
            </p>
          </div>
          {spaces.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">No co-working spaces found.</p>
              <Link
                href="/admin/coworking-spaces/create"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                Add New Co-working Space
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {spaces.map((space) => (
                <li key={space._id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <p className="text-md font-medium text-indigo-600 truncate">{space.name}</p>
                        <p className="sm:ml-4 mt-1 sm:mt-0 flex items-center text-sm text-gray-500">
                          <FiMapPin className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          <span>{space.location}</span>
                        </p>
                      </div>
                      <div className="flex">
                        <p className="flex items-center text-sm text-gray-500 mr-4">
                          <FiUsers className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          <span>{space.availableSeats} seats</span>
                        </p>
                        <div className="flex space-x-2">
                          <Link
                            href={`/admin/coworking-spaces/${space._id}`}
                            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title="View Details"
                          >
                            <FiEye className="h-5 w-5 text-gray-500" />
                          </Link>
                          <Link
                            href={`/admin/coworking-spaces/${space._id}/edit`}
                            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title="Edit"
                          >
                            <FiEdit2 className="h-5 w-5 text-gray-500" />
                          </Link>
                          <button
                            onClick={() => handleDelete(space._id)}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                            title="Delete"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage; 