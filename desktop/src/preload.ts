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
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: string, classification?: string) =>
      ipcRenderer.invoke('storage:set', key, value, classification),
    remove: (key: string) => ipcRenderer.invoke('storage:remove', key)
  },

  // Session operations
  session: {
    unlock: (password: string) => ipcRenderer.invoke('session:unlock', password),
    lock: () => ipcRenderer.invoke('session:lock'),
    isLocked: () => ipcRenderer.invoke('session:isLocked'),
    recordActivity: () => ipcRenderer.invoke('session:recordActivity')
  },

  // Ledger operations
  ledger: {
    addEntry: (entry: unknown) => ipcRenderer.invoke('ledger:addEntry', entry),
    getEntries: () => ipcRenderer.invoke('ledger:getEntries')
  },

  // FX operations
  fx: {
    addSnapshot: (snapshot: unknown) => ipcRenderer.invoke('fx:addSnapshot', snapshot),
    getSnapshots: () => ipcRenderer.invoke('fx:getSnapshots')
  },

  // Update events
  onUpdateChecking: (callback: () => void) => {
    ipcRenderer.on('update-checking', () => callback());
  },
  onUpdateAvailable: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onUpdateNotAvailable: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-not-available', (_event, info) => callback(info));
  },
  onUpdateProgress: (callback: (progress: unknown) => void) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: (info: unknown) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
  onUpdateError: (callback: (error: unknown) => void) => {
    ipcRenderer.on('update-error', (_event, error) => callback(error));
  }
});

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI?: {
      storage: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string, classification?: string) => Promise<boolean>;
        remove: (key: string) => Promise<boolean>;
      };
      session: {
        unlock: (password: string) => Promise<boolean>;
        lock: () => Promise<boolean>;
        isLocked: () => Promise<boolean>;
        recordActivity: () => Promise<boolean>;
      };
      ledger: {
        addEntry: (entry: unknown) => Promise<boolean>;
        getEntries: () => Promise<unknown[]>;
      };
      fx: {
        addSnapshot: (snapshot: unknown) => Promise<boolean>;
        getSnapshots: () => Promise<unknown[]>;
      };
      onUpdateChecking: (callback: () => void) => void;
      onUpdateAvailable: (callback: (info: unknown) => void) => void;
      onUpdateNotAvailable: (callback: (info: unknown) => void) => void;
      onUpdateProgress: (callback: (progress: unknown) => void) => void;
      onUpdateDownloaded: (callback: (info: unknown) => void) => void;
      onUpdateError: (callback: (error: unknown) => void) => void;
    };
  }
}
