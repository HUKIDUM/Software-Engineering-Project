'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MembershipRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the register membership page
    router.push('/register');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-lg text-gray-500">Redirecting to membership registration...</div>
    </div>
  );
}
