const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use 
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
    onBackendPort: (callback) => ipcRenderer.on('backend-port', (_, port) => callback(port))
  }
);