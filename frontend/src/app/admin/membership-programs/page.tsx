'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiAward, FiGift, FiBarChart2 } from 'react-icons/fi';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface Benefit {
  _id: string;
  description: string;
  value: string;
}

interface Reward {
  _id: string;
  name: string;
  description: string;
  pointsCost: number;
  isAvailable: boolean;
}

interface MembershipProgram {
  _id: string;
  name: string;
  type: string;
  description: string;
  pointsRequired: number;
  benefits: Benefit[];
  rewards: Reward[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MembershipStats {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  cancelledMembers: number;
  totalRedemptions: number;
  programDistribution: Record<string, number>;
  redemptionsPerProgram: Record<string, number>;
  redemptionPercentage: number;
}

export default function MembershipProgramsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [membershipPrograms, setMembershipPrograms] = useState<MembershipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProgram, setCurrentProgram] = useState<MembershipProgram | null>(null);
  const [activeTab, setActiveTab] = useState('programs'); // 'programs' or 'statistics'
  const [stats, setStats] = useState<MembershipStats | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'basic',
    description: '',
    pointsRequired: 0,
    isActive: true,
    benefits: [{ description: '', value: '' }],
    rewards: [{ name: '', description: '', pointsCost: 0, isAvailable: true }]
  });

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
      
      fetchMembershipPrograms();
      fetchMembershipStats();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchMembershipPrograms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/memberships/programs');
      setMembershipPrograms(response.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching membership programs:', err);
      setError('Failed to load membership programs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembershipStats = async () => {
    try {
      const response = await api.get('/memberships/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching membership statistics:', err);
    }
  };

  const openCreateModal = () => {
    setCurrentProgram(null);
    setFormData({
      name: '',
      type: 'basic',
      description: '',
      pointsRequired: 0,
      isActive: true,
      benefits: [{ description: '', value: '' }],
      rewards: [{ name: '', description: '', pointsCost: 0, isAvailable: true }]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (program: MembershipProgram) => {
    setCurrentProgram(program);
    setFormData({
      name: program.name,
      type: program.type,
      description: program.description,
      pointsRequired: program.pointsRequired,
      isActive: program.isActive,
      benefits: program.benefits.length > 0 ? program.benefits : [{ description: '', value: '' }],
      rewards: program.rewards.length > 0 ? program.rewards : [{ name: '', description: '', pointsCost: 0, isAvailable: true }]
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentProgram(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleBenefitChange = (index: number, field: string, value: string) => {
    const updatedBenefits = [...formData.benefits];
    updatedBenefits[index] = { 
      ...updatedBenefits[index], 
      [field]: value 
    };
    
    setFormData((prev) => ({
      ...prev,
      benefits: updatedBenefits
    }));
  };

  const handleRewardChange = (index: number, field: string, value: any) => {
    const updatedRewards = [...formData.rewards];
    updatedRewards[index] = { 
      ...updatedRewards[index], 
      [field]: field === 'pointsCost' ? Number(value) : field === 'isAvailable' ? value === 'true' : value 
    };
    
    setFormData((prev) => ({
      ...prev,
      rewards: updatedRewards
    }));
  };

  const addBenefit = () => {
    setFormData((prev) => ({
      ...prev,
      benefits: [...prev.benefits, { description: '', value: '' }]
    }));
  };

  const removeBenefit = (index: number) => {
    if (formData.benefits.length > 1) {
      const updatedBenefits = [...formData.benefits];
      updatedBenefits.splice(index, 1);
      
      setFormData((prev) => ({
        ...prev,
        benefits: updatedBenefits
      }));
    }
  };

  const addReward = () => {
    setFormData((prev) => ({
      ...prev,
      rewards: [...prev.rewards, { name: '', description: '', pointsCost: 0, isAvailable: true }]
    }));
  };

  const removeReward = (index: number) => {
    if (formData.rewards.length > 1) {
      const updatedRewards = [...formData.rewards];
      updatedRewards.splice(index, 1);
      
      setFormData((prev) => ({
        ...prev,
        rewards: updatedRewards
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (currentProgram) {
        // Update existing program
        await api.put(`/memberships/programs/${currentProgram._id}`, formData);
        setSuccess('Membership program updated successfully!');
      } else {
        // Create new program
        await api.post('/memberships/programs', formData);
        setSuccess('Membership program created successfully!');
      }
      
      closeModal();
      fetchMembershipPrograms();
    } catch (err) {
      console.error('Error saving membership program:', err);
      setError('Failed to save membership program. Please check your inputs and try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this membership program? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete the membership program and its associated available rewards
      await api.delete(`/memberships/programs/${id}?deleteRewards=true`);
      setSuccess('Membership program and its available rewards deleted successfully!');
      fetchMembershipPrograms();
    } catch (err) {
      console.error('Error deleting membership program:', err);
      setError('Failed to delete membership program. Please try again.');
    }
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
              Membership Programs Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Create, update and manage membership programs and their rewards
            </p>
          </div>
          <div className="mt-5 flex lg:mt-0 lg:ml-4">
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <FiPlus className="-ml-1 mr-2 h-5 w-5" />
              Create Membership Program
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

        {/* Tabs for Programs and Statistics */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('programs')}
              className={`${
                activeTab === 'programs'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Programs
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`${
                activeTab === 'statistics'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FiBarChart2 className="mr-2" />
              Statistics
            </button>
          </nav>
        </div>

        {/* Programs Tab Content */}
        {activeTab === 'programs' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">Membership Programs</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                A list of all membership programs in the system
              </p>
            </div>
            {membershipPrograms.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-500">No membership programs found.</p>
                <button
                  onClick={openCreateModal}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                  Create New Membership Program
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {membershipPrograms.map((program) => (
                  <li key={program._id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <p className="text-md font-medium text-indigo-600 truncate">{program.name}</p>
                            <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${program.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {program.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {program.type}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{program.description}</p>
                          <div className="mt-1 flex items-center">
                            <FiAward className="flex-shrink-0 mr-1.5 h-4 w-4 text-yellow-500" />
                            <span className="text-sm text-gray-700">{program.pointsRequired} points required</span>
                            
                            <FiGift className="flex-shrink-0 ml-4 mr-1.5 h-4 w-4 text-indigo-500" />
                            <span className="text-sm text-gray-700">{program.rewards.length} rewards</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(program)}
                            className="inline-flex items-center p-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            title="Edit"
                          >
                            <FiEdit2 className="h-5 w-5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(program._id)}
                            className="inline-flex items-center p-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                            title="Delete"
                          >
                            <FiTrash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Statistics Tab Content */}
        {activeTab === 'statistics' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">Membership Statistics</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Overview of membership program metrics and user data
              </p>
            </div>
            
            {!stats ? (
              <div className="text-center py-12 px-4">
                <p className="text-gray-500">Loading statistics...</p>
              </div>
            ) : (
              <div className="p-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white overflow-hidden shadow rounded-lg border">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Members</dt>
                      <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalMembers}</dd>
                    </div>
                  </div>
                  
                  <div className="bg-white overflow-hidden shadow rounded-lg border">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Members</dt>
                      <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.activeMembers}</dd>
                    </div>
                  </div>
                  
                  <div className="bg-white overflow-hidden shadow rounded-lg border">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Redemptions</dt>
                      <dd className="mt-1 text-3xl font-semibold text-indigo-600">{stats.totalRedemptions}</dd>
                    </div>
                  </div>
                  
                  <div className="bg-white overflow-hidden shadow rounded-lg border">
                    <div className="px-4 py-5 sm:p-6">
                      <dt className="text-sm font-medium text-gray-500 truncate">Redemption Rate</dt>
                      <dd className="mt-1 text-3xl font-semibold text-amber-600">
                        {stats.redemptionPercentage.toFixed(1)}%
                      </dd>
                    </div>
                  </div>
                </div>
                
                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Membership Distribution Chart */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Membership Distribution</h3>
                    <div className="h-64">
                      <Pie
                        data={{
                          labels: Object.keys(stats.programDistribution),
                          datasets: [
                            {
                              data: Object.values(stats.programDistribution),
                              backgroundColor: [
                                '#3B82F6', // blue
                                '#10B981', // green
                                '#F59E0B', // amber
                                '#EF4444', // red
                                '#8B5CF6', // purple
                                '#EC4899', // pink
                              ],
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Redemptions Per Program Chart */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Redemptions by Program</h3>
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: Object.keys(stats.redemptionsPerProgram),
                          datasets: [
                            {
                              label: 'Number of Redemptions',
                              data: Object.values(stats.redemptionsPerProgram),
                              backgroundColor: '#3B82F6',
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                precision: 0
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Member Status Distribution */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Member Status Distribution</h3>
                    <div className="h-64">
                      <Pie
                        data={{
                          labels: ['Active', 'Inactive', 'Cancelled'],
                          datasets: [
                            {
                              data: [
                                stats.activeMembers,
                                stats.inactiveMembers,
                                stats.cancelledMembers
                              ],
                              backgroundColor: [
                                '#10B981', // green for active
                                '#F59E0B', // amber for inactive
                                '#EF4444', // red for cancelled
                              ],
                              borderWidth: 1,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Redemption Percentage Visualization */}
                  <div className="bg-white overflow-hidden shadow rounded-lg border p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Redemption Rate</h3>
                    <div className="flex flex-col items-center justify-center h-64">
                      <div className="relative mb-4">
                        <div className="w-36 h-36 rounded-full flex items-center justify-center border-8" 
                             style={{ 
                               borderColor: '#3B82F6',
                               background: `conic-gradient(#3B82F6 ${stats.redemptionPercentage * 3.6}deg, #f3f4f6 0deg)`
                             }}>
                          <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center">
                            <span className="text-3xl font-bold text-gray-900">
                              {stats.redemptionPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-500 text-center">
                        {stats.redemptionPercentage.toFixed(1)}% of members have redeemed at least one reward
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal for Create/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {currentProgram ? 'Edit Membership Program' : 'Create Membership Program'}
                      </h3>
                      <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                        <div className="sm:col-span-3">
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Program Name
                          </label>
                          <div className="mt-1">
                            <input
                              type="text"
                              name="name"
                              id="name"
                              value={formData.name}
                              onChange={handleChange}
                              required
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                            Membership Type
                          </label>
                          <div className="mt-1">
                            <select
                              id="type"
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="none">None</option>
                              <option value="basic">Basic</option>
                              <option value="gold">Gold</option>
                              <option value="platinum">Platinum</option>
                              <option value="diamond">Diamond</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <div className="mt-1">
                            <textarea
                              id="description"
                              name="description"
                              rows={3}
                              value={formData.description}
                              onChange={handleChange}
                              required
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="pointsRequired" className="block text-sm font-medium text-gray-700">
                            Points Required
                          </label>
                          <div className="mt-1">
                            <input
                              type="number"
                              name="pointsRequired"
                              id="pointsRequired"
                              min="0"
                              value={formData.pointsRequired}
                              onChange={handleChange}
                              required
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                          </div>
                        </div>

                        <div className="sm:col-span-3">
                          <label htmlFor="isActive" className="block text-sm font-medium text-gray-700">
                            Status
                          </label>
                          <div className="mt-1">
                            <select
                              id="isActive"
                              name="isActive"
                              value={formData.isActive.toString()}
                              onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </div>
                        </div>

                        <div className="sm:col-span-6">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Benefits</label>
                            <button
                              type="button"
                              onClick={addBenefit}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              <FiPlus className="mr-1" /> Add Benefit
                            </button>
                          </div>
                          {formData.benefits.map((benefit, index) => (
                            <div key={index} className="flex items-center mb-2">
                              <div className="flex-grow mr-2">
                                <input
                                  type="text"
                                  placeholder="Benefit description"
                                  value={benefit.description}
                                  onChange={(e) => handleBenefitChange(index, 'description', e.target.value)}
                                  required
                                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                              <div className="flex-grow-0 flex-shrink-0 w-36 mr-2">
                                <input
                                  type="text"
                                  placeholder="Value (optional)"
                                  value={benefit.value || ''}
                                  onChange={(e) => handleBenefitChange(index, 'value', e.target.value)}
                                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                              {formData.benefits.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeBenefit(index)}
                                  className="inline-flex items-center p-1 border border-transparent rounded-full text-red-600 hover:bg-red-100"
                                >
                                  <FiTrash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="sm:col-span-6">
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Rewards</label>
                            <button
                              type="button"
                              onClick={addReward}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              <FiPlus className="mr-1" /> Add Reward
                            </button>
                          </div>
                          {formData.rewards.map((reward, index) => (
                            <div key={index} className="border border-gray-200 p-3 rounded-md mb-3">
                              <div className="grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-6">
                                <div className="sm:col-span-3">
                                  <label className="block text-xs font-medium text-gray-500">Name</label>
                                  <input
                                    type="text"
                                    placeholder="Reward name"
                                    value={reward.name}
                                    onChange={(e) => handleRewardChange(index, 'name', e.target.value)}
                                    required
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  />
                                </div>
                                <div className="sm:col-span-2">
                                  <label className="block text-xs font-medium text-gray-500">Points Cost</label>
                                  <input
                                    type="number"
                                    placeholder="Points cost"
                                    min="0"
                                    value={reward.pointsCost}
                                    onChange={(e) => handleRewardChange(index, 'pointsCost', e.target.value)}
                                    required
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  />
                                </div>
                                <div className="sm:col-span-1 flex items-end">
                                  <div className="flex justify-between w-full">
                                    <select
                                      value={reward.isAvailable.toString()}
                                      onChange={(e) => handleRewardChange(index, 'isAvailable', e.target.value)}
                                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                    >
                                      <option value="true">Available</option>
                                      <option value="false">Unavailable</option>
                                    </select>
                                    {formData.rewards.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeReward(index)}
                                        className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full text-red-600 hover:bg-red-100"
                                      >
                                        <FiTrash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="sm:col-span-6">
                                  <label className="block text-xs font-medium text-gray-500">Description</label>
                                  <textarea
                                    placeholder="Reward description"
                                    value={reward.description}
                                    onChange={(e) => handleRewardChange(index, 'description', e.target.value)}
                                    required
                                    rows={2}
                                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {currentProgram ? 'Update Program' : 'Create Program'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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
} 