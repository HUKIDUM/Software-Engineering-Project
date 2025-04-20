'use client';

import React, { useEffect, useState, useCallback, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api'; // Import API utility
import { BuildingOffice2Icon, PencilSquareIcon, TrashIcon, PlusCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'; // Example icons

// Define interfaces
interface CoworkingSpace {
  _id: string;
  name: string;
}

interface Equipment {
  _id: string;
  name: string;
  description?: string;
  quantityAvailable: number;
  coworkingSpace: string; // Should match the ID type, usually string
}

const AdminEquipmentPage: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [loadingPage, setLoadingPage] = useState(true);
  const [coworkingSpaces, setCoworkingSpaces] = useState<CoworkingSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [loadingSpaces, setLoadingSpaces] = useState(false); // Separate loading state for spaces
  const [errorSpaces, setErrorSpaces] = useState<string>(''); // Separate error state for spaces

  // State for equipment
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [errorEquipment, setErrorEquipment] = useState<string>('');

  // State for Add Equipment Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipDesc, setNewEquipDesc] = useState('');
  const [newEquipQuantity, setNewEquipQuantity] = useState<number | string>(1); // Use string initially for input field flexibility
  const [addEquipError, setAddEquipError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for Edit Equipment Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [editEquipName, setEditEquipName] = useState('');
  const [editEquipDesc, setEditEquipDesc] = useState('');
  const [editEquipQuantity, setEditEquipQuantity] = useState<number | string>(0);
  const [editEquipError, setEditEquipError] = useState<string>('');

  // Authentication Check Effect
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        router.push('/auth/login');
      } else {
        // Fetch coworking spaces only after confirming admin auth
        fetchCoworkingSpaces(); 
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Fetch Coworking Spaces Function
  const fetchCoworkingSpaces = async () => {
    setLoadingSpaces(true);
    setErrorSpaces('');
    try {
      // Assuming the endpoint returns all spaces without pagination for admin purposes
      const response = await api.get('/coworking-spaces'); 
      if (response.data.success && Array.isArray(response.data.data)) {
        setCoworkingSpaces(response.data.data);
        // Optionally set a default selected space
        if (response.data.data.length > 0 && !selectedSpaceId) {
          setSelectedSpaceId(response.data.data[0]._id); 
        }
      } else {
        throw new Error('Invalid data format received for coworking spaces.');
      }
    } catch (err) {
      console.error('Error fetching coworking spaces:', err);
      setErrorSpaces('Failed to load coworking spaces. Please try again.');
    } finally {
      setLoadingSpaces(false);
      setLoadingPage(false); // Mark page as ready after attempting to load spaces
    }
  };

  // Fetch Equipment Function (using useCallback for potential optimization)
  const fetchEquipment = useCallback(async (spaceId: string) => {
    if (!spaceId) {
        setEquipment([]); // Clear equipment if no space is selected
        return;
    }
    setLoadingEquipment(true);
    setErrorEquipment('');
    try {
      // Use the nested route endpoint
      const response = await api.get(`/coworking-spaces/${spaceId}/equipment`);
      if (response.data.success && Array.isArray(response.data.data)) {
        setEquipment(response.data.data);
      } else {
        setEquipment([]); // Set empty array on unexpected data structure
        throw new Error('Invalid data format received for equipment.');
      }
    } catch (err) {
      console.error(`Error fetching equipment for space ${spaceId}:`, err);
      setErrorEquipment('Failed to load equipment. Please try again.');
      setEquipment([]); // Clear equipment on error
    } finally {
      setLoadingEquipment(false);
    }
  }, []); // Empty dependency array for useCallback as it doesn't depend on component state directly

  // Effect to fetch equipment when selectedSpaceId changes
  useEffect(() => {
    if (selectedSpaceId) {
      fetchEquipment(selectedSpaceId);
    }
  }, [selectedSpaceId, fetchEquipment]); // Include fetchEquipment in dependency array

  // Handler for dropdown change
  const handleSpaceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSpaceId(event.target.value);
    // Equipment fetching is handled by the useEffect hook above
  };

  // --- Add Equipment Modal Handlers ---
  const openAddModal = () => {
    setNewEquipName('');
    setNewEquipDesc('');
    setNewEquipQuantity(1);
    setAddEquipError('');
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleAddNewEquipmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddEquipError('');

    const quantityNum = parseInt(String(newEquipQuantity), 10);

    if (!newEquipName.trim()) {
      setAddEquipError('Equipment name is required.');
      return;
    }
    if (isNaN(quantityNum) || quantityNum < 0) {
      setAddEquipError('Quantity must be a non-negative number.');
      return;
    }
    if (!selectedSpaceId) {
        setAddEquipError('Cannot add equipment: No coworking space selected.');
        return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: newEquipName,
        description: newEquipDesc,
        quantityAvailable: quantityNum,
        // The coworkingSpaceId is part of the URL, not the body for this endpoint
      };
      await api.post(`/coworking-spaces/${selectedSpaceId}/equipment`, payload);
      
      closeAddModal();
      fetchEquipment(selectedSpaceId); // Refresh the equipment list
      // Optionally show a success notification

    } catch (err: any) {
      console.error("Error adding new equipment:", err);
      const message = err.response?.data?.error || 'Failed to add equipment. Please try again.';
      setAddEquipError(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- End Add Equipment Modal Handlers ---

  // --- Edit Equipment Modal Handlers ---
  const openEditModal = (equip: Equipment) => {
    setEditingEquipment(equip);
    setEditEquipName(equip.name);
    setEditEquipDesc(equip.description || '');
    setEditEquipQuantity(equip.quantityAvailable);
    setEditEquipError('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEquipment(null); // Clear editing state
  };

  const handleUpdateEquipmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingEquipment) return;

    setEditEquipError('');
    const quantityNum = parseInt(String(editEquipQuantity), 10);

    if (!editEquipName.trim()) {
      setEditEquipError('Equipment name is required.');
      return;
    }
     if (isNaN(quantityNum) || quantityNum < 0) {
      setEditEquipError('Quantity must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    try {
       // Only send fields that can be updated
      const payload = {
        name: editEquipName,
        description: editEquipDesc,
        quantityAvailable: quantityNum,
      };
      // Use the general equipment endpoint for updates
      await api.put(`/equipment/${editingEquipment._id}`, payload);
      
      closeEditModal();
      fetchEquipment(selectedSpaceId); // Refresh list
    } catch (err: any) {
      console.error("Error updating equipment:", err);
      const message = err.response?.data?.error || 'Failed to update equipment. Please try again.';
      setEditEquipError(message);
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- End Edit Equipment Modal Handlers ---

  // Placeholder handlers for buttons
  const handleAddEquipment = () => {
    console.log("Add New Equipment for space:", selectedSpaceId);
    // TODO: Open Add Equipment Modal/Form
  };

  const handleEditEquipment = (equip: Equipment) => {
    console.log("Edit Equipment:", equip);
    // TODO: Open Edit Equipment Modal/Form with equip data
  };

  const handleDeleteEquipment = async (equipId: string) => {
    // Find the equipment name for the confirmation message
    const equipToDelete = equipment.find(e => e._id === equipId);
    const confirmMessage = equipToDelete 
      ? `Are you sure you want to delete the equipment "${equipToDelete.name}"?`
      : "Are you sure you want to delete this equipment?";
      
    if (window.confirm(confirmMessage)) {
      setIsSubmitting(true); // Prevent other actions during delete
      setErrorEquipment(''); // Clear previous table errors
      try {
        // Use the general equipment endpoint for deletion
        await api.delete(`/equipment/${equipId}`);
        // After successful deletion, refetch equipment list for the current space
        fetchEquipment(selectedSpaceId);
        // Optionally show a success message
      } catch (err: any) {
        console.error("Error deleting equipment:", err);
        const message = err.response?.data?.error || 'Failed to delete equipment. Please try again.';
        setErrorEquipment(message); // Display error near the table
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // Loading state for initial auth check or space loading
  if (isLoading || loadingPage) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Main component rendering for authenticated admin
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Manage Coworking Space Equipment
        </h1>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {/* Coworking Space Selector */}
          <div className="mb-6">
            <label htmlFor="coworkingSpaceSelect" className="block text-sm font-medium text-gray-700 mb-2">
              Select Coworking Space:
            </label>
            {loadingSpaces ? (
              <p>Loading spaces...</p>
            ) : errorSpaces ? (
              <p className="text-red-600">{errorSpaces}</p>
            ) : coworkingSpaces.length > 0 ? (
              <div className="relative">
                <select
                  id="coworkingSpaceSelect"
                  name="coworkingSpace"
                  value={selectedSpaceId}
                  onChange={handleSpaceChange}
                  disabled={loadingEquipment || isSubmitting} // Disable while loading/submitting
                  className="block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm appearance-none border disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {coworkingSpaces.map((space) => (
                    <option key={space._id} value={space._id}>
                      {space.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  {/* You might need to adjust icon positioning based on select width */}
                  {/* <BuildingOffice2Icon className="h-5 w-5" aria-hidden="true" /> */}
                </div>
              </div>
            ) : (
              <p>No coworking spaces found.</p>
            )}
          </div>

          {/* Equipment Section */}
          {selectedSpaceId ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Equipment for {coworkingSpaces.find(s => s._id === selectedSpaceId)?.name || 'Selected Space'}
                </h2>
                <button
                  onClick={openAddModal}
                  disabled={!selectedSpaceId || loadingEquipment}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusCircleIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  Add Equipment
                </button>
              </div>

              {/* Equipment Table */}
              {loadingEquipment ? (
                <p>Loading equipment...</p>
              ) : errorEquipment ? (
                <p className="text-red-600">{errorEquipment}</p>
              ) : (
                <div className="shadow border-b border-gray-200 sm:rounded-lg overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Available</th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {equipment.length > 0 ? (
                        equipment.map((equip) => (
                          <tr key={equip._id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{equip.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{equip.description || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{equip.quantityAvailable}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button onClick={() => openEditModal(equip)} className="text-indigo-600 hover:text-indigo-900" title="Edit" disabled={isSubmitting}>
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>
                              <button onClick={() => handleDeleteEquipment(equip._id)} className="text-red-600 hover:text-red-900" title="Delete" disabled={isSubmitting}>
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                            No equipment found for this space.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
             !loadingSpaces && !errorSpaces && <p className="text-gray-500">Please select a coworking space to view its equipment.</p>
          )}

        </div>
      </div>

      {/* Add Equipment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-500 bg-opacity-75 transition-opacity" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            {/* Modal panel */} 
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleAddNewEquipmentSubmit}> 
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                      <PlusCircleIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Add New Equipment
                      </h3>
                      <div className="mt-4 space-y-4">
                        {addEquipError && (
                          <p className="text-sm text-red-600">{addEquipError}</p>
                        )}
                        <div>
                          <label htmlFor="equipName" className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            id="equipName"
                            value={newEquipName}
                            onChange={(e) => setNewEquipName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="equipDesc" className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            id="equipDesc"
                            rows={3}
                            value={newEquipDesc}
                            onChange={(e) => setNewEquipDesc(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="equipQuantity" className="block text-sm font-medium text-gray-700">Quantity Available <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            id="equipQuantity"
                            value={newEquipQuantity}
                            onChange={(e) => setNewEquipQuantity(e.target.value)} // Keep as string for input flexibility
                            required
                            min="0"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Equipment'}
                  </button>
                  <button
                    type="button"
                    onClick={closeAddModal}
                    disabled={isSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {isEditModalOpen && editingEquipment && (
        <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-500 bg-opacity-75" aria-labelledby="edit-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleUpdateEquipmentSubmit}> 
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                      <PencilSquareIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="edit-modal-title">
                        Edit Equipment: {editingEquipment.name}
                      </h3>
                      <div className="mt-4 space-y-4">
                        {editEquipError && (
                          <p className="text-sm text-red-600">{editEquipError}</p>
                        )}
                        <div>
                          <label htmlFor="editEquipName" className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            id="editEquipName"
                            value={editEquipName}
                            onChange={(e) => setEditEquipName(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="editEquipDesc" className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            id="editEquipDesc"
                            rows={3}
                            value={editEquipDesc}
                            onChange={(e) => setEditEquipDesc(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label htmlFor="editEquipQuantity" className="block text-sm font-medium text-gray-700">Quantity Available <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            id="editEquipQuantity"
                            value={editEquipQuantity}
                            onChange={(e) => setEditEquipQuantity(e.target.value)}
                            required
                            min="0"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={isSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminEquipmentPage; 