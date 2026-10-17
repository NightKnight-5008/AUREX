/**
 * useUpdateNotifications Hook
 * 
 * Listens for update events from main process
 * Validates: Requirements 7.2, 7.3, 7.4
 */

import { useState, useEffect } from 'react';

interface UpdateInfo {
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  updateInfo: UpdateInfo | null;
  progress: ProgressInfo | null;
  error: string | null;
}

/**
 * Hook for listening to update events from main process
 * Validates: Requirements 7.2, 7.3, 7.4
 */
export function useUpdateNotifications() {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    updateInfo: null,
    progress: null,
    error: null
  });

  useEffect(() => {
    if (!window.electronAPI) {
      return;
    }

    // Listen for update checking
    window.electronAPI.onUpdateChecking(() => {
      setState(prev => ({
        ...prev,
        checking: true,
        error: null
      }));
    });

    // Listen for update available
    window.electronAPI.onUpdateAvailable((info: unknown) => {
      setState(prev => ({
        ...prev,
        checking: false,
        available: true,
        downloading: true,
        updateInfo: info as UpdateInfo
      }));
    });

    // Listen for update not available
    window.electronAPI.onUpdateNotAvailable((info: unknown) => {
      setState(prev => ({
        ...prev,
        checking: false,
        available: false,
        updateInfo: info as UpdateInfo
      }));
    });

    // Listen for download progress
    window.electronAPI.onUpdateProgress((progress: unknown) => {
      setState(prev => ({
        ...prev,
        downloading: true,
        progress: progress as ProgressInfo
      }));
    });

    // Listen for update downloaded
    window.electronAPI.onUpdateDownloaded((info: unknown) => {
      setState(prev => ({
        ...prev,
        downloading: false,
        downloaded: true,
        updateInfo: info as UpdateInfo
      }));
    });

    // Listen for update error
    window.electronAPI.onUpdateError((error: unknown) => {
      const errorMessage = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : 'Unknown error';

      setState(prev => ({
        ...prev,
        checking: false,
        downloading: false,
        error: errorMessage
      }));
    });
  }, []);

  return state;
}
