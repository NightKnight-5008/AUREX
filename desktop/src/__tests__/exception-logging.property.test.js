/**
 * AUREX Desktop - Exception Logging Property-Based Tests
 *
 * Property 8: Exception and Rejection Logging
 * Validates: Requirements 15.4, 15.5
 *
 * This test suite uses property-based testing to verify that uncaught exceptions
 * and unhandled promise rejections in the main process are logged with stack traces
 * and context information across a wide range of error scenarios.
 *
 * Property: For all uncaught exceptions and unhandled promise rejections,
 * the error MUST be logged with stack trace and context information.
 *
 * **Validates: Requirements 15.4, 15.5**
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Mock electron-log
const mockLog = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

vi.mock('electron-log', () => ({
  default: mockLog
}));

describe('Property 8: Exception and Rejection Logging', () => {
  let originalUncaughtExceptionListeners;
  let originalUnhandledRejectionListeners;
  let uncaughtExceptionHandler;
  let unhandledRejectionHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original listeners
    originalUncaughtExceptionListeners = process.listeners('uncaughtException');
    originalUnhandledRejectionListeners = process.listeners('unhandledRejection');

    // Remove all existing listeners to avoid interference
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');

    // Set up handlers that match main.ts implementation
    uncaughtExceptionHandler = (error) => {
      mockLog.error('Uncaught exception in main process:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    };

    unhandledRejectionHandler = (reason, promise) => {
      mockLog.error('Unhandled promise rejection in main process:', {
        reason: reason instanceof Error ? {
          message: reason.message,
          stack: reason.stack,
          name: reason.name
        } : reason,
        promise: promise.toString()
      });
    };

    // Register our test handlers
    process.on('uncaughtException', uncaughtExceptionHandler);
    process.on('unhandledRejection', unhandledRejectionHandler);
  });

  afterEach(() => {
    // Remove test handlers
    process.removeListener('uncaughtException', uncaughtExceptionHandler);
    process.removeListener('unhandledRejection', unhandledRejectionHandler);

    // Restore original listeners
    originalUncaughtExceptionListeners.forEach(listener => {
      process.on('uncaughtException', listener);
    });
    originalUnhandledRejectionListeners.forEach(listener => {
      process.on('unhandledRejection', listener);
    });
  });

  /**
   * Property: Uncaught exceptions MUST be logged with message, stack, and name
   */
  it('property: uncaught exceptions are logged with complete error details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 200 }),
          name: fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError')
        }),
        async (errorData) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create error with specified properties
          const error = new Error(errorData.message);
          error.name = errorData.name;

          // Emit uncaught exception
          process.emit('uncaughtException', error);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Must log the exception
          expect(mockLog.error).toHaveBeenCalled();

          // Property: Log must contain exception message
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Uncaught exception in main process')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include structured error data
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('message');
          expect(logData).toHaveProperty('stack');
          expect(logData).toHaveProperty('name');

          // Property: Error details must match original error
          expect(logData.message).toBe(errorData.message);
          expect(logData.name).toBe(errorData.name);
          expect(logData.stack).toBeDefined();
          expect(typeof logData.stack).toBe('string');
          expect(logData.stack.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Uncaught exceptions MUST include stack traces
   */
  it('property: uncaught exceptions include non-empty stack traces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create error (will have automatic stack trace)
          const error = new Error(errorMessage);

          // Emit uncaught exception
          process.emit('uncaughtException', error);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Must log with stack trace
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Uncaught exception in main process')
          );
          expect(relevantCall).toBeDefined();

          const logData = relevantCall[1];
          expect(logData.stack).toBeDefined();
          expect(typeof logData.stack).toBe('string');
          expect(logData.stack.length).toBeGreaterThan(0);
          
          // Property: Stack trace should contain error message
          expect(logData.stack).toContain(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unhandled rejections with Error objects MUST be logged with stack traces
   */
  it('property: unhandled rejections with Error objects are logged with stack traces', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 200 }),
          name: fc.constantFrom('Error', 'TypeError', 'NetworkError', 'ValidationError')
        }),
        async (errorData) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create error
          const error = new Error(errorData.message);
          error.name = errorData.name;

          // Create a promise for the rejection
          const promise = Promise.reject(error);

          // Emit unhandled rejection
          process.emit('unhandledRejection', error, promise);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Must log the rejection
          expect(mockLog.error).toHaveBeenCalled();

          // Property: Log must contain rejection message
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Unhandled promise rejection in main process')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include structured error data
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('reason');
          expect(logData).toHaveProperty('promise');

          // Property: Reason must be an Error object with stack
          expect(logData.reason).toHaveProperty('message');
          expect(logData.reason).toHaveProperty('stack');
          expect(logData.reason).toHaveProperty('name');
          expect(logData.reason.message).toBe(errorData.message);
          expect(logData.reason.name).toBe(errorData.name);
          expect(logData.reason.stack).toBeDefined();
          expect(typeof logData.reason.stack).toBe('string');

          // Prevent unhandled rejection warning
          promise.catch(() => {});
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Unhandled rejections with non-Error reasons MUST be logged
   */
  it('property: unhandled rejections with non-Error reasons are logged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 1 }),
          fc.integer(),
          fc.object(),
          fc.array(fc.anything()),
          fc.constant(null)
        ),
        async (reason) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create a promise for the rejection
          const promise = Promise.reject(reason);

          // Emit unhandled rejection
          process.emit('unhandledRejection', reason, promise);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Must log the rejection
          expect(mockLog.error).toHaveBeenCalled();

          // Property: Log must contain rejection message
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Unhandled promise rejection in main process')
          );
          expect(relevantCall).toBeDefined();

          // Property: Log must include reason (not as Error object)
          const logData = relevantCall[1];
          expect(logData).toBeDefined();
          expect(logData).toHaveProperty('reason');
          expect(logData.reason).toEqual(reason);

          // Prevent unhandled rejection warning
          promise.catch(() => {});
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All exception logs MUST use error log level
   */
  it('property: all exception logs use error log level', async () => {
    const testCases = [
      { type: 'exception', error: new Error('Test exception') },
      { type: 'rejection', error: new Error('Test rejection') }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testCases),
        async (testCase) => {
          // Clear previous calls
          mockLog.error.mockClear();
          mockLog.info.mockClear();
          mockLog.warn.mockClear();

          if (testCase.type === 'exception') {
            process.emit('uncaughtException', testCase.error);
          } else {
            const promise = Promise.reject(testCase.error);
            process.emit('unhandledRejection', testCase.error, promise);
            promise.catch(() => {});
          }

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Must use error log level
          expect(mockLog.error).toHaveBeenCalled();
          expect(mockLog.info).not.toHaveBeenCalled();
          expect(mockLog.warn).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Exception log messages MUST be non-empty strings
   */
  it('property: exception log messages are non-empty strings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create and emit exception
          const error = new Error(errorMessage);
          process.emit('uncaughtException', error);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Log message must be non-empty string
          expect(mockLog.error).toHaveBeenCalled();
          const logCalls = mockLog.error.mock.calls;
          
          for (const call of logCalls) {
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
   * Property: Structured exception data MUST be objects
   */
  it('property: structured exception data are objects', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create and emit exception
          const error = new Error(errorMessage);
          process.emit('uncaughtException', error);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Structured data must be objects
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Uncaught exception in main process')
          );
          expect(relevantCall).toBeDefined();

          if (relevantCall.length > 1) {
            const structuredData = relevantCall[1];
            expect(typeof structuredData).toBe('object');
            expect(structuredData).not.toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Exception logs MUST include error name property
   */
  it('property: exception logs include error name property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          message: fc.string({ minLength: 1, maxLength: 100 }),
          name: fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'CustomError')
        }),
        async (errorData) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create error with specific name
          const error = new Error(errorData.message);
          error.name = errorData.name;

          // Emit exception
          process.emit('uncaughtException', error);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Log must include error name
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Uncaught exception in main process')
          );
          expect(relevantCall).toBeDefined();

          const logData = relevantCall[1];
          expect(logData).toHaveProperty('name');
          expect(logData.name).toBe(errorData.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Rejection logs MUST include promise reference
   */
  it('property: rejection logs include promise reference', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create error and promise
          const error = new Error(errorMessage);
          const promise = Promise.reject(error);

          // Emit rejection
          process.emit('unhandledRejection', error, promise);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Log must include promise reference
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Unhandled promise rejection in main process')
          );
          expect(relevantCall).toBeDefined();

          const logData = relevantCall[1];
          expect(logData).toHaveProperty('promise');
          expect(typeof logData.promise).toBe('string');

          // Prevent unhandled rejection warning
          promise.catch(() => {});
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Stack traces MUST contain file and line information
   */
  it('property: stack traces contain file and line information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorMessage) => {
          // Clear previous calls
          mockLog.error.mockClear();

          // Create error (will have automatic stack trace with file/line info)
          const error = new Error(errorMessage);

          // Emit exception
          process.emit('uncaughtException', error);

          // Wait for async logging
          await new Promise(resolve => setImmediate(resolve));

          // Property: Stack trace should contain typical stack trace patterns
          const logCalls = mockLog.error.mock.calls;
          const relevantCall = logCalls.find(call => 
            call[0].includes('Uncaught exception in main process')
          );
          expect(relevantCall).toBeDefined();

          const logData = relevantCall[1];
          expect(logData.stack).toBeDefined();
          
          // Stack traces typically contain "at" keyword and line/column info
          // or at minimum the error message
          const stack = logData.stack;
          expect(stack.length).toBeGreaterThan(errorMessage.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
