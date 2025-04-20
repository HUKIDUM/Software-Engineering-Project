'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FiSave, FiX, FiMapPin, FiUsers, FiMap } from 'react-icons/fi';
import Link from 'next/link';
import Map from '@/components/Map';
import { getAddressFromCoordinates } from '@/lib/googleMaps';

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

const EditCoworkingSpacePage = ({ params }: { params: { id: string } }) => {
  // Unwrap params using React.use()
  const resolvedParams = React.use(params);
  const spaceId = resolvedParams.id;
  
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CoworkingSpace | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);

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
      
      if (spaceId) {
        fetchCoworkingSpace();
      }
    }
  }, [isAuthenticated, isLoading, user, router, spaceId]);

  const fetchCoworkingSpace = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/coworking-spaces/${spaceId}`);
      setFormData(response.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching co-working space:', err);
      setError('Failed to load co-working space details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return;
    
    const { name, value } = e.target;
    
    if (name === 'longitude' || name === 'latitude') {
      const index = name === 'longitude' ? 0 : 1;
      const newCoordinates: [number, number] = [...formData.coordinates.coordinates];
      newCoordinates[index] = parseFloat(value) || 0;
      
      setFormData({
        ...formData,
        coordinates: {
          ...formData.coordinates,
          coordinates: newCoordinates
        }
      });
    } else if (name === 'availableSeats') {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    if (!formData) return;
    
    // Validate coordinates
    if (
      typeof lat !== 'number' || 
      typeof lng !== 'number' || 
      isNaN(lat) || 
      isNaN(lng) || 
      lat < -90 || 
      lat > 90 || 
      lng < -180 || 
      lng > 180
    ) {
      console.error('Invalid coordinates:', lat, lng);
      return;
    }
    
    // Update coordinates (note: coordinates array is [longitude, latitude])
    const newCoordinates: [number, number] = [lng, lat];
    
    setFormData({
      ...formData,
      coordinates: {
        ...formData.coordinates,
        coordinates: newCoordinates
      }
    });

    // Try to get the address from the coordinates if location is empty
    if (!formData.location) {
      try {
        const address = await getAddressFromCoordinates(lat, lng);
        if (address) {
          setFormData(prev => {
            if (!prev) return null;
            return {
              ...prev,
              location: address
            };
          });
        }
      } catch (err) {
        console.error('Error fetching address:', err);
      }
    }
  };

  const toggleMap = () => {
    setShowMap(!showMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      await api.put(`/coworking-spaces/${spaceId}`, formData);
      router.push('/admin');
    } catch (err: Error | unknown) {
      console.error('Error updating coworking space:', err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to update coworking space. Please try again.';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  // Ensure coordinates are valid for the map
  const validateCoordinates = () => {
    if (!formData) return false;
    
    const [lng, lat] = formData.coordinates.coordinates;
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' && 
      !isNaN(lat) && 
      !isNaN(lng) && 
      lat >= -90 && 
      lat <= 90 && 
      lng >= -180 && 
      lng <= 180
    );
  };

  const mapPosition = validateCoordinates() && formData 
    ? { 
        lat: formData.coordinates.coordinates[1], 
        lng: formData.coordinates.coordinates[0] 
      }
    : { lat: 13.7563, lng: 100.5018 }; // Default to Bangkok

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <p className="text-gray-500">Co-working space not found.</p>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Return to Admin Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:items-center lg:justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold leading-7 text-gray-900 sm:text-3xl sm:truncate">
              Edit Co-working Space
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Update the details of {formData.name}
            </p>
          </div>
          <div className="mt-5 flex lg:mt-0 lg:ml-4">
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FiX className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              Cancel
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    <FiMapPin className="inline-block mr-1" /> Space Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    <FiMapPin className="inline-block mr-1" /> Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label htmlFor="availableSeats" className="block text-sm font-medium text-gray-700">
                    <FiUsers className="inline-block mr-1" /> Available Seats
                  </label>
                  <input
                    type="number"
                    name="availableSeats"
                    id="availableSeats"
                    min="1"
                    value={formData.availableSeats}
                    onChange={handleChange}
                    required
                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-1">
                      <FiMapPin className="inline-block mr-1" /> Coordinates
                    </legend>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={toggleMap}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <FiMap className="-ml-0.5 mr-2 h-4 w-4" />
                        {showMap ? 'Hide Map' : 'Pick on Map'}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="longitude" className="block text-xs font-medium text-gray-500">Longitude</label>
                        <input
                          type="number"
                          name="longitude"
                          id="longitude"
                          step="any"
                          value={formData.coordinates.coordinates[0]}
                          onChange={handleChange}
                          required
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label htmlFor="latitude" className="block text-xs font-medium text-gray-500">Latitude</label>
                        <input
                          type="number"
                          name="latitude"
                          id="latitude"
                          step="any"
                          value={formData.coordinates.coordinates[1]}
                          onChange={handleChange}
                          required
                          className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Map section */}
                {showMap && (
                  <div className="col-span-2 mt-2">
                    <div className="border border-gray-300 rounded-md overflow-hidden">
                      <Map
                        center={mapPosition}
                        zoom={15}
                        height="400px"
                        markers={[
                          {
                            position: mapPosition,
                            title: formData.name,
                          },
                        ]}
                        onMapClick={handleMapClick}
                        draggableMarker={true}
                        onMarkerDrag={handleMapClick}
                      />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Click on the map to update the location or drag the marker to adjust.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <FiSave className="mr-2 -ml-1 h-5 w-5" />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCoworkingSpacePage; 