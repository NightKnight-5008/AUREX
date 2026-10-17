/**
 * OfflineIndicator Component
 * 
 * Displays offline status when network unavailable
 * Validates: Requirement 13.2
 */

import React, { useState, useEffect } from 'react';
import { networkMonitor } from '../lib/network-monitor';
import { offlineQueue } from '../lib/offline-queue';

/**
 * Offline indicator component
 * Validates: Requirement 13.2
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(networkMonitor.getStatus());
  const [queueSize, setQueueSize] = useState(offlineQueue.getQueueSize());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Listen for network status changes
    const handleStatusChange = (online: boolean) => {
      setIsOnline(online);
      
      if (online && queueSize > 0) {
        setIsSyncing(true);
        // Sync will happen automatically via offlineQueue
        setTimeout(() => {
          setIsSyncing(false);
          setQueueSize(offlineQueue.getQueueSize());
        }, 2000);
      }
    };

    networkMonitor.onChange(handleStatusChange);

    // Update queue size periodically
    const interval = setInterval(() => {
      setQueueSize(offlineQueue.getQueueSize());
    }, 1000);

    return () => {
      networkMonitor.removeListener(handleStatusChange);
      clearInterval(interval);
    };
  }, [queueSize]);

  // Don't show anything if online and no queued operations
  if (isOnline && queueSize === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        backgroundColor: isOnline ? '#10b981' : '#ef4444',
        color: 'white',
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        zIndex: 9999,
        transition: 'all 0.3s ease'
      }}
    >
      {/* Status Icon */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'white',
          animation: isSyncing ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }}
      />

      {/* Status Text */}
      <span>
        {!isOnline && 'Offline'}
        {isOnline && isSyncing && 'Syncing...'}
        {isOnline && !isSyncing && queueSize > 0 && `${queueSize} pending`}
      </span>

      {/* Inline CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
