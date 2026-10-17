/**
 * AUREX UNIFIED SMS SCHEMA
 *
 * Single source of truth for SMS entities across:
 * - Android app (sender)
 * - Backend API (processor/storage)
 * - Desktop frontend (consumer)
 *
 * All layers MUST use these types. No parallel definitions.
 */

// ============================================================================
// UNIFIED SMS CLASSIFICATION ENUM
// ============================================================================
// This replaces THREE separate classification systems:
// 1. SmsClassification in use-sms-queries.ts (11 types)
// 2. SMSClassificationType in sms-ai-classifier.ts (12 types)
// 3. Ad-hoc string classification in DeviceSmsEvent
//
// RULE: All classification must use this enum. No string fallbacks.

export type UnifiedSmsClassification =
  // Financial transaction types
  | 'payment_received'       // Payment to card confirmed
  | 'card_purchase'          // Purchase/charge on card
  | 'cash_withdrawal'        // ATM or cash withdrawal
  | 'fee_charged'            // Late fee, annual fee, etc.
  | 'interest_applied'       // Interest charge added
  | 'refund'                 // Refund credited
  // Card status types
  | 'card_blocked'           // Fraud alert / card blocked
  | 'credit_limit_changed'   // Limit increase/decrease
  // Informational types
  | 'statement_issued'       // Monthly statement ready
  | 'payment_reminder'       // Payment due date approaching
  | 'balance_update'         // Balance notification
  // Security types
  | 'otp_verification'       // OTP/verification code
  | 'fraud_alert'            // Suspicious activity alert
  // Other
  | 'promotional'            // Marketing/promotional
  | 'reward_notification'    // Cashback/points earned
  | 'unknown'                // Unclassified
  | 'ambiguous'              // Multiple classifications possible
  | 'rejected';              // Rejected by classifier

// ============================================================================
// UNIFIED SYNC STATUS
// ============================================================================
// Full set used across Android → Backend → Desktop

export type UnifiedSyncStatus =
  | 'pending'    // Queued, not yet synced
  | 'synced'     // Successfully synced to backend
  | 'failed'     // Sync failed, max retries exhausted
  | 'retrying'   // Sync failed, retrying with backoff
  | 'conflict';  // Duplicate or conflicting data detected

// ============================================================================
// SYNC METADATA
// ============================================================================

export interface UnifiedSyncMetadata {
  status: UnifiedSyncStatus;
  lastSyncAttempt?: string;   // ISO 8601
  syncedAt?: string;          // ISO 8601
  retryCount: number;
  nextRetryAt?: string;       // ISO 8601
  errorMessage?: string;
  conflictDetected?: boolean;
  tamperDetected?: boolean;
}

// ============================================================================
// EXTRACTED DATA (AI Processing Output)
// ============================================================================

export interface UnifiedExtractedData {
  sms_type: UnifiedSmsClassification;
  affects_balance: boolean;
  amount?: number;
  currency?: string;
  card_last_four?: string;
  merchant?: string;
  date_time?: string;          // ISO 8601
  due_date?: string;           // ISO 8601
  minimum_payment?: number;
  current_balance?: number;
  available_credit?: number;
  otp?: string;
  reference_number?: string;
  confidence: number;          // 0-1
}

// ============================================================================
// UNIFIED SMS MESSAGE
// ============================================================================
// This is the FINAL schema. Android sends it. Backend stores it. Desktop reads it.

export interface UnifiedSmsMessage {
  // Identity
  id: string;
  workspaceId: string;
  deviceId: string;

  // Source
  phoneNumber: string;          // E.164 format
  sender: string;               // Sender ID (e.g., "BANK-ALERTS")
  content: string;              // Raw SMS text

  // Timestamps (ISO 8601 ONLY)
  receivedAt: string;           // When SMS was received on device
  createdAt: string;            // When record was created in backend

  // AI Processing
  classification?: UnifiedSmsClassification;
  extractedData?: UnifiedExtractedData;
  aiProcessedAt?: string;       // ISO 8601

  // Card Linking
  cardId?: string | null;       // Linked card ID (matched or manual)

  // Encryption & Security
  isEncrypted: boolean;

  // Sync
  syncMetadata: UnifiedSyncMetadata;

  // Android Device Context
  simSlot?: number;             // 0 or 1 (dual SIM)
  simCarrierName?: string;      // e.g., "T-Mobile"
  deviceTimezoneOffset?: number; // Minutes offset from UTC
  deviceLocale?: string;        // e.g., "en_US"

  // Processing flags
  processed: boolean;
  locallyPreprocessed?: boolean;
  likelyFinancial?: boolean;
  appVersion?: string;
  rejectionReason?: string;
}

// ============================================================================
// MAPPING HELPERS
// ============================================================================
// Map old classification types to the unified enum

/**
 * Map sms-ai-classifier.ts SMSClassificationType → UnifiedSmsClassification
 */
export function mapClassifierTypeToUnified(type: string): UnifiedSmsClassification {
  const mapping: Record<string, UnifiedSmsClassification> = {
    'payment_confirmation': 'payment_received',
    'payment_reminder': 'payment_reminder',
    'minimum_payment_due': 'payment_reminder',
    'transaction_alert': 'card_purchase',
    'balance_update': 'balance_update',
    'credit_limit_warning': 'credit_limit_changed',
    'fraud_alert': 'fraud_alert',
    'otp_verification': 'otp_verification',
    'statement_ready': 'statement_issued',
    'reward_notification': 'reward_notification',
    'promotional': 'promotional',
    'unknown': 'unknown',
  };

  return mapping[type] || 'unknown';
}

/**
 * Map use-sms-queries.ts SmsClassification → UnifiedSmsClassification
 * (These are already aligned, but this ensures type safety)
 */
export function mapQueryClassificationToUnified(type: string): UnifiedSmsClassification {
  const mapping: Record<string, UnifiedSmsClassification> = {
    'payment_received': 'payment_received',
    'card_purchase': 'card_purchase',
    'cash_withdrawal': 'cash_withdrawal',
    'fee_charged': 'fee_charged',
    'interest_applied': 'interest_applied',
    'refund': 'refund',
    'card_blocked': 'card_blocked',
    'credit_limit_changed': 'credit_limit_changed',
    'statement_issued': 'statement_issued',
    'ambiguous': 'ambiguous',
    'rejected': 'rejected',
  };

  return mapping[type] || 'unknown';
}

// ============================================================================
// CARD LINKING
// ============================================================================

/**
 * Auto-link SMS to a card by matching card_last_four from extractedData
 * against the user's card database.
 *
 * @param extractedData - AI-extracted data from SMS
 * @param cards - User's card list (must have lastFourDigits and id)
 * @returns cardId if matched, null otherwise
 */
export function autoLinkSmsToCard(
  extractedData: UnifiedExtractedData | undefined,
  cards: Array<{ id: string; lastFourDigits: string }>
): string | null {
  if (!extractedData?.card_last_four) return null;

  const matched = cards.find(
    card => card.lastFourDigits === extractedData.card_last_four
  );

  return matched?.id || null;
}

// ============================================================================
// ANDROID PAYLOAD SCHEMA
// ============================================================================
// What Android app MUST send to POST /api/sms/sync

export interface AndroidSmsPayload {
  deviceId: string;
  workspaceId: string;
  messages: Array<{
    phoneNumber: string;        // E.164 format
    sender: string;
    content: string;
    receivedAt: string;         // ISO 8601 ONLY (not Unix timestamp)
    isEncrypted: boolean;
    simSlot?: number;
    simCarrierName?: string;
    deviceTimezoneOffset?: number;
    deviceLocale?: string;
    // Local pre-processing hints (optional)
    locallyPreprocessed?: boolean;
    likelyFinancial?: boolean;
    appVersion?: string;
  }>;
}
