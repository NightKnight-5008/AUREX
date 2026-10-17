/**
 * AUREX Desktop - Offline Operation Queueing Property-Based Tests
 *
 * Property 7: Offline Operation Queueing and Replay
 * Validates: Requirements 10.6, 13.4, 13.5
 *
 * This test suite uses property-based testing to verify that operations queued
 * while offline are correctly executed when connection is restored.
 *
 * Property: For any Supabase operation queued while offline, when the connection
 * is restored, the operation should be executed and produce the same result as
 * if it had been executed while online.
 *
 * **Validates: Requirements 10.6, 13.4, 13.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock the network monitor
const mockNetworkMonitor = {
  getStatus: vi.fn(),
  onChange: vi.fn(),
  removeAllListeners: vi.fn()
};

vi.mock('../../src/lib/network-monitor', () => ({
  networkMonitor: mockNetworkMonitor,
  NetworkMonitor: vi.fn(() => mockNetworkMonitor)
}));

// Mock window.electronAPI
const mockElectronAPI = {
  storage: {
    get: vi.fn(),
    set: vi.fn()
  }
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};

describe('Property 7: Offline Operation Queueing and Replay', () => {
  let OfflineQueue;
  let queue;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup global mocks
    global.window = {
      electronAPI: mockElectronAPI,
      addEventListener: vi.fn()
    };
    global.localStorage = mockLocalStorage;
    global.console = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    };

    // Mock network monitor to start offline
    mockNetworkMonitor.getStatus.mockReturnValue(false);
    mockNetworkMonitor.onChange.mockImplementation(() => {});

    // Mock storage to return null initially
    mockElectronAPI.storage.get.mockResolvedValue(null);
    mockElectronAPI.storage.set.mockResolvedValue(true);
    mockLocalStorage.getItem.mockReturnValue(null);

    // Dynamically import OfflineQueue after mocks are set up
    const module = await import('../../src/lib/offline-queue.js');
    OfflineQueue = module.OfflineQueue;
    
    // Create a fresh instance
    queue = new OfflineQueue();
    
    // Clear the queue to ensure clean state
    await queue.clear();
  });

  afterEach(async () => {
    if (queue) {
      await queue.clear();
    }
  });

  /**
   * Property: Operations queued while offline are stored
   */
  it('property: operations queued while offline are persisted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('insert', 'update', 'delete'),
          table: fc.constantFrom('users', 'transactions', 'accounts', 'ledger'),
          data: fc.object({ maxDepth: 2 }),
          filter: fc.option(fc.object({ maxDepth: 1 }), { nil: undefined })
        }),
        async (operation) => {
          // Ensure we're offline
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          // Enqueue the operation
          await queue.enqueue(operation);

          // Property: Queue size should increase
          expect(queue.getQueueSize()).toBeGreaterThan(0);

          // Property: Operation should be in the queue
          const queuedOps = queue.getQueue();
          const found = queuedOps.find(op => 
            op.type === operation.type && 
            op.table === operation.table
          );
          expect(found).toBeDefined();
          expect(found.retryCount).toBe(0);
          expect(found.timestamp).toBeGreaterThan(0);
          expect(found.id).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Queued operations are executed when connection is restored
   */
  it('property: queued operations execute when online', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('insert', 'update', 'delete'),
            table: fc.constantFrom('users', 'transactions', 'accounts'),
            data: fc.object({ maxDepth: 2 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (operations) => {
          // Start offline
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          // Mock executor that tracks calls
          const executedOps = [];
          const mockExecutor = vi.fn(async (op) => {
            executedOps.push(op);
          });
          queue.setExecutor(mockExecutor);

          // Enqueue all operations while offline
          for (const op of operations) {
            await queue.enqueue(op);
          }

          const initialQueueSize = queue.getQueueSize();
          expect(initialQueueSize).toBe(operations.length);

          // Go online and sync
          mockNetworkMonitor.getStatus.mockReturnValue(true);
          await queue.sync();

          // Property: All operations should be executed
          expect(mockExecutor).toHaveBeenCalledTimes(operations.length);

          // Property: Queue should be empty after successful sync
          expect(queue.getQueueSize()).toBe(0);

          // Property: Each operation should be executed exactly once
          expect(executedOps.length).toBe(operations.length);

          // Property: Operations should maintain their type and table
          for (let i = 0; i < operations.length; i++) {
            const original = operations[i];
            const executed = executedOps.find(op => 
              op.type === original.type && 
              op.table === original.table
            );
            expect(executed).toBeDefined();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Failed operations are retried up to max retries
   */
  it('property: failed operations are retried with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('insert', 'update', 'delete'),
          table: fc.constantFrom('users', 'transactions'),
          data: fc.object({ maxDepth: 2 })
        }),
        async (operation) => {
          // Start offline, enqueue, then go online
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          let callCount = 0;
          const mockExecutor = vi.fn(async () => {
            callCount++;
            // Fail first 2 times, succeed on 3rd
            if (callCount < 3) {
              throw new Error('Simulated failure');
            }
          });
          queue.setExecutor(mockExecutor);

          await queue.enqueue(operation);

          // Go online and sync multiple times
          mockNetworkMonitor.getStatus.mockReturnValue(true);
          
          // First sync - should fail and retry
          await queue.sync();
          expect(callCount).toBe(1);
          expect(queue.getQueueSize()).toBe(1);

          // Second sync - should fail and retry again
          await queue.sync();
          expect(callCount).toBe(2);
          expect(queue.getQueueSize()).toBe(1);

          // Third sync - should succeed
          await queue.sync();
          expect(callCount).toBe(3);
          
          // Property: Queue should be empty after successful retry
          expect(queue.getQueueSize()).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Operations exceeding max retries are discarded
   */
  it('property: operations exceeding max retries are discarded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('insert', 'update', 'delete'),
          table: fc.constantFrom('users', 'transactions'),
          data: fc.object({ maxDepth: 2 })
        }),
        async (operation) => {
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          // Executor that always fails
          const mockExecutor = vi.fn(async () => {
            throw new Error('Persistent failure');
          });
          queue.setExecutor(mockExecutor);

          await queue.enqueue(operation);
          expect(queue.getQueueSize()).toBe(1);

          // Go online
          mockNetworkMonitor.getStatus.mockReturnValue(true);

          // Sync multiple times (max retries is 3)
          await queue.sync(); // Attempt 1, retryCount = 1
          expect(queue.getQueueSize()).toBe(1);

          await queue.sync(); // Attempt 2, retryCount = 2
          expect(queue.getQueueSize()).toBe(1);

          await queue.sync(); // Attempt 3, retryCount = 3
          
          // Property: Operation should be discarded after max retries
          expect(queue.getQueueSize()).toBe(0);
          
          // Property: Executor should be called 3 times (max retries)
          expect(mockExecutor).toHaveBeenCalledTimes(3);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Sync does not execute when offline
   */
  it('property: sync is skipped when offline', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('insert', 'update', 'delete'),
            table: fc.constantFrom('users', 'transactions'),
            data: fc.object({ maxDepth: 2 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (operations) => {
          // Clear queue before test
          await queue.clear();
          
          // Stay offline
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          const mockExecutor = vi.fn();
          queue.setExecutor(mockExecutor);

          // Enqueue operations
          for (const op of operations) {
            await queue.enqueue(op);
          }

          const queueSize = queue.getQueueSize();
          expect(queueSize).toBe(operations.length);

          // Try to sync while offline
          await queue.sync();

          // Property: Executor should not be called
          expect(mockExecutor).not.toHaveBeenCalled();

          // Property: Queue size should remain unchanged
          expect(queue.getQueueSize()).toBe(queueSize);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Operations maintain data integrity through queue
   */
  it('property: operation data is preserved through queueing and execution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('insert', 'update', 'delete'),
          table: fc.string({ minLength: 1, maxLength: 20 }),
          data: fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            value: fc.float({ min: 0, max: 1000000, noNaN: true })
          }),
          filter: fc.option(
            fc.record({
              id: fc.integer({ min: 1, max: 10000 })
            }),
            { nil: undefined }
          )
        }),
        async (operation) => {
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          let executedOp = null;
          const mockExecutor = vi.fn(async (op) => {
            executedOp = op;
          });
          queue.setExecutor(mockExecutor);

          // Enqueue
          await queue.enqueue(operation);

          // Go online and sync
          mockNetworkMonitor.getStatus.mockReturnValue(true);
          await queue.sync();

          // Property: Operation data should be preserved
          expect(executedOp).toBeDefined();
          expect(executedOp.type).toBe(operation.type);
          expect(executedOp.table).toBe(operation.table);
          expect(executedOp.data).toEqual(operation.data);
          
          if (operation.filter) {
            expect(executedOp.filter).toEqual(operation.filter);
          }

          // Property: Metadata should be added
          expect(executedOp.id).toBeDefined();
          expect(executedOp.timestamp).toBeGreaterThan(0);
          expect(executedOp.retryCount).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Multiple syncs don't duplicate operations
   */
  it('property: operations are not duplicated on multiple syncs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('insert', 'update', 'delete'),
            table: fc.constantFrom('users', 'transactions'),
            data: fc.object({ maxDepth: 2 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (operations) => {
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          const executedOps = [];
          const mockExecutor = vi.fn(async (op) => {
            executedOps.push(op);
          });
          queue.setExecutor(mockExecutor);

          // Enqueue all operations
          for (const op of operations) {
            await queue.enqueue(op);
          }

          // Go online
          mockNetworkMonitor.getStatus.mockReturnValue(true);

          // Sync multiple times
          await queue.sync();
          const firstSyncCount = mockExecutor.mock.calls.length;

          await queue.sync();
          const secondSyncCount = mockExecutor.mock.calls.length;

          await queue.sync();
          const thirdSyncCount = mockExecutor.mock.calls.length;

          // Property: Operations should only execute once
          expect(firstSyncCount).toBe(operations.length);
          expect(secondSyncCount).toBe(operations.length); // No new calls
          expect(thirdSyncCount).toBe(operations.length); // No new calls

          // Property: Each operation should have unique ID
          const ids = executedOps.map(op => op.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(operations.length);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Queue operations are executed in FIFO order
   */
  it('property: operations execute in first-in-first-out order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('insert', 'update', 'delete'),
            table: fc.constantFrom('users', 'transactions'),
            data: fc.record({
              sequence: fc.integer({ min: 0, max: 1000 })
            })
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (operations) => {
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          const executionOrder = [];
          const mockExecutor = vi.fn(async (op) => {
            executionOrder.push(op.data.sequence);
          });
          queue.setExecutor(mockExecutor);

          // Enqueue operations with sequence numbers
          for (const op of operations) {
            await queue.enqueue(op);
          }

          // Go online and sync
          mockNetworkMonitor.getStatus.mockReturnValue(true);
          await queue.sync();

          // Property: Execution order should match enqueue order
          const expectedOrder = operations.map(op => op.data.sequence);
          expect(executionOrder).toEqual(expectedOrder);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Concurrent sync calls are handled safely
   */
  it('property: concurrent sync calls do not cause race conditions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('insert', 'update', 'delete'),
            table: fc.constantFrom('users', 'transactions'),
            data: fc.object({ maxDepth: 2 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (operations) => {
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          const executedOps = [];
          const mockExecutor = vi.fn(async (op) => {
            // Simulate async delay
            await new Promise(resolve => setTimeout(resolve, 10));
            executedOps.push(op);
          });
          queue.setExecutor(mockExecutor);

          // Enqueue operations
          for (const op of operations) {
            await queue.enqueue(op);
          }

          // Go online
          mockNetworkMonitor.getStatus.mockReturnValue(true);

          // Start multiple syncs concurrently
          const syncPromises = [
            queue.sync(),
            queue.sync(),
            queue.sync()
          ];

          await Promise.all(syncPromises);

          // Property: Each operation should execute exactly once
          expect(executedOps.length).toBe(operations.length);

          // Property: No duplicate executions
          const ids = executedOps.map(op => op.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(operations.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Queue persists operations to storage
   */
  it('property: operations are persisted to storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            type: fc.constantFrom('insert', 'update', 'delete'),
            table: fc.constantFrom('users', 'transactions'),
            data: fc.object({ maxDepth: 2 })
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (operations) => {
          // Clear queue and mocks before test
          await queue.clear();
          mockElectronAPI.storage.set.mockClear();
          mockLocalStorage.setItem.mockClear();
          
          mockNetworkMonitor.getStatus.mockReturnValue(false);

          // Enqueue operations
          for (const op of operations) {
            await queue.enqueue(op);
          }

          // Property: Storage should be called to persist queue
          // Wait for async persist to complete
          await new Promise(resolve => setTimeout(resolve, 50));

          // Check if either electronAPI or localStorage was called
          const electronCalled = mockElectronAPI.storage.set.mock.calls.length > 0;
          const localStorageCalled = mockLocalStorage.setItem.mock.calls.length > 0;

          expect(electronCalled || localStorageCalled).toBe(true);

          // If electronAPI was used, verify the data
          if (electronCalled) {
            const lastCall = mockElectronAPI.storage.set.mock.calls[
              mockElectronAPI.storage.set.mock.calls.length - 1
            ];
            expect(lastCall[0]).toBe('offline-queue');
            
            const storedData = JSON.parse(lastCall[1]);
            expect(Array.isArray(storedData)).toBe(true);
            expect(storedData.length).toBe(operations.length);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
