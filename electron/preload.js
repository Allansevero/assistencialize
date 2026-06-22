const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  clearSessionCache: (partitionId) => ipcRenderer.invoke('clear-session-cache', partitionId),
  getWebviewPreloadPath: () => ipcRenderer.invoke('get-webview-preload-path')
});
