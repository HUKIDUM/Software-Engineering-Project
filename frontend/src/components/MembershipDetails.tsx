'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface MembershipData {
  program: {
    _id: string;
    name: string;
    type: string;
    description: string;
    pointsRequired: number;
    benefits: Array<{description: string}>;
    isActive: boolean;
  };
  status: string;
  points: number;
  startDate: string;
  endDate: string;
}

interface MembershipProgram {
  _id: string;
  name: string;
  type: string;
  pointsRequired: number;
}

export default function MembershipDetails() {
  const { user, token } = useAuth();
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [programs, setPrograms] = useState<MembershipProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch membership data
        const membershipRes = await fetch('http://localhost:5003/api/v1/memberships', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!membershipRes.ok) {
          if (membershipRes.status === 404) {
            setMembership(null);
            setLoading(false);
            return;
          }
          throw new Error('Failed to fetch membership details');
        }

        const membershipData = await membershipRes.json();
        setMembership(membershipData.data);

        // Fetch all membership programs
        const programsRes = await fetch('http://localhost:5003/api/v1/memberships/programs', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!programsRes.ok) {
          throw new Error('Failed to fetch membership programs');
        }

        const programsData = await programsRes.json();
        setPrograms(programsData.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load membership details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  // Calculate next tier and points needed
  const getNextTierInfo = (currentType: string, points: number) => {
    // Sort programs by points required in ascending order
    const sortedPrograms = [...programs].sort((a, b) => a.pointsRequired - b.pointsRequired);
    
    // Find current program index
    const currentIndex = sortedPrograms.findIndex(p => p.type === currentType);
    
    // If current type is not found or is the highest tier
    if (currentIndex === -1 || currentIndex === sortedPrograms.length - 1) {
      return { nextTier: null, nextTierName: null, pointsNeeded: 0, progress: 100 };
    }
    
    // Get next tier program
    const nextProgram = sortedPrograms[currentIndex + 1];
    const pointsNeeded = nextProgram.pointsRequired - points;
    
    // Calculate progress towards next tier, not based on basic membership
    const currentPoints = points;
    const nextTierPoints = nextProgram.pointsRequired;
    const currentTierPoints = currentIndex >= 0 ? sortedPrograms[currentIndex].pointsRequired : 0;
    
    // Calculate progress as percentage between current tier and next tier
    const progressRange = nextTierPoints - currentTierPoints;
    const pointsAboveCurrentTier = currentPoints - currentTierPoints;
    const progress = Math.min(100, (pointsAboveCurrentTier / progressRange) * 100);
    
    return { 
      nextTier: nextProgram.type,
      nextTierName: nextProgram.name,
      pointsNeeded, 
      progress 
    };
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
  if (membership.status === 'cancelled' || (membership.program && membership.program.type === 'none')) {
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

  const { nextTier, nextTierName, pointsNeeded, progress } = getNextTierInfo(
    membership.program?.type || 'basic', 
    membership.points
  );

  return (
    <div className="bg-white p-4 rounded-md shadow-sm">
      <h3 className="text-lg font-medium mb-3">Your Membership</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-gray-600">Type:</div>
        <div className="font-medium capitalize">
          {membership.program?.name || 'Basic Membership'}
          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
            membership.program?.type === 'diamond' ? 'bg-blue-100 text-blue-800' :
            membership.program?.type === 'gold' ? 'bg-yellow-100 text-yellow-800' :
            membership.program?.type === 'platinum' ? 'bg-gray-200 text-gray-800' :
            'bg-gray-100 text-gray-600'
          }`}>
            {membership.program?.type || 'basic'}
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
    
      
      {membership.status === 'active' && (
        <div className="mt-3 flex items-center justify-between">
          <Link 
            href="/profile/membership" 
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Manage Membership & Rewards
          </Link>
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