'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { FiHome, FiCalendar, FiMapPin, FiUser, FiLogOut, FiCoffee, FiShoppingBag } from 'react-icons/fi';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-white shadow-lg shadow-indigo-500/25 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                CoWork Space
              </Link>
            </div>
            {isAuthenticated && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className={`${
                    isActive('/dashboard')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <FiHome className="mr-1" /> Dashboard
                </Link>
                <Link
                  href="/reservations"
                  className={`${
                    isActive('/reservations')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <FiCalendar className="mr-1" /> My Reservations
                </Link>
                <Link
                  href="/coworking-spaces"
                  className={`${
                    isActive('/coworking-spaces')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <FiMapPin className="mr-1" /> Spaces
                </Link>
                <Link
                  href="/menu"
                  className={`${
                    isActive('/menu')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  <FiCoffee className="mr-1" /> Food Menu
                </Link>
                {user?.role === 'admin' && (
                  <>
                    <Link
                      href="/admin"
                      className={`${
                        isActive('/admin')
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Admin Home
                    </Link>
                    <Link
                      href="/admin/orders"
                      className={`${
                        pathname.startsWith('/admin/orders')
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Manage Orders
                    </Link>
                    <Link
                      href="/admin/reservations"
                      className={`${
                        pathname.startsWith('/admin/reservations')
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Manage Reservations
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <button
                  title="View Cart"
                  className="text-gray-500 hover:text-gray-700 p-1 rounded-full relative"
                >
                  <FiShoppingBag className="h-6 w-6" />
                </button>
                <Link
                  href="/profile"
                  className="text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <FiUser className="mr-1" />
                  {user?.name}
                </Link>
                <button
                  onClick={() => logout()}
                  className="text-gray-500 hover:text-gray-700 flex items-center"
                >
                  <FiLogOut className="mr-1" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/login"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-500"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;