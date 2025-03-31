const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send actions to main process
  setWindowOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity),
  setWindowBackgroundColor: (color) => ipcRenderer.send('set-bg-color', color),
  closeWindow: () => ipcRenderer.send('close-output-window'),
  
  // Receive events from main process
  onUpdateAnalysis: (callback) => ipcRenderer.on('update-analysis', (_, text) => callback(text)),
  onUpdateBgColor: (callback) => ipcRenderer.on('update-bg-color', (_, color) => callback(color))
});