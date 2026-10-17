import express from 'express';
import axios from 'axios';
import { query } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================================
// AI ROUTES
//
// Three capabilities:
//   1. POST /api/ai/chat               - proxy to an OpenAI-compatible
//                                        chat completion API (env-driven)
//   2. POST /api/ai/sms/classify       - deterministic, pattern-matching
//                                        SMS classification + extraction
//   3. POST /api/ai/analysis/financial - deterministic financial health
//                                        analysis from cards + transactions
//
// The SMS classification and financial analysis are fully deterministic:
// no external AI calls are made for them.
// ============================================================

// ============================================================
// SHARED HELPERS
// ============================================================

function toNumber(value) {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function round2(value) {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// ============================================================
// POST /api/ai/chat
//
// Proxy a chat completion request to an OpenAI-compatible endpoint.
//
// Request body:
//   {
//     messages: [{ role: 'system'|'user'|'assistant', content: string }],
//     model?: string
//   }
//
// Configuration (environment variables):
//   AI_API_ID       - API identifier        (X-CREAO-API-ID header)
//   AI_API_PATH     - API path              (X-CREAO-API-PATH header)
//   AI_API_NAME     - API name              (X-CREAO-API-NAME header)
//   AI_API_BASE_URL - optional base URL override
//   AI_DEFAULT_MODEL - optional default model
//
// Returns the upstream chat completion response verbatim.
// ============================================================
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const validRoles = ['system', 'user', 'assistant'];
    for (const message of messages) {
      if (
        !message ||
        typeof message.content !== 'string' ||
        !validRoles.includes(message.role)
      ) {
        return res.status(400).json({
          error: 'Each message requires a valid role (system|user|assistant) and string content',
        });
      }
    }

    // Read config at request time (dotenv is loaded during server startup)
    const apiId = process.env.AI_API_ID;
    const apiPath = process.env.AI_API_PATH;
    const apiName = process.env.AI_API_NAME || 'OpenAIGPTChat';
    const baseUrl = (process.env.AI_API_BASE_URL || '').replace(/\/+$/, '');

    if (!apiId || !apiPath) {
      return res.status(503).json({
        error: 'AI API not configured. Set AI_API_ID and AI_API_PATH environment variables.',
      });
    }

    // Allow either a full URL or a path relative to the base URL
    const url = /^https?:\/\//i.test(apiPath)
      ? apiPath
      : `${baseUrl}${apiPath.startsWith('/') ? '' : '/'}${apiPath}`;

    const response = await axios.post(
      url,
      {
        model: model || process.env.AI_DEFAULT_MODEL || 'MaaS_4.1',
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-CREAO-API-NAME': apiName,
          'X-CREAO-API-PATH': apiPath,
          'X-CREAO-API-ID': apiId,
        },
        timeout: 60000,
      }
    );

    return res.json(response.data);
  } catch (error) {
    console.error('AI chat error:', error.message);

    // Surface upstream status/details when available
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'AI chat completion failed',
        details: error.response.data,
      });
    }

    return res.status(502).json({ error: 'Failed to reach AI chat completion service' });
  }
});

// ============================================================
// SMS CLASSIFICATION (deterministic pattern matching)
// ============================================================

// Internal classification types
const CLASSIFICATION_PATTERNS = [
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
    type: 'otp_verification',
    keywords: ['otp', 'verification code', 'one-time password'],
    patterns: [
      /\b\d{4,6}\b.*(?:otp|code|verification)/i,
      /(?:otp|code).*\b\d{4,6}\b/i,
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
    type: 'credit_limit_warning',
    keywords: ['credit limit', 'over limit', 'limit exceeded'],
    patterns: [
      /credit.*limit.*(?:exceeded|warning|reached)/i,
      /over.*limit/i,
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
    type: 'statement_ready',
    keywords: ['statement', 'billing statement', 'monthly statement'],
    patterns: [
      /(?:billing|monthly|credit card).*statement/i,
      /statement.*(?:ready|available)/i,
    ],
    priority: 6,
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

// Map internal types to the unified SMS classification enum
const UNIFIED_TYPE_MAP = {
  payment_confirmation: 'payment_received',
  payment_reminder: 'payment_reminder',
  minimum_payment_due: 'payment_reminder',
  transaction_alert: 'card_purchase',
  balance_update: 'balance_update',
  credit_limit_warning: 'credit_limit_changed',
  fraud_alert: 'fraud_alert',
  otp_verification: 'otp_verification',
  statement_ready: 'statement_issued',
  reward_notification: 'reward_notification',
  promotional: 'promotional',
  unknown: 'unknown',
};

const EXTRACTION_PATTERNS = {
  amount: [
    /\$\s*([0-9,]+\.?\d{0,2})/,
    /(?:USD|EUR|GBP|INR|EGP|SAR|AED|CAD|AUD)\s*([0-9,]+\.?\d{0,2})/i,
    /([0-9,]+\.?\d{0,2})\s*(?:USD|EUR|GBP|INR|EGP|SAR|AED|CAD|AUD)/i,
    /(?:amount|amt|of|for)\s*:?\s*([0-9,]+\.\d{2})/i,
  ],
  cardLast4: [
    /card\s*(?:ending|#|no\.?|number)\s*(?:in\s*)?(\d{4})/i,
    /x{2,}(\d{4})/i,
    /\*{2,}(\d{4})/i,
    /ending\s+(?:in\s+)?(\d{4})/i,
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
    /(?:on|by)\s+(\w+\s+\d{1,2},?\s+\d{4})/i,
  ],
  minimumPayment: [
    /minimum\s+(?:payment|due)\s*(?:of|is|:)?\s*\$?\s*([0-9][0-9,]*\.?\d{0,2})/i,
    /\bmin(?:imum)?\s*pay(?:ment)?\b\s*(?:of|is|:)?\s*\$?\s*([0-9][0-9,]*\.?\d{0,2})/i,
  ],
  referenceNumber: [
    /(?:ref(?:erence)?|txn|transaction)\s*(?:no|number|id|#)?\s*[:#]?\s*([A-Z0-9]{6,})/i,
  ],
};

// Known bank sender/content patterns (used to suggest an unverified bank)
const COMMON_BANK_PATTERNS = [
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

function normalizePhoneNumber(phoneNumber) {
  return String(phoneNumber || '').replace(/[^\d+]/g, '').trim();
}

function detectLanguage(content) {
  if (/[\u0600-\u06FF]/.test(content)) return 'ar';
  if (/[\u0900-\u097F]/.test(content)) return 'hi';
  if (/[a-zA-Z]/.test(content)) return 'en';
  return 'unknown';
}

function parseDateToISO(dateStr) {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (error) {
    // Parsing failed - fall through and return the original string
  }
  return dateStr;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Classify SMS content into an internal type with a confidence score.
 */
function classifyMessageType(content) {
  const contentLower = content.toLowerCase();
  const sortedPatterns = [...CLASSIFICATION_PATTERNS].sort((a, b) => b.priority - a.priority);

  for (const pattern of sortedPatterns) {
    let matchScore = 0;
    let totalChecks = 0;

    for (const keyword of pattern.keywords) {
      totalChecks++;
      if (contentLower.includes(keyword)) {
        matchScore++;
      }
    }

    for (const regex of pattern.patterns) {
      totalChecks++;
      if (regex.test(content)) {
        matchScore += 2; // Regex matches weigh more than keyword hits
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

/**
 * Detect the currency mentioned in an SMS.
 */
function detectCurrency(content) {
  const codeMatch = content.match(/\b(USD|EUR|GBP|INR|EGP|SAR|AED|CAD|AUD)\b/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }

  const symbolMatch = content.match(/(\$|€|£|₹)/);
  if (symbolMatch) {
    const symbols = { $: 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR' };
    return symbols[symbolMatch[1]] || 'USD';
  }

  return undefined;
}

/**
 * Extract structured data from SMS content.
 */
function extractDataFromSMS(content, type) {
  const data = {};

  // Amount + currency
  for (const pattern of EXTRACTION_PATTERNS.amount) {
    const match = content.match(pattern);
    if (match) {
      data.amount = round2(parseFloat(match[1].replace(/,/g, '')));
      break;
    }
  }
  const currency = detectCurrency(content);
  if (currency) {
    data.currency = currency;
  }

  // Card last 4 digits
  for (const pattern of EXTRACTION_PATTERNS.cardLast4) {
    const match = content.match(pattern);
    if (match) {
      data.cardLast4 = match[1];
      break;
    }
  }

  // Merchant (transaction / payment messages only)
  if (type === 'transaction_alert' || type === 'payment_confirmation') {
    for (const pattern of EXTRACTION_PATTERNS.merchant) {
      const match = content.match(pattern);
      if (match) {
        data.merchant = match[1].trim();
        break;
      }
    }
  }

  // OTP code
  if (type === 'otp_verification') {
    for (const pattern of EXTRACTION_PATTERNS.otp) {
      const match = content.match(pattern);
      if (match) {
        data.otp = match[1];
        break;
      }
    }
  }

  // Due date
  if (type === 'payment_reminder' || type === 'minimum_payment_due') {
    for (const pattern of EXTRACTION_PATTERNS.dueDate) {
      const match = content.match(pattern);
      if (match) {
        data.dueDate = parseDateToISO(match[1]);
        break;
      }
    }
  }

  // Minimum payment
  if (type === 'minimum_payment_due') {
    for (const pattern of EXTRACTION_PATTERNS.minimumPayment) {
      const match = content.match(pattern);
      if (match) {
        data.minimumPayment = round2(parseFloat(match[1].replace(/,/g, '')));
        break;
      }
    }
  }

  // Reference number
  for (const pattern of EXTRACTION_PATTERNS.referenceNumber) {
    const match = content.match(pattern);
    if (match) {
      data.referenceNumber = match[1];
      break;
    }
  }

  return data;
}

/**
 * Determine which phone number received the SMS (matched against phoneMapping).
 */
function detectReceivingPhone(senderNumber, phoneMapping) {
  if (!Array.isArray(phoneMapping)) {
    return null;
  }
  const normalizedSender = normalizePhoneNumber(senderNumber);
  const match = phoneMapping.find(
    (entry) => entry && normalizePhoneNumber(entry.phoneNumber) === normalizedSender
  );
  return match && typeof match.index !== 'undefined' ? match.index : null;
}

/**
 * Flag potential phishing/fraud attempts from unverified senders.
 */
function detectBankClaimWithoutVerification(senderNumber, messageContent) {
  const reasons = [];
  const contentLower = messageContent.toLowerCase();

  const bankKeywords = [
    'account', 'card', 'payment', 'transaction', 'balance', 'credit',
    'debit', 'bank', 'verification', 'otp', 'verify', 'security',
  ];
  if (bankKeywords.some((keyword) => contentLower.includes(keyword))) {
    reasons.push('Message contains banking keywords but sender is not verified');
  }

  const urgencyKeywords = [
    'urgent', 'immediately', 'suspended', 'locked', 'expired',
    'verify now', 'click here', 'limited time',
  ];
  if (urgencyKeywords.some((keyword) => contentLower.includes(keyword))) {
    reasons.push('Message contains urgency language (common phishing tactic)');
  }

  if (/http[s]?:\/\//.test(messageContent) || /\.com|\.net|\.org/i.test(messageContent)) {
    reasons.push('Message contains links (potential phishing)');
  }

  const sensitiveRequests = ['password', 'pin', 'cvv', 'social security', 'ssn'];
  if (sensitiveRequests.some((keyword) => contentLower.includes(keyword))) {
    reasons.push('Message requests sensitive information (RED FLAG)');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}

/**
 * Analyze content from an already-verified sender for anomalies.
 */
function analyzeMessageContent(messageContent, expectedBank) {
  const reasons = [];
  const contentLower = messageContent.toLowerCase();
  const bankLower = expectedBank.toLowerCase();

  if (!contentLower.includes(bankLower.split(' ')[0])) {
    reasons.push('Message does not mention expected bank name');
    return { suspicionLevel: 'medium', reasons };
  }

  if (/password|pin|cvv/i.test(messageContent)) {
    reasons.push('Verified sender asking for sensitive info (unusual)');
    return { suspicionLevel: 'low', reasons };
  }

  return { suspicionLevel: 'none', reasons };
}

/**
 * Verify a sender against the user's bank whitelist.
 */
function verifyBankSMS(senderNumber, messageContent, userWhitelist) {
  const whitelist = Array.isArray(userWhitelist) ? userWhitelist : [];
  const normalizedSender = normalizePhoneNumber(senderNumber);

  const matchedEntry = whitelist.find(
    (entry) => entry && entry.isActive !== false && normalizePhoneNumber(entry.phoneNumber) === normalizedSender
  );

  if (matchedEntry) {
    const contentCheck = analyzeMessageContent(messageContent, matchedEntry.bankName || '');
    return {
      isVerified: true,
      bankName: matchedEntry.bankName || null,
      whitelistEntryId: matchedEntry.id || null,
      suspicionLevel: contentCheck.suspicionLevel,
      reasons: contentCheck.reasons,
    };
  }

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
 * Suggest a bank based on sender number and content (for unverified senders).
 */
function suggestBankFromSMS(senderNumber, messageContent) {
  const suggestions = new Set();
  let highConfidenceMatches = 0;
  const contentLower = messageContent.toLowerCase();

  for (const pattern of COMMON_BANK_PATTERNS) {
    let matches = 0;

    if (pattern.senderPatterns.some((regex) => regex.test(senderNumber))) {
      matches++;
    }
    if (pattern.contentPatterns.some((regex) => regex.test(messageContent))) {
      matches++;
    }
    if (pattern.keywords.some((keyword) => contentLower.includes(keyword))) {
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

/**
 * Determine whether the classified SMS should produce action items.
 */
function determineActionItems(type, extractedData) {
  const requiresCalendarEvent = type === 'minimum_payment_due' || type === 'payment_reminder';
  const requiresTaskCreation = requiresCalendarEvent;
  const requiresDocsEntry = type === 'payment_confirmation';

  let suggestedEventTitle;
  let suggestedDueDate;

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

/**
 * POST /api/ai/sms/classify
 *
 * Deterministic SMS classification and structured-data extraction.
 *
 * Request body:
 *   {
 *     smsContent: string,                    // required
 *     senderNumber: string,                  // required
 *     phoneMapping?: [{ phoneNumber, index, label }],
 *     userBankWhitelist?: [{ id, bankName, phoneNumber, isActive, ... }],
 *     receivedAt?: string                    // optional ISO timestamp
 *   }
 *
 * Response:
 *   {
 *     success: true,
 *     type, unifiedType, confidence,
 *     extractedData: { amount, currency, cardLast4, merchant, dueDate,
 *                      minimumPayment, otp, referenceNumber },
 *     bankVerification: { isVerified, bankName, whitelistEntryId, suspicionLevel, reasons },
 *     suggestedBankName, receivingPhoneIndex, language,
 *     requiresCalendarEvent, requiresTaskCreation, requiresDocsEntry,
 *     suggestedEventTitle, suggestedDueDate,
 *     processingTimestamp, rawContent
 *   }
 */
router.post('/sms/classify', authenticateToken, async (req, res) => {
  try {
    const { smsContent, senderNumber, phoneMapping, userBankWhitelist } = req.body;

    if (!smsContent || typeof smsContent !== 'string') {
      return res.status(400).json({ error: 'smsContent is required' });
    }

    const sender = senderNumber || '';

    const language = detectLanguage(smsContent);
    const classification = classifyMessageType(smsContent);
    const extractedData = extractDataFromSMS(smsContent, classification.type);
    const bankVerification = verifyBankSMS(sender, smsContent, userBankWhitelist);

    let suggestedBankName;
    if (!bankVerification.isVerified) {
      const suggestion = suggestBankFromSMS(sender, smsContent);
      suggestedBankName = suggestion.suggestedBanks[0];
    }

    const receivingPhoneIndex = detectReceivingPhone(sender, phoneMapping);
    const actionItems = determineActionItems(classification.type, extractedData);

    return res.json({
      success: true,
      type: classification.type,
      category: classification.type,
      unifiedType: UNIFIED_TYPE_MAP[classification.type] || 'unknown',
      confidence: classification.confidence,
      extractedData,
      bankVerification,
      suggestedBankName,
      receivingPhoneIndex,
      language,
      requiresCalendarEvent: actionItems.requiresCalendarEvent,
      requiresTaskCreation: actionItems.requiresTaskCreation,
      requiresDocsEntry: actionItems.requiresDocsEntry,
      suggestedEventTitle: actionItems.suggestedEventTitle,
      suggestedDueDate: actionItems.suggestedDueDate,
      processingTimestamp: new Date().toISOString(),
      rawContent: smsContent,
    });
  } catch (error) {
    console.error('SMS classification error:', error.message);
    res.status(500).json({ error: 'Failed to classify SMS' });
  }
});

// ============================================================
// FINANCIAL ANALYSIS (deterministic calculations)
// ============================================================

// Status point weights (0-25) used for the stress "statusImpact" factor
const STATUS_POINTS = {
  paid: 0,
  minimum_paid: 6,
  partially_paid: 12,
  grace_period: 16,
  unpaid: 20,
  overdue: 25,
  over_limit: 25,
};

const INCOME_TYPES = ['credit', 'income', 'deposit', 'refund', 'payment_received'];

/**
 * Days from today until the next occurrence of a due day-of-month.
 */
function daysUntilDue(dueDay) {
  const day = toNumber(dueDay);
  if (day < 1 || day > 31) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let due = new Date(today.getFullYear(), today.getMonth(), day);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, day);
  }

  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

/**
 * Derive a card status from its stored fields.
 */
function deriveCardStatus(card, days) {
  const debt = toNumber(card.outstanding_debt);
  const limit = toNumber(card.limit_amount);
  const minimum = toNumber(card.minimum_payment);

  if (debt <= 0) return 'paid';
  if (limit > 0 && debt > limit) return 'over_limit';
  if (days !== null && days < 0) return days <= -5 ? 'overdue' : 'grace_period';
  if (minimum > 0 && debt < minimum) return 'partially_paid';
  return 'unpaid';
}

/**
 * Compute the financial analysis payload for a user.
 */
async function computeFinancialAnalysis(userId) {
  const cardsResult = await query(
    `SELECT * FROM credit_cards
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  const transactionsResult = await query(
    `SELECT * FROM transactions
     WHERE user_id = $1
     ORDER BY transaction_date DESC`,
    [userId]
  );

  const cards = cardsResult.rows || [];
  const transactions = transactionsResult.rows || [];

  let totalDebt = 0;
  let totalCreditLimit = 0;
  let totalAvailableCredit = 0;
  let totalMinimumPayment = 0;
  let overLimitCards = 0;
  let cardsWithDebt = 0;
  let upcomingDueCount = 0;
  let worstStatusPoints = 0;

  const cardSummaries = cards.map((card) => {
    const creditLimit = toNumber(card.limit_amount);
    const outstandingDebt = toNumber(card.outstanding_debt);
    const availableBalance = toNumber(card.current_balance);
    const minimumPayment = toNumber(card.minimum_payment);
    const days = daysUntilDue(card.due_date);
    const status = deriveCardStatus(card, days);
    const utilization = creditLimit > 0 ? (outstandingDebt / creditLimit) * 100 : 0;
    const isOverLimit = creditLimit > 0 && outstandingDebt > creditLimit;

    totalDebt += outstandingDebt;
    totalCreditLimit += creditLimit;
    totalAvailableCredit += availableBalance;
    totalMinimumPayment += minimumPayment;
    if (isOverLimit) overLimitCards++;
    if (outstandingDebt > 0) cardsWithDebt++;
    if (days !== null && days >= 0 && days <= 7) upcomingDueCount++;
    worstStatusPoints = Math.max(worstStatusPoints, STATUS_POINTS[status] || 0);

    return {
      id: card.id,
      cardName: card.alias_name,
      lastFour: card.last_four_digits,
      cardNetwork: card.card_network,
      creditLimit: round2(creditLimit),
      availableBalance: round2(availableBalance),
      outstandingDebt: round2(outstandingDebt),
      minimumPayment: round2(minimumPayment),
      dueDate: card.due_date,
      daysUntilDue: days,
      utilization: round2(utilization),
      isOverLimit,
      status,
    };
  });

  const utilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0;
  const debtToLimitRatio = totalCreditLimit > 0 ? totalDebt / totalCreditLimit : 0;

  // Transaction aggregation
  let totalSpend = 0;
  let totalIncome = 0;
  const byCategory = {};

  for (const tx of transactions) {
    const amount = toNumber(tx.amount);
    const category = tx.category || 'uncategorized';
    const isIncome = INCOME_TYPES.includes(String(tx.transaction_type || '').toLowerCase());

    if (isIncome) {
      totalIncome += amount;
    } else {
      totalSpend += amount;
    }

    if (!byCategory[category]) {
      byCategory[category] = { spend: 0, income: 0, count: 0 };
    }
    byCategory[category].count++;
    if (isIncome) {
      byCategory[category].income += amount;
    } else {
      byCategory[category].spend += amount;
    }
  }

  // ---- Stress score (deterministic, 0-100) ----
  const utilizationImpact = round2(clamp(utilization, 0, 100) * 0.4); // 0-40
  const statusImpact = round2(clamp(worstStatusPoints, 0, 25)); // 0-25

  let nearestDue = null;
  for (const summary of cardSummaries) {
    if (summary.outstandingDebt > 0 && summary.daysUntilDue !== null && summary.daysUntilDue >= 0) {
      if (nearestDue === null || summary.daysUntilDue < nearestDue) {
        nearestDue = summary.daysUntilDue;
      }
    }
  }
  const dueDateProximityImpact = round2(
    nearestDue === null ? 0 : clamp((1 - nearestDue / 30) * 20, 0, 20)
  ); // 0-20

  const activeCardsImpact = round2(clamp((cardsWithDebt / 5) * 10, 0, 10)); // 0-10
  const overLimitImpact = overLimitCards > 0 ? 5 : 0; // 0-5

  const stressScore = round2(
    clamp(
      utilizationImpact + statusImpact + dueDateProximityImpact + activeCardsImpact + overLimitImpact,
      0,
      100
    )
  );

  let stressLevel = 'safe';
  if (stressScore >= 70) stressLevel = 'high_risk';
  else if (stressScore >= 40) stressLevel = 'watchlist';

  const breakdown = [];
  if (utilizationImpact > 0) {
    breakdown.push(`Credit utilization is ${round2(utilization)}% (contributes ${utilizationImpact} points)`);
  }
  if (statusImpact > 0) {
    breakdown.push(`At least one card has an outstanding/unpaid status (contributes ${statusImpact} points)`);
  }
  if (dueDateProximityImpact > 0) {
    breakdown.push(`A payment is due in ${nearestDue} day(s) (contributes ${dueDateProximityImpact} points)`);
  }
  if (activeCardsImpact > 0) {
    breakdown.push(`${cardsWithDebt} card(s) carry a balance (contributes ${activeCardsImpact} points)`);
  }
  if (overLimitImpact > 0) {
    breakdown.push(`${overLimitCards} card(s) are over the credit limit (contributes ${overLimitImpact} points)`);
  }
  if (breakdown.length === 0) {
    breakdown.push('No significant financial stress factors detected');
  }

  const paymentHistoryScore = round2(clamp(100 - (statusImpact / 25) * 100, 0, 100));

  // ---- Recommendations ----
  const recommendations = [];

  if (cards.length === 0) {
    recommendations.push({
      priority: 'low',
      category: 'setup',
      title: 'Add your credit cards',
      description: 'Add your credit cards to unlock utilization tracking and personalized recommendations.',
    });
  }

  if (utilization > 30) {
    recommendations.push({
      priority: utilization > 80 ? 'high' : 'medium',
      category: 'utilization',
      title: 'Reduce credit utilization below 30%',
      description: `Your overall utilization is ${round2(utilization)}%. Paying down ${formatCurrency(
        Math.max(0, totalDebt - totalCreditLimit * 0.3)
      )} would bring it to the recommended 30% threshold.`,
    });
  }

  if (overLimitCards > 0) {
    recommendations.push({
      priority: 'high',
      category: 'over_limit',
      title: 'Bring over-limit cards back under their limit',
      description: `${overLimitCards} card(s) exceed their credit limit, which can trigger fees and lower your credit score.`,
    });
  }

  if (nearestDue !== null && nearestDue <= 3) {
    recommendations.push({
      priority: 'high',
      category: 'due_date',
      title: 'Upcoming payment due soon',
      description: `A payment is due in ${nearestDue} day(s). Total minimum due is ${formatCurrency(totalMinimumPayment)}.`,
    });
  } else if (totalMinimumPayment > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'due_date',
      title: 'Schedule your minimum payments',
      description: `Your total minimum payment is ${formatCurrency(totalMinimumPayment)}. Consider automating it to avoid late fees.`,
    });
  }

  if (cardsWithDebt > 1) {
    recommendations.push({
      priority: 'medium',
      category: 'strategy',
      title: 'Prioritize paying down the highest-utilization card',
      description: 'Focusing extra payments on the card with the highest utilization lowers your overall utilization fastest.',
    });
  }

  if (totalDebt > 0) {
    recommendations.push({
      priority: 'low',
      category: 'payoff',
      title: 'Pay more than the minimum where possible',
      description: 'Paying above the minimum reduces interest charges and shortens your payoff timeline.',
    });
  }

  if (stressLevel === 'safe' && recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      category: 'maintenance',
      title: 'You are in good financial shape',
      description: 'Keep utilization below 30% and pay balances in full each cycle to maintain this position.',
    });
  }

  return {
    summary: {
      totalDebt: round2(totalDebt),
      totalCreditLimit: round2(totalCreditLimit),
      totalAvailableCredit: round2(totalAvailableCredit),
      totalMinimumPayment: round2(totalMinimumPayment),
      creditUtilization: round2(utilization),
      debtToLimitRatio: round2(debtToLimitRatio * 10000) / 10000,
      cardCount: cards.length,
      cardsWithDebt,
      overLimitCards,
      upcomingDueCount,
    },
    stressScore: {
      score: stressScore,
      level: stressLevel,
      contributingFactors: {
        utilizationImpact,
        statusImpact,
        dueDateProximityImpact,
        activeCardsImpact,
        overLimitImpact,
      },
      breakdown,
    },
    cards: cardSummaries,
    transactions: {
      count: transactions.length,
      totalSpend: round2(totalSpend),
      totalIncome: round2(totalIncome),
      net: round2(totalIncome - totalSpend),
      byCategory: Object.keys(byCategory).map((category) => ({
        category,
        spend: round2(byCategory[category].spend),
        income: round2(byCategory[category].income),
        count: byCategory[category].count,
      })),
    },
    recommendations,
    meta: {
      utilizationRate: round2(debtToLimitRatio * 10000) / 10000,
      paymentHistoryScore,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * POST /api/ai/analysis/financial
 *
 * Deterministic financial analysis for the authenticated user.
 *
 * Request body:
 *   { userId?: string }   // optional; must match the authenticated user
 *
 * Response:
 *   {
 *     success: true,
 *     userId,
 *     summary: { totalDebt, totalCreditLimit, creditUtilization, ... },
 *     stressScore: { score, level, contributingFactors, breakdown },
 *     cards: [...],
 *     transactions: { count, totalSpend, totalIncome, net, byCategory },
 *     recommendations: [...],
 *     meta: { ... }
 *   }
 */
router.post('/analysis/financial', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const requestedUserId = req.body ? req.body.userId : undefined;

    // A userId may be supplied, but it must match the authenticated user
    if (requestedUserId && String(requestedUserId) !== String(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const analysis = await computeFinancialAnalysis(userId);

    // Persist the stress score for historical tracking (best-effort)
    try {
      await query(
        `INSERT INTO financial_stress_index
           (user_id, stress_score, debt_to_limit_ratio, payment_history_score, utilization_rate, calculated_at, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          analysis.stressScore.score,
          analysis.meta.utilizationRate,
          analysis.meta.paymentHistoryScore,
          analysis.meta.utilizationRate,
        ]
      );
    } catch (persistError) {
      console.error('Persist financial stress index error:', persistError.message);
    }

    res.json({
      success: true,
      userId,
      ...analysis,
    });
  } catch (error) {
    console.error('Financial analysis error:', error.message);
    res.status(500).json({ error: 'Failed to generate financial analysis' });
  }
});

export default router;
