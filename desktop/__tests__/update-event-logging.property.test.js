/**
 * AUREX Desktop - Update Event Logging Property-Based Tests
 *
 * Property 5: Update Event Logging
 * Validates: Requirement 7.5
 *
 * This test suite uses property-based testing to verify that all auto-update
 * events are logged with appropriate details across a wide range of scenarios.
 *
 * Property: For all auto-update events (checking, available, not-available,
 * progress, downloaded, error), the event MUST be logged to electron-log with
 * appropriate details.
 *
 * **Validates: Requirements 7.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock electron-updater - must provide both default and named exports
vi.mock('electron-updater', () => {
  const mockAutoUpdater = {
    logger: null,
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn()
  };
  
  return {
    default: { autoUpdater: mockAutoUpdater },
    autoUpdater: mockAutoUpdater
  };
});

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

import { AutoUpdateManager } from '../lib/auto-update-manager';
import pkg from 'electron-updater';
const { autoUpdater: mockAutoUpdater } = pkg;
import log from 'electron-log';
const mockLog = log;

describe('Property 5: Update Event Logging', () => {
  let manager;
  let eventHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};

    // Capture event handlers registered by AutoUpdateManager
    mockAutoUpdater.on.mockImplementation((event, handler) => {
      eventHandlers[event] = handler;
    });

    // Create manager instance (production mode to enable update logic)
    manager = new AutoUpdateManager(true);
  });

  /**
   * Property: 'checking-for-update' event MUST be logged
   */
  it('property: checking-for-update event is logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No data for this event
        async () => {
          // Clear previous calls
          mockLog.info.mockClear();

          // Trigger the event
          const handler = eventHandlers['checking-for-update'];
          expect(handler).toBeDefined();
          handler();

          // Property: Must log the event
          expect(mockLog.info).toHaveBeenCalled();
          
          // Property: Log message must contain event information
          const logCalls = mockLog.info.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Checking for updates')
          );
          expect(relevantCall).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 'update-available' event MUST be logged with version details
   */
  it('property: update-available event is logged with version details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^\d+\.\d+\.\d+/.test(s) || s.length > 0),
          releaseDate: fc.date().map(d => d.toISOString()),
          files: fc.array(fc.object(), { maxLength: 5 })
        }),
        async (updateInfo) => {
          // Clear previous calls
          mockLog.info.mockClear();

          // Trigger the event
          const handler = eventHandlers['update-available'];
          expect(handler).toBeDefined();
          handler(updateInfo);

          // Property: Must log the event
          expect(mockLog.info).toHaveBeenCalled();

          // Property: Log must contain version information
          const logCalls = mockLog.info.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Update available')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include structured data with version
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('version');
          expect(logData.version).toBe(updateInfo.version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 'update-not-available' event MUST be logged with version
   */
  it('property: update-not-available event is logged with version', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^\d+\.\d+\.\d+/.test(s) || s.length > 0)
        }),
        async (updateInfo) => {
          // Clear previous calls
          mockLog.info.mockClear();

          // Trigger the event
          const handler = eventHandlers['update-not-available'];
          expect(handler).toBeDefined();
          handler(updateInfo);

          // Property: Must log the event
          expect(mockLog.info).toHaveBeenCalled();

          // Property: Log must contain appropriate message
          const logCalls = mockLog.info.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Update not available')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include version data
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('version');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 'download-progress' event MUST be logged with progress details
   */
  it('property: download-progress event is logged with progress details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          percent: fc.float({ min: 0, max: 100, noNaN: true }),
          transferred: fc.integer({ min: 0, max: 1000000000 }),
          total: fc.integer({ min: 1, max: 1000000000 }),
          bytesPerSecond: fc.integer({ min: 0, max: 100000000 })
        }),
        async (progress) => {
          // Clear previous calls
          mockLog.info.mockClear();

          // Trigger the event
          const handler = eventHandlers['download-progress'];
          expect(handler).toBeDefined();
          handler(progress);

          // Property: Must log the event
          expect(mockLog.info).toHaveBeenCalled();

          // Property: Log must contain progress information
          const logCalls = mockLog.info.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Download progress')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include all progress metrics
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('percent');
          expect(logData).toHaveProperty('transferred');
          expect(logData).toHaveProperty('total');
          expect(logData).toHaveProperty('bytesPerSecond');
          
          // Property: Percent should be formatted to 2 decimal places
          expect(typeof logData.percent).toBe('string');
          expect(logData.percent).toMatch(/^\d+\.\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 'update-downloaded' event MUST be logged with version details
   */
  it('property: update-downloaded event is logged with version details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          version: fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^\d+\.\d+\.\d+/.test(s) || s.length > 0),
          releaseDate: fc.date().map(d => d.toISOString())
        }),
        async (updateInfo) => {
          // Clear previous calls
          mockLog.info.mockClear();

          // Trigger the event
          const handler = eventHandlers['update-downloaded'];
          expect(handler).toBeDefined();
          handler(updateInfo);

          // Property: Must log the event
          expect(mockLog.info).toHaveBeenCalled();

          // Property: Log must contain downloaded message
          const logCalls = mockLog.info.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Update downloaded')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include version information
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('version');
          expect(logData.version).toBe(updateInfo.version);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 'error' event MUST be logged with error details
   */
  it('property: error event is logged with error details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 200 }),
          name: fc.constantFrom('Error', 'UpdateError', 'NetworkError', 'TimeoutError'),
          stack: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: undefined })
        }).map(obj => {
          const error = new Error(obj.message);
          error.name = obj.name;
          if (obj.stack) {
            error.stack = obj.stack;
          }
          return error;
        }),
        async (error) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Trigger the event
          const handler = eventHandlers['error'];
          expect(handler).toBeDefined();
          handler(error);

          // Property: Must log the error
          expect(mockLog.error).toHaveBeenCalled();

          // Property: Log must contain error message
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Update error')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include error details
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('message');
          expect(logData).toHaveProperty('name');
          expect(logData).toHaveProperty('stack');
          expect(logData.message).toBe(error.message);
          expect(logData.name).toBe(error.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All events MUST use appropriate log level
   */
  it('property: events use appropriate log levels (info vs error)', async () => {
    const testCases = [
      { event: 'checking-for-update', level: 'info', data: null },
      { event: 'update-available', level: 'info', data: { version: '1.0.0', releaseDate: '2024-01-01', files: [] } },
      { event: 'update-not-available', level: 'info', data: { version: '1.0.0' } },
      { event: 'download-progress', level: 'info', data: { percent: 50, transferred: 500, total: 1000, bytesPerSecond: 1000 } },
      { event: 'update-downloaded', level: 'info', data: { version: '1.0.0', releaseDate: '2024-01-01' } },
      { event: 'error', level: 'error', data: new Error('Test error') }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testCases),
        async (testCase) => {
          // Clear previous calls
          mockLog.info.mockClear();
          mockLog.error.mockClear();

          // Trigger the event
          const handler = eventHandlers[testCase.event];
          expect(handler).toBeDefined();
          handler(testCase.data);

          // Property: Must use correct log level
          if (testCase.level === 'info') {
            expect(mockLog.info).toHaveBeenCalled();
            expect(mockLog.error).not.toHaveBeenCalled();
          } else if (testCase.level === 'error') {
            expect(mockLog.error).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Log messages MUST be non-empty strings
   */
  it('property: all log messages are non-empty strings', async () => {
    const events = [
      { name: 'checking-for-update', data: null },
      { name: 'update-available', data: { version: '1.0.0', releaseDate: '2024-01-01', files: [] } },
      { name: 'update-not-available', data: { version: '1.0.0' } },
      { name: 'download-progress', data: { percent: 50, transferred: 500, total: 1000, bytesPerSecond: 1000 } },
      { name: 'update-downloaded', data: { version: '1.0.0', releaseDate: '2024-01-01' } },
      { name: 'error', data: new Error('Test error') }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...events),
        async (event) => {
          // Clear previous calls
          mockLog.info.mockClear();
          mockLog.error.mockClear();

          // Trigger the event
          const handler = eventHandlers[event.name];
          expect(handler).toBeDefined();
          handler(event.data);

          // Property: Log message must be non-empty string
          const allCalls = [...mockLog.info.mock.calls, ...mockLog.error.mock.calls];
          expect(allCalls.length).toBeGreaterThan(0);

          for (const call of allCalls) {
            const message = call[0];
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Structured log data MUST be objects (not primitives)
   */
  it('property: structured log data are objects when provided', async () => {
    const eventsWithData = [
      { name: 'update-available', data: { version: '1.0.0', releaseDate: '2024-01-01', files: [] } },
      { name: 'update-not-available', data: { version: '1.0.0' } },
      { name: 'download-progress', data: { percent: 50, transferred: 500, total: 1000, bytesPerSecond: 1000 } },
      { name: 'update-downloaded', data: { version: '1.0.0', releaseDate: '2024-01-01' } },
      { name: 'error', data: new Error('Test error') }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...eventsWithData),
        async (event) => {
          // Clear previous calls
          mockLog.info.mockClear();
          mockLog.error.mockClear();

          // Trigger the event
          const handler = eventHandlers[event.name];
          expect(handler).toBeDefined();
          handler(event.data);

          // Property: Structured data must be objects
          const allCalls = [...mockLog.info.mock.calls, ...mockLog.error.mock.calls];
          
          for (const call of allCalls) {
            if (call.length > 1 && call[1] !== undefined) {
              const structuredData = call[1];
              expect(typeof structuredData).toBe('object');
              expect(structuredData).not.toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error events MUST include stack traces
   */
  it('property: error events include stack traces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 200 }),
          name: fc.constantFrom('Error', 'UpdateError', 'NetworkError')
        }).map(obj => {
          const error = new Error(obj.message);
          error.name = obj.name;
          return error;
        }),
        async (error) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Trigger the event
          const handler = eventHandlers['error'];
          expect(handler).toBeDefined();
          handler(error);

          // Property: Error log must include stack trace
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Update error')
          );
          expect(relevantCall).toBeDefined();

          const logData = relevantCall[1];
          expect(logData).toHaveProperty('stack');
          expect(logData.stack).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
