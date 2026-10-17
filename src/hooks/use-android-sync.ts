import { useState, useEffect } from 'react';

export interface AndroidSyncStatus {
  isConnected: boolean;
  lastSyncTime: Date | null;
  deviceName: string | null;
  phoneCount: number;
  messagesSynced: number;
}

/**
 * Hook to monitor Android app sync status
 * Checks for recent SMS events to determine if Android app is actively syncing
 */
export function useAndroidSync(smsEvents: Array<{ timestamp: Date }>) {
  const [syncStatus, setSyncStatus] = useState<AndroidSyncStatus>({
    isConnected: false,
    lastSyncTime: null,
    deviceName: null,
    phoneCount: 0,
    messagesSynced: 0,
  });

  useEffect(() => {
    if (smsEvents.length === 0) {
      setSyncStatus({
        isConnected: false,
        lastSyncTime: null,
        deviceName: null,
        phoneCount: 0,
        messagesSynced: 0,
      });
      return;
    }

    // Find the most recent SMS event
    const sortedEvents = [...smsEvents].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const mostRecent = sortedEvents[0];
    const mostRecentTime = new Date(mostRecent.timestamp);
    const now = new Date();
    const timeDiff = now.getTime() - mostRecentTime.getTime();

    // Consider connected if last sync was within 5 minutes
    const isConnected = timeDiff < 5 * 60 * 1000;

    // Count unique phone numbers (assuming semi-account system with 4 phones)
    const phoneCount = 4; // Based on semi-account architecture

    setSyncStatus({
      isConnected,
      lastSyncTime: mostRecentTime,
      deviceName: 'Android Device', // Could be enhanced with actual device info
      phoneCount,
      messagesSynced: smsEvents.length,
    });
  }, [smsEvents]);

  return syncStatus;
}

/**
 * Format time difference for display
 */
export function formatTimeSince(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 30) return `${seconds}s ago`;
  return 'Just now';
}
