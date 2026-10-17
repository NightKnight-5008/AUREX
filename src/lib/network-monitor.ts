/**
 * NetworkMonitor - Network Status Monitoring
 * 
 * Monitors online/offline status using navigator.onLine
 * Validates: Requirements 13.1, 13.2
 */

export type NetworkStatusListener = (isOnline: boolean) => void;

/**
 * NetworkMonitor class
 * Monitors network connectivity status and notifies listeners of changes
 */
export class NetworkMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: NetworkStatusListener[] = [];

  constructor() {
    // Listen for online event
    window.addEventListener('online', () => {
      this.updateStatus(true);
    });

    // Listen for offline event
    window.addEventListener('offline', () => {
      this.updateStatus(false);
    });

    console.log('[NetworkMonitor] Initialized', { isOnline: this.isOnline });
  }

  /**
   * Update network status and notify listeners
   * Validates: Requirement 13.1
   * 
   * @param online - Whether the network is online
   */
  private updateStatus(online: boolean): void {
    if (this.isOnline !== online) {
      this.isOnline = online;
      console.log('[NetworkMonitor] Status changed', { isOnline: online });
      
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(online);
        } catch (error) {
          console.error('[NetworkMonitor] Error in listener:', error);
        }
      });
    }
  }

  /**
   * Get current network status
   * Validates: Requirement 13.1
   * 
   * @returns True if online, false if offline
   */
  public getStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Register a listener for network status changes
   * Validates: Requirement 13.2
   * 
   * @param listener - Callback function to be called when status changes
   */
  public onChange(listener: NetworkStatusListener): void {
    this.listeners.push(listener);
  }

  /**
   * Unregister a listener
   * 
   * @param listener - The listener to remove
   */
  public removeListener(listener: NetworkStatusListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Remove all listeners
   */
  public removeAllListeners(): void {
    this.listeners = [];
  }
}

// Export singleton instance
export const networkMonitor = new NetworkMonitor();
