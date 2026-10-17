/**
 * AUREX FINANCIAL OPERATING SYSTEM - LEDGER INTEGRATION SERVICE
 *
 * Bridges existing transaction flows with the double-entry ledger system.
 *
 * INTEGRATION POINTS:
 * - SMS card transactions → ledger entries
 * - Manual card payments → ledger entries
 * - Payroll processing → ledger entries
 * - Card balance derivation from ledger
 *
 * ACCOUNT STRUCTURE:
 * Assets:
 *   1000-CASH - Cash/Bank account
 * Liabilities:
 *   2100-CARD-{last4} - Credit card accounts (one per card)
 * Expenses:
 *   5000-OPERATING-EXPENSE - General operating expenses
 *   5100-PAYROLL-EXPENSE - Payroll expenses
 *   5200-TAX-EXPENSE - Tax expenses
 */

import { Ledger, getLedger } from './Ledger';
import { AccountType, NormalBalance, TransactionSource, type Account } from '@/types/ledger';
import { TrustLevel, type SmsTransaction } from '@/types/sms-trust';
import type { EnhancedCompanyCard } from '@/types/enhanced-financial';

/**
 * Standard Chart of Accounts for AUREX
 */
export const STANDARD_ACCOUNTS = {
  // Assets
  CASH: '1000-CASH',

  // Liabilities (cards are created dynamically)
  CARD_PREFIX: '2100-CARD-',

  // Expenses
  OPERATING_EXPENSE: '5000-OPERATING-EXPENSE',
  PAYROLL_EXPENSE: '5100-PAYROLL-EXPENSE',
  TAX_EXPENSE: '5200-TAX-EXPENSE',
} as const;

/**
 * Ledger Integration Service
 */
export class LedgerIntegration {
  private ledger: Ledger;

  constructor(ledger?: Ledger) {
    this.ledger = ledger || getLedger();
  }

  /**
   * Initialize standard chart of accounts
   */
  initializeChartOfAccounts(): void {
    const now = new Date();
    const systemUser = 'system';

    // Cash account
    this.ledger.addAccount({
      id: STANDARD_ACCOUNTS.CASH,
      code: '1000',
      name: 'Cash',
      type: AccountType.ASSET,
      normalBalance: NormalBalance.DEBIT,
      currency: 'USD',
      description: 'Cash and bank accounts',
      active: true,
      createdAt: now,
      createdBy: systemUser
    });

    // Operating expense
    this.ledger.addAccount({
      id: STANDARD_ACCOUNTS.OPERATING_EXPENSE,
      code: '5000',
      name: 'Operating Expense',
      type: AccountType.EXPENSE,
      normalBalance: NormalBalance.DEBIT,
      currency: 'USD',
      description: 'General operating expenses',
      active: true,
      createdAt: now,
      createdBy: systemUser
    });

    // Payroll expense
    this.ledger.addAccount({
      id: STANDARD_ACCOUNTS.PAYROLL_EXPENSE,
      code: '5100',
      name: 'Payroll Expense',
      type: AccountType.EXPENSE,
      normalBalance: NormalBalance.DEBIT,
      currency: 'USD',
      description: 'Employee payroll expenses',
      active: true,
      createdAt: now,
      createdBy: systemUser
    });

    // Tax expense
    this.ledger.addAccount({
      id: STANDARD_ACCOUNTS.TAX_EXPENSE,
      code: '5200',
      name: 'Tax Expense',
      type: AccountType.EXPENSE,
      normalBalance: NormalBalance.DEBIT,
      currency: 'USD',
      description: 'Tax payments and obligations',
      active: true,
      createdAt: now,
      createdBy: systemUser
    });
  }

  /**
   * Create or get card liability account
   */
  getOrCreateCardAccount(card: EnhancedCompanyCard): Account {
    const accountId = `${STANDARD_ACCOUNTS.CARD_PREFIX}${card.lastFourDigits}`;

    let account = this.ledger.getAccount(accountId);
    if (!account) {
      const newAccount: Account = {
        id: accountId,
        code: `2100-${card.lastFourDigits}`,
        name: `${card.cardholderName} Card (${card.lastFourDigits})`,
        type: AccountType.LIABILITY,
        normalBalance: NormalBalance.CREDIT,
        currency: 'USD',
        description: `Credit card ending in ${card.lastFourDigits}`,
        active: true,
        createdAt: new Date(),
        createdBy: 'system'
      };

      this.ledger.addAccount(newAccount);
      account = newAccount;
    }

    return account;
  }

  /**
   * Process SMS card transaction (HIGH trust only)
   */
  processSmsCardTransaction(
    smsTransaction: SmsTransaction,
    card: EnhancedCompanyCard,
    createdBy: string
  ): { success: boolean; entryId?: string; errors?: string[] } {
    // Only process HIGH trust transactions automatically
    if (smsTransaction.trustLevel !== TrustLevel.HIGH) {
      return {
        success: false,
        errors: ['SMS transaction requires manual review (trust level not HIGH)']
      };
    }

    const { parsedData, confidenceScore } = smsTransaction;

    if (!parsedData.amount) {
      return {
        success: false,
        errors: ['Transaction amount not available']
      };
    }

    // Get or create card account
    const cardAccount = this.getOrCreateCardAccount(card);

    // Create ledger entry: Debit expense, Credit card liability
    const result = this.ledger.addEntry({
      amount: Math.abs(parsedData.amount),
      currency: parsedData.currency || 'USD',
      debitAccountId: STANDARD_ACCOUNTS.OPERATING_EXPENSE,
      creditAccountId: cardAccount.id,
      description: parsedData.merchant
        ? `Purchase at ${parsedData.merchant}`
        : 'Card purchase',
      source: TransactionSource.SMS,
      sourceRef: smsTransaction.id,
      confidenceScore,
      metadata: {
        smsMessageHash: smsTransaction.messageHash,
        trustLevel: smsTransaction.trustLevel,
        cardLast4: parsedData.cardLast4,
        transactionDate: parsedData.transactionDate,
        merchant: parsedData.merchant
      },
      createdBy
    });

    if (result.success && result.entry) {
      return {
        success: true,
        entryId: result.entry.id
      };
    }

    return {
      success: false,
      errors: result.errors?.map(e => e.message) || ['Unknown error']
    };
  }

  /**
   * Process manual card payment
   */
  processCardPayment(
    card: EnhancedCompanyCard,
    amount: number,
    description: string,
    createdBy: string
  ): { success: boolean; entryId?: string; errors?: string[] } {
    if (amount <= 0) {
      return {
        success: false,
        errors: ['Payment amount must be positive']
      };
    }

    // Get or create card account
    const cardAccount = this.getOrCreateCardAccount(card);

    // Create ledger entry: Debit card liability, Credit cash
    const result = this.ledger.addEntry({
      amount,
      currency: 'USD',
      debitAccountId: cardAccount.id, // Reduce liability
      creditAccountId: STANDARD_ACCOUNTS.CASH, // Reduce cash
      description: description || `Payment to ${card.cardholderName} card`,
      source: TransactionSource.CARD_PAYMENT,
      sourceRef: `PAYMENT-${Date.now()}`,
      metadata: {
        cardId: card.id,
        cardLast4: card.lastFourDigits
      },
      createdBy
    });

    if (result.success && result.entry) {
      return {
        success: true,
        entryId: result.entry.id
      };
    }

    return {
      success: false,
      errors: result.errors?.map(e => e.message) || ['Unknown error']
    };
  }

  /**
   * Process payroll transaction
   */
  processPayroll(
    totalAmount: number,
    description: string,
    createdBy: string,
    breakdown?: {
      grossPay: number;
      taxes: number;
      netPay: number;
    }
  ): { success: boolean; entryIds?: string[]; errors?: string[] } {
    if (totalAmount <= 0) {
      return {
        success: false,
        errors: ['Payroll amount must be positive']
      };
    }

    const entryIds: string[] = [];

    // If breakdown provided, create separate entries for payroll and taxes
    if (breakdown) {
      // Payroll expense entry
      const payrollResult = this.ledger.addEntry({
        amount: breakdown.grossPay,
        currency: 'USD',
        debitAccountId: STANDARD_ACCOUNTS.PAYROLL_EXPENSE,
        creditAccountId: STANDARD_ACCOUNTS.CASH,
        description: `${description} - Gross Pay`,
        source: TransactionSource.PAYROLL,
        sourceRef: `PAYROLL-${Date.now()}`,
        metadata: {
          grossPay: breakdown.grossPay,
          taxes: breakdown.taxes,
          netPay: breakdown.netPay
        },
        createdBy
      });

      if (!payrollResult.success) {
        return {
          success: false,
          errors: payrollResult.errors?.map(e => e.message) || ['Payroll entry failed']
        };
      }

      if (payrollResult.entry) {
        entryIds.push(payrollResult.entry.id);
      }

      // Tax expense entry (if taxes > 0)
      if (breakdown.taxes > 0) {
        const taxResult = this.ledger.addEntry({
          amount: breakdown.taxes,
          currency: 'USD',
          debitAccountId: STANDARD_ACCOUNTS.TAX_EXPENSE,
          creditAccountId: STANDARD_ACCOUNTS.CASH,
          description: `${description} - Taxes`,
          source: TransactionSource.TAX,
          sourceRef: `TAX-${Date.now()}`,
          metadata: {
            relatedPayrollEntry: payrollResult.entry?.id
          },
          createdBy
        });

        if (!taxResult.success) {
          return {
            success: false,
            errors: taxResult.errors?.map(e => e.message) || ['Tax entry failed']
          };
        }

        if (taxResult.entry) {
          entryIds.push(taxResult.entry.id);
        }
      }
    } else {
      // Simple payroll entry
      const result = this.ledger.addEntry({
        amount: totalAmount,
        currency: 'USD',
        debitAccountId: STANDARD_ACCOUNTS.PAYROLL_EXPENSE,
        creditAccountId: STANDARD_ACCOUNTS.CASH,
        description,
        source: TransactionSource.PAYROLL,
        sourceRef: `PAYROLL-${Date.now()}`,
        createdBy
      });

      if (!result.success) {
        return {
          success: false,
          errors: result.errors?.map(e => e.message) || ['Payroll entry failed']
        };
      }

      if (result.entry) {
        entryIds.push(result.entry.id);
      }
    }

    return {
      success: true,
      entryIds
    };
  }

  /**
   * Get card balance from ledger
   */
  getCardBalance(card: EnhancedCompanyCard): number {
    const accountId = `${STANDARD_ACCOUNTS.CARD_PREFIX}${card.lastFourDigits}`;
    const balance = this.ledger.getAccountBalance(accountId);

    return balance ? balance.balance : 0;
  }

  /**
   * Get cash balance from ledger
   */
  getCashBalance(): number {
    const balance = this.ledger.getAccountBalance(STANDARD_ACCOUNTS.CASH);
    return balance ? balance.balance : 0;
  }

  /**
   * Sync card balances from ledger
   */
  syncCardBalances(cards: EnhancedCompanyCard[]): Map<string, number> {
    const balances = new Map<string, number>();

    for (const card of cards) {
      const balance = this.getCardBalance(card);
      balances.set(card.id, balance);
    }

    return balances;
  }

  /**
   * Get expense summary by category
   */
  getExpenseSummary(startDate?: Date, endDate?: Date): {
    operating: number;
    payroll: number;
    tax: number;
    total: number;
  } {
    const operatingBalance = this.ledger.getAccountBalance(
      STANDARD_ACCOUNTS.OPERATING_EXPENSE,
      endDate
    );
    const payrollBalance = this.ledger.getAccountBalance(
      STANDARD_ACCOUNTS.PAYROLL_EXPENSE,
      endDate
    );
    const taxBalance = this.ledger.getAccountBalance(
      STANDARD_ACCOUNTS.TAX_EXPENSE,
      endDate
    );

    const operating = operatingBalance?.balance || 0;
    const payroll = payrollBalance?.balance || 0;
    const tax = taxBalance?.balance || 0;

    return {
      operating,
      payroll,
      tax,
      total: operating + payroll + tax
    };
  }

  /**
   * Get all card accounts
   */
  getAllCardAccounts(): Account[] {
    return this.ledger
      .getAllAccounts()
      .filter(account => account.id.startsWith(STANDARD_ACCOUNTS.CARD_PREFIX));
  }

  /**
   * Export ledger data for persistence
   */
  exportLedger(): ReturnType<Ledger['export']> {
    return this.ledger.export();
  }

  /**
   * Import ledger data from persistence
   */
  importLedger(data: Parameters<Ledger['import']>[0]): void {
    this.ledger.import(data);
  }
}

/**
 * Global ledger integration instance
 */
let globalIntegration: LedgerIntegration | null = null;

/**
 * Get or create global ledger integration instance
 */
export function getLedgerIntegration(): LedgerIntegration {
  if (!globalIntegration) {
    globalIntegration = new LedgerIntegration();
    // Initialize chart of accounts on first access
    globalIntegration.initializeChartOfAccounts();
  }
  return globalIntegration;
}
