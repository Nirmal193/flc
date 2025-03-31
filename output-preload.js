const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setWindowOpacity: (opacity) => ipcRenderer.send('set-opacity', opacity),
  setWindowBackgroundColor: (color) => ipcRenderer.send('set-bg-color', color),
  closeWindow: () => ipcRenderer.send('close-output-window')
});
