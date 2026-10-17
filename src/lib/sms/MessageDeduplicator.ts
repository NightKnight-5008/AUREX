/**
 * AUREX FINANCIAL OPERATING SYSTEM - SMS MESSAGE DEDUPLICATOR
 *
 * Detects and filters duplicate SMS messages using SHA-256 hashing.
 *
 * IMPLEMENTATION:
 * - Hash normalization (lowercase, whitespace removal, special chars)
 * - Time-based deduplication window (24 hours default)
 * - Persistent deduplication cache
 * - Automatic cleanup of old records
 *
 * USE CASES:
 * - Network retransmission (same SMS sent twice)
 * - Multiple devices receiving same SMS
 * - Banking system duplicates
 * - User error (re-importing same SMS file)
 */

import type { SmsDeduplicationRecord } from '@/types/sms-trust';

/**
 * Normalize SMS message for consistent hashing
 */
function normalizeMessage(message: string): string {
  return message
    .toLowerCase() // Case insensitive
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,:-]/g, '') // Remove special chars except common punctuation
    .trim();
}

/**
 * Generate SHA-256 hash of normalized message
 */
export async function hashMessage(message: string): Promise<string> {
  const normalized = normalizeMessage(message);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Message Deduplicator Class
 */
export class MessageDeduplicator {
  private deduplicationRecords: Map<string, SmsDeduplicationRecord> = new Map();
  private readonly STORAGE_KEY = '__aurex_sms_dedup__';
  private readonly DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Load deduplication records from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const records = JSON.parse(stored) as Record<string, SmsDeduplicationRecord>;

        // Convert date strings back to Date objects
        for (const [hash, record] of Object.entries(records)) {
          this.deduplicationRecords.set(hash, {
            ...record,
            firstSeen: new Date(record.firstSeen),
            lastSeen: new Date(record.lastSeen)
          });
        }

        // Clean up old records
        this.cleanupOldRecords();
      }
    } catch (error) {
      console.error('Failed to load deduplication records:', error);
      this.deduplicationRecords.clear();
    }
  }

  /**
   * Save deduplication records to storage
   */
  private saveToStorage(): void {
    try {
      const records: Record<string, SmsDeduplicationRecord> = {};

      for (const [hash, record] of this.deduplicationRecords.entries()) {
        records[hash] = record;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Failed to save deduplication records:', error);
    }
  }

  /**
   * Clean up records older than deduplication window
   */
  private cleanupOldRecords(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [hash, record] of this.deduplicationRecords.entries()) {
      if (now - record.lastSeen.getTime() > this.DEDUP_WINDOW_MS) {
        this.deduplicationRecords.delete(hash);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.saveToStorage();
    }
  }

  /**
   * Check if message is a duplicate
   */
  async isDuplicate(message: string): Promise<{
    isDuplicate: boolean;
    originalTransactionId?: string;
    messageHash: string;
  }> {
    const hash = await hashMessage(message);
    const record = this.deduplicationRecords.get(hash);

    if (record) {
      // Update last seen time
      record.lastSeen = new Date();
      record.count++;
      this.saveToStorage();

      return {
        isDuplicate: true,
        originalTransactionId: record.originalTransactionId,
        messageHash: hash
      };
    }

    return {
      isDuplicate: false,
      messageHash: hash
    };
  }

  /**
   * Record a new message (after processing)
   */
  recordMessage(messageHash: string, transactionId: string): void {
    const now = new Date();

    const record: SmsDeduplicationRecord = {
      hash: messageHash,
      firstSeen: now,
      lastSeen: now,
      count: 1,
      originalTransactionId: transactionId
    };

    this.deduplicationRecords.set(messageHash, record);
    this.saveToStorage();
  }

  /**
   * Get deduplication statistics
   */
  getStatistics(): {
    totalRecords: number;
    duplicatesDetected: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  } {
    let duplicatesDetected = 0;
    let oldestRecord: Date | null = null;
    let newestRecord: Date | null = null;

    for (const record of this.deduplicationRecords.values()) {
      if (record.count > 1) {
        duplicatesDetected += record.count - 1;
      }

      if (!oldestRecord || record.firstSeen < oldestRecord) {
        oldestRecord = record.firstSeen;
      }

      if (!newestRecord || record.lastSeen > newestRecord) {
        newestRecord = record.lastSeen;
      }
    }

    return {
      totalRecords: this.deduplicationRecords.size,
      duplicatesDetected,
      oldestRecord,
      newestRecord
    };
  }

  /**
   * Clear all deduplication records
   */
  clear(): void {
    this.deduplicationRecords.clear();
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Force cleanup of old records (manual trigger)
   */
  forceCleanup(): void {
    this.cleanupOldRecords();
  }
}

/**
 * Global deduplicator instance
 */
let globalDeduplicator: MessageDeduplicator | null = null;

/**
 * Get or create global deduplicator instance
 */
export function getDeduplicator(): MessageDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new MessageDeduplicator();
  }
  return globalDeduplicator;
}
