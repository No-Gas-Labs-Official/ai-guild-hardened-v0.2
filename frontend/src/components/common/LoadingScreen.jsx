import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-primary-600 font-bold text-3xl">NG</span>
        </div>
      </div>

      {/* Loading spinner */}
      <div className="mb-4">
        <div className="spinner"></div>
      </div>

      {/* Loading text */}
      <div className="text-center">
        <h2 className="text-white text-xl font-semibold mb-2">
          No-Gas-Labs™
        </h2>
        <p className="text-primary-200 text-sm">
          Loading Operations Intelligence...
        </p>
      </div>

      {/* Loading dots animation */}
      <div className="mt-8 flex space-x-2">
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
};

export default LoadingScreen;