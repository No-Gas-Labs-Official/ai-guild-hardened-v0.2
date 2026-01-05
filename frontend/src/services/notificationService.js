import { apiService } from './apiService';

class NotificationService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.permission = 'default';
    this.registration = null;
    this.listeners = [];
  }

  // Check if push notifications are supported
  checkSupport() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Initialize push notifications
  async initialize() {
    if (!this.isSupported) {
      console.log('Push notifications not supported');
      return false;
    }

    try {
      // Request permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.log('Push notification permission denied');
        return false;
      }

      // Get service worker registration
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.ready;
      }

      // Register device with backend
      await this.registerDevice();

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission;
    }

    this.permission = Notification.permission;
    return Notification.permission;
  }

  // Register device with backend
  async registerDevice() {
    try {
      // Get or generate device ID
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
      }

      // Get FCM token (mock for demo)
      const fcmToken = 'mock_fcm_token_' + deviceId;

      // Get device info
      const deviceInfo = {
        fcmToken,
        deviceId,
        deviceType: 'mobile',
        deviceName: navigator.userAgent.split(' ')[0] || 'Unknown Device'
      };

      // Register with backend
      const response = await apiService.post('/api/notifications/register-device', deviceInfo);
      
      console.log('Device registered for push notifications:', response.data);
      this.notifyListeners('device-registered', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Failed to register device:', error);
      throw error;
    }
  }

  // Get notification settings
  async getSettings() {
    try {
      const response = await apiService.get('/api/notifications/settings');
      return response.data.settings;
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      throw error;
    }
  }

  // Update notification settings
  async updateSettings(settings) {
    try {
      const response = await apiService.put('/api/notifications/settings', { settings });
      this.notifyListeners('settings-updated', response.data.settings);
      return response.data.settings;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }

  // Get notifications
  async getNotifications(options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.unreadOnly) params.append('unreadOnly', options.unreadOnly);

      const response = await apiService.get(`/api/notifications?${params}`);
      
      this.notifyListeners('notifications-loaded', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await apiService.put(`/api/notifications/${notificationId}/read`);
      this.notifyListeners('notification-read', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      const response = await apiService.put('/api/notifications/read-all');
      this.notifyListeners('all-notifications-read', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      const response = await apiService.delete(`/api/notifications/${notificationId}`);
      this.notifyListeners('notification-deleted', { notificationId, ...response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  // Subscribe to topic
  async subscribeToTopic(topic) {
    try {
      const response = await apiService.post('/api/notifications/subscribe', { topic });
      this.notifyListeners('subscribed-to-topic', { topic, ...response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }

  // Show local notification
  showLocalNotification(title, body, options = {}) {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return;
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    const notification = new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      ...options
    });

    // Handle notification click
    notification.onclick = (event) => {
      event.preventDefault();
      this.notifyListeners('notification-clicked', {
        notification,
        data: options.data
      });
      
      // Focus or navigate to appropriate page
      if (options.data && options.data.url) {
        window.location.href = options.data.url;
      }
      
      notification.close();
    };

    // Auto-close after timeout
    if (options.autoClose !== false) {
      setTimeout(() => {
        notification.close();
      }, options.timeout || 5000);
    }

    return notification;
  }

  // Send push notification (demo - would be server-side)
  async sendNotification(userId, title, body, options = {}) {
    try {
      const payload = {
        userId,
        title,
        body,
        data: options.data,
        type: options.type || 'general',
        priority: options.priority || 'normal'
      };

      const response = await apiService.post('/api/notifications/send', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  // Add event listener
  addListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Remove event listener
  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Notify listeners
  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in notification listener for ${event}:`, error);
        }
      });
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await apiService.get('/api/notifications?unreadOnly=true&limit=1');
      return response.data.unreadCount || 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Clear all notifications
  async clearAll() {
    try {
      // Delete all notifications (would need batch delete endpoint)
      const notifications = await this.getNotifications({ limit: 100 });
      for (const notification of notifications.notifications) {
        await this.deleteNotification(notification.id);
      }
      
      this.notifyListeners('all-notifications-cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;