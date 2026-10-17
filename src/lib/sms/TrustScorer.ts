/**
 * AUREX FINANCIAL OPERATING SYSTEM - SMS TRUST SCORER
 *
 * Calculates confidence scores for SMS-derived transactions.
 *
 * SCORING ALGORITHM:
 * - Card Match (30 points): Exact last 4 digits match
 * - Amount Valid (20 points): Valid format, reasonable range
 * - Date Valid (15 points): Recent, reasonable timestamp
 * - Merchant Valid (15 points): Extracted and non-empty
 * - Balance Valid (10 points): Matches expected calculation
 * - Currency Valid (5 points): Valid currency code
 * - No Conflicts (5 points): No conflicting data
 *
 * TRUST LEVELS:
 * - HIGH (90-100): Auto-apply
 * - MEDIUM (60-89): Apply with warning
 * - LOW (<60): Manual review required
 */

import {
  TrustLevel,
  type TrustFactors,
  type TrustScoringConfig,
  type SmsTransaction
} from '@/types/sms-trust';
import type { EnhancedCompanyCard } from '@/types/enhanced-financial';

/**
 * Default trust scoring configuration
 */
export const DEFAULT_TRUST_CONFIG: TrustScoringConfig = {
  highThreshold: 90,
  mediumThreshold: 60,
  cardMatchWeight: 30,
  amountValidWeight: 20,
  dateValidWeight: 15,
  merchantValidWeight: 15,
  balanceValidWeight: 10,
  currencyValidWeight: 5,
  noConflictsWeight: 5,
  autoApplyThreshold: 90,
  requireReviewThreshold: 60
};

/**
 * Trust Scorer Class
 */
export class TrustScorer {
  private config: TrustScoringConfig;

  constructor(config: Partial<TrustScoringConfig> = {}) {
    this.config = { ...DEFAULT_TRUST_CONFIG, ...config };
  }

  /**
   * Calculate trust score for a parsed SMS transaction
   */
  calculateTrustScore(
    parsedData: SmsTransaction['parsedData'],
    cards: EnhancedCompanyCard[]
  ): {
    confidenceScore: number;
    trustLevel: TrustLevel;
    trustFactors: TrustFactors;
    requiresReview: boolean;
    linkedCardId?: string;
  } {
    const factors: TrustFactors = {
      cardMatch: this.scoreCardMatch(parsedData, cards),
      amountValid: this.scoreAmountValid(parsedData),
      dateValid: this.scoreDateValid(parsedData),
      merchantValid: this.scoreMerchantValid(parsedData),
      balanceValid: this.scoreBalanceValid(parsedData, cards),
      currencyValid: this.scoreCurrencyValid(parsedData),
      noConflicts: this.scoreNoConflicts(parsedData)
    };

    // Calculate total confidence score
    const confidenceScore = Math.round(
      factors.cardMatch +
      factors.amountValid +
      factors.dateValid +
      factors.merchantValid +
      factors.balanceValid +
      factors.currencyValid +
      factors.noConflicts
    );

    // Determine trust level
    let trustLevel: TrustLevel;
    if (confidenceScore >= this.config.highThreshold) {
      trustLevel = TrustLevel.HIGH;
    } else if (confidenceScore >= this.config.mediumThreshold) {
      trustLevel = TrustLevel.MEDIUM;
    } else {
      trustLevel = TrustLevel.LOW;
    }

    // Determine if manual review is required
    const requiresReview = confidenceScore < this.config.requireReviewThreshold;

    // Find linked card if card match is high
    let linkedCardId: string | undefined;
    if (factors.cardMatch >= this.config.cardMatchWeight * 0.8 && parsedData.cardLast4) {
      const matchedCard = cards.find(c => c.lastFourDigits === parsedData.cardLast4);
      linkedCardId = matchedCard?.id;
    }

    return {
      confidenceScore,
      trustLevel,
      trustFactors: factors,
      requiresReview,
      linkedCardId
    };
  }

  /**
   * Score card match (0-30 points)
   */
  private scoreCardMatch(
    parsedData: SmsTransaction['parsedData'],
    cards: EnhancedCompanyCard[]
  ): number {
    if (!parsedData.cardLast4) {
      return 0; // No card number extracted
    }

    // Exact match with known card
    const matchedCard = cards.find(c => c.lastFourDigits === parsedData.cardLast4);
    if (matchedCard) {
      return this.config.cardMatchWeight; // Full points
    }

    // Card number extracted but no match
    return this.config.cardMatchWeight * 0.3; // 30% of points for extraction
  }

  /**
   * Score amount validity (0-20 points)
   */
  private scoreAmountValid(parsedData: SmsTransaction['parsedData']): number {
    if (parsedData.amount === undefined || parsedData.amount === null) {
      return 0; // No amount extracted
    }

    const amount = Math.abs(parsedData.amount);

    // Check if amount is reasonable (not too large, not zero)
    if (amount === 0) {
      return 0;
    }

    if (amount > 1000000) {
      // Unusually large transaction
      return this.config.amountValidWeight * 0.3;
    }

    if (amount < 0.01) {
      // Unusually small transaction
      return this.config.amountValidWeight * 0.5;
    }

    // Amount is reasonable
    return this.config.amountValidWeight;
  }

  /**
   * Score date validity (0-15 points)
   */
  private scoreDateValid(parsedData: SmsTransaction['parsedData']): number {
    if (!parsedData.transactionDate) {
      // No date extracted, use today's date assumption
      return this.config.dateValidWeight * 0.5;
    }

    const transactionDate = new Date(parsedData.transactionDate);
    const now = new Date();

    // Check if date is in the future
    if (transactionDate > now) {
      return this.config.dateValidWeight * 0.2; // Future dates are suspicious
    }

    // Check if date is too old (>30 days)
    const daysDiff = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 30) {
      return this.config.dateValidWeight * 0.4; // Old transactions less reliable
    }

    // Check if date is very recent (<24 hours)
    if (daysDiff < 1) {
      return this.config.dateValidWeight; // Recent transactions most reliable
    }

    // Date is reasonable (1-30 days old)
    return this.config.dateValidWeight * 0.8;
  }

  /**
   * Score merchant validity (0-15 points)
   */
  private scoreMerchantValid(parsedData: SmsTransaction['parsedData']): number {
    if (!parsedData.merchant) {
      return 0; // No merchant extracted
    }

    const merchant = parsedData.merchant.trim();

    if (merchant.length === 0) {
      return 0;
    }

    // Check merchant name quality
    if (merchant.length < 3) {
      return this.config.merchantValidWeight * 0.3; // Too short
    }

    // Check for common merchant patterns
    const hasCommonWords = /\b(PURCHASE|PAYMENT|ATM|POS|ONLINE|STORE)\b/i.test(merchant);
    if (hasCommonWords) {
      return this.config.merchantValidWeight * 0.7; // Generic merchant info
    }

    // Good merchant name extracted
    return this.config.merchantValidWeight;
  }

  /**
   * Score balance validity (0-10 points)
   */
  private scoreBalanceValid(
    parsedData: SmsTransaction['parsedData'],
    cards: EnhancedCompanyCard[]
  ): number {
    if (parsedData.balance === undefined || parsedData.balance === null) {
      return this.config.balanceValidWeight * 0.5; // No balance info
    }

    if (!parsedData.cardLast4 || !parsedData.amount) {
      return this.config.balanceValidWeight * 0.3; // Can't verify without card/amount
    }

    // Find matching card
    const matchedCard = cards.find(c => c.lastFourDigits === parsedData.cardLast4);
    if (!matchedCard) {
      return this.config.balanceValidWeight * 0.5; // Can't verify without card
    }

    // Calculate expected balance
    const currentBalance = matchedCard.availableBalance;
    const transactionAmount = parsedData.amount;
    const expectedBalance = currentBalance - transactionAmount;

    // Check if reported balance matches expected
    const balanceDiff = Math.abs(parsedData.balance - expectedBalance);
    const tolerance = Math.max(Math.abs(transactionAmount) * 0.01, 1); // 1% tolerance or $1

    if (balanceDiff <= tolerance) {
      return this.config.balanceValidWeight; // Balance matches
    }

    // Balance doesn't match (could be due to other pending transactions)
    return this.config.balanceValidWeight * 0.3;
  }

  /**
   * Score currency validity (0-5 points)
   */
  private scoreCurrencyValid(parsedData: SmsTransaction['parsedData']): number {
    if (!parsedData.currency) {
      return this.config.currencyValidWeight * 0.7; // No currency, assume local
    }

    const currency = parsedData.currency.toUpperCase();

    // Check if valid ISO 4217 currency code (simplified check)
    const validCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'SGD'];
    if (validCurrencies.includes(currency)) {
      return this.config.currencyValidWeight;
    }

    // Currency code extracted but not in common list
    return this.config.currencyValidWeight * 0.5;
  }

  /**
   * Score absence of conflicts (0-5 points)
   */
  private scoreNoConflicts(parsedData: SmsTransaction['parsedData']): number {
    const conflicts: string[] = [];

    // Check for conflicting transaction types
    if (parsedData.transactionType === 'UNKNOWN') {
      conflicts.push('Unknown transaction type');
    }

    // Check for negative amounts with credit type
    if (parsedData.amount && parsedData.amount < 0 && parsedData.transactionType === 'CREDIT') {
      conflicts.push('Negative credit amount');
    }

    // Check for positive amounts with debit type
    if (parsedData.amount && parsedData.amount > 0 && parsedData.transactionType === 'DEBIT') {
      conflicts.push('Positive debit amount');
    }

    // Check for missing critical fields
    const criticalFields = [parsedData.amount, parsedData.cardLast4];
    const missingCritical = criticalFields.filter(f => f === undefined || f === null).length;

    if (missingCritical > 0) {
      conflicts.push(`Missing ${missingCritical} critical fields`);
    }

    // Calculate score based on conflicts
    if (conflicts.length === 0) {
      return this.config.noConflictsWeight;
    }

    if (conflicts.length === 1) {
      return this.config.noConflictsWeight * 0.5;
    }

    // Multiple conflicts
    return 0;
  }

  /**
   * Get suggested action based on trust level
   */
  getSuggestedAction(trustLevel: TrustLevel): 'APPROVE' | 'REJECT' | 'NEEDS_INFO' {
    switch (trustLevel) {
      case TrustLevel.HIGH:
        return 'APPROVE';
      case TrustLevel.MEDIUM:
        return 'APPROVE'; // With warning
      case TrustLevel.LOW:
        return 'NEEDS_INFO';
    }
  }

  /**
   * Generate suggestions for manual review
   */
  generateSuggestions(
    parsedData: SmsTransaction['parsedData'],
    trustFactors: TrustFactors,
    cards: EnhancedCompanyCard[]
  ): string[] {
    const suggestions: string[] = [];

    // Card match suggestions
    if (trustFactors.cardMatch < this.config.cardMatchWeight * 0.5) {
      if (!parsedData.cardLast4) {
        suggestions.push('No card number detected. Verify which card was used.');
      } else {
        suggestions.push(`Card ${parsedData.cardLast4} not found in your cards. Is this a new card?`);
      }
    }

    // Amount suggestions
    if (trustFactors.amountValid < this.config.amountValidWeight * 0.5) {
      if (!parsedData.amount) {
        suggestions.push('Transaction amount not detected. Check the SMS message.');
      } else if (Math.abs(parsedData.amount) > 10000) {
        suggestions.push(`Large amount: ${parsedData.amount}. Verify this is correct.`);
      }
    }

    // Date suggestions
    if (trustFactors.dateValid < this.config.dateValidWeight * 0.5) {
      suggestions.push('Transaction date unclear. Confirm when this transaction occurred.');
    }

    // Merchant suggestions
    if (trustFactors.merchantValid < this.config.merchantValidWeight * 0.5) {
      suggestions.push('Merchant name not detected. Where did this transaction occur?');
    }

    // Balance suggestions
    if (trustFactors.balanceValid < this.config.balanceValidWeight * 0.5) {
      suggestions.push('Balance mismatch detected. Other transactions may have occurred.');
    }

    // General suggestion if no specific issues
    if (suggestions.length === 0) {
      suggestions.push('Review the transaction details and confirm accuracy.');
    }

    return suggestions;
  }
}

/**
 * Global trust scorer instance
 */
let globalScorer: TrustScorer | null = null;

/**
 * Get or create global trust scorer instance
 */
export function getTrustScorer(config?: Partial<TrustScoringConfig>): TrustScorer {
  if (!globalScorer || config) {
    globalScorer = new TrustScorer(config);
  }
  return globalScorer;
}
