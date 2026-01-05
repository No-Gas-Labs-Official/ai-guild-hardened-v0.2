import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { App as CapacitorApp } from '@capacitor/app';

// Components
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Repositories from './components/repositories/Repositories';
import Agents from './components/agents/Agents';
import Prototypes from './components/prototypes/Prototypes';
import CLI from './components/cli/CLI';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import LoadingScreen from './components/common/LoadingScreen';
import NetworkStatus from './components/common/NetworkStatus';

// Services
import { authService } from './services/authService';
import { apiService } from './services/apiService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Initialize app
    initializeApp();
    
    // Handle network status
    handleNetworkStatus();
    
    // Handle back button on mobile
    handleBackButton();
    
    // Configure status bar
    configureStatusBar();
  }, []);

  const initializeApp = async () => {
    try {
      // Check for existing session
      const token = localStorage.getItem('auth_token');
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('App initialization error:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const handleNetworkStatus = () => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  };

  const handleBackButton = () => {
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
    }
  };

  const configureStatusBar = async () => {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({
        style: StatusBar.Style.Dark
      });
      
      await StatusBar.setBackgroundColor({
        color: '#3b82f6'
      });
    }
  };

  const handleLogin = async (credentials) => {
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      localStorage.setItem('auth_token', result.token);
      return result;
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      setUser(null);
      localStorage.removeItem('auth_token');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even on error
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NetworkStatus isOnline={isOnline} />
      
      <Routes>
        <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="repositories" element={<Repositories />} />
          <Route path="agents" element={<Agents />} />
          <Route path="prototypes" element={<Prototypes />} />
          <Route path="cli" element={<CLI />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;