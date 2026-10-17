/**
 * useDesktopStorage Hook
 * 
 * Wraps window.electronAPI.storage with fallback to localStorage
 * Validates: Requirements 10.1, 10.3
 */

import { useCallback } from 'react';

type DataClassification = 'PUBLIC' | 'PRIVATE' | 'SENSITIVE';

interface DesktopStorageAPI {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, classification?: DataClassification) => Promise<boolean>;
  remove: (key: string) => Promise<boolean>;
}

/**
 * Hook for accessing desktop storage with fallback to localStorage
 * Validates: Requirements 10.1, 10.3
 */
export function useDesktopStorage(): DesktopStorageAPI {
  const get = useCallback(async (key: string): Promise<string | null> => {
    try {
      if (window.electronAPI?.storage) {
        // Use Electron secure storage
        return await window.electronAPI.storage.get(key);
      } else {
        // Fallback to localStorage
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error('[useDesktopStorage] Error getting value:', error);
      return null;
    }
  }, []);

  const set = useCallback(async (
    key: string, 
    value: string, 
    classification: DataClassification = 'PRIVATE'
  ): Promise<boolean> => {
    try {
      if (window.electronAPI?.storage) {
        // Use Electron secure storage
        return await window.electronAPI.storage.set(key, value, classification);
      } else {
        // Fallback to localStorage
        localStorage.setItem(key, value);
        return true;
      }
    } catch (error) {
      console.error('[useDesktopStorage] Error setting value:', error);
      return false;
    }
  }, []);

  const remove = useCallback(async (key: string): Promise<boolean> => {
    try {
      if (window.electronAPI?.storage) {
        // Use Electron secure storage
        return await window.electronAPI.storage.remove(key);
      } else {
        // Fallback to localStorage
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.error('[useDesktopStorage] Error removing value:', error);
      return false;
    }
  }, []);

  return { get, set, remove };
}
