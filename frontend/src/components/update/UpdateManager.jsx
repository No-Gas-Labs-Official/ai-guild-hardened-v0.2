import React, { useState, useEffect } from 'react';
import { 
  CloudArrowDownIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { updateService } from '../../services/updateService';

const UpdateManager = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, downloading, installing, completed, error
  const [progress, setProgress] = useState(0);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [showHistory, setShowHistory] = useState(false);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  useEffect(() => {
    checkForUpdates();
    loadVersionHistory();
    
    // Set up update service listeners
    updateService.addListener('update-checked', handleUpdateChecked);
    updateService.addListener('update-started', handleUpdateStarted);
    updateService.addListener('update-progress', handleUpdateProgress);
    updateService.addListener('update-completed', handleUpdateCompleted);
    updateService.addListener('update-error', handleUpdateError);
    
    // Start automatic checking if enabled
    if (autoCheckEnabled) {
      updateService.startAutoCheck(30); // Check every 30 minutes
    }
    
    return () => {
      updateService.removeListener('update-checked', handleUpdateChecked);
      updateService.removeListener('update-started', handleUpdateStarted);
      updateService.removeListener('update-progress', handleUpdateProgress);
      updateService.removeListener('update-completed', handleUpdateCompleted);
      updateService.removeListener('update-error', handleUpdateError);
      updateService.stopAutoCheck();
    };
  }, [autoCheckEnabled]);

  const checkForUpdates = async () => {
    try {
      const updateData = await updateService.checkForUpdates();
      setUpdateAvailable(updateData.hasUpdate);
      setUpdateInfo(updateData);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const loadVersionHistory = async () => {
    try {
      const history = await updateService.getVersionHistory();
      setVersionHistory(history);
    } catch (error) {
      console.error('Failed to load version history:', error);
    }
  };

  const handleUpdateChecked = (data) => {
    setUpdateAvailable(data.hasUpdate);
    setUpdateInfo(data);
  };

  const handleUpdateStarted = () => {
    setUpdateStatus('downloading');
    setProgress(0);
  };

  const handleUpdateProgress = (data) => {
    setProgress(data.progress);
    setUpdateStatus(data.status.includes('Installing') ? 'installing' : 'downloading');
  };

  const handleUpdateCompleted = (data) => {
    setUpdateStatus('completed');
    setProgress(100);
  };

  const handleUpdateError = (data) => {
    setUpdateStatus('error');
    console.error('Update error:', data.error);
  };

  const startUpdate = async () => {
    try {
      setUpdateStatus('downloading');
      await updateService.downloadAndInstall(updateInfo);
    } catch (error) {
      console.error('Failed to start update:', error);
      setUpdateStatus('error');
    }
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  const retryUpdate = () => {
    setUpdateStatus('idle');
    checkForUpdates();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading':
        return 'text-blue-600 bg-blue-100';
      case 'installing':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'downloading':
      case 'installing':
        return <ArrowPathIcon className="h-5 w-5 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      default:
        return <CloudArrowDownIcon className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="px-4 space-y-4">
      {/* Current Version */}
      <div className="card-mobile">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Current Version</h3>
          <span className="text-xs text-gray-500">v{currentVersion}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
          <span className="text-xs text-green-600">Up to date</span>
        </div>
      </div>

      {/* Update Available Alert */}
      {updateAvailable && updateInfo && (
        <div className="card-mobile border-l-4 border-blue-500 bg-blue-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <CloudArrowDownIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Update Available
                </h3>
              </div>
              
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-700">
                  Version {updateInfo.latestVersion}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {updateInfo.releaseNotes}
                </p>
              </div>
              
              {updateInfo.updateRequired && (
                <div className="flex items-center text-xs text-amber-600 mb-2">
                  <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                  This update is required
                </div>
              )}
            </div>
            
            <button
              onClick={dismissUpdate}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          
          {updateStatus === 'idle' && (
            <div className="flex space-x-2 mt-3">
              <button
                onClick={startUpdate}
                className="btn-primary flex-1 text-sm"
              >
                Download Now
              </button>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary text-sm"
              >
                History
              </button>
            </div>
          )}
          
          {(updateStatus === 'downloading' || updateStatus === 'installing') && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(updateStatus)}`}>
                  <div className="flex items-center">
                    {getStatusIcon(updateStatus)}
                    <span className="ml-1">
                      {updateStatus === 'downloading' ? 'Downloading...' : 'Installing...'}
                    </span>
                  </div>
                </span>
                <span className="text-xs text-gray-500">{progress}%</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    updateStatus === 'downloading' ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {updateStatus === 'completed' && (
            <div className="mt-3">
              <div className="flex items-center text-green-600 mb-2">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Update downloaded successfully</span>
              </div>
              <div className="flex space-x-2">
                <button className="btn-primary flex-1 text-sm">
                  Install Now
                </button>
                <button
                  onClick={() => setUpdateStatus('idle')}
                  className="btn-secondary text-sm"
                >
                  Later
                </button>
              </div>
            </div>
          )}
          
          {updateStatus === 'error' && (
            <div className="mt-3">
              <div className="flex items-center text-red-600 mb-2">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Update failed</span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={retryUpdate}
                  className="btn-primary flex-1 text-sm"
                >
                  Retry
                </button>
                <button
                  onClick={() => setUpdateStatus('idle')}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto Check Settings */}
      <div className="card-mobile">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">Auto Check Updates</h3>
            <p className="text-xs text-gray-500">Check for updates every 30 minutes</p>
          </div>
          <button
            onClick={() => {
              setAutoCheckEnabled(!autoCheckEnabled);
              if (!autoCheckEnabled) {
                updateService.startAutoCheck(30);
              } else {
                updateService.stopAutoCheck();
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoCheckEnabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoCheckEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Manual Check */}
      <div className="card-mobile">
        <button
          onClick={checkForUpdates}
          disabled={updateStatus !== 'idle'}
          className="btn-secondary w-full text-sm"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Check for Updates
        </button>
      </div>

      {/* Version History */}
      {showHistory && (
        <div className="card-mobile">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center">
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Version History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {versionHistory.map((version, index) => (
              <div
                key={version.id}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  version.version === currentVersion
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">
                      v{version.version}
                    </span>
                    {version.version === currentVersion && (
                      <span className="ml-2 text-xs text-primary-600">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Build {version.build_number}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDate(version.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Information */}
      {!updateAvailable && updateStatus === 'idle' && (
        <div className="card text-center py-8">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            You're up to date
          </h3>
          <p className="text-gray-500 text-sm">
            No updates available. Version {currentVersion} is the latest.
          </p>
        </div>
      )}
    </div>
  );
};

export default UpdateManager;