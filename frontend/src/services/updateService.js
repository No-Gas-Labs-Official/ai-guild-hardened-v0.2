import { apiService } from './apiService';

class UpdateService {
  constructor() {
    this.currentVersion = '1.0.0';
    this.updateCheckInterval = null;
    this.listeners = [];
  }

  // Check for updates
  async checkForUpdates() {
    try {
      const response = await apiService.post('/api/apk/check-updates', {
        currentVersion: this.currentVersion
      });

      const updateInfo = response.data;
      this.notifyListeners('update-checked', updateInfo);
      
      return updateInfo;
    } catch (error) {
      console.error('Update check failed:', error);
      throw error;
    }
  }

  // Get latest version info
  async getLatestVersion() {
    try {
      const response = await apiService.get('/api/apk/latest');
      return response.data;
    } catch (error) {
      console.error('Failed to get latest version:', error);
      throw error;
    }
  }

  // Get version history
  async getVersionHistory() {
    try {
      const response = await apiService.get('/api/apk/history');
      return response.data.versions;
    } catch (error) {
      console.error('Failed to get version history:', error);
      throw error;
    }
  }

  // Download APK
  async downloadAPK(versionId) {
    try {
      const response = await apiService.get(`/api/apk/download/${versionId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to download APK:', error);
      throw error;
    }
  }

  // Start automatic update checking
  startAutoCheck(intervalMinutes = 60) {
    // Stop existing interval
    this.stopAutoCheck();

    // Check immediately
    this.checkForUpdates();

    // Set up interval
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMinutes * 60 * 1000);

    console.log(`Auto update checking started (interval: ${intervalMinutes} minutes)`);
  }

  // Stop automatic update checking
  stopAutoCheck() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('Auto update checking stopped');
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
          console.error(`Error in update listener for ${event}:`, error);
        }
      });
    }
  }

  // Prompt user to update
  promptUpdate(updateInfo) {
    if (updateInfo.hasUpdate) {
      // Create a custom confirmation dialog
      const shouldUpdate = window.confirm(
        `New version available: ${updateInfo.latestVersion}\n\n` +
        `Release notes: ${updateInfo.releaseNotes}\n\n` +
        `Would you like to download the update?`
      );

      if (shouldUpdate) {
        this.downloadAndInstall(updateInfo);
      }
    }
  }

  // Download and install update
  async downloadAndInstall(updateInfo) {
    try {
      this.notifyListeners('update-started', updateInfo);

      // Show progress indicator
      this.notifyListeners('update-progress', { progress: 0, status: 'Starting download...' });

      // Simulate download progress
      for (let i = 0; i <= 100; i += 10) {
        this.notifyListeners('update-progress', { 
          progress: i, 
          status: `Downloading... ${i}%` 
        });
        await this.sleep(200);
      }

      // Get download info
      const downloadInfo = await this.downloadAPK(updateInfo.version?.id || 1);
      
      this.notifyListeners('update-progress', { 
        progress: 100, 
        status: 'Download complete. Installing...' 
      });

      // On mobile, this would trigger the actual APK installation
      this.notifyListeners('update-completed', downloadInfo);

      // In a real mobile app, this would open the APK file
      if (window.Capacitor && window.Capacitor.getPlatform() !== 'web') {
        // Open the downloaded APK
        this.notifyListeners('update-installing', { 
          status: 'Opening APK for installation...' 
        });
      } else {
        // On web, just show the download link
        window.open(downloadInfo.downloadUrl, '_blank');
      }

    } catch (error) {
      console.error('Update failed:', error);
      this.notifyListeners('update-error', { error: error.message });
    }
  }

  // Utility sleep function
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const updateService = new UpdateService();
export default updateService;