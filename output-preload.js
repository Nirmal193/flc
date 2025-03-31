// output-preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateAnalysis: (callback) =>
    ipcRenderer.on('update-analysis', (event, analysisText) => callback(analysisText))
});
