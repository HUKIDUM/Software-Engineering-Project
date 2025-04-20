'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiMail, FiPhone, FiUserCheck, FiGift, FiStar } from 'react-icons/fi';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [membershipType, setMembershipType] = useState<string | null>(null);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [membershipPoints, setMembershipPoints] = useState<number | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [isLoading, user, router]);

  // Fetch latest membership status, type & points
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:5003/api/v1/auth/membership', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const points = typeof json.data.points === 'number' ? json.data.points : null;
          const status = json.data.status;
          setMembershipStatus(status);
          setMembershipPoints(points);

          // Calculate membership type based on points and status
          let calculatedType: string | null = null;
          if (status === 'active') {
            if (points === null || points < 100) {
              calculatedType = 'basic'; // Or keep null if basic isn't a formal type
            } else if (points >= 100 && points <= 200) {
              calculatedType = 'gold';
            } else if (points >= 201 && points <= 500) {
              calculatedType = 'platinum';
            } else if (points >= 501) {
              calculatedType = 'diamond';
            }
          } 
          setMembershipType(calculatedType);

        } else {
          // No membership data
          setMembershipType(null);
          setMembershipStatus(null);
          setMembershipPoints(null);
        }
      })
      .catch(err => {
        console.error('Failed to fetch membership:', err);
        setMembershipType(null);
        setMembershipStatus(null);
        setMembershipPoints(null);
      });
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and account status.</p>
        </div>
        <div className="border-t border-gray-200">
          <dl>

            {/* Name */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <FiUser className="mr-2" /> Full name
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.name}
              </dd>
            </div>

            {/* Email */}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <FiMail className="mr-2" /> Email address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.email}
              </dd>
            </div>

            {/* Telephone */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <FiPhone className="mr-2" /> Telephone
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {user.telephoneNumber}
              </dd>
            </div>

            {/* Account Type */}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <FiUserCheck className="mr-2" /> Account type
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {user.role === 'admin' ? 'Administrator' : 'Regular User'}
                </span>
              </dd>
            </div>

            {/* Membership Type */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <FiStar className="mr-2" /> Membership Type
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                {membershipType ? (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      /* membershipType === 'premium' ? 'bg-purple-100 text-purple-800' : */
                      membershipType === 'platinum' ? 'bg-gray-200 text-gray-800'
                      : membershipType === 'gold' ? 'bg-yellow-100 text-yellow-800'
                      : membershipType === 'diamond' ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {membershipType.charAt(0).toUpperCase() + membershipType.slice(1)}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">{membershipStatus === 'active' ? 'Basic' : 'No membership'}</span>
                )}
              </dd>
            </div>

            {/* Membership Status */}
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="flex items-center text-sm font-medium text-gray-500">
                <FiUserCheck className="mr-2" /> Membership Status
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                {membershipStatus ? (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      membershipStatus === 'active'
                        ? 'bg-green-100 text-green-800'
                        : membershipStatus === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {membershipStatus.charAt(0).toUpperCase() + membershipStatus.slice(1)}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">No membership</span>
                )}

                {/* === Re-added Button group pushed to the right === */}
                <div className="ml-auto flex space-x-4">
                  {/* Show Register button if status is not active */}
                  {membershipStatus !== 'active' && (
                    <Link
                      href="/membership" // Link to activation/registration page
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                    >
                      Register Membership
                    </Link>
                  )}
                  
                  {/* Show Cancel button only if status is active */}
                  {membershipStatus === 'active' && (
                    <Link
                      href="/cancelMembership"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
                    >
                      Cancel Membership
                    </Link>
                  )}
                </div>
              </dd>
            </div>

            {/* Reward Points */}
            {/* Show only if membership is active and points exist */}
            {membershipStatus === 'active' && membershipPoints !== null && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="flex items-center text-sm font-medium text-gray-500">
                  <FiGift className="mr-2" /> Reward Points
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {membershipPoints}
                </dd>
              </div>
            )}

          </dl>
        </div>
      </div>
    </div>
  );
}
