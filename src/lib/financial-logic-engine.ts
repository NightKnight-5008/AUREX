/**
 * Financial Logic Normalization Engine
 *
 * Centralizes all financial calculations with normalized definitions independent of SMS wording.
 * Handles edge cases like partial payments, out-of-order SMS, refunds, and currency normalization.
 */

import type {
  EnhancedCompanyCard,
  CardStatus,
  FieldMetadata,
  FieldChangeRecord,
  DataSourceType,
  ConfidenceScore,
} from '@/types/enhanced-financial';
import type { CompanyCard, SmsEvent } from '@/types/financial';

export class FinancialLogicEngine {
  /**
   * Calculate outstanding debt from credit limit and available balance
   */
  static calculateOutstandingDebt(creditLimit: number, availableBalance: number): number {
    const debt = creditLimit - availableBalance;
    return Math.max(0, debt); // Debt cannot be negative
  }

  /**
   * Calculate utilization percentage
   */
  static calculateUtilization(outstandingDebt: number, creditLimit: number): number {
    if (creditLimit === 0) return 0;
    const utilization = (outstandingDebt / creditLimit) * 100;
    return Math.min(100, Math.max(0, utilization)); // Clamp between 0-100
  }

  /**
   * Calculate days until due date
   */
  static calculateDaysUntilDue(dueDate: Date | null): number | null {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate data freshness in hours
   */
  static calculateDataFreshness(lastUpdate: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60)); // Convert to hours
  }

  /**
   * Determine card status based on financial state
   */
  static determineCardStatus(
    outstandingDebt: number,
    creditLimit: number,
    minimumPayment: number,
    dueDate: Date | null,
    lastPaymentAmount: number | undefined,
    paymentsThisCycle: number
  ): { status: CardStatus; reason: string } {
    const daysUntilDue = this.calculateDaysUntilDue(dueDate);

    // Check if over limit
    if (outstandingDebt > creditLimit) {
      return {
        status: 'over_limit',
        reason: `Outstanding debt (${outstandingDebt.toFixed(2)}) exceeds credit limit (${creditLimit.toFixed(2)})`,
      };
    }

    // Check if fully paid
    if (outstandingDebt === 0 || outstandingDebt < 0.01) {
      return {
        status: 'paid',
        reason: 'No outstanding debt. Card is fully settled.',
      };
    }

    // Check if overdue (past due date with no grace period)
    if (daysUntilDue !== null && daysUntilDue < -3) {
      // 3 days grace period
      return {
        status: 'overdue',
        reason: `Payment is ${Math.abs(daysUntilDue)} days overdue`,
      };
    }

    // Check if in grace period
    if (daysUntilDue !== null && daysUntilDue < 0 && daysUntilDue >= -3) {
      return {
        status: 'grace_period',
        reason: `Within ${Math.abs(daysUntilDue)}-day grace period after due date`,
      };
    }

    // Check payment status relative to minimum payment
    if (lastPaymentAmount !== undefined && paymentsThisCycle > 0) {
      if (lastPaymentAmount >= outstandingDebt) {
        return {
          status: 'paid',
          reason: `Full payment of ${lastPaymentAmount.toFixed(2)} received`,
        };
      } else if (lastPaymentAmount >= minimumPayment) {
        return {
          status: 'minimum_paid',
          reason: `Minimum payment of ${minimumPayment.toFixed(2)} met. Remaining balance: ${outstandingDebt.toFixed(2)}`,
        };
      } else if (lastPaymentAmount > 0) {
        return {
          status: 'partially_paid',
          reason: `Partial payment of ${lastPaymentAmount.toFixed(2)} received. Still below minimum payment of ${minimumPayment.toFixed(2)}`,
        };
      }
    }

    // Default to unpaid if debt exists
    return {
      status: 'unpaid',
      reason: `Outstanding debt: ${outstandingDebt.toFixed(2)}. Minimum payment: ${minimumPayment.toFixed(2)}`,
    };
  }

  /**
   * Validate financial state for impossible conditions
   */
  static validateFinancialState(card: {
    creditLimit: number;
    availableBalance: number;
    outstandingDebt: number;
    minimumPayment: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for negative values
    if (card.creditLimit < 0) {
      errors.push('Credit limit cannot be negative');
    }
    if (card.availableBalance < 0) {
      errors.push('Available balance cannot be negative');
    }
    if (card.outstandingDebt < 0) {
      errors.push('Outstanding debt cannot be negative');
    }
    if (card.minimumPayment < 0) {
      errors.push('Minimum payment cannot be negative');
    }

    // Check for impossible balance states
    if (card.availableBalance > card.creditLimit) {
      errors.push(
        `Available balance (${card.availableBalance}) cannot exceed credit limit (${card.creditLimit})`
      );
    }

    // Check debt calculation consistency
    const calculatedDebt = this.calculateOutstandingDebt(card.creditLimit, card.availableBalance);
    if (Math.abs(calculatedDebt - card.outstandingDebt) > 0.01) {
      errors.push(
        `Outstanding debt (${card.outstandingDebt}) inconsistent with credit limit and available balance (calculated: ${calculatedDebt})`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Resolve conflicting data from multiple SMS messages
   */
  static resolveConflict(
    values: Array<{
      value: any;
      timestamp: Date;
      confidence: ConfidenceScore;
      source: DataSourceType;
      isPaymentConfirmation: boolean;
    }>
  ): any {
    // Priority 1: Most recent timestamp
    values.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Priority 2: Payment confirmations over inferred values
    const paymentConfirmations = values.filter((v) => v.isPaymentConfirmation);
    if (paymentConfirmations.length > 0) {
      return paymentConfirmations[0].value;
    }

    // Priority 3: Highest confidence score
    const byConfidence = [...values].sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });

    return byConfidence[0].value;
  }

  /**
   * Create field metadata
   */
  static createFieldMetadata(
    sourceType: DataSourceType,
    confidenceScore: ConfidenceScore,
    timestamp: Date = new Date()
  ): FieldMetadata {
    return {
      fieldName: '',
      sourceType,
      confidenceScore,
      lastConfirmedTimestamp: timestamp,
      estimatedValue: sourceType === 'inferred' || sourceType === 'calculated',
    };
  }

  /**
   * Record field change
   */
  static recordFieldChange(
    fieldName: string,
    oldValue: any,
    newValue: any,
    source: DataSourceType,
    triggeredBy: string,
    reason?: string
  ): FieldChangeRecord {
    return {
      fieldName,
      oldValue,
      newValue,
      changeTimestamp: new Date(),
      changeSource: source,
      triggeredBy,
      reason,
    };
  }

  /**
   * Convert basic CompanyCard to EnhancedCompanyCard
   */
  static enhanceCard(card: CompanyCard): EnhancedCompanyCard {
    const now = new Date();
    const outstandingDebt = card.outstandingDebt ?? this.calculateOutstandingDebt(card.creditLimit, card.availableBalance);
    const utilizationPercentage = this.calculateUtilization(outstandingDebt, card.creditLimit);
    const daysUntilDue = this.calculateDaysUntilDue(card.dueDate);
    const isOverLimit = outstandingDebt > card.creditLimit;

    const { status, reason } = this.determineCardStatus(
      outstandingDebt,
      card.creditLimit,
      card.minimumPayment,
      card.dueDate,
      undefined,
      0
    );

    return {
      ...card,
      status,
      statusReason: reason,
      statusLastUpdated: now,
      outstandingDebt,
      metadata: {
        creditLimit: this.createFieldMetadata('manual', 'high', now),
        availableBalance: this.createFieldMetadata('manual', 'medium', now),
        outstandingDebt: this.createFieldMetadata('calculated', 'high', now),
        minimumPayment: this.createFieldMetadata('manual', 'medium', now),
        dueDate: this.createFieldMetadata('manual', 'high', now),
      },
      changeHistory: [],
      lastDataUpdate: now,
      dataFreshnessHours: 0,
      utilizationPercentage,
      daysUntilDue,
      isOverLimit,
      paymentsThisCycle: 0,
    };
  }

  /**
   * Normalize currency value (remove formatting, convert to number)
   */
  static normalizeCurrency(value: string | number): number {
    if (typeof value === 'number') return value;

    // Remove currency symbols, commas, and whitespace
    const cleaned = value
      .replace(/[Rs\.EGP\$€£,\s]/g, '')
      .trim();

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Handle refund and reversal logic
   */
  static applyRefund(
    currentDebt: number,
    refundAmount: number,
    creditLimit: number
  ): {
    newDebt: number;
    newAvailableBalance: number;
  } {
    const newDebt = Math.max(0, currentDebt - refundAmount);
    const newAvailableBalance = creditLimit - newDebt;

    return {
      newDebt,
      newAvailableBalance,
    };
  }

  /**
   * Calculate minimum payment (typically 5% of outstanding debt or a fixed minimum)
   */
  static calculateMinimumPayment(outstandingDebt: number, fixedMinimum: number = 100): number {
    const percentageBased = outstandingDebt * 0.05; // 5% of debt
    return Math.max(percentageBased, fixedMinimum);
  }
}
