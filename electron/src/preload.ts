require('./rt/electron-rt');

//////////////////////////////
// User Defined Preload scripts below
console.log('User Preload!');

const { contextBridge, ipcRenderer } = require('electron');

// This is the bridge that lets your website talk to the laptop
contextBridge.exposeInMainWorld('electronAPI', {
    quitApp: () => ipcRenderer.send('quit-app')
});