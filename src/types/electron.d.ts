/**
 * TypeScript type definitions for window.electronAPI
 * Validates: Requirements 2.1, 2.2
 */

export interface ElectronAPI {
  // Storage API
  storage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, classification?: 'PUBLIC' | 'PRIVATE' | 'SENSITIVE'): Promise<boolean>;
    remove(key: string): Promise<boolean>;
  };

  // Session API
  session: {
    unlock(password: string): Promise<boolean>;
    lock(): Promise<boolean>;
    isLocked(): Promise<boolean>;
    recordActivity(): Promise<boolean>;
  };

  // Ledger API
  ledger: {
    addEntry(entry: unknown): Promise<boolean>;
    getEntries(): Promise<unknown[]>;
  };

  // FX API
  fx: {
    addSnapshot(snapshot: unknown): Promise<boolean>;
    getSnapshots(): Promise<unknown[]>;
  };

  // Update event listeners
  onUpdateChecking(callback: () => void): void;
  onUpdateAvailable(callback: (info: unknown) => void): void;
  onUpdateNotAvailable(callback: (info: unknown) => void): void;
  onUpdateProgress(callback: (progress: unknown) => void): void;
  onUpdateDownloaded(callback: (info: unknown) => void): void;
  onUpdateError(callback: (error: unknown) => void): void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
