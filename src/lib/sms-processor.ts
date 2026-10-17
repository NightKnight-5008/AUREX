import type { CompanyCard, SmsEvent } from '@/types/financial';

/**
 * SMS Processing Engine
 *
 * Automatically processes incoming SMS events from banks and updates card metrics accordingly.
 *
 * Key Features:
 * 1. FULL PAYMENT DETECTION: When SMS indicates card is fully paid
 *    - Sets paymentStatus to 'paid'
 *    - Sets outstandingDebt to 0
 *    - Sets minimumPayment to 0
 *    - Updates availableBalance to credit limit (or value from SMS)
 *
 * 2. PARTIAL PAYMENT DETECTION: When SMS indicates partial payment or balance update
 *    - Sets paymentStatus to 'unpaid' (if debt remains)
 *    - Updates availableBalance from SMS
 *    - Calculates outstandingDebt from creditLimit - availableBalance
 *    - Updates minimumPayment if present in SMS
 *
 * 3. AUTO-SYNC ALL METRICS: Percentage, debt, balance, minimum payment
 *    - Usage percentage calculated from outstandingDebt / creditLimit
 *    - All values synced with whatever SMS contains
 *    - Credit limit updates handled automatically
 *
 * 4. BANK NAME MATCHING: Only processes SMS from the correct bank
 * 5. CARD IDENTIFICATION: Matches SMS to cards using last 4 digits
 */

export interface SmsProcessingResult {
  cardId: string;
  updates: Partial<CompanyCard>;
  processingType: 'full_payment' | 'partial_payment' | 'limit_update' | 'due_date_alert' | 'other';
  reason: string;
}

/**
 * Parse SMS content to extract card information
 */
function extractCardIdFromSms(smsContent: string, cards: CompanyCard[]): string | null {
  // Extract last 4 digits from SMS (common patterns: xx1234, xxxx1234, ****1234, etc.)
  const last4Match = smsContent.match(/(?:xx|xxxx|\*{4})(\d{4})/i);

  if (!last4Match) return null;

  const last4Digits = last4Match[1];
  const matchingCard = cards.find(card => card.lastFourDigits === last4Digits);

  return matchingCard?.id || null;
}

/**
 * Extract bank name from SMS
 */
function extractBankName(smsContent: string, cards: CompanyCard[]): string | null {
  for (const card of cards) {
    if (smsContent.toLowerCase().includes(card.issuingBank.toLowerCase())) {
      return card.issuingBank;
    }
  }
  return null;
}

/**
 * Parse amount from SMS (supports various formats: Rs.1,234.00, EGP1234, $1,234, etc.)
 */
function parseAmount(text: string): number | null {
  // Match patterns like: Rs.1,234.00, EGP1234, $1,234, 1234.00, etc.
  const amountMatch = text.match(/(?:Rs\.?|EGP|USD|\$|EUR|€|GBP|£)?\s*([\d,]+(?:\.\d{1,2})?)/);

  if (!amountMatch) return null;

  const amountStr = amountMatch[1].replace(/,/g, '');
  const amount = parseFloat(amountStr);

  return isNaN(amount) ? null : amount;
}

/**
 * Detect if SMS indicates full payment
 */
function isFullPaymentSms(smsContent: string): boolean {
  const fullPaymentKeywords = [
    'fully paid',
    'payment received',
    'outstanding balance: 0',
    'outstanding: 0',
    'balance cleared',
    'payment successful',
    'paid in full',
    'total amount paid',
    'statement balance paid',
  ];

  const contentLower = smsContent.toLowerCase();
  return fullPaymentKeywords.some(keyword => contentLower.includes(keyword));
}

/**
 * Detect if SMS indicates partial payment
 */
function isPartialPaymentSms(smsContent: string): boolean {
  const partialPaymentKeywords = [
    'partial payment',
    'payment received',
    'amount paid',
    'credited',
    'payment of',
    'received payment',
  ];

  const contentLower = smsContent.toLowerCase();
  return partialPaymentKeywords.some(keyword => contentLower.includes(keyword));
}

/**
 * Extract available balance from SMS
 */
function extractAvailableBalance(smsContent: string): number | null {
  // Look for patterns: "Avl Bal:", "Available:", "Avail Balance:", "Avl Limit:", etc.
  const balancePatterns = [
    /(?:avl\.?\s*bal\.?|available\s*balance|avl\.?\s*limit|available\s*limit|available):\s*(?:Rs\.?|EGP|USD|\$|EUR|€|GBP|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:balance|limit)\s*(?:Rs\.?|EGP|USD|\$|EUR|€|GBP|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of balancePatterns) {
    const match = smsContent.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }
  }

  return null;
}

/**
 * Extract outstanding debt from SMS
 */
function extractOutstandingDebt(smsContent: string): number | null {
  // Look for patterns: "Outstanding:", "Amount Due:", "Balance Due:", etc.
  const debtPatterns = [
    /(?:outstanding|amount\s*due|balance\s*due|total\s*due):\s*(?:Rs\.?|EGP|USD|\$|EUR|€|GBP|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of debtPatterns) {
    const match = smsContent.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }
  }

  return null;
}

/**
 * Extract minimum payment from SMS
 */
function extractMinimumPayment(smsContent: string): number | null {
  // Look for patterns: "Min Payment:", "Minimum Due:", "Min Amount:", etc.
  const minPaymentPatterns = [
    /(?:min\.?\s*payment|minimum\s*due|min\.?\s*amount|minimum\s*payment):\s*(?:Rs\.?|EGP|USD|\$|EUR|€|GBP|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of minPaymentPatterns) {
    const match = smsContent.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }
  }

  return null;
}

/**
 * Extract credit limit from SMS
 */
function extractCreditLimit(smsContent: string): number | null {
  // Look for patterns: "Credit Limit:", "Total Limit:", etc.
  const limitPatterns = [
    /(?:credit\s*limit|total\s*limit):\s*(?:Rs\.?|EGP|USD|\$|EUR|€|GBP|£)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  ];

  for (const pattern of limitPatterns) {
    const match = smsContent.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }
  }

  return null;
}

/**
 * Process an SMS event and determine card updates
 */
export function processSmsEvent(
  smsEvent: SmsEvent,
  cards: CompanyCard[]
): SmsProcessingResult | null {
  const { smsContent, parsedData } = smsEvent;

  // Step 1: Find the card this SMS relates to
  let cardId: string | null | undefined = smsEvent.relatedCardId;
  if (!cardId) {
    cardId = extractCardIdFromSms(smsContent, cards);
  }

  if (!cardId) {
    // Can't process without knowing which card
    return null;
  }

  const card = cards.find(c => c.id === cardId);
  if (!card || card.cardType !== 'credit') {
    // Only process credit cards
    return null;
  }

  // Step 2: Check if bank name matches
  const bankName = extractBankName(smsContent, cards);
  if (bankName !== null && bankName !== card.issuingBank) {
    // Bank mismatch - skip processing
    return null;
  }

  // Step 3: Determine processing type and extract updates
  const updates: Partial<CompanyCard> = {};
  let processingType: SmsProcessingResult['processingType'] = 'other';
  let reason = '';

  // Handle Full Payment
  if (isFullPaymentSms(smsContent)) {
    processingType = 'full_payment';
    reason = 'SMS indicates card is fully paid';

    updates.paymentStatus = 'paid';
    updates.minimumPayment = 0;
    updates.outstandingDebt = 0;

    // If available balance is mentioned, update it
    const availableBalance = parsedData.availableBalance || extractAvailableBalance(smsContent);
    if (availableBalance !== null) {
      updates.availableBalance = availableBalance;
    } else {
      // If no balance specified, assume full credit limit is available
      updates.availableBalance = card.creditLimit;
    }
  }
  // Handle Partial Payment or Balance Update
  else if (isPartialPaymentSms(smsContent) || parsedData.availableBalance || parsedData.paymentAmount) {
    processingType = 'partial_payment';
    reason = 'SMS indicates partial payment or balance update';

    // Extract all available metrics from SMS
    const availableBalance = parsedData.availableBalance || extractAvailableBalance(smsContent);
    const outstandingDebt = extractOutstandingDebt(smsContent);
    const minimumPayment = parsedData.paymentAmount || extractMinimumPayment(smsContent);
    const creditLimit = parsedData.creditLimit || extractCreditLimit(smsContent);

    // Update available balance
    if (availableBalance !== null) {
      updates.availableBalance = availableBalance;
    }

    // Update credit limit if mentioned
    if (creditLimit !== null) {
      updates.creditLimit = creditLimit;
    }

    // Calculate outstanding debt
    if (outstandingDebt !== null) {
      updates.outstandingDebt = outstandingDebt;
    } else if (availableBalance !== null && (creditLimit !== null || card.creditLimit)) {
      // Calculate from available balance and credit limit
      const limit = creditLimit !== null ? creditLimit : card.creditLimit;
      updates.outstandingDebt = limit - availableBalance;
    }

    // Update minimum payment
    if (minimumPayment !== null) {
      updates.minimumPayment = minimumPayment;
    }

    // Determine payment status based on outstanding debt
    const finalOutstandingDebt = updates.outstandingDebt ?? card.outstandingDebt ?? 0;
    if (finalOutstandingDebt > 0) {
      updates.paymentStatus = 'unpaid';
    } else {
      updates.paymentStatus = 'paid';
      updates.minimumPayment = 0;
    }
  }
  // Handle Credit Limit Update
  else if (parsedData.creditLimit) {
    processingType = 'limit_update';
    reason = 'SMS indicates credit limit update';

    updates.creditLimit = parsedData.creditLimit;

    const availableBalance = parsedData.availableBalance || extractAvailableBalance(smsContent);
    if (availableBalance !== null) {
      updates.availableBalance = availableBalance;
      updates.outstandingDebt = parsedData.creditLimit - availableBalance;
    }
  }
  // Handle Due Date Alert
  else if (parsedData.dueDate) {
    processingType = 'due_date_alert';
    reason = 'SMS indicates due date reminder';

    updates.dueDate = parsedData.dueDate;

    const minimumPayment = extractMinimumPayment(smsContent);
    if (minimumPayment !== null) {
      updates.minimumPayment = minimumPayment;
      updates.paymentStatus = 'unpaid';
    }
  }

  // Only return if we have meaningful updates
  if (Object.keys(updates).length === 0) {
    return null;
  }

  return {
    cardId,
    updates,
    processingType,
    reason,
  };
}

/**
 * Process multiple SMS events and batch update cards
 */
export function processSmsEventsBatch(
  smsEvents: SmsEvent[],
  cards: CompanyCard[]
): CompanyCard[] {
  const updatedCards = [...cards];
  const processedCardIds = new Set<string>();

  // Process SMS events in chronological order (oldest first)
  const sortedEvents = [...smsEvents].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const smsEvent of sortedEvents) {
    const result = processSmsEvent(smsEvent, updatedCards);

    if (result) {
      const cardIndex = updatedCards.findIndex(c => c.id === result.cardId);

      if (cardIndex !== -1) {
        // Apply updates to the card
        updatedCards[cardIndex] = {
          ...updatedCards[cardIndex],
          ...result.updates,
        };

        processedCardIds.add(result.cardId);
      }
    }
  }

  return updatedCards;
}

/**
 * Get a summary of SMS processing results
 */
export function getSmsProcessingSummary(
  smsEvents: SmsEvent[],
  cards: CompanyCard[]
): {
  totalProcessed: number;
  fullPayments: number;
  partialPayments: number;
  limitUpdates: number;
  dueDateAlerts: number;
  failed: number;
} {
  let totalProcessed = 0;
  let fullPayments = 0;
  let partialPayments = 0;
  let limitUpdates = 0;
  let dueDateAlerts = 0;
  let failed = 0;

  for (const smsEvent of smsEvents) {
    const result = processSmsEvent(smsEvent, cards);

    if (result) {
      totalProcessed++;

      switch (result.processingType) {
        case 'full_payment':
          fullPayments++;
          break;
        case 'partial_payment':
          partialPayments++;
          break;
        case 'limit_update':
          limitUpdates++;
          break;
        case 'due_date_alert':
          dueDateAlerts++;
          break;
      }
    } else {
      failed++;
    }
  }

  return {
    totalProcessed,
    fullPayments,
    partialPayments,
    limitUpdates,
    dueDateAlerts,
    failed,
  };
}
