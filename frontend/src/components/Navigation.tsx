// frontend/src/components/Navigation.tsx

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import {
  FiMenu,
  FiX,
  FiHome,
  FiMap,
  FiCalendar,
  FiUser,
  FiLogOut,
  FiLogIn,
  FiUserPlus,
  FiSettings,
  FiCoffee    // ← Add FiCoffee here
} from 'react-icons/fi';

const Navigation: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left nav links */}
          <div className="flex space-x-8">
            <Link
              href="/"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                isActive('/')
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <FiHome className="mr-1" /> Dashboard
            </Link>

            <Link
              href="/coworking-spaces"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                pathname?.startsWith('/coworking-spaces')
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <FiMap className="mr-1" /> Spaces
            </Link>

            <Link
              href="/reservations"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                isActive('/reservations')
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <FiCalendar className="mr-1" /> My Reservations
            </Link>

            <Link
              href="/food-menu"
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                isActive('/food-menu')
                  ? 'border-indigo-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <FiCoffee className="mr-1" /> Food Menu
            </Link>

            {user && user.role === 'admin' && (
              <Link
                href="/admin"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname?.startsWith('/admin')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <FiSettings className="mr-1" /> Admin
              </Link>
            )}
          </div>

          {/* Right user/auth links */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                >
                  <FiLogOut className="mr-1" /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded"
                >
                  <FiLogIn className="mr-1" /> Login
                </Link>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center px-2 py-1 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                >
                  <FiUserPlus className="mr-1" /> Register
                </Link>
              </>
            )}
          </div>
        </div>
        {/* Mobile menu omitted */}
      </div>
    </nav>
  );
};

export default Navigation;
