import React, { useState, useEffect } from 'react';
import { WifiIcon, SignalSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const NetworkStatus = ({ isOnline }) => {
  const [showBanner, setShowBanner] = useState(!isOnline);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setShowBanner(!isOnline);
  }, [isOnline]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    // Trigger a reconnection attempt
    window.location.reload();
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 safe-area-inset-top">
      <div className="bg-red-600 text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SignalSlashIcon className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">
                No Internet Connection
              </p>
              <p className="text-xs text-red-200">
                Please check your connection and try again
              </p>
            </div>
          </div>
          
          <button
            onClick={handleRetry}
            className="btn-secondary bg-white bg-opacity-20 text-white hover:bg-opacity-30 text-sm px-3 py-1"
          >
            Retry
          </button>
        </div>
      </div>
      
      {/* Spacer to push content below the banner */}
      <div className="h-1 bg-red-700"></div>
    </div>
  );
};

export default NetworkStatus;