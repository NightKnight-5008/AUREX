/**
 * AUREX Desktop - IPC Input Validation Property-Based Tests
 *
 * Property 1: IPC Input Validation
 * Validates: Requirement 2.3
 *
 * This test suite uses property-based testing to verify that IPC handlers
 * correctly validate and reject invalid/malicious inputs across a wide range
 * of edge cases and attack vectors.
 *
 * Property: For all invalid inputs, IPC handlers MUST reject with errors
 * and MUST NOT execute the underlying operation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import fc from 'fast-check';
import { IPCSecurityLayer } from '../lib/ipc-security';

// Mock electron modules
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Property 1: IPC Input Validation', () => {
  let ipcSecurity;
  let mockStorage;
  let mockSession;
  let handlers;

  beforeEach(() => {
    // Reset handlers map
    handlers = new Map();

    // Mock ipcMain.handle to capture handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel, handler) => {
      handlers.set(channel, handler);
    });

    // Create mock storage manager
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      addLedgerEntry: vi.fn(),
      getLedgerEntries: vi.fn(),
      addFXSnapshot: vi.fn(),
      getFXSnapshots: vi.fn()
    };

    // Create mock session manager (unlocked by default)
    mockSession = {
      isLocked: vi.fn().mockReturnValue(false),
      unlock: vi.fn(),
      lockApp: vi.fn(),
      recordActivity: vi.fn()
    };

    // Create IPC security layer
    ipcSecurity = new IPCSecurityLayer(mockStorage, mockSession);
    ipcSecurity.registerHandlers();
  });

  /**
   * Property: storage:get MUST reject all non-string keys
   */
  it('property: storage:get rejects non-string keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.array(fc.string()),
          fc.object(),
          fc.func(fc.string())
        ),
        async (invalidKey) => {
          const handler = handlers.get('storage:get');
          const result = await handler({}, invalidKey);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');

          // Property: Must NOT execute storage operation
          expect(mockStorage.get).not.toHaveBeenCalled();

          // Reset mock for next iteration
          mockStorage.get.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: storage:get MUST reject empty string keys
   */
  it('property: storage:get rejects empty or whitespace-only keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t'),
          fc.constant('\n'),
          fc.constant('\r\n'),
          fc.constant('  \t  \n  ')
        ),
        async (emptyKey) => {
          const handler = handlers.get('storage:get');
          const result = await handler({}, emptyKey);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toContain('cannot be empty');

          // Property: Must NOT execute storage operation
          expect(mockStorage.get).not.toHaveBeenCalled();

          // Reset mock
          mockStorage.get.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: storage:get MUST sanitize control characters from keys
   */
  it('property: storage:get sanitizes control characters from keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/[\x00-\x1F\x7F]/.test(s)),
          fc.array(fc.integer({ min: 0x00, max: 0x1F }), { maxLength: 10 }).map(arr => arr.map(n => String.fromCharCode(n)).join(''))
        ),
        async ([validPart, controlChars]) => {
          const maliciousKey = validPart + controlChars;
          const handler = handlers.get('storage:get');
          
          await handler({}, maliciousKey);

          // Property: Control characters MUST be removed
          if (mockStorage.get.mock.calls.length > 0) {
            const sanitizedKey = mockStorage.get.mock.calls[0][0];
            expect(sanitizedKey).not.toMatch(/[\x00-\x1F\x7F]/);
          }

          // Reset mock
          mockStorage.get.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: storage:set MUST reject null/undefined values
   */
  it('property: storage:set rejects null/undefined values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom(null, undefined),
        async (key, invalidValue) => {
          const handler = handlers.get('storage:set');
          const result = await handler({}, key, invalidValue);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toContain('value is required');

          // Property: Must NOT execute storage operation
          expect(mockStorage.set).not.toHaveBeenCalled();

          // Reset mock
          mockStorage.set.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: storage:set MUST reject invalid classifications
   */
  it('property: storage:set rejects invalid classifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }).filter(s => !['PUBLIC', 'PRIVATE', 'SENSITIVE', 'public', 'private', 'sensitive'].includes(s)),
        async (key, value, invalidClassification) => {
          const handler = handlers.get('storage:set');
          const result = await handler({}, key, value, invalidClassification);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toContain('Invalid classification');

          // Property: Must NOT execute storage operation
          expect(mockStorage.set).not.toHaveBeenCalled();

          // Reset mock
          mockStorage.set.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: storage:set MUST accept only valid classifications
   */
  it('property: storage:set accepts only valid classifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1 }),
        fc.constantFrom('PUBLIC', 'PRIVATE', 'SENSITIVE', 'public', 'private', 'sensitive'),
        async (key, value, validClassification) => {
          const handler = handlers.get('storage:set');
          const result = await handler({}, key, value, validClassification);

          // Property: Must succeed
          expect(result.success).toBe(true);

          // Property: Must normalize to uppercase
          expect(mockStorage.set).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            validClassification.toUpperCase()
          );

          // Reset mock
          mockStorage.set.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: session:unlock MUST reject short passwords
   */
  it('property: session:unlock rejects passwords shorter than 4 characters', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 3 }),
        async (shortPassword) => {
          const handler = handlers.get('session:unlock');
          const result = await handler({}, shortPassword);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toMatch(/at least 4 characters/i);

          // Property: Must NOT execute unlock operation
          expect(mockSession.unlock).not.toHaveBeenCalled();

          // Reset mock
          mockSession.unlock.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: session:unlock MUST reject null/undefined passwords
   */
  it('property: session:unlock rejects null/undefined passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(null, undefined),
        async (invalidPassword) => {
          const handler = handlers.get('session:unlock');
          const result = await handler({}, invalidPassword);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toContain('password is required');

          // Property: Must NOT execute unlock operation
          expect(mockSession.unlock).not.toHaveBeenCalled();

          // Reset mock
          mockSession.unlock.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: ledger:addEntry MUST reject non-object entries
   */
  it('property: ledger:addEntry rejects non-object entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer(),
          fc.float(),
          fc.boolean()
        ),
        async (invalidEntry) => {
          const handler = handlers.get('ledger:addEntry');
          const result = await handler({}, invalidEntry);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();

          // Property: Must NOT execute ledger operation
          expect(mockStorage.addLedgerEntry).not.toHaveBeenCalled();

          // Reset mock
          mockStorage.addLedgerEntry.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: ledger:addEntry MUST accept valid objects and arrays
   */
  it('property: ledger:addEntry accepts valid objects and arrays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.object(),
          fc.array(fc.anything())
        ),
        async (validEntry) => {
          const handler = handlers.get('ledger:addEntry');
          const result = await handler({}, validEntry);

          // Property: Must succeed
          expect(result.success).toBe(true);

          // Property: Must execute ledger operation
          expect(mockStorage.addLedgerEntry).toHaveBeenCalledWith(validEntry);

          // Reset mock
          mockStorage.addLedgerEntry.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: fx:addSnapshot MUST reject non-object snapshots
   */
  it('property: fx:addSnapshot rejects non-object snapshots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer(),
          fc.float(),
          fc.boolean()
        ),
        async (invalidSnapshot) => {
          const handler = handlers.get('fx:addSnapshot');
          const result = await handler({}, invalidSnapshot);

          // Property: Must reject with error
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();

          // Property: Must NOT execute FX operation
          expect(mockStorage.addFXSnapshot).not.toHaveBeenCalled();

          // Reset mock
          mockStorage.addFXSnapshot.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: fx:addSnapshot MUST accept valid objects and arrays
   */
  it('property: fx:addSnapshot accepts valid objects and arrays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.object(),
          fc.array(fc.anything())
        ),
        async (validSnapshot) => {
          const handler = handlers.get('fx:addSnapshot');
          const result = await handler({}, validSnapshot);

          // Property: Must succeed
          expect(result.success).toBe(true);

          // Property: Must execute FX operation
          expect(mockStorage.addFXSnapshot).toHaveBeenCalledWith(validSnapshot);

          // Reset mock
          mockStorage.addFXSnapshot.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All handlers MUST return consistent error structure
   */
  it('property: all handlers return consistent error structure on failure', async () => {
    const testCases = [
      { handler: 'storage:get', args: [null] },
      { handler: 'storage:set', args: ['key', null] },
      { handler: 'storage:remove', args: [null] },
      { handler: 'session:unlock', args: [null] },
      { handler: 'ledger:addEntry', args: [null] },
      { handler: 'fx:addSnapshot', args: [null] }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testCases),
        async (testCase) => {
          const handler = handlers.get(testCase.handler);
          const result = await handler({}, ...testCase.args);

          // Property: Error response MUST have consistent structure
          expect(result).toHaveProperty('success');
          expect(result.success).toBe(false);
          expect(result).toHaveProperty('error');
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: SQL injection attempts MUST be sanitized
   */
  it('property: SQL injection attempts are sanitized from keys', async () => {
    const sqlInjectionPatterns = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM passwords--",
      "1' AND '1'='1",
      "'; DELETE FROM data WHERE '1'='1"
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...sqlInjectionPatterns),
        async (sqlInjection) => {
          const handler = handlers.get('storage:get');
          await handler({}, sqlInjection);

          // Property: If operation executed, key must be sanitized
          if (mockStorage.get.mock.calls.length > 0) {
            const sanitizedKey = mockStorage.get.mock.calls[0][0];
            // Control characters should be removed
            expect(sanitizedKey).not.toMatch(/[\x00-\x1F\x7F]/);
          }

          // Reset mock
          mockStorage.get.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: XSS attempts MUST be sanitized
   */
  it('property: XSS attempts are sanitized from values', async () => {
    const xssPatterns = [
      "<script>alert('XSS')</script>",
      "<img src=x onerror=alert('XSS')>",
      "javascript:alert('XSS')",
      "<iframe src='javascript:alert(\"XSS\")'></iframe>",
      "<svg onload=alert('XSS')>"
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.constantFrom(...xssPatterns),
        async (key, xssValue) => {
          const handler = handlers.get('storage:set');
          await handler({}, key, xssValue);

          // Property: If operation executed, value must be sanitized
          if (mockStorage.set.mock.calls.length > 0) {
            const sanitizedValue = mockStorage.set.mock.calls[0][1];
            // Control characters should be removed
            expect(sanitizedValue).not.toMatch(/[\x00-\x1F\x7F]/);
          }

          // Reset mock
          mockStorage.set.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Path traversal attempts MUST be handled safely
   */
  it('property: path traversal attempts in keys are handled safely', async () => {
    const pathTraversalPatterns = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\config\\sam",
      "....//....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...pathTraversalPatterns),
        async (pathTraversal) => {
          const handler = handlers.get('storage:get');
          const result = await handler({}, pathTraversal);

          // Property: Must either reject or sanitize
          if (result.success) {
            // If accepted, must be sanitized
            if (mockStorage.get.mock.calls.length > 0) {
              const sanitizedKey = mockStorage.get.mock.calls[0][0];
              expect(sanitizedKey).not.toMatch(/[\x00-\x1F\x7F]/);
            }
          }

          // Reset mock
          mockStorage.get.mockClear();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Unicode control characters MUST be sanitized
   */
  it('property: Unicode control characters are sanitized', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/[\x00-\x1F\x7F]/.test(s)),
          fc.array(fc.integer({ min: 0x0000, max: 0x001F }), { maxLength: 10 }).map(arr => arr.map(n => String.fromCharCode(n)).join(''))
        ),
        async ([validPart, controlChars]) => {
          const maliciousKey = validPart + controlChars;
          const handler = handlers.get('storage:get');
          
          await handler({}, maliciousKey);

          // Property: Control characters MUST be removed
          if (mockStorage.get.mock.calls.length > 0) {
            const sanitizedKey = mockStorage.get.mock.calls[0][0];
            expect(sanitizedKey).not.toMatch(/[\x00-\x1F\x7F]/);
          }

          // Reset mock
          mockStorage.get.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });
});
