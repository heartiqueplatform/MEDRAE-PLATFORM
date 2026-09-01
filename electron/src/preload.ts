require('./rt/electron-rt');

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
    quitApp: () => ipcRenderer.send('quit-app'),
    startExam: () => ipcRenderer.send('exam-started'),
    endExam: () => ipcRenderer.send('exam-ended'),
    onEscapePressed: (callback: () => void) => {
        ipcRenderer.on('escape-pressed', () => callback());
    },
    onBlockedClose: (callback: () => void) => {
        ipcRenderer.on('blocked-close', () => callback());
    },
    onFocusLost: (callback: () => void) => {
        ipcRenderer.on('focus-lost-warning', () => callback());
    },
    removeListeners: () => {
        ipcRenderer.removeAllListeners('escape-pressed');
        ipcRenderer.removeAllListeners('blocked-close');
        ipcRenderer.removeAllListeners('focus-lost-warning');
    }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);