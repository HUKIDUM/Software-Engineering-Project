'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterMembershipPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [type, setType] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('http://localhost:5003/api/v1/auth/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
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

      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

      <form onSubmit={handleSubmit}>
        <label className="block text-gray-700 mb-2 font-medium">Select Membership Type:</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded"
        >
          {isSubmitting ? 'Registering...' : 'Register Membership'}
        </button>
      </form>
    </div>
  );
}
