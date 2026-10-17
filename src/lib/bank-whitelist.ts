/**
 * Bank Whitelist Verification System
 *
 * Maintains a whitelist of verified bank phone numbers to prevent SMS spoofing
 * and phishing attacks. Only SMS from whitelisted numbers claiming to be from
 * banks will be processed as legitimate bank communications.
 *
 * Features:
 * - User-managed whitelist of trusted bank phone numbers
 * - Bank name and verification status tracking
 * - Automatic flagging of suspicious SMS
 * - Support for multiple banks per user
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface BankWhitelistEntry {
  id: string;                    // Unique identifier
  userId: string;                // Owner of this whitelist entry
  bankName: string;              // Name of the bank
  phoneNumber: string;           // Verified bank phone number (E.164 format)
  countryCode: string;           // ISO country code (e.g., 'US', 'IN', 'EG')
  verifiedAt: string;            // ISO timestamp when verified
  verifiedBy: 'user' | 'system' | 'admin'; // Verification source
  isActive: boolean;             // Whether this entry is active
  notes: string | null;          // Optional notes
  lastSeenAt: string | null;     // Last time SMS received from this number
  smsCount: number;              // Count of SMS received from this number
}

export interface BankVerificationResult {
  isVerified: boolean;           // Is the sender in whitelist?
  bankName: string | null;       // Name of verified bank (if verified)
  whitelistEntryId: string | null; // Whitelist entry ID (if verified)
  suspicionLevel: 'none' | 'low' | 'medium' | 'high'; // Fraud suspicion level
  reasons: string[];             // Reasons for suspicion (if any)
}

export interface BankSMSPattern {
  bankName: string;
  keywords: string[];            // Keywords that appear in bank SMS
  senderPatterns: RegExp[];      // Regex patterns for sender numbers
  contentPatterns: RegExp[];     // Regex patterns for SMS content
}

// ============================================================================
// Predefined Bank Patterns (Common Banks)
// ============================================================================

const COMMON_BANK_PATTERNS: BankSMSPattern[] = [
  // US Banks
  {
    bankName: 'Chase Bank',
    keywords: ['chase', 'jpmorgan', 'chase bank'],
    senderPatterns: [/^24273$/, /^CHASE$/, /^\+1(800|888)935/],
    contentPatterns: [/chase.*account/i, /jpmorgan.*chase/i],
  },
  {
    bankName: 'Bank of America',
    keywords: ['bank of america', 'bofa', 'boa'],
    senderPatterns: [/^BOFA$/, /^226563$/, /^\+1(800)432/],
    contentPatterns: [/bank of america/i, /bofa.*account/i],
  },
  {
    bankName: 'Wells Fargo',
    keywords: ['wells fargo', 'wellsfargo'],
    senderPatterns: [/^93557$/, /^WELLSFARGO$/, /^\+1(800)869/],
    contentPatterns: [/wells fargo/i, /wellsfargo/i],
  },
  {
    bankName: 'Citi Bank',
    keywords: ['citi', 'citibank', 'citicards'],
    senderPatterns: [/^CITI$/, /^274484$/, /^\+1(800)374/],
    contentPatterns: [/citi(bank|card)?/i],
  },
  {
    bankName: 'Capital One',
    keywords: ['capital one', 'capitalone'],
    senderPatterns: [/^CAPITALONE$/, /^227898$/, /^\+1(800)227/],
    contentPatterns: [/capital one/i, /capitalone/i],
  },
  // Indian Banks
  {
    bankName: 'State Bank of India',
    keywords: ['sbi', 'state bank', 'sbiyono'],
    senderPatterns: [/^SBIINB$/, /^SBIYONO$/, /^\+91(9(0|8|7))/],
    contentPatterns: [/state bank of india/i, /sbi.*account/i],
  },
  {
    bankName: 'HDFC Bank',
    keywords: ['hdfc', 'hdfcbank'],
    senderPatterns: [/^HDFCBK$/, /^HDFC$/, /^\+91(9(0|8|7))/],
    contentPatterns: [/hdfc.*bank/i, /hdfc.*card/i],
  },
  {
    bankName: 'ICICI Bank',
    keywords: ['icici', 'icicib'],
    senderPatterns: [/^ICICIB$/, /^ICICI$/, /^\+91(9(0|8|7))/],
    contentPatterns: [/icici.*bank/i, /icici.*card/i],
  },
  // Egyptian Banks
  {
    bankName: 'National Bank of Egypt',
    keywords: ['nbe', 'national bank egypt'],
    senderPatterns: [/^NBE$/, /^\+20(10|11|12)/],
    contentPatterns: [/national bank.*egypt/i, /nbe.*account/i],
  },
  {
    bankName: 'Banque Misr',
    keywords: ['banque misr', 'bm'],
    senderPatterns: [/^BM$/, /^BANQUEMISR$/, /^\+20(10|11|12)/],
    contentPatterns: [/banque misr/i],
  },
];

// ============================================================================
// Bank Whitelist Management
// ============================================================================

/**
 * Create a new bank whitelist entry
 */
export function createBankWhitelistEntry(
  userId: string,
  bankName: string,
  phoneNumber: string,
  countryCode: string,
  verifiedBy: 'user' | 'system' | 'admin' = 'user'
): BankWhitelistEntry {
  return {
    id: generateWhitelistId(),
    userId,
    bankName,
    phoneNumber: normalizePhoneNumber(phoneNumber),
    countryCode: countryCode.toUpperCase(),
    verifiedAt: new Date().toISOString(),
    verifiedBy,
    isActive: true,
    notes: null,
    lastSeenAt: null,
    smsCount: 0,
  };
}

/**
 * Verify if a phone number is in user's bank whitelist
 */
export function verifyBankSender(
  senderNumber: string,
  userWhitelist: BankWhitelistEntry[]
): BankVerificationResult {
  const normalizedSender = normalizePhoneNumber(senderNumber);

  // Check exact match in whitelist
  const matchedEntry = userWhitelist.find(
    entry => entry.isActive && entry.phoneNumber === normalizedSender
  );

  if (matchedEntry) {
    return {
      isVerified: true,
      bankName: matchedEntry.bankName,
      whitelistEntryId: matchedEntry.id,
      suspicionLevel: 'none',
      reasons: [],
    };
  }

  // Not in whitelist - check if it claims to be from a bank (suspicious)
  const suspicionCheck = detectBankClaimWithoutVerification(senderNumber, '');

  return {
    isVerified: false,
    bankName: null,
    whitelistEntryId: null,
    suspicionLevel: suspicionCheck.isSuspicious ? 'high' : 'none',
    reasons: suspicionCheck.reasons,
  };
}

/**
 * Verify SMS content and sender together
 */
export function verifyBankSMS(
  senderNumber: string,
  messageContent: string,
  userWhitelist: BankWhitelistEntry[]
): BankVerificationResult {
  const normalizedSender = normalizePhoneNumber(senderNumber);

  // Check exact match in whitelist
  const matchedEntry = userWhitelist.find(
    entry => entry.isActive && entry.phoneNumber === normalizedSender
  );

  if (matchedEntry) {
    // Verified sender - check if content matches expected bank communication
    const contentCheck = analyzeMessageContent(messageContent, matchedEntry.bankName);

    return {
      isVerified: true,
      bankName: matchedEntry.bankName,
      whitelistEntryId: matchedEntry.id,
      suspicionLevel: contentCheck.suspicionLevel,
      reasons: contentCheck.reasons,
    };
  }

  // Not in whitelist - check for phishing attempts
  const suspicionCheck = detectBankClaimWithoutVerification(senderNumber, messageContent);

  return {
    isVerified: false,
    bankName: null,
    whitelistEntryId: null,
    suspicionLevel: suspicionCheck.isSuspicious ? 'high' : 'none',
    reasons: suspicionCheck.reasons,
  };
}

/**
 * Suggest banks based on sender number and content
 */
export function suggestBankFromSMS(
  senderNumber: string,
  messageContent: string
): { suggestedBanks: string[]; confidence: 'high' | 'medium' | 'low' } {
  const suggestions = new Set<string>();
  let highConfidenceMatches = 0;

  for (const pattern of COMMON_BANK_PATTERNS) {
    let matches = 0;

    // Check sender patterns
    if (pattern.senderPatterns.some(regex => regex.test(senderNumber))) {
      matches++;
    }

    // Check content patterns
    if (pattern.contentPatterns.some(regex => regex.test(messageContent))) {
      matches++;
    }

    // Check keywords in content
    const contentLower = messageContent.toLowerCase();
    if (pattern.keywords.some(keyword => contentLower.includes(keyword))) {
      matches++;
    }

    if (matches >= 2) {
      suggestions.add(pattern.bankName);
      highConfidenceMatches++;
    } else if (matches === 1) {
      suggestions.add(pattern.bankName);
    }
  }

  return {
    suggestedBanks: Array.from(suggestions),
    confidence: highConfidenceMatches > 0 ? 'high' : suggestions.size > 0 ? 'medium' : 'low',
  };
}

// ============================================================================
// Fraud Detection
// ============================================================================

/**
 * Detect potential phishing/fraud attempts
 */
function detectBankClaimWithoutVerification(
  senderNumber: string,
  messageContent: string
): { isSuspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const contentLower = messageContent.toLowerCase();

  // Keywords that suggest banking communication
  const bankKeywords = [
    'account',
    'card',
    'payment',
    'transaction',
    'balance',
    'credit',
    'debit',
    'bank',
    'verification',
    'otp',
    'verify',
    'security',
  ];

  const hasBankKeywords = bankKeywords.some(keyword => contentLower.includes(keyword));

  if (hasBankKeywords) {
    reasons.push('Message contains banking keywords but sender is not verified');
  }

  // Check for urgency language (common in phishing)
  const urgencyKeywords = [
    'urgent',
    'immediately',
    'suspended',
    'locked',
    'expired',
    'verify now',
    'click here',
    'limited time',
  ];

  if (urgencyKeywords.some(keyword => contentLower.includes(keyword))) {
    reasons.push('Message contains urgency language (common phishing tactic)');
  }

  // Check for links (banks rarely send links via SMS)
  if (/http[s]?:\/\//.test(messageContent) || /\.com|\.net|\.org/i.test(messageContent)) {
    reasons.push('Message contains links (potential phishing)');
  }

  // Check for requests for sensitive information
  const sensitiveRequests = ['password', 'pin', 'cvv', 'social security', 'ssn'];
  if (sensitiveRequests.some(keyword => contentLower.includes(keyword))) {
    reasons.push('Message requests sensitive information (RED FLAG)');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Analyze message content for anomalies
 */
function analyzeMessageContent(
  messageContent: string,
  expectedBank: string
): { suspicionLevel: 'none' | 'low' | 'medium' | 'high'; reasons: string[] } {
  const reasons: string[] = [];
  const contentLower = messageContent.toLowerCase();
  const bankLower = expectedBank.toLowerCase();

  // Check if message mentions the correct bank
  if (!contentLower.includes(bankLower.split(' ')[0])) {
    reasons.push('Message does not mention expected bank name');
    return { suspicionLevel: 'medium', reasons };
  }

  // Check for suspicious patterns even from verified senders
  if (/password|pin|cvv/i.test(messageContent)) {
    reasons.push('Verified sender asking for sensitive info (unusual)');
    return { suspicionLevel: 'low', reasons };
  }

  return { suspicionLevel: 'none', reasons };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Normalize phone number for comparison
 */
function normalizePhoneNumber(phoneNumber: string): string {
  // Remove all non-numeric characters except leading +
  return phoneNumber.replace(/[^\d+]/g, '').trim();
}

/**
 * Generate unique whitelist entry ID
 */
function generateWhitelistId(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  return `wl-${hex}`;
}

/**
 * Update whitelist entry after receiving SMS
 */
export function updateWhitelistEntryStats(
  entry: BankWhitelistEntry
): BankWhitelistEntry {
  return {
    ...entry,
    lastSeenAt: new Date().toISOString(),
    smsCount: entry.smsCount + 1,
  };
}

/**
 * Get common banks for a country
 */
export function getCommonBanksForCountry(countryCode: string): BankSMSPattern[] {
  const code = countryCode.toUpperCase();

  // Map country codes to banks
  const countryBankMap: Record<string, string[]> = {
    US: ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citi Bank', 'Capital One'],
    IN: ['State Bank of India', 'HDFC Bank', 'ICICI Bank'],
    EG: ['National Bank of Egypt', 'Banque Misr'],
    // Add more countries as needed
  };

  const bankNames = countryBankMap[code] || [];
  return COMMON_BANK_PATTERNS.filter(pattern => bankNames.includes(pattern.bankName));
}

/**
 * Export whitelist for backup
 */
export function exportWhitelist(whitelist: BankWhitelistEntry[]): string {
  return JSON.stringify(whitelist, null, 2);
}

/**
 * Import whitelist from backup
 */
export function importWhitelist(jsonString: string, userId: string): BankWhitelistEntry[] {
  const imported = JSON.parse(jsonString) as BankWhitelistEntry[];

  // Validate and assign to user
  return imported.map(entry => ({
    ...entry,
    userId, // Override with current user
    id: generateWhitelistId(), // Generate new IDs
    verifiedAt: new Date().toISOString(),
  }));
}
