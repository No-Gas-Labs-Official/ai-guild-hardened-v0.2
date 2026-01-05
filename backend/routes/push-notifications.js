const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Mock Firebase Cloud Messaging service
const mockFCM = {
  sendNotification: async (token, notification) => {
    console.log('Sending push notification:', notification);
    // In production, integrate with actual FCM
    return { success: true, messageId: 'mock_' + Date.now() };
  },
  
  subscribeToTopic: async (token, topic) => {
    console.log(`Subscribing ${token} to topic: ${topic}`);
    return { success: true };
  }
};

// Send push notification to user
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { userId, title, body, data, type, priority = 'normal' } = req.body;
    
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'User ID, title, and body are required' });
    }

    // Get user's FCM tokens
    const tokensResult = await pool.query(
      'SELECT fcm_token FROM user_devices WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    if (tokensResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active devices found for user' });
    }

    // Store notification in database
    const notificationResult = await pool.query(
      `INSERT INTO notifications (user_id, title, body, data, type, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, title, body, JSON.stringify(data || {}), type, priority, 'sent']
    );

    // Send push notification to all devices
    const results = [];
    for (const row of tokensResult.rows) {
      const result = await mockFCM.sendNotification(row.fcm_token, {
        title,
        body,
        data: {
          ...data,
          notificationId: notificationResult.rows[0].id,
          type
        },
        priority,
        sound: 'default'
      });
      results.push(result);
    }

    res.json({
      message: 'Push notification sent successfully',
      notification: notificationResult.rows[0],
      devicesSent: results.length,
      results
    });
  } catch (error) {
    console.error('Send push notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register device for push notifications
router.post('/register-device', authenticateToken, async (req, res) => {
  try {
    const { fcmToken, deviceId, deviceType, deviceName } = req.body;
    
    if (!fcmToken || !deviceId) {
      return res.status(400).json({ error: 'FCM token and device ID are required' });
    }

    // Check if device already exists
    const existingDevice = await pool.query(
      'SELECT id FROM user_devices WHERE user_id = $1 AND device_id = $2',
      [req.user.userId, deviceId]
    );

    let result;
    if (existingDevice.rows.length > 0) {
      // Update existing device
      result = await pool.query(
        `UPDATE user_devices 
         SET fcm_token = $1, device_type = $2, device_name = $3, last_seen = CURRENT_TIMESTAMP, is_active = true
         WHERE user_id = $4 AND device_id = $5
         RETURNING *`,
        [fcmToken, deviceType || 'mobile', deviceName || 'Unknown Device', req.user.userId, deviceId]
      );
    } else {
      // Register new device
      result = await pool.query(
        `INSERT INTO user_devices (user_id, device_id, fcm_token, device_type, device_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.user.userId, deviceId, fcmToken, deviceType || 'mobile', deviceName || 'Unknown Device', true]
      );
    }

    res.status(201).json({
      message: 'Device registered successfully',
      device: result.rows[0]
    });
  } catch (error) {
    console.error('Register device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unregister device
router.delete('/unregister-device/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const result = await pool.query(
      'UPDATE user_devices SET is_active = false WHERE user_id = $1 AND device_id = $2 RETURNING *',
      [req.user.userId, deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json({
      message: 'Device unregistered successfully',
      device: result.rows[0]
    });
  } catch (error) {
    console.error('Unregister device error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;
    
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.userId];
    
    if (unreadOnly === 'true') {
      query += ' AND read_at IS NULL';
    }
    
    query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    
    // Get unread count
    const unreadResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
      [req.user.userId]
    );
    
    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadResult.rows[0].count),
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await pool.query(
      `UPDATE notifications 
       SET read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET read_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND read_at IS NULL
       RETURNING *`,
      [req.user.userId]
    );

    res.json({
      message: 'All notifications marked as read',
      count: result.rows.length
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notificationId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification deleted successfully',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscribe to topic
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { topic } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Get user's active devices
    const devicesResult = await pool.query(
      'SELECT fcm_token FROM user_devices WHERE user_id = $1 AND is_active = true',
      [req.user.userId]
    );

    if (devicesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active devices found' });
    }

    // Subscribe all devices to topic
    const results = [];
    for (const row of devicesResult.rows) {
      const result = await mockFCM.subscribeToTopic(row.fcm_token, topic);
      results.push(result);
    }

    res.json({
      message: 'Subscribed to topic successfully',
      topic,
      devicesSubscribed: results.length
    });
  } catch (error) {
    console.error('Subscribe to topic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      res.json({
        settings: {
          push_enabled: true,
          email_enabled: false,
          repo_updates: true,
          agent_tasks: true,
          security_alerts: true,
          system_notifications: true
        }
      });
    } else {
      res.json({ settings: result.rows[0] });
    }
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notification settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { settings } = req.body;
    
    const result = await pool.query(
      `INSERT INTO notification_settings (user_id, push_enabled, email_enabled, repo_updates, agent_tasks, security_alerts, system_notifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         push_enabled = EXCLUDED.push_enabled,
         email_enabled = EXCLUDED.email_enabled,
         repo_updates = EXCLUDED.repo_updates,
         agent_tasks = EXCLUDED.agent_tasks,
         security_alerts = EXCLUDED.security_alerts,
         system_notifications = EXCLUDED.system_notifications
       RETURNING *`,
      [
        req.user.userId,
        settings.push_enabled !== false,
        settings.email_enabled === true,
        settings.repo_updates !== false,
        settings.agent_tasks !== false,
        settings.security_alerts !== false,
        settings.system_notifications !== false
      ]
    );

    res.json({
      message: 'Notification settings updated successfully',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;