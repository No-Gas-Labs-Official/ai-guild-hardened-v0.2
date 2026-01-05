import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  CodeBracketIcon, 
  CpuChipIcon, 
  BeakerIcon, 
  ComputerDesktopIcon, 
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { Capacitor } from '@capacitor/core';

const Layout = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Repositories',
      href: '/repositories',
      icon: CodeBracketIcon,
      current: location.pathname === '/repositories'
    },
    {
      name: 'Agents',
      href: '/agents',
      icon: CpuChipIcon,
      current: location.pathname === '/agents'
    },
    {
      name: 'Prototypes',
      href: '/prototypes',
      icon: BeakerIcon,
      current: location.pathname === '/prototypes'
    },
    {
      name: 'CLI',
      href: '/cli',
      icon: ComputerDesktopIcon,
      current: location.pathname === '/cli'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/settings'
    }
  ];

  const handleNavigation = (href) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="sheet-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`sheet-panel ${sidebarOpen ? '' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">NG</span>
              </div>
              <span className="font-semibold text-gray-900">No-Gas-Labs</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <UserCircleIcon className="h-10 w-10 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 safe-area-inset-top">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {navigation.find(item => item.current)?.name || 'Dashboard'}
            </h1>

            <div className="flex items-center space-x-2">
              {/* Status indicator */}
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500 hidden sm:inline">Online</span>
              </div>

              {/* Notifications (placeholder) */}
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-600 relative">
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="py-4 safe-area-inset-bottom">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;