/**
 * AUREX Desktop - IPC Security Layer Tests
 *
 * Tests for IPC handler validation, sanitization, error handling, and logging
 * Validates: Requirements 2.3, 2.7, 15.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ipcMain } from 'electron';
import { IPCSecurityLayer } from '../lib/ipc-security';
import { SecureStorageManager } from '../lib/secure-storage';
import { SessionManager } from '../lib/session-manager';

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

describe('IPCSecurityLayer', () => {
  let ipcSecurity: IPCSecurityLayer;
  let mockStorage: SecureStorageManager;
  let mockSession: SessionManager;
  let handlers: Map<string, Function>;

  beforeEach(() => {
    // Reset handlers map
    handlers = new Map();

    // Mock ipcMain.handle to capture handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
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
    } as any;

    // Create mock session manager
    mockSession = {
      isLocked: vi.fn().mockReturnValue(false),
      unlock: vi.fn(),
      lockApp: vi.fn(),
      recordActivity: vi.fn()
    } as any;

    // Create IPC security layer
    ipcSecurity = new IPCSecurityLayer(mockStorage, mockSession);
    ipcSecurity.registerHandlers();
  });

  describe('Handler Registration', () => {
    it('should register all required IPC handlers', () => {
      const expectedHandlers = [
        'storage:get',
        'storage:set',
        'storage:remove',
        'session:unlock',
        'session:lock',
        'session:isLocked',
        'session:recordActivity',
        'ledger:addEntry',
        'ledger:getEntries',
        'fx:addSnapshot',
        'fx:getSnapshots'
      ];

      expectedHandlers.forEach(handler => {
        expect(handlers.has(handler)).toBe(true);
      });
    });
  });

  describe('Storage Handlers - Input Validation', () => {
    it('storage:get should reject null key', async () => {
      const handler = handlers.get('storage:get')!;
      const result = await handler({}, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('key is required');
    });

    it('storage:get should reject empty string key', async () => {
      const handler = handlers.get('storage:get')!;
      const result = await handler({}, '');

      expect(result.success).toBe(false);
      expect(result.error).toContain('key cannot be empty');
    });

    it('storage:get should reject non-string key', async () => {
      const handler = handlers.get('storage:get')!;
      const result = await handler({}, 123);

      expect(result.success).toBe(false);
      expect(result.error).toContain('key must be a string');
    });

    it('storage:set should reject null value', async () => {
      const handler = handlers.get('storage:set')!;
      const result = await handler({}, 'test-key', null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('value is required');
    });

    it('storage:set should reject invalid classification', async () => {
      const handler = handlers.get('storage:set')!;
      const result = await handler({}, 'test-key', 'test-value', 'INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid classification');
    });

    it('storage:set should accept valid classifications', async () => {
      const handler = handlers.get('storage:set')!;
      
      const classifications = ['PUBLIC', 'PRIVATE', 'SENSITIVE'];
      
      for (const classification of classifications) {
        const result = await handler({}, 'test-key', 'test-value', classification);
        expect(result.success).toBe(true);
      }
    });

    it('storage:set should default to PRIVATE classification', async () => {
      const handler = handlers.get('storage:set')!;
      await handler({}, 'test-key', 'test-value');

      expect(mockStorage.set).toHaveBeenCalledWith('test-key', 'test-value', 'PRIVATE');
    });
  });

  describe('Storage Handlers - Sanitization', () => {
    it('should sanitize control characters from key', async () => {
      const handler = handlers.get('storage:get')!;
      await handler({}, 'test\x00key\x1F');

      expect(mockStorage.get).toHaveBeenCalledWith('testkey');
    });

    it('should sanitize control characters from value', async () => {
      const handler = handlers.get('storage:set')!;
      await handler({}, 'test-key', 'test\x00value\x1F');

      expect(mockStorage.set).toHaveBeenCalledWith('test-key', 'testvalue', 'PRIVATE');
    });
  });

  describe('Session Handlers - Access Control', () => {
    it('should block storage operations when session is locked', async () => {
      vi.mocked(mockSession.isLocked).mockReturnValue(true);

      const handler = handlers.get('storage:get')!;
      const result = await handler({}, 'test-key');

      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
      expect(mockStorage.get).not.toHaveBeenCalled();
    });

    it('should block ledger operations when session is locked', async () => {
      vi.mocked(mockSession.isLocked).mockReturnValue(true);

      const handler = handlers.get('ledger:getEntries')!;
      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
      expect(mockStorage.getLedgerEntries).not.toHaveBeenCalled();
    });

    it('should block fx operations when session is locked', async () => {
      vi.mocked(mockSession.isLocked).mockReturnValue(true);

      const handler = handlers.get('fx:getSnapshots')!;
      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('locked');
      expect(mockStorage.getFXSnapshots).not.toHaveBeenCalled();
    });

    it('should allow session:unlock when locked', async () => {
      vi.mocked(mockSession.isLocked).mockReturnValue(true);
      vi.mocked(mockSession.unlock).mockResolvedValue(true);

      const handler = handlers.get('session:unlock')!;
      const result = await handler({}, 'password123');

      expect(result.success).toBe(true);
      expect(mockSession.unlock).toHaveBeenCalledWith('password123');
    });
  });

  describe('Session Handlers - Validation', () => {
    it('session:unlock should reject short passwords', async () => {
      const handler = handlers.get('session:unlock')!;
      const result = await handler({}, 'abc');

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 4 characters');
    });

    it('session:unlock should reject null password', async () => {
      const handler = handlers.get('session:unlock')!;
      const result = await handler({}, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('password is required');
    });
  });

  describe('Ledger Handlers - Validation', () => {
    it('ledger:addEntry should reject null entry', async () => {
      const handler = handlers.get('ledger:addEntry')!;
      const result = await handler({}, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Entry is required');
    });

    it('ledger:addEntry should reject non-object entry', async () => {
      const handler = handlers.get('ledger:addEntry')!;
      const result = await handler({}, 'string-entry');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Entry must be an object or array');
    });

    it('ledger:addEntry should accept valid object entry', async () => {
      const handler = handlers.get('ledger:addEntry')!;
      const entry = { type: 'transaction', amount: 100 };
      const result = await handler({}, entry);

      expect(result.success).toBe(true);
      expect(mockStorage.addLedgerEntry).toHaveBeenCalledWith(entry);
    });

    it('ledger:addEntry should accept valid array entry', async () => {
      const handler = handlers.get('ledger:addEntry')!;
      const entry = [1, 2, 3];
      const result = await handler({}, entry);

      expect(result.success).toBe(true);
      expect(mockStorage.addLedgerEntry).toHaveBeenCalledWith(entry);
    });
  });

  describe('FX Handlers - Validation', () => {
    it('fx:addSnapshot should reject null snapshot', async () => {
      const handler = handlers.get('fx:addSnapshot')!;
      const result = await handler({}, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Snapshot is required');
    });

    it('fx:addSnapshot should reject non-object snapshot', async () => {
      const handler = handlers.get('fx:addSnapshot')!;
      const result = await handler({}, 'string-snapshot');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Snapshot must be an object or array');
    });

    it('fx:addSnapshot should accept valid object snapshot', async () => {
      const handler = handlers.get('fx:addSnapshot')!;
      const snapshot = { currency: 'USD', rate: 1.23 };
      const result = await handler({}, snapshot);

      expect(result.success).toBe(true);
      expect(mockStorage.addFXSnapshot).toHaveBeenCalledWith(snapshot);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      vi.mocked(mockStorage.get).mockImplementation(() => {
        throw new Error('Database error');
      });

      const handler = handlers.get('storage:get')!;
      const result = await handler({}, 'test-key');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle session errors gracefully', async () => {
      vi.mocked(mockSession.unlock).mockRejectedValue(new Error('Invalid password'));

      const handler = handlers.get('session:unlock')!;
      const result = await handler({}, 'wrong-password');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid password');
    });
  });

  describe('Successful Operations', () => {
    it('storage:get should return value on success', async () => {
      vi.mocked(mockStorage.get).mockReturnValue('test-value');

      const handler = handlers.get('storage:get')!;
      const result = await handler({}, 'test-key');

      expect(result.success).toBe(true);
      expect(result.data).toBe('test-value');
    });

    it('storage:set should return true on success', async () => {
      const handler = handlers.get('storage:set')!;
      const result = await handler({}, 'test-key', 'test-value', 'PRIVATE');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('ledger:getEntries should return entries on success', async () => {
      const entries = [{ id: 1 }, { id: 2 }];
      vi.mocked(mockStorage.getLedgerEntries).mockReturnValue(entries);

      const handler = handlers.get('ledger:getEntries')!;
      const result = await handler({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(entries);
    });

    it('fx:getSnapshots should return snapshots on success', async () => {
      const snapshots = [{ rate: 1.23 }, { rate: 1.24 }];
      vi.mocked(mockStorage.getFXSnapshots).mockReturnValue(snapshots);

      const handler = handlers.get('fx:getSnapshots')!;
      const result = await handler({});

      expect(result.success).toBe(true);
      expect(result.data).toEqual(snapshots);
    });
  });
});
