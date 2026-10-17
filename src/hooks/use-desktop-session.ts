/**
 * useDesktopSession Hook
 * 
 * Wraps window.electronAPI.session methods
 * Validates: Requirement 10.1
 */

import { useCallback, useState, useEffect } from 'react';

interface DesktopSessionAPI {
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<boolean>;
  isLocked: () => Promise<boolean>;
  recordActivity: () => Promise<boolean>;
  locked: boolean;
  refreshLockStatus: () => Promise<void>;
}

/**
 * Hook for accessing desktop session management
 * Validates: Requirement 10.1
 */
export function useDesktopSession(): DesktopSessionAPI {
  const [locked, setLocked] = useState<boolean>(false);

  const unlock = useCallback(async (password: string): Promise<boolean> => {
    try {
      if (window.electronAPI?.session) {
        const result = await window.electronAPI.session.unlock(password);
        if (result) {
          setLocked(false);
        }
        return result;
      }
      return false;
    } catch (error) {
      console.error('[useDesktopSession] Error unlocking:', error);
      return false;
    }
  }, []);

  const lock = useCallback(async (): Promise<boolean> => {
    try {
      if (window.electronAPI?.session) {
        const result = await window.electronAPI.session.lock();
        if (result) {
          setLocked(true);
        }
        return result;
      }
      return false;
    } catch (error) {
      console.error('[useDesktopSession] Error locking:', error);
      return false;
    }
  }, []);

  const isLocked = useCallback(async (): Promise<boolean> => {
    try {
      if (window.electronAPI?.session) {
        return await window.electronAPI.session.isLocked();
      }
      return false;
    } catch (error) {
      console.error('[useDesktopSession] Error checking lock status:', error);
      return false;
    }
  }, []);

  const recordActivity = useCallback(async (): Promise<boolean> => {
    try {
      if (window.electronAPI?.session) {
        return await window.electronAPI.session.recordActivity();
      }
      return false;
    } catch (error) {
      console.error('[useDesktopSession] Error recording activity:', error);
      return false;
    }
  }, []);

  const refreshLockStatus = useCallback(async (): Promise<void> => {
    const status = await isLocked();
    setLocked(status);
  }, [isLocked]);

  // Check lock status on mount
  useEffect(() => {
    refreshLockStatus();
  }, [refreshLockStatus]);

  // Record activity on user interaction
  useEffect(() => {
    const handleActivity = () => {
      recordActivity();
    };

    // Listen for user activity events
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [recordActivity]);

  return {
    unlock,
    lock,
    isLocked,
    recordActivity,
    locked,
    refreshLockStatus
  };
}
