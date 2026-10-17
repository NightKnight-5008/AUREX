/**
 * AUREX FINANCIAL OPERATING SYSTEM - SMS TRUST MODEL
 *
 * Defines trust levels and confidence scoring for SMS-derived transactions.
 *
 * SECURITY PHILOSOPHY:
 * - Treat all SMS as untrusted external data
 * - Never auto-apply low-confidence transactions
 * - Require manual review for ambiguous data
 * - Maintain audit trail of all trust decisions
 *
 * TRUST LEVELS:
 * - HIGH (90-100): Exact card match + amount + date + merchant
 * - MEDIUM (60-89): Partial match or missing non-critical fields
 * - LOW (<60): Ambiguous, conflicting, or insufficient data
 */

/**
 * Trust level enum
 */
export enum TrustLevel {
  HIGH = 'HIGH',     // 90-100% confidence - auto-apply
  MEDIUM = 'MEDIUM', // 60-89% confidence - apply with warning
  LOW = 'LOW'        // <60% confidence - manual review required
}

/**
 * Trust factors that contribute to confidence score
 */
export interface TrustFactors {
  /** Card last 4 digits matched exactly (0-30 points) */
  cardMatch: number;

  /** Amount format valid and reasonable (0-20 points) */
  amountValid: number;

  /** Date/time reasonable and recent (0-15 points) */
  dateValid: number;

  /** Merchant name extracted successfully (0-15 points) */
  merchantValid: number;

  /** Balance update matches expected (0-10 points) */
  balanceValid: number;

  /** Currency code detected and valid (0-5 points) */
  currencyValid: number;

  /** No conflicting data (0-5 points) */
  noConflicts: number;
}

/**
 * SMS transaction with trust metadata
 */
export interface SmsTransaction {
  /** Unique transaction ID */
  id: string;

  /** Raw SMS message text */
  rawMessage: string;

  /** SHA-256 hash of message (for deduplication) */
  messageHash: string;

  /** When SMS was received */
  receivedAt: Date;

  /** Parsed transaction data */
  parsedData: {
    amount?: number;
    currency?: string;
    cardLast4?: string;
    merchant?: string;
    balance?: number;
    transactionDate?: Date;
    transactionType?: 'DEBIT' | 'CREDIT' | 'REFUND' | 'UNKNOWN';
  };

  /** Overall trust level */
  trustLevel: TrustLevel;

  /** Confidence score (0-100) */
  confidenceScore: number;

  /** Detailed trust factors */
  trustFactors: TrustFactors;

  /** Whether manual review is required */
  requiresReview: boolean;

  /** Review status */
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPLIED';

  /** Who reviewed (user ID) */
  reviewedBy?: string;

  /** When reviewed */
  reviewedAt?: Date;

  /** Manual override applied */
  manualOverride?: boolean;

  /** Review notes */
  reviewNotes?: string;

  /** Linked card ID (if matched) */
  linkedCardId?: string;

  /** Whether this is a duplicate message */
  isDuplicate: boolean;

  /** Original message ID if duplicate */
  originalMessageId?: string;
}

/**
 * SMS deduplication record
 */
export interface SmsDeduplicationRecord {
  /** Message hash (SHA-256) */
  hash: string;

  /** First seen timestamp */
  firstSeen: Date;

  /** Last seen timestamp */
  lastSeen: Date;

  /** Number of times seen */
  count: number;

  /** Original transaction ID */
  originalTransactionId: string;
}

/**
 * Manual review queue item
 */
export interface ReviewQueueItem {
  /** Transaction being reviewed */
  transaction: SmsTransaction;

  /** Priority (lower = higher priority) */
  priority: number;

  /** Age in milliseconds */
  age: number;

  /** Suggested action */
  suggestedAction: 'APPROVE' | 'REJECT' | 'NEEDS_INFO';

  /** Automated suggestions */
  suggestions: string[];
}

/**
 * Trust scoring configuration
 */
export interface TrustScoringConfig {
  /** Minimum score for HIGH trust (default: 90) */
  highThreshold: number;

  /** Minimum score for MEDIUM trust (default: 60) */
  mediumThreshold: number;

  /** Weight for card match (default: 30) */
  cardMatchWeight: number;

  /** Weight for amount validity (default: 20) */
  amountValidWeight: number;

  /** Weight for date validity (default: 15) */
  dateValidWeight: number;

  /** Weight for merchant validity (default: 15) */
  merchantValidWeight: number;

  /** Weight for balance validity (default: 10) */
  balanceValidWeight: number;

  /** Weight for currency validity (default: 5) */
  currencyValidWeight: number;

  /** Weight for no conflicts (default: 5) */
  noConflictsWeight: number;

  /** Auto-apply threshold (default: 90 - HIGH only) */
  autoApplyThreshold: number;

  /** Require review threshold (default: 60 - LOW only) */
  requireReviewThreshold: number;
}

/**
 * Trust statistics
 */
export interface TrustStatistics {
  /** Total messages processed */
  totalProcessed: number;

  /** Messages by trust level */
  byTrustLevel: {
    [TrustLevel.HIGH]: number;
    [TrustLevel.MEDIUM]: number;
    [TrustLevel.LOW]: number;
  };

  /** Messages auto-applied */
  autoApplied: number;

  /** Messages requiring review */
  pendingReview: number;

  /** Messages approved after review */
  approved: number;

  /** Messages rejected */
  rejected: number;

  /** Duplicate messages detected */
  duplicates: number;

  /** Average confidence score */
  averageConfidence: number;

  /** Date range */
  dateRange: {
    start: Date;
    end: Date;
  };
}
