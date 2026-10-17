/**
 * AI-Powered SMS Classification Engine
 *
 * Analyzes SMS content to:
 * - Identify which phone number received the SMS (1-4)
 * - Classify SMS type (payment_confirmation, reminder, transaction_alert, warning, etc.)
 * - Extract structured data (amount, date, card number, merchant, etc.)
 * - Detect bank sender and verify against whitelist
 * - Generate Google Calendar/Tasks/Docs entries for reminders
 *
 * Uses pattern matching and NLP techniques for accurate classification
 */

import type { BankWhitelistEntry, BankVerificationResult } from './bank-whitelist';
import { verifyBankSMS, suggestBankFromSMS } from './bank-whitelist';
import type { UnifiedSmsClassification } from '@/types/sms';
import { mapClassifierTypeToUnified } from '@/types/sms';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * @deprecated Use UnifiedSmsClassification from '@/types/sms' instead.
 * Kept for internal pattern-matching, mapped to unified enum at output boundaries.
 */
export type SMSClassificationType =
  | 'payment_confirmation'
  | 'payment_reminder'
  | 'minimum_payment_due'
  | 'transaction_alert'
  | 'balance_update'
  | 'credit_limit_warning'
  | 'fraud_alert'
  | 'otp_verification'
  | 'statement_ready'
  | 'reward_notification'
  | 'promotional'
  | 'unknown';

export interface SMSClassificationResult {
  // Classification (internal, deprecated — use unifiedType for new code)
  type: SMSClassificationType;
  /** Unified classification mapped from internal type */
  unifiedType: UnifiedSmsClassification;
  confidence: number; // 0-1

  // Extracted Data
  extractedData: {
    amount?: number;
    currency?: string;
    cardLast4?: string;
    cardType?: string; // 'credit' | 'debit'
    merchant?: string;
    transactionDate?: string; // ISO format
    dueDate?: string; // ISO format
    minimumPayment?: number;
    currentBalance?: number;
    availableCredit?: number;
    otp?: string;
    referenceNumber?: string;
  };

  // Bank Verification
  bankVerification: BankVerificationResult;
  suggestedBankName?: string;

  // Phone Detection
  receivingPhoneIndex: 1 | 2 | 3 | 4 | null; // Which phone received it

  // Metadata
  processingTimestamp: string;
  rawContent: string;
  language: 'en' | 'ar' | 'hi' | 'unknown';

  // Action Items
  requiresCalendarEvent: boolean;
  requiresTaskCreation: boolean;
  requiresDocsEntry: boolean;
  suggestedEventTitle?: string;
  suggestedDueDate?: string;
}

export interface PhoneNumberMapping {
  phoneNumber: string;
  index: 1 | 2 | 3 | 4;
  label: string;
}

// ============================================================================
// Classification Patterns
// ============================================================================

interface ClassificationPattern {
  type: SMSClassificationType;
  keywords: string[];
  patterns: RegExp[];
  priority: number; // Higher priority checked first
}

const CLASSIFICATION_PATTERNS: ClassificationPattern[] = [
  {
    type: 'payment_confirmation',
    keywords: ['payment received', 'payment successful', 'paid', 'payment processed'],
    patterns: [
      /payment.*(?:received|successful|processed)/i,
      /successfully.*paid/i,
      /(?:payment|transaction).*(?:complete|completed)/i,
    ],
    priority: 10,
  },
  {
    type: 'minimum_payment_due',
    keywords: ['minimum payment', 'minimum due', 'payment due'],
    patterns: [
      /minimum.*(?:payment|due)/i,
      /(?:min|minimum).*(?:pay|payment).*due/i,
      /payment.*due.*\$?\d+/i,
    ],
    priority: 9,
  },
  {
    type: 'payment_reminder',
    keywords: ['payment reminder', 'due date', 'payment approaching'],
    patterns: [
      /payment.*(?:reminder|due)/i,
      /due.*(?:date|payment)/i,
      /(?:bill|payment).*approaching/i,
    ],
    priority: 8,
  },
  {
    type: 'transaction_alert',
    keywords: ['transaction', 'purchase', 'charged', 'debit', 'withdrawal'],
    patterns: [
      /(?:transaction|purchase).*(?:\$|USD|INR|EGP)\s*[\d,]+/i,
      /(?:charged|debited).*\$?\d+/i,
      /withdrawal.*\$?\d+/i,
    ],
    priority: 7,
  },
  {
    type: 'fraud_alert',
    keywords: ['suspicious', 'unusual', 'fraud', 'unauthorized', 'verify'],
    patterns: [
      /(?:suspicious|unusual).*(?:activity|transaction)/i,
      /fraud.*alert/i,
      /unauthorized.*(?:transaction|access)/i,
    ],
    priority: 10,
  },
  {
    type: 'balance_update',
    keywords: ['balance', 'available balance', 'current balance'],
    patterns: [
      /(?:available|current).*balance/i,
      /balance.*\$?\d+/i,
    ],
    priority: 5,
  },
  {
    type: 'credit_limit_warning',
    keywords: ['credit limit', 'over limit', 'limit exceeded'],
    patterns: [
      /credit.*limit.*(?:exceeded|warning|reached)/i,
      /over.*limit/i,
    ],
    priority: 8,
  },
  {
    type: 'otp_verification',
    keywords: ['otp', 'verification code', 'one-time password'],
    patterns: [
      /\b\d{4,6}\b.*(?:otp|code|verification)/i,
      /(?:otp|code).*\b\d{4,6}\b/i,
    ],
    priority: 9,
  },
  {
    type: 'statement_ready',
    keywords: ['statement', 'billing statement', 'monthly statement'],
    patterns: [
      /(?:billing|monthly|credit card).*statement/i,
      /statement.*(?:ready|available)/i,
    ],
    priority: 6,
  },
  {
    type: 'reward_notification',
    keywords: ['reward', 'points', 'cashback', 'bonus'],
    patterns: [
      /(?:reward|cashback).*(?:earned|credited)/i,
      /\d+.*points.*(?:earned|awarded)/i,
    ],
    priority: 4,
  },
  {
    type: 'promotional',
    keywords: ['offer', 'discount', 'sale', 'promotion'],
    patterns: [
      /(?:exclusive|special).*(?:offer|discount)/i,
      /\d+%.*(?:off|discount)/i,
    ],
    priority: 2,
  },
];

// ============================================================================
// Data Extraction Patterns
// ============================================================================

const EXTRACTION_PATTERNS = {
  amount: [
    /\$\s*([0-9,]+\.?\d{0,2})/,
    /(USD|INR|EGP|EUR|GBP)\s*([0-9,]+\.?\d{0,2})/i,
    /([0-9,]+\.?\d{0,2})\s*(USD|INR|EGP|EUR|GBP)/i,
  ],
  cardLast4: [
    /card\s*(?:ending|#|no\.?|number)\s*(?:in\s*)?(\d{4})/i,
    /x+(\d{4})/i,
    /\*+(\d{4})/i,
  ],
  merchant: [
    /(?:at|from)\s+([A-Z][A-Za-z0-9\s&'-]+?)(?:\s+on|\s+\d|$)/,
    /transaction.*at\s+([^.]+)/i,
  ],
  otp: [
    /\b(\d{4,6})\b.*(?:otp|code|verification)/i,
    /(?:otp|code).*\b(\d{4,6})\b/i,
  ],
  dueDate: [
    /due.*(?:on|by)\s+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /payment.*due.*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
    /(?:on|by)\s+(\w+\s+\d{1,2},?\s+\d{4})/i, // e.g., "Jan 15, 2024"
  ],
  minimumPayment: [
    /minimum.*(?:payment|due).*\$?\s*([0-9,]+\.?\d{0,2})/i,
    /min.*pay.*\$?\s*([0-9,]+\.?\d{0,2})/i,
  ],
};

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Classify and extract data from SMS message
 */
export async function classifySMS(
  smsContent: string,
  senderNumber: string,
  receivedAt: string,
  phoneMapping: PhoneNumberMapping[],
  userBankWhitelist: BankWhitelistEntry[]
): Promise<SMSClassificationResult> {
  // Detect language
  const language = detectLanguage(smsContent);

  // Classify SMS type
  const classification = classifyMessageType(smsContent);

  // Extract structured data
  const extractedData = extractDataFromSMS(smsContent, classification.type);

  // Verify bank sender
  const bankVerification = verifyBankSMS(senderNumber, smsContent, userBankWhitelist);

  // Suggest bank if not verified
  let suggestedBankName: string | undefined;
  if (!bankVerification.isVerified) {
    const suggestion = suggestBankFromSMS(senderNumber, smsContent);
    suggestedBankName = suggestion.suggestedBanks[0];
  }

  // Detect which phone number received this
  const receivingPhoneIndex = detectReceivingPhone(senderNumber, phoneMapping);

  // Determine if action items needed
  const actionItems = determineActionItems(classification.type, extractedData);

  return {
    type: classification.type,
    unifiedType: mapClassifierTypeToUnified(classification.type),
    confidence: classification.confidence,
    extractedData,
    bankVerification,
    suggestedBankName,
    receivingPhoneIndex,
    processingTimestamp: new Date().toISOString(),
    rawContent: smsContent,
    language,
    ...actionItems,
  };
}

// ============================================================================
// Classification Logic
// ============================================================================

function classifyMessageType(content: string): { type: SMSClassificationType; confidence: number } {
  const contentLower = content.toLowerCase();

  // Sort patterns by priority
  const sortedPatterns = [...CLASSIFICATION_PATTERNS].sort((a, b) => b.priority - a.priority);

  for (const pattern of sortedPatterns) {
    let matchScore = 0;
    let totalChecks = 0;

    // Check keywords
    for (const keyword of pattern.keywords) {
      totalChecks++;
      if (contentLower.includes(keyword)) {
        matchScore++;
      }
    }

    // Check regex patterns
    for (const regex of pattern.patterns) {
      totalChecks++;
      if (regex.test(content)) {
        matchScore += 2; // Regex matches worth more
      }
    }

    const confidence = totalChecks > 0 ? matchScore / (totalChecks + pattern.patterns.length) : 0;

    if (confidence > 0.3) {
      return {
        type: pattern.type,
        confidence: Math.min(confidence, 1.0),
      };
    }
  }

  return { type: 'unknown', confidence: 0 };
}

// ============================================================================
// Data Extraction
// ============================================================================

function extractDataFromSMS(
  content: string,
  type: SMSClassificationType
): SMSClassificationResult['extractedData'] {
  const data: SMSClassificationResult['extractedData'] = {};

  // Extract amount
  for (const pattern of EXTRACTION_PATTERNS.amount) {
    const match = content.match(pattern);
    if (match) {
      const amountStr = match[1] || match[2];
      data.amount = parseFloat(amountStr.replace(/,/g, ''));
      data.currency = (match[2] || match[1] || 'USD').toUpperCase();
      break;
    }
  }

  // Extract card last 4 digits
  for (const pattern of EXTRACTION_PATTERNS.cardLast4) {
    const match = content.match(pattern);
    if (match) {
      data.cardLast4 = match[1];
      break;
    }
  }

  // Extract merchant name
  if (type === 'transaction_alert' || type === 'payment_confirmation') {
    for (const pattern of EXTRACTION_PATTERNS.merchant) {
      const match = content.match(pattern);
      if (match) {
        data.merchant = match[1].trim();
        break;
      }
    }
  }

  // Extract OTP
  if (type === 'otp_verification') {
    for (const pattern of EXTRACTION_PATTERNS.otp) {
      const match = content.match(pattern);
      if (match) {
        data.otp = match[1];
        break;
      }
    }
  }

  // Extract due date
  if (type === 'payment_reminder' || type === 'minimum_payment_due') {
    for (const pattern of EXTRACTION_PATTERNS.dueDate) {
      const match = content.match(pattern);
      if (match) {
        data.dueDate = parseDateToISO(match[1]);
        break;
      }
    }
  }

  // Extract minimum payment
  if (type === 'minimum_payment_due') {
    for (const pattern of EXTRACTION_PATTERNS.minimumPayment) {
      const match = content.match(pattern);
      if (match) {
        data.minimumPayment = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
  }

  return data;
}

// ============================================================================
// Action Item Determination
// ============================================================================

function determineActionItems(
  type: SMSClassificationType,
  extractedData: SMSClassificationResult['extractedData']
) {
  const requiresCalendarEvent = type === 'minimum_payment_due' || type === 'payment_reminder';
  const requiresTaskCreation = requiresCalendarEvent;
  const requiresDocsEntry = type === 'payment_confirmation';

  let suggestedEventTitle: string | undefined;
  let suggestedDueDate: string | undefined;

  if (requiresCalendarEvent && extractedData.cardLast4) {
    const amount = extractedData.minimumPayment || extractedData.amount || 0;
    suggestedEventTitle = `Minimum payment due for Card ${extractedData.cardLast4} - ${formatCurrency(amount)}`;
    suggestedDueDate = extractedData.dueDate;
  }

  return {
    requiresCalendarEvent,
    requiresTaskCreation,
    requiresDocsEntry,
    suggestedEventTitle,
    suggestedDueDate,
  };
}

// ============================================================================
// Phone Detection
// ============================================================================

function detectReceivingPhone(
  senderNumber: string,
  phoneMapping: PhoneNumberMapping[]
): 1 | 2 | 3 | 4 | null {
  // In a real implementation, the Android app would pass which SIM received the SMS
  // For now, return null (will be populated by Android app)
  return null;
}

// ============================================================================
// Language Detection
// ============================================================================

function detectLanguage(content: string): 'en' | 'ar' | 'hi' | 'unknown' {
  // Simple language detection
  // Arabic: Check for Arabic Unicode range
  if (/[\u0600-\u06FF]/.test(content)) {
    return 'ar';
  }

  // Hindi: Check for Devanagari Unicode range
  if (/[\u0900-\u097F]/.test(content)) {
    return 'hi';
  }

  // English: Default for Latin characters
  if (/[a-zA-Z]/.test(content)) {
    return 'en';
  }

  return 'unknown';
}

// ============================================================================
// Utility Functions
// ============================================================================

function parseDateToISO(dateStr: string): string {
  // Try to parse various date formats
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // Parsing failed
  }

  // Return original if parsing failed
  return dateStr;
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Generate suggested Google Calendar event
 */
export function generateCalendarEvent(classification: SMSClassificationResult): {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
} | null {
  if (!classification.requiresCalendarEvent || !classification.suggestedEventTitle) {
    return null;
  }

  const dueDate = classification.suggestedDueDate
    ? new Date(classification.suggestedDueDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days from now

  return {
    title: classification.suggestedEventTitle,
    description: `Payment reminder from SMS:\n\n${classification.rawContent}`,
    startDate: dueDate.toISOString(),
    endDate: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
  };
}

/**
 * Generate suggested Google Task
 */
export function generateTask(classification: SMSClassificationResult): {
  title: string;
  notes: string;
  dueDate: string;
} | null {
  if (!classification.requiresTaskCreation || !classification.suggestedEventTitle) {
    return null;
  }

  const dueDate = classification.suggestedDueDate
    ? new Date(classification.suggestedDueDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    title: classification.suggestedEventTitle,
    notes: `From SMS received at ${classification.processingTimestamp}:\n\n${classification.rawContent}`,
    dueDate: dueDate.toISOString(),
  };
}

/**
 * Generate suggested Google Docs entry
 */
export function generateDocsEntry(classification: SMSClassificationResult): string | null {
  if (!classification.requiresDocsEntry) {
    return null;
  }

  const date = new Date(classification.processingTimestamp);
  const formattedDate = date.toLocaleDateString();
  const amount = classification.extractedData.amount || 0;
  const cardLast4 = classification.extractedData.cardLast4 || 'XXXX';

  return `${formattedDate} Card ${cardLast4} was paid off with ${formatCurrency(amount)}`;
}
