/**
 * OfflineQueue - Offline Operation Queueing
 * 
 * Queues Supabase operations when offline and syncs when connection restored
 * Validates: Requirements 13.3, 13.4, 13.5, 10.6
 */

import { networkMonitor } from './network-monitor';

export interface QueuedOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data?: any;
  filter?: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

export type OperationExecutor = (operation: QueuedOperation) => Promise<void>;

/**
 * OfflineQueue class
 * Manages queued operations for offline support
 */
export class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private storageKey = 'offline-queue';
  private isSyncing = false;
  private maxRetries = 3;
  private operationExecutor: OperationExecutor | null = null;

  constructor() {
    // Load persisted queue from storage
    this.loadQueue();

    // Listen for network status changes
    networkMonitor.onChange((isOnline) => {
      if (isOnline && this.queue.length > 0) {
        console.log('[OfflineQueue] Network restored, starting sync');
        this.sync();
      }
    });

    console.log('[OfflineQueue] Initialized', { queuedOperations: this.queue.length });
  }

  /**
   * Set the operation executor function
   * 
   * @param executor - Function to execute queued operations
   */
  public setExecutor(executor: OperationExecutor): void {
    this.operationExecutor = executor;
  }

  /**
   * Enqueue an operation for later execution
   * Validates: Requirement 13.3
   * 
   * @param operation - The operation to queue
   */
  public async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedOp: QueuedOperation = {
      ...operation,
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(queuedOp);
    await this.persist();

    console.log('[OfflineQueue] Operation queued', { 
      type: queuedOp.type, 
      table: queuedOp.table,
      queueSize: this.queue.length 
    });
  }

  /**
   * Sync all queued operations
   * Validates: Requirements 13.4, 13.5, 10.6
   */
  public async sync(): Promise<void> {
    if (!networkMonitor.getStatus()) {
      console.log('[OfflineQueue] Cannot sync - offline');
      return;
    }

    if (this.isSyncing) {
      console.log('[OfflineQueue] Sync already in progress');
      return;
    }

    if (!this.operationExecutor) {
      console.error('[OfflineQueue] No operation executor set');
      return;
    }

    this.isSyncing = true;
    console.log('[OfflineQueue] Starting sync', { operations: this.queue.length });

    const operations = [...this.queue];
    const failedOperations: QueuedOperation[] = [];

    for (const op of operations) {
      try {
        await this.executeOperation(op);
        
        // Remove from queue on success
        const index = this.queue.findIndex(q => q.id === op.id);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }

        console.log('[OfflineQueue] Operation synced', { 
          type: op.type, 
          table: op.table 
        });
      } catch (error) {
        console.error('[OfflineQueue] Operation failed', { 
          type: op.type, 
          table: op.table,
          error 
        });

        // Increment retry count
        op.retryCount++;

        // Re-queue if under max retries
        if (op.retryCount < this.maxRetries) {
          failedOperations.push(op);
        } else {
          console.error('[OfflineQueue] Operation exceeded max retries, discarding', {
            type: op.type,
            table: op.table,
            retryCount: op.retryCount
          });
          
          // Remove from queue
          const index = this.queue.findIndex(q => q.id === op.id);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
        }
      }
    }

    // Update queue with failed operations
    if (failedOperations.length > 0) {
      console.log('[OfflineQueue] Re-queuing failed operations', { 
        count: failedOperations.length 
      });
    }

    await this.persist();
    this.isSyncing = false;

    console.log('[OfflineQueue] Sync complete', { 
      remaining: this.queue.length 
    });
  }

  /**
   * Execute a queued operation
   * 
   * @param operation - The operation to execute
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    if (!this.operationExecutor) {
      throw new Error('No operation executor set');
    }

    await this.operationExecutor(operation);
  }

  /**
   * Get the current queue size
   * 
   * @returns Number of queued operations
   */
  public getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get all queued operations
   * 
   * @returns Array of queued operations
   */
  public getQueue(): QueuedOperation[] {
    return [...this.queue];
  }

  /**
   * Clear all queued operations
   */
  public async clear(): Promise<void> {
    this.queue = [];
    await this.persist();
    console.log('[OfflineQueue] Queue cleared');
  }

  /**
   * Persist queue to storage
   * Validates: Requirement 13.4
   */
  private async persist(): Promise<void> {
    try {
      if (window.electronAPI?.storage) {
        // Use Electron secure storage if available
        await window.electronAPI.storage.set(
          this.storageKey,
          JSON.stringify(this.queue),
          'PRIVATE'
        );
      } else {
        // Fallback to localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to persist queue:', error);
    }
  }

  /**
   * Load queue from storage
   */
  private loadQueue(): void {
    try {
      let queueData: string | null = null;

      if (window.electronAPI?.storage) {
        // Note: This is async but we're in constructor, so we'll load async
        window.electronAPI.storage.get(this.storageKey).then(data => {
          if (data) {
            this.queue = JSON.parse(data);
            console.log('[OfflineQueue] Loaded queue from storage', { 
              operations: this.queue.length 
            });
          }
        }).catch(error => {
          console.error('[OfflineQueue] Failed to load queue from Electron storage:', error);
        });
      } else {
        // Fallback to localStorage
        queueData = localStorage.getItem(this.storageKey);
        if (queueData) {
          this.queue = JSON.parse(queueData);
          console.log('[OfflineQueue] Loaded queue from localStorage', { 
            operations: this.queue.length 
          });
        }
      }
    } catch (error) {
      console.error('[OfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Generate a unique ID for an operation
   * 
   * @returns Unique ID string
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();
