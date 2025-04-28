'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { FiAward, FiGift, FiChevronRight, FiCheck, FiAlertTriangle } from 'react-icons/fi';

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
}

interface RewardWithProgram {
  reward: Reward;
  programId: string;
  programName: string;
}

interface RedeemHistory {
  _id: string;
  reward: Reward;
  membershipProgram: MembershipProgram;
  redeemedAt: string;
  pointsSpent: number;
  status: 'redeemed' | 'used' | 'cancelled';
}

export default function MembershipPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState('programs'); // 'programs', 'rewards', 'history'
  const [eligiblePrograms, setEligiblePrograms] = useState<MembershipProgram[]>([]);
  const [currentMembership, setCurrentMembership] = useState<{
    program: MembershipProgram;
    status: string;
    points: number;
  } | null>(null);
  const [availableRewards, setAvailableRewards] = useState<RewardWithProgram[]>([]);
  const [redeemHistory, setRedeemHistory] = useState<RedeemHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardWithProgram | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }
      
      fetchData();
    }
  }, [isAuthenticated, isLoading, user, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMembership(),
        fetchEligiblePrograms(),
        fetchRewards(),
        fetchRedemptionHistory()
      ]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load membership data. Please try again later.');
    } finally {
      setLoading(false);
      // Debug check for redeemHistory state after all fetches complete
      setTimeout(() => {
        console.log("Final redeemHistory state:", redeemHistory);
      }, 0);
    }
  };

  const fetchMembership = async () => {
    try {
      const response = await api.get('/memberships');
      console.log("Membership API response:", response.data);
      if (response.data.success && response.data.data) {
        const { currentProgram, status, points } = response.data.data;
        
        if (currentProgram) {
          setCurrentMembership({ 
            program: currentProgram,
            status, 
            points 
          });
        } else {
          setCurrentMembership(null);
        }
      } else {
        setCurrentMembership(null);
      }
    } catch (err) {
      console.error('Error fetching current membership:', err);
      setCurrentMembership(null);
    }
  };

  const fetchEligiblePrograms = async () => {
    try {
      const response = await api.get('/memberships/eligible');
      if (response.data.success && response.data.data) {
        setEligiblePrograms(response.data.data);
      } else {
        setEligiblePrograms([]);
      }
    } catch (err) {
      console.error('Error fetching eligible programs:', err);
      setEligiblePrograms([]);
    }
  };

  const fetchRewards = async () => {
    try {
      const response = await api.get('/memberships/rewards');
      if (response.data.success && response.data.data) {
        setAvailableRewards(response.data.data);
      } else {
        setAvailableRewards([]);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setAvailableRewards([]);
    }
  };

  const fetchRedemptionHistory = async () => {
    try {
      const response = await api.get('/memberships/rewards/history');
      console.log("Redemption history API response:", response.data);
      
      if (response.data.success && response.data.data) {
        console.log("Setting redeem history with data:", JSON.stringify(response.data.data));
        setRedeemHistory(response.data.data);
      } else {
        console.log("No redemption history data found, setting empty array");
        setRedeemHistory([]);
      }
    } catch (err) {
      console.error('Error fetching redemption history:', err);
      setRedeemHistory([]);
    }
  };

  const chooseMembership = async (programId: string) => {
    try {
      await api.post(`/memberships/choose/${programId}`);
      setSuccess('Membership program selected successfully!');
      await fetchData();
    } catch (err) {
      console.error('Error choosing membership program:', err);
      setError('Failed to select membership program. Please try again.');
    }
  };

  const openRedeemModal = (reward: RewardWithProgram) => {
    setSelectedReward(reward);
    setRedeemModalOpen(true);
  };

  const closeRedeemModal = () => {
    setRedeemModalOpen(false);
    setSelectedReward(null);
  };

  const redeemReward = async () => {
    if (!selectedReward) return;

    try {
      await api.post('/memberships/rewards/redeem', {
        programId: selectedReward.programId,
        rewardId: selectedReward.reward._id
      });
      
      setSuccess('Reward redeemed successfully!');
      closeRedeemModal();
      await fetchData();
    } catch (err: any) {
      console.error('Error redeeming reward:', err);
      setError(err.response?.data?.message || 'Failed to redeem reward. Please try again.');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'redeemed':
        return 'bg-yellow-100 text-yellow-800';
      case 'used':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!currentMembership) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-yellow-50 p-4 rounded shadow-sm text-center">
          <FiAlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Active Membership</h3>
          <p className="text-yellow-700 mb-4">You don't have an active membership yet. Please register for a membership to access this feature.</p>
          <button 
            onClick={() => router.push('/register')} 
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Register for Membership
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h1 className="text-lg font-medium text-gray-900">Membership Management</h1>
          <p className="mt-1 text-sm text-gray-500">View your membership details, eligible programs, and rewards.</p>
        </div>

        {/* Current Status */}
        {currentMembership && (
          <div className="bg-indigo-50 px-4 py-5 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-md font-medium text-gray-800">Current Membership</h2>
                <div className="mt-2 flex items-center">
                  <span className="text-2xl font-semibold text-indigo-700">{currentMembership.program.name}</span>
                  <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium ${
                    currentMembership.program.type === 'diamond' ? 'bg-blue-100 text-blue-800' :
                    currentMembership.program.type === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                    currentMembership.program.type === 'platinum' ? 'bg-gray-200 text-gray-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {currentMembership.program.type}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{currentMembership.program.description}</p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
                <div className="rounded-full bg-white px-4 py-2 shadow-sm border border-indigo-200">
                  <span className="text-lg font-semibold text-indigo-800">{currentMembership.points} Points</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">Membership Status: {currentMembership.status}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setCurrentTab('programs')}
              className={`px-6 py-4 text-sm font-medium ${
                currentTab === 'programs'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiAward className="inline mr-2" /> Eligible Programs
            </button>
            <button
              onClick={() => setCurrentTab('rewards')}
              className={`px-6 py-4 text-sm font-medium ${
                currentTab === 'rewards'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiGift className="inline mr-2" /> Available Rewards
            </button>
            <button
              onClick={() => setCurrentTab('history')}
              className={`px-6 py-4 text-sm font-medium ${
                currentTab === 'history'
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Redemption History
            </button>
          </nav>
        </div>

        {/* Messages */}
        {error && (
          <div className="m-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {success && (
          <div className="m-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-sm text-green-600">{success}</div>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-4 sm:p-6">
          {/* Eligible Programs */}
          {currentTab === 'programs' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Eligible Membership Programs</h2>
              {currentMembership ? (
                <p className="text-sm text-gray-500">
                  Based on your {currentMembership.points} points, you're eligible for the following membership programs:
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Available membership programs:
                </p>
              )}
              
              {eligiblePrograms.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-md text-center">
                  <p className="text-gray-500">No additional programs available at your current point level.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {eligiblePrograms.map((program) => (
                    <div 
                      key={program._id} 
                      className="border rounded-lg overflow-hidden shadow-sm hover:shadow border-gray-200"
                    >
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{program.name}</h3>
                            <div className="mt-1 flex items-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                program.type === 'diamond' ? 'bg-blue-100 text-blue-800' :
                                program.type === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                                program.type === 'platinum' ? 'bg-gray-200 text-gray-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {program.type}
                              </span>
                              <span className="ml-2 text-sm text-gray-500">{program.pointsRequired} points required</span>
                            </div>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm text-gray-500">{program.description}</p>
                        
                        {program.benefits.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700">Benefits:</h4>
                            <ul className="mt-2 space-y-1">
                              {program.benefits.slice(0, 3).map((benefit, index) => (
                                <li key={index} className="flex items-start">
                                  <FiChevronRight className="mt-1 h-4 w-4 text-indigo-400 mr-1" />
                                  <span className="text-sm text-gray-600">{benefit.description}</span>
                                </li>
                              ))}
                              {program.benefits.length > 3 && (
                                <li className="text-sm text-indigo-600">+ {program.benefits.length - 3} more benefits</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Available Rewards */}
          {currentTab === 'rewards' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Available Rewards</h2>
              {currentMembership ? (
                <p className="text-sm text-gray-500">
                  Redeem your {currentMembership.points} points for these exclusive rewards:
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Available rewards for redemption:
                </p>
              )}
              
              {availableRewards.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-md text-center">
                  <p className="text-gray-500">No rewards are currently available for redemption.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableRewards.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{item.reward.name}</h3>
                            <p className="text-sm text-gray-500">{item.programName}</p>
                          </div>
                          <div className="bg-indigo-100 rounded-full px-3 py-1">
                            <span className="text-sm font-medium text-indigo-800">{item.reward.pointsCost} pts</span>
                          </div>
                        </div>
                        
                        <p className="mt-3 text-sm text-gray-600">{item.reward.description}</p>
                        
                        <div className="mt-5">
                          <button
                            onClick={() => openRedeemModal(item)}
                            disabled={!currentMembership || currentMembership.points < item.reward.pointsCost}
                            className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm 
                              ${currentMembership && currentMembership.points >= item.reward.pointsCost 
                                ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                          >
                            <FiGift className="mr-2" />
                            {currentMembership && currentMembership.points >= item.reward.pointsCost 
                              ? 'Redeem Reward' 
                              : currentMembership
                                ? `Need ${item.reward.pointsCost - currentMembership.points} more points`
                                : 'Sign up for membership first'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Redemption History */}
          {currentTab === 'history' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">Redemption History</h2>
              
              {redeemHistory.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-md text-center">
                  <p className="text-gray-500">You haven't redeemed any rewards yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reward
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Program
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {redeemHistory.map((history) => (
                        <tr key={history._id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {history.reward ? history.reward.name : 'Unknown Reward'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {history.membershipProgram ? history.membershipProgram.name : 'Unknown Program'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {history.redeemedAt ? new Date(history.redeemedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {history.pointsSpent || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(history.status)}`}>
                              {history.status || 'unknown'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Redeem Confirmation Modal */}
      {redeemModalOpen && selectedReward && currentMembership && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiGift className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Redeem Reward
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to redeem <span className="font-medium">{selectedReward.reward.name}</span> for <span className="font-medium">{selectedReward.reward.pointsCost} points</span>?
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        Your current point balance: <span className="font-medium">{currentMembership.points} points</span>
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        After redemption: <span className="font-medium">{currentMembership.points - selectedReward.reward.pointsCost} points</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={redeemReward}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Confirm Redemption
                </button>
                <button
                  type="button"
                  onClick={closeRedeemModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 