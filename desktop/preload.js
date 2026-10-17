/**
 * AUREX Desktop - Preload Script
 *
 * Secure bridge between main and renderer processes
 *
 * SECURITY:
 * - Only exposes whitelisted APIs
 * - No direct Node.js access in renderer
 * - All IPC validated and sanitized
 */
import { contextBridge, ipcRenderer } from 'electron';
// Expose secure API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    // Storage operations
    storage: {
        get: (key) => ipcRenderer.invoke('storage:get', key),
        set: (key, value, classification) => ipcRenderer.invoke('storage:set', key, value, classification),
        remove: (key) => ipcRenderer.invoke('storage:remove', key)
    },
    // Session operations
    session: {
        unlock: (password) => ipcRenderer.invoke('session:unlock', password),
        lock: () => ipcRenderer.invoke('session:lock'),
        isLocked: () => ipcRenderer.invoke('session:isLocked'),
        recordActivity: () => ipcRenderer.invoke('session:recordActivity')
    },
    // Ledger operations
    ledger: {
        addEntry: (entry) => ipcRenderer.invoke('ledger:addEntry', entry),
        getEntries: () => ipcRenderer.invoke('ledger:getEntries')
    },
    // FX operations
    fx: {
        addSnapshot: (snapshot) => ipcRenderer.invoke('fx:addSnapshot', snapshot),
        getSnapshots: () => ipcRenderer.invoke('fx:getSnapshots')
    },
    // Update events
    onUpdateChecking: (callback) => {
        ipcRenderer.on('update-checking', () => callback());
    },
    onUpdateAvailable: (callback) => {
        ipcRenderer.on('update-available', (_event, info) => callback(info));
    },
    onUpdateNotAvailable: (callback) => {
        ipcRenderer.on('update-not-available', (_event, info) => callback(info));
    },
    onUpdateProgress: (callback) => {
        ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback) => {
        ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
    },
    onUpdateError: (callback) => {
        ipcRenderer.on('update-error', (_event, error) => callback(error));
    }
});
