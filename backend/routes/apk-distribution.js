const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');
const { authenticateToken } = require('./auth');
const router = express.Router();

// APK storage directory
const APK_STORAGE_DIR = path.join(__dirname, '../storage/apk');

// Ensure storage directory exists
const ensureStorageDir = async () => {
  try {
    await fs.mkdir(APK_STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create APK storage directory:', error);
  }
};

// Initialize storage
ensureStorageDir();

// Upload new APK version
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    // In a real implementation, this would handle multipart file upload
    const { version, releaseNotes, buildNumber } = req.body;
    
    if (!version || !releaseNotes) {
      return res.status(400).json({ error: 'Version and release notes are required' });
    }

    // Store version info in database
    const result = await pool.query(
      `INSERT INTO apk_versions (version, build_number, release_notes, file_path, uploaded_by, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [version, buildNumber || '1', releaseNotes, '/storage/apk/', req.user.userId, true]
    );

    // Update previous versions as inactive
    await pool.query(
      'UPDATE apk_versions SET is_active = false WHERE id != $1',
      [result.rows[0].id]
    );

    res.status(201).json({
      message: 'APK version uploaded successfully',
      version: result.rows[0]
    });
  } catch (error) {
    console.error('APK upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get latest APK version info
router.get('/latest', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM apk_versions WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    if (result.rows.length === 0) {
      return res.json({ 
        hasUpdate: false, 
        message: 'No APK versions available' 
      });
    }

    const latestVersion = result.rows[0];
    
    res.json({
      hasUpdate: true,
      version: latestVersion,
      downloadUrl: `/api/apk/download/${latestVersion.id}`,
      releaseNotes: latestVersion.release_notes,
      updateRequired: true
    });
  } catch (error) {
    console.error('Get latest APK error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check for updates (for mobile app)
router.post('/check-updates', async (req, res) => {
  try {
    const { currentVersion } = req.body;
    
    if (!currentVersion) {
      return res.status(400).json({ error: 'Current version is required' });
    }

    // Get latest version
    const latestResult = await pool.query(
      'SELECT * FROM apk_versions WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );

    if (latestResult.rows.length === 0) {
      return res.json({ 
        hasUpdate: false, 
        message: 'No updates available' 
      });
    }

    const latestVersion = latestResult.rows[0];
    
    // Simple version comparison (in production, use semver)
    const hasUpdate = currentVersion !== latestVersion.version;
    
    res.json({
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion.version,
      downloadUrl: hasUpdate ? `/api/apk/download/${latestVersion.id}` : null,
      releaseNotes: hasUpdate ? latestVersion.release_notes : null,
      updateRequired: hasUpdate,
      forceUpdate: false // Set to true for critical updates
    });
  } catch (error) {
    console.error('Check updates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Download APK
router.get('/download/:versionId', async (req, res) => {
  try {
    const { versionId } = req.params;
    
    // Get version info
    const result = await pool.query(
      'SELECT * FROM apk_versions WHERE id = $1',
      [versionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'APK version not found' });
    }

    const version = result.rows[0];
    
    // In a real implementation, serve the actual APK file
    // For now, return a mock download
    res.json({
      message: 'APK download ready',
      version: version,
      downloadUrl: 'https://example.com/download/latest.apk',
      size: '15.2 MB',
      checksum: 'sha256:abc123...'
    });
  } catch (error) {
    console.error('Download APK error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get version history
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM apk_versions ORDER BY created_at DESC LIMIT 10'
    );

    res.json({
      versions: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Get version history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete version (admin only)
router.delete('/:versionId', authenticateToken, async (req, res) => {
  try {
    const { versionId } = req.params;
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Delete version
    const result = await pool.query(
      'DELETE FROM apk_versions WHERE id = $1 RETURNING *',
      [versionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'APK version not found' });
    }

    res.json({
      message: 'APK version deleted successfully',
      version: result.rows[0]
    });
  } catch (error) {
    console.error('Delete version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;