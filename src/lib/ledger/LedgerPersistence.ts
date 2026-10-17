/**
 * AUREX FINANCIAL OPERATING SYSTEM - LEDGER PERSISTENCE
 *
 * Handles saving and loading ledger data to/from secure storage.
 *
 * PERSISTENCE STRATEGY:
 * - Store ledger entries and accounts in encrypted storage
 * - Auto-save on every ledger modification
 * - Versioned data format for migrations
 * - Compression for large datasets
 *
 * SECURITY:
 * - Uses SENSITIVE data classification
 * - AES-256-GCM encrypted storage
 * - Integrity verification on load
 */

import { SecureStorage } from '@/lib/security/SecureStorage';
import { DataClassification } from '@/lib/security/types';
import { getLedgerIntegration } from './LedgerIntegration';
import type { Account, LedgerEntry } from '@/types/ledger';

/**
 * Ledger data format (versioned for future migrations)
 */
export interface LedgerData {
  version: number;
  timestamp: Date;
  entries: LedgerEntry[];
  accounts: Account[];
  entryCounter: number;
}

/**
 * Current ledger data version
 */
const LEDGER_DATA_VERSION = 1;

/**
 * Storage key for ledger data
 */
const LEDGER_STORAGE_KEY = 'aurex-ledger-data';

/**
 * Ledger Persistence Service
 */
export class LedgerPersistence {
  private autoSaveEnabled = true;
  private saveThrottleMs = 1000; // Throttle saves to max once per second
  private lastSaveTime = 0;
  private pendingSave: number | null = null;

  /**
   * Save ledger data to storage
   */
  async save(): Promise<{ success: boolean; error?: string }> {
    try {
      const integration = getLedgerIntegration();
      const exportedData = integration.exportLedger();

      const ledgerData: LedgerData = {
        version: LEDGER_DATA_VERSION,
        timestamp: new Date(),
        entries: exportedData.entries,
        accounts: exportedData.accounts,
        entryCounter: exportedData.entryCounter
      };

      // Serialize to JSON
      const serialized = JSON.stringify(ledgerData, (key, value) => {
        // Convert Dates to ISO strings for serialization
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      });

      // Save to secure storage with SENSITIVE classification
      await SecureStorage.set(LEDGER_STORAGE_KEY, serialized, {
        classification: DataClassification.SENSITIVE
      });

      this.lastSaveTime = Date.now();

      return { success: true };
    } catch (error) {
      console.error('Failed to save ledger data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Load ledger data from storage
   */
  async load(): Promise<{ success: boolean; data?: LedgerData; error?: string }> {
    try {
      const stored = await SecureStorage.get<string>(LEDGER_STORAGE_KEY);

      if (!stored) {
        // No data found - this is OK for first run
        return { success: true };
      }

      // Parse JSON with Date revival
      const ledgerData: LedgerData = JSON.parse(stored, (key, value) => {
        // Revive ISO date strings back to Date objects
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      });

      // Version check (for future migrations)
      if (ledgerData.version !== LEDGER_DATA_VERSION) {
        console.warn(`Ledger data version mismatch. Expected ${LEDGER_DATA_VERSION}, got ${ledgerData.version}`);
        // TODO: Add migration logic here when version changes
      }

      // Validate data structure
      if (!ledgerData.entries || !ledgerData.accounts || ledgerData.entryCounter === undefined) {
        return {
          success: false,
          error: 'Invalid ledger data structure'
        };
      }

      return {
        success: true,
        data: ledgerData
      };
    } catch (error) {
      console.error('Failed to load ledger data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import ledger data into the ledger
   */
  async restore(): Promise<{ success: boolean; error?: string }> {
    try {
      const loadResult = await this.load();

      if (!loadResult.success) {
        return {
          success: false,
          error: loadResult.error || 'Failed to load data'
        };
      }

      if (!loadResult.data) {
        // No data to restore - this is OK
        return { success: true };
      }

      const integration = getLedgerIntegration();
      integration.importLedger({
        entries: loadResult.data.entries,
        accounts: loadResult.data.accounts,
        entryCounter: loadResult.data.entryCounter
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to restore ledger data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clear all ledger data from storage
   */
  async clear(): Promise<{ success: boolean; error?: string }> {
    try {
      await SecureStorage.remove(LEDGER_STORAGE_KEY);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear ledger data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Auto-save ledger data (throttled)
   */
  autoSave(): void {
    if (!this.autoSaveEnabled) {
      return;
    }

    const now = Date.now();
    const timeSinceLastSave = now - this.lastSaveTime;

    // If enough time has passed, save immediately
    if (timeSinceLastSave >= this.saveThrottleMs) {
      void this.save();
      return;
    }

    // Otherwise, schedule a save for later
    if (this.pendingSave !== null) {
      clearTimeout(this.pendingSave);
    }

    this.pendingSave = window.setTimeout(() => {
      void this.save();
      this.pendingSave = null;
    }, this.saveThrottleMs - timeSinceLastSave);
  }

  /**
   * Enable auto-save
   */
  enableAutoSave(): void {
    this.autoSaveEnabled = true;
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    this.autoSaveEnabled = false;

    // Clear pending save
    if (this.pendingSave !== null) {
      clearTimeout(this.pendingSave);
      this.pendingSave = null;
    }
  }

  /**
   * Check if data exists in storage
   */
  async hasData(): Promise<boolean> {
    const stored = await SecureStorage.get<string>(LEDGER_STORAGE_KEY);
    return stored !== null;
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    exists: boolean;
    entryCount?: number;
    accountCount?: number;
    lastSaved?: Date;
    version?: number;
  } | null> {
    try {
      const stored = await SecureStorage.get<string>(LEDGER_STORAGE_KEY);

      if (!stored) {
        return { exists: false };
      }

      // Parse the stored data to get statistics
      const ledgerData: LedgerData = JSON.parse(stored, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      });

      return {
        exists: true,
        entryCount: ledgerData.entries.length,
        accountCount: ledgerData.accounts.length,
        lastSaved: ledgerData.timestamp,
        version: ledgerData.version
      };
    } catch (error) {
      console.error('Failed to get ledger stats:', error);
      return null;
    }
  }

  /**
   * Export ledger data as JSON (for backup/download)
   */
  async exportAsJson(): Promise<{ success: boolean; json?: string; error?: string }> {
    try {
      const integration = getLedgerIntegration();
      const exportedData = integration.exportLedger();

      const ledgerData: LedgerData = {
        version: LEDGER_DATA_VERSION,
        timestamp: new Date(),
        entries: exportedData.entries,
        accounts: exportedData.accounts,
        entryCounter: exportedData.entryCounter
      };

      const json = JSON.stringify(ledgerData, null, 2);

      return {
        success: true,
        json
      };
    } catch (error) {
      console.error('Failed to export ledger as JSON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Import ledger data from JSON (for restore/upload)
   */
  async importFromJson(json: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Parse JSON with Date revival
      const ledgerData: LedgerData = JSON.parse(json, (key, value) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
          return new Date(value);
        }
        return value;
      });

      // Validate data structure
      if (!ledgerData.entries || !ledgerData.accounts || ledgerData.entryCounter === undefined) {
        return {
          success: false,
          error: 'Invalid ledger data structure'
        };
      }

      // Import into ledger
      const integration = getLedgerIntegration();
      integration.importLedger({
        entries: ledgerData.entries,
        accounts: ledgerData.accounts,
        entryCounter: ledgerData.entryCounter
      });

      // Save to storage
      await this.save();

      return { success: true };
    } catch (error) {
      console.error('Failed to import ledger from JSON:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Global ledger persistence instance
 */
let globalPersistence: LedgerPersistence | null = null;

/**
 * Get or create global ledger persistence instance
 */
export function getLedgerPersistence(): LedgerPersistence {
  if (!globalPersistence) {
    globalPersistence = new LedgerPersistence();
  }
  return globalPersistence;
}

/**
 * Initialize ledger persistence (load from storage on startup)
 */
export async function initializeLedgerPersistence(): Promise<{
  success: boolean;
  error?: string;
}> {
  const persistence = getLedgerPersistence();
  const result = await persistence.restore();

  if (result.success) {
    // Enable auto-save after successful restore
    persistence.enableAutoSave();
  }

  return result;
}
