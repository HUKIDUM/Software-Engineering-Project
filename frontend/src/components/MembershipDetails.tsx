'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface MembershipData {
  _id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  points: number;
  user: string;
}

// Define tier thresholds for display
const TIER_THRESHOLDS = {
  platinum: 30,
  gold: 100,
  diamond: 200
};

export default function MembershipDetails() {
  const { user, token } = useAuth();
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMembership = async () => {
      if (!user || !token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('http://localhost:5003/api/v1/memberships', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            // User doesn't have a membership yet
            setMembership(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch membership details');
        }

        const data = await res.json();
        setMembership(data.data);
      } catch (err) {
        console.error('Error fetching membership:', err);
        setError('Failed to load membership details');
      } finally {
        setLoading(false);
      }
    };

    fetchMembership();
  }, [user, token]);

  // Calculate next tier and points needed
  const getNextTierInfo = (currentType: string, points: number) => {
    if (currentType === 'diamond') {
      return { nextTier: null, pointsNeeded: 0, progress: 100 };
    }
    
    if (currentType === 'gold') {
      const pointsNeeded = TIER_THRESHOLDS.diamond - points;
      const progress = Math.min(100, (points / TIER_THRESHOLDS.diamond) * 100);
      return { nextTier: 'diamond', pointsNeeded, progress };
    }
    
    if (currentType === 'platinum') {
      const pointsNeeded = TIER_THRESHOLDS.gold - points;
      const progress = Math.min(100, (points / TIER_THRESHOLDS.gold) * 100);
      return { nextTier: 'gold', pointsNeeded, progress };
    }
    
    if (currentType === 'basic') {
      const pointsNeeded = TIER_THRESHOLDS.platinum - points;
      const progress = Math.min(100, (points / TIER_THRESHOLDS.platinum) * 100);
      return { nextTier: 'platinum', pointsNeeded, progress };
    }
    
    // 'none' type or any other
    return { nextTier: 'basic', pointsNeeded: 1, progress: 0 };
  };

  if (loading) {
    return <div className="text-gray-500">Loading membership details...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!membership) {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <p className="text-yellow-700">
          You don't have an active membership yet. 
          <Link href="/register" className="ml-2 text-blue-600 underline">
            Register now
          </Link>
        </p>
      </div>
    );
  }

  // Handle cancelled or none type memberships
  if (membership.status === 'cancelled' || membership.type === 'none') {
    return (
      <div className="bg-yellow-50 p-4 rounded-md">
        <p className="text-yellow-700 mb-2">
          Your membership is currently {membership.status === 'cancelled' ? 'cancelled' : 'inactive'}.
        </p>
        <Link 
          href="/register" 
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm inline-block"
        >
          Register New Membership
        </Link>
      </div>
    );
  }

  const { nextTier, pointsNeeded, progress } = getNextTierInfo(membership.type, membership.points);

  return (
    <div className="bg-white p-4 rounded-md shadow-sm">
      <h3 className="text-lg font-medium mb-3">Your Membership</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-600">Type:</div>
        <div className="font-medium capitalize">
          {membership.type}
          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
            membership.type === 'diamond' ? 'bg-blue-100 text-blue-800' :
            membership.type === 'gold' ? 'bg-yellow-100 text-yellow-800' :
            membership.type === 'platinum' ? 'bg-gray-200 text-gray-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {membership.type}
          </span>
        </div>
        
        <div className="text-gray-600">Status:</div>
        <div className="font-medium capitalize">{membership.status}</div>
        
        <div className="text-gray-600">Start Date:</div>
        <div>{new Date(membership.startDate).toLocaleDateString()}</div>
        
        <div className="text-gray-600">End Date:</div>
        <div>{new Date(membership.endDate).toLocaleDateString()}</div>
        
        <div className="text-gray-600">Reward Points:</div>
        <div className="font-medium text-indigo-600">{membership.points} points</div>
      </div>
      
      {/* Tier progress - only show if not diamond and active status */}
      {nextTier && membership.status === 'active' && (
        <div className="mt-4">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress to {nextTier}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {pointsNeeded} more points needed to reach {nextTier}
          </p>
        </div>
      )}
      
      {membership.status === 'active' && (
        <div className="mt-3">
          <Link 
            href="/cancelMembership" 
            className="text-sm text-red-600 hover:text-red-800"
          >
            Cancel membership
          </Link>
        </div>
      )}
    </div>
  );
} 