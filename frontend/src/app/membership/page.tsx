'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MembershipPage() {
  const { user, isLoading} = useAuth(); // if available
  const router = useRouter();
  const [isActivating, setIsActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleActivate = async () => {
    if (!user) return;
    setIsActivating(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5003/api/v1/auth/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'premium',
          status: 'active'
        })
      });

      if (!res.ok) throw new Error(await res.text());

      

      alert('Membership activated!');
      router.push('/profile');
    } catch (err) {
      console.error(err);
      setErrorMessage('Activation failed. Please try again.');
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg text-gray-500">Loading membership page...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Activate Premium Membership</h1>
      <p className="mb-4 text-gray-600">
        Enjoy exclusive benefits, rewards, and premium features by activating your membership.
      </p>

      <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-6">
        <p className="text-sm text-indigo-700">
          Once activated, your membership will be valid for 30 days from today.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 text-red-600">
          <p>{errorMessage}</p>
        </div>
      )}

      <button
        onClick={handleActivate}
        disabled={isActivating}
        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
      >
        {isActivating ? 'Activating...' : 'Activate Now'}
      </button>
    </div>
  );
}
