import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  CheckIcon, 
  XMarkIcon, 
  CogIcon,
  TrashIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { notificationService } from '../../services/notificationService';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadSettings();
    
    // Initialize push notifications
    notificationService.initialize();
    
    // Listen for updates
    notificationService.addListener('notifications-loaded', handleNotificationsLoaded);
    notificationService.addListener('notification-read', handleNotificationRead);
    notificationService.addListener('all-notifications-read', handleAllNotificationsRead);
    notificationService.addListener('settings-updated', handleSettingsUpdated);
    
    return () => {
      notificationService.removeListener('notifications-loaded', handleNotificationsLoaded);
      notificationService.removeListener('notification-read', handleNotificationRead);
      notificationService.removeListener('all-notifications-read', handleAllNotificationsRead);
      notificationService.removeListener('settings-updated', handleSettingsUpdated);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getNotifications({ limit: 50 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const settingsData = await notificationService.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleNotificationsLoaded = (data) => {
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  };

  const handleNotificationRead = (data) => {
    setNotifications(prev => 
      prev.map(n => n.id === data.notification.id ? { ...n, read_at: new Date().toISOString() } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  const handleSettingsUpdated = (newSettings) => {
    setSettings(newSettings);
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notifications.find(n => n.id === notificationId && !n.read_at)) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      await notificationService.updateSettings(newSettings);
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'security_alert':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'repo_update':
      case 'agent_task':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'system_notification':
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const filteredNotifications = notifications.filter(n => {
    switch (filter) {
      case 'unread':
        return !n.read_at;
      case 'read':
        return !!n.read_at;
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="card-mobile">
        <div className="flex items-center justify-center h-32">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <BellIcon className="h-5 w-5 mr-2" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <CogIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && settings && (
        <div className="card-mobile">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Notification Settings</h3>
          
          <div className="space-y-3">
            {Object.entries(settings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <label className="text-sm text-gray-600 capitalize">
                  {key.replace(/_/g, ' ')}
                </label>
                <button
                  onClick={() => updateSetting(key, !value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      value ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        {['all', 'unread', 'read'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${
              filter === tab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'unread' && unreadCount > 0 && (
              <span className="ml-1 text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      {unreadCount > 0 && (
        <div className="flex space-x-2">
          <button
            onClick={markAllAsRead}
            className="btn-secondary flex-1 text-sm py-2"
          >
            <CheckIcon className="h-4 w-4 mr-1" />
            Mark All Read
          </button>
          <button
            onClick={() => notificationService.clearAll()}
            className="btn-secondary flex-1 text-sm py-2"
          >
            <ArchiveBoxIcon className="h-4 w-4 mr-1" />
            Clear All
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`relative p-3 rounded-lg border ${
                notification.read_at
                  ? 'bg-white border-gray-200'
                  : 'bg-primary-50 border-primary-200'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    notification.read_at ? 'text-gray-900' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </p>
                  <p className={`text-sm mt-1 ${
                    notification.read_at ? 'text-gray-600' : 'text-gray-700'
                  }`}>
                    {notification.body}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {getTimeAgo(notification.created_at)}
                    </span>
                    
                    <div className="flex items-center space-x-2">
                      {!notification.read_at && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                        >
                          <CheckIcon className="h-3 w-3 mr-1" />
                          Read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {!notification.read_at && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-l-lg"></div>
              )}
            </div>
          ))
        ) : (
          <div className="card text-center py-8">
            <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No notifications
            </h3>
            <p className="text-gray-500 text-sm">
              {filter === 'unread' ? 'All caught up!' : 'Your notifications will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {filteredNotifications.length >= 20 && (
        <button className="w-full btn-secondary text-sm py-3">
          Load More
        </button>
      )}
    </div>
  );
};

export default NotificationCenter;