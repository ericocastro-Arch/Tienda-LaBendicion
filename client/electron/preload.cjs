const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron,
  },
  printBuffer: (bytes) => ipcRenderer.invoke('printer:print-buffer', bytes),
  printerName: () => ipcRenderer.invoke('printer:name'),
});
