'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterMembershipPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Just create a basic membership - type will be determined by points
      const res = await fetch('http://localhost:5003/api/v1/memberships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to register membership');
      }

      router.push('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-md rounded px-8 pt-6 pb-8">
      <h2 className="text-xl font-semibold mb-4 text-center">Register Membership</h2>
      
      <div className="mb-6 text-center">
        <p className="text-gray-600 mb-2">
          Join our membership program to earn reward points and enjoy benefits!
        </p>
        <p className="text-sm text-gray-500">
          Your membership tier will automatically upgrade as you earn points:
        </p>
        <ul className="text-sm text-gray-500 mt-2">
          <li>• 0-29 points: Basic membership</li>
          <li>• 30-99 points: Platinum membership</li>
          <li>• 100-199 points: Gold membership</li>
          <li>• 200+ points: Diamond membership</li>
        </ul>
      </div>

      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded"
        >
          {isSubmitting ? 'Registering...' : 'Register Basic Membership'}
        </button>
      </form>
    </div>
  );
}
