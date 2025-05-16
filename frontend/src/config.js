// This file handles API URL configuration in both Electron and development environments

/**
 * Get the backend API URL based on environment
 * In Electron, this will use IPC to get the dynamically assigned port
 * In development, it will use the default URL
 */
export const getApiUrl = async () => {
  // Check if we're running in Electron
  if (window.electronAPI) {
    try {
      // Get the backend URL from the Electron main process
      const backendUrl = await window.electronAPI.getBackendUrl();
      console.log('Received backend URL from Electron:', backendUrl);
      return backendUrl;
    } catch (error) {
      console.error('Failed to get backend URL from Electron:', error);
      // Fallback to default
      return 'http://localhost:5001';
    }
  }
  
  // Not running in Electron, use default development URL
  console.log('Using default development backend URL');
  return process.env.REACT_APP_API_URL || 'http://localhost:5001';
};

// Export a default URL for initial loading
export const DEFAULT_API_URL = 'http://localhost:5001';