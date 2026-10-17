/**
 * AUREX FINANCIAL OPERATING SYSTEM - DOUBLE-ENTRY LEDGER
 *
 * Core ledger implementation with double-entry accounting.
 *
 * GUARANTEES:
 * - All debits = all credits (enforced at write time)
 * - Entries are immutable (can only reverse, never delete)
 * - Balances always derived from entries
 * - Complete audit trail
 * - Currency consistency within transactions
 */

import {
  AccountType,
  NormalBalance,
  TransactionSource,
  type Account,
  type LedgerEntry,
  type Transaction,
  type AccountBalance,
  type LedgerValidationError,
  type LedgerStatistics
} from '@/types/ledger';

/**
 * Ledger Class
 */
export class Ledger {
  private entries: Map<string, LedgerEntry> = new Map();
  private accounts: Map<string, Account> = new Map();
  private entryCounter = 1;

  /**
   * Add a new ledger entry (double-entry)
   */
  addEntry(params: {
    amount: number;
    currency: string;
    debitAccountId: string;
    creditAccountId: string;
    description: string;
    source: TransactionSource;
    sourceRef: string;
    confidenceScore?: number;
    metadata?: Record<string, unknown>;
    createdBy: string;
  }): { success: boolean; entry?: LedgerEntry; errors?: LedgerValidationError[] } {
    // Validate
    const errors = this.validateEntry(params);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    // Get accounts
    const debitAccount = this.accounts.get(params.debitAccountId);
    const creditAccount = this.accounts.get(params.creditAccountId);

    if (!debitAccount || !creditAccount) {
      return {
        success: false,
        errors: [{
          type: 'INVALID_ACCOUNT',
          message: 'Debit or credit account not found'
        }]
      };
    }

    // Create entry
    const entry: LedgerEntry = {
      id: this.generateEntryId(),
      entryNumber: this.entryCounter++,
      timestamp: new Date(),
      amount: Math.abs(params.amount), // Always positive
      currency: params.currency,
      debitAccount,
      creditAccount,
      description: params.description,
      source: params.source,
      sourceRef: params.sourceRef,
      confidenceScore: params.confidenceScore,
      reversedBy: undefined,
      reversed: false,
      metadata: params.metadata || {},
      createdBy: params.createdBy,
      createdAt: new Date()
    };

    // Store entry
    this.entries.set(entry.id, entry);

    return { success: true, entry };
  }

  /**
   * Reverse an entry (creates offsetting entry)
   */
  reverseEntry(params: {
    entryId: string;
    reason: string;
    createdBy: string;
  }): { success: boolean; reversal?: LedgerEntry; errors?: LedgerValidationError[] } {
    const originalEntry = this.entries.get(params.entryId);

    if (!originalEntry) {
      return {
        success: false,
        errors: [{
          type: 'INVALID_ACCOUNT',
          message: 'Entry not found',
          entryId: params.entryId
        }]
      };
    }

    if (originalEntry.reversedBy) {
      return {
        success: false,
        errors: [{
          type: 'DUPLICATE_ENTRY',
          message: 'Entry already reversed',
          entryId: params.entryId
        }]
      };
    }

    // Create reversal entry (swap debit/credit)
    const reversal: LedgerEntry = {
      id: this.generateEntryId(),
      entryNumber: this.entryCounter++,
      timestamp: new Date(),
      amount: originalEntry.amount,
      currency: originalEntry.currency,
      debitAccount: originalEntry.creditAccount, // Swapped
      creditAccount: originalEntry.debitAccount, // Swapped
      description: `REVERSAL: ${params.reason}`,
      source: originalEntry.source,
      sourceRef: originalEntry.sourceRef,
      reversedBy: undefined,
      reversed: true,
      metadata: {
        ...originalEntry.metadata,
        reversalOf: originalEntry.id,
        reversalReason: params.reason
      },
      createdBy: params.createdBy,
      createdAt: new Date()
    };

    // Mark original as reversed
    originalEntry.reversedBy = reversal.id;

    // Store reversal
    this.entries.set(reversal.id, reversal);

    return { success: true, reversal };
  }

  /**
   * Calculate account balance
   */
  getAccountBalance(accountId: string, asOf?: Date): AccountBalance | null {
    const account = this.accounts.get(accountId);
    if (!account) {
      return null;
    }

    const cutoffDate = asOf || new Date();
    let balance = 0;
    let entryCount = 0;

    for (const entry of this.entries.values()) {
      // Skip if after cutoff date
      if (entry.timestamp > cutoffDate) {
        continue;
      }

      // Skip if reversed (unless we want to see historical balance)
      if (entry.reversedBy && !asOf) {
        continue;
      }

      // Check if this entry affects the account
      if (entry.debitAccount.id === accountId) {
        // Debit entry
        if (account.normalBalance === NormalBalance.DEBIT) {
          balance += entry.amount;
        } else {
          balance -= entry.amount;
        }
        entryCount++;
      }

      if (entry.creditAccount.id === accountId) {
        // Credit entry
        if (account.normalBalance === NormalBalance.CREDIT) {
          balance += entry.amount;
        } else {
          balance -= entry.amount;
        }
        entryCount++;
      }
    }

    return {
      account,
      balance,
      currency: account.currency,
      asOf: cutoffDate,
      entryCount
    };
  }

  /**
   * Get all balances for a specific account type
   */
  getBalancesByType(type: AccountType, asOf?: Date): AccountBalance[] {
    const balances: AccountBalance[] = [];

    for (const account of this.accounts.values()) {
      if (account.type === type) {
        const balance = this.getAccountBalance(account.id, asOf);
        if (balance) {
          balances.push(balance);
        }
      }
    }

    return balances;
  }

  /**
   * Get entries for an account
   */
  getEntriesForAccount(accountId: string, limit?: number): LedgerEntry[] {
    const entries: LedgerEntry[] = [];

    for (const entry of this.entries.values()) {
      if (entry.debitAccount.id === accountId || entry.creditAccount.id === accountId) {
        entries.push(entry);
      }
    }

    // Sort by entry number (descending)
    entries.sort((a, b) => b.entryNumber - a.entryNumber);

    return limit ? entries.slice(0, limit) : entries;
  }

  /**
   * Get ledger statistics
   */
  getStatistics(): LedgerStatistics {
    const bySource: Record<TransactionSource, number> = {
      [TransactionSource.SMS]: 0,
      [TransactionSource.MANUAL]: 0,
      [TransactionSource.IMPORT]: 0,
      [TransactionSource.PAYROLL]: 0,
      [TransactionSource.TAX]: 0,
      [TransactionSource.CARD_PAYMENT]: 0,
      [TransactionSource.RECURRING]: 0
    };

    const byAccountType: Record<AccountType, number> = {
      [AccountType.ASSET]: 0,
      [AccountType.LIABILITY]: 0,
      [AccountType.EQUITY]: 0,
      [AccountType.REVENUE]: 0,
      [AccountType.EXPENSE]: 0
    };

    const currencyMap = new Map<string, { entries: number; volume: number }>();
    let totalVolume = 0;
    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const entry of this.entries.values()) {
      // By source
      bySource[entry.source]++;

      // By account type
      byAccountType[entry.debitAccount.type]++;
      byAccountType[entry.creditAccount.type]++;

      // Currency
      const currencyData = currencyMap.get(entry.currency) || { entries: 0, volume: 0 };
      currencyData.entries++;
      currencyData.volume += entry.amount;
      currencyMap.set(entry.currency, currencyData);

      // Total volume
      totalVolume += entry.amount;

      // Date range
      if (!earliest || entry.timestamp < earliest) {
        earliest = entry.timestamp;
      }
      if (!latest || entry.timestamp > latest) {
        latest = entry.timestamp;
      }
    }

    return {
      totalEntries: this.entries.size,
      bySource,
      byAccountType,
      totalVolume,
      dateRange: {
        earliest: earliest || new Date(),
        latest: latest || new Date()
      },
      currencies: Array.from(currencyMap.entries()).map(([code, data]) => ({
        code,
        ...data
      }))
    };
  }

  /**
   * Validate entry before adding
   */
  private validateEntry(params: {
    amount: number;
    currency: string;
    debitAccountId: string;
    creditAccountId: string;
  }): LedgerValidationError[] {
    const errors: LedgerValidationError[] = [];

    // Amount must be positive
    if (params.amount <= 0) {
      errors.push({
        type: 'NEGATIVE_AMOUNT',
        message: 'Amount must be positive'
      });
    }

    // Accounts must be different
    if (params.debitAccountId === params.creditAccountId) {
      errors.push({
        type: 'INVALID_ACCOUNT',
        message: 'Debit and credit accounts must be different'
      });
    }

    // Accounts must exist
    const debitAccount = this.accounts.get(params.debitAccountId);
    const creditAccount = this.accounts.get(params.creditAccountId);

    if (!debitAccount) {
      errors.push({
        type: 'INVALID_ACCOUNT',
        message: `Debit account not found: ${params.debitAccountId}`
      });
    }

    if (!creditAccount) {
      errors.push({
        type: 'INVALID_ACCOUNT',
        message: `Credit account not found: ${params.creditAccountId}`
      });
    }

    // Currency must match (for same-currency transactions)
    if (debitAccount && creditAccount && debitAccount.currency !== creditAccount.currency) {
      errors.push({
        type: 'CURRENCY_MISMATCH',
        message: 'Debit and credit accounts must have same currency'
      });
    }

    return errors;
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `ENTRY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add account to chart of accounts
   */
  addAccount(account: Account): void {
    this.accounts.set(account.id, account);
  }

  /**
   * Get account by ID
   */
  getAccount(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Export ledger data (for persistence)
   */
  export(): {
    entries: LedgerEntry[];
    accounts: Account[];
    entryCounter: number;
  } {
    return {
      entries: Array.from(this.entries.values()),
      accounts: Array.from(this.accounts.values()),
      entryCounter: this.entryCounter
    };
  }

  /**
   * Import ledger data (from persistence)
   */
  import(data: {
    entries: LedgerEntry[];
    accounts: Account[];
    entryCounter: number;
  }): void {
    this.entries.clear();
    this.accounts.clear();

    for (const account of data.accounts) {
      this.accounts.set(account.id, account);
    }

    for (const entry of data.entries) {
      this.entries.set(entry.id, entry);
    }

    this.entryCounter = data.entryCounter;
  }
}

/**
 * Global ledger instance
 */
let globalLedger: Ledger | null = null;

/**
 * Get or create global ledger instance
 */
export function getLedger(): Ledger {
  if (!globalLedger) {
    globalLedger = new Ledger();
  }
  return globalLedger;
}
