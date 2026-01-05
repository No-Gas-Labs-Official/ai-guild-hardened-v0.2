import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Capacitor } from '@capacitor/core';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onLogin(formData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-600 to-primary-800 safe-area-inset-top">
      {/* Status bar placeholder for mobile */}
      <div className="h-6 bg-primary-800"></div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 safe-area-inset-bottom">
        <div className="w-full max-w-md">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <span className="text-primary-600 font-bold text-2xl">NG</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              No-Gas-Labs™
            </h1>
            <p className="text-primary-200 text-sm">
              Mobile Operations Intelligence
            </p>
          </div>

          {/* Login form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Username field */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="input-mobile"
                  placeholder="Enter your username or email"
                  autoComplete="username"
                  required
                />
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-mobile pr-12"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full relative"
              >
                {loading ? (
                  <>
                    <span className="opacity-0">Sign In</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="spinner-sm"></div>
                    </div>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo account info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center mb-2">
                Demo Account
              </p>
              <div className="bg-gray-50 rounded-lg p-3 text-xs">
                <p className="text-gray-600">
                  <strong>Username:</strong> admin
                </p>
                <p className="text-gray-600">
                  <strong>Password:</strong> admin123
                </p>
              </div>
            </div>
          </div>

          {/* Additional links */}
          <div className="mt-6 text-center">
            <p className="text-sm text-primary-200">
              Don't have an account?{' '}
              <button className="text-white font-medium hover:underline">
                Contact your administrator
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-primary-200 text-xs">
        <p>&copy; 2024 No-Gas-Labs™. All rights reserved.</p>
        <p className="mt-1">Version 1.0.0</p>
      </div>
    </div>
  );
};

export default Login;