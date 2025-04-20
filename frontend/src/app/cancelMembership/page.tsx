'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelMembershipPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleCancel = async () => {
    if (!user) return;
    setIsCancelling(true);
    setErrorMessage(null);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5003/api/v1/auth/membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'none',
          status: 'cancelled'
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Cancel error:', errText);
        setErrorMessage('Failed to cancel membership.');
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-red-600">Cancel Membership</h1>

      {!success ? (
        <>
          <p className="mb-6 text-gray-700">
            Are you sure you want to cancel your premium membership? You will lose access to all premium features.
          </p>

          {errorMessage && <p className="text-red-500 mb-4">{errorMessage}</p>}

          <div className="flex gap-4">
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md"
            >
              {isCancelling ? 'Cancelling...' : 'Yes, Cancel Membership'}
            </button>

            <button
              onClick={() => router.push('/profile')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-md"
            >
              Go Back
            </button>
          </div>
        </>
      ) : (
        <div className="text-green-700">
          <p className="mb-4">✅ Your membership has been successfully cancelled.</p>
          <button
            onClick={() => router.push('/profile')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md"
          >
            Back to Profile
          </button>
        </div>
      )}
    </div>
  );
}