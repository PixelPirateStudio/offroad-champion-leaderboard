import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  TrophyIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  FlagIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAdminAuth();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: HomeIcon },
    { name: 'Players', href: '/admin/players', icon: UsersIcon },
    { name: 'Races', href: '/admin/races', icon: FlagIcon },
    { name: 'Prizes', href: '/admin/prizes', icon: TrophyIcon },
    { name: 'Redemptions', href: '/admin/redemptions', icon: BanknotesIcon },
    { name: 'Logs', href: '/admin/logs', icon: DocumentTextIcon },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return router.pathname === path;
    }
    return router.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0E0A1B] to-[#190F31]">
      {/* Sidebar - Desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-[#0E0A1B] border-r border-purple-900/30 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>
          <div className="mt-8 flex-1 flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                      ${
                        isActive(item.href)
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-300 hover:bg-purple-900/30 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="mr-3 h-6 w-6" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-purple-900/30 p-4">
            <div className="flex items-center w-full">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{user?.name || user?.username}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="ml-3 p-2 text-gray-400 hover:text-white transition-colors"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#0E0A1B] border-b border-purple-900/30">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-300 hover:text-white"
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-[#0E0A1B]" style={{ top: '52px' }}>
          <nav className="px-4 pt-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                    ${
                      isActive(item.href)
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-purple-900/30 hover:text-white'
                    }
                  `}
                >
                  <Icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="w-full group flex items-center px-3 py-3 text-sm font-medium rounded-lg text-gray-300 hover:bg-purple-900/30 hover:text-white transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6" />
              Logout
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 pt-20 md:pt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
