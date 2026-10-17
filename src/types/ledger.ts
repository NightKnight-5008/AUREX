/**
 * AUREX FINANCIAL OPERATING SYSTEM - LEDGER TYPES
 *
 * Double-entry accounting ledger system.
 *
 * PRINCIPLES:
 * - Every transaction has equal debits and credits
 * - Entries are immutable (can only be reversed, never deleted)
 * - Balances are derived from entries, never stored
 * - All entries include audit trail (who, when, why)
 * - Source references link back to originating data (SMS, payroll, etc.)
 */

/**
 * Account types following standard chart of accounts
 */
export enum AccountType {
  ASSET = 'ASSET',           // Normal debit balance
  LIABILITY = 'LIABILITY',   // Normal credit balance
  EQUITY = 'EQUITY',         // Normal credit balance
  REVENUE = 'REVENUE',       // Normal credit balance
  EXPENSE = 'EXPENSE'        // Normal debit balance
}

/**
 * Normal balance side for account types
 */
export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

/**
 * Transaction source types
 */
export enum TransactionSource {
  SMS = 'SMS',               // SMS-derived transaction
  MANUAL = 'MANUAL',         // Manual entry
  IMPORT = 'IMPORT',         // CSV/file import
  PAYROLL = 'PAYROLL',       // Payroll processing
  TAX = 'TAX',              // Tax calculation
  CARD_PAYMENT = 'CARD_PAYMENT', // Card payment
  RECURRING = 'RECURRING'    // Recurring transaction
}

/**
 * Account in the chart of accounts
 */
export interface Account {
  /** Unique account ID */
  id: string;

  /** Account code (e.g., "1000-CASH", "2100-CARDS-VISA-1234") */
  code: string;

  /** Account name */
  name: string;

  /** Account type */
  type: AccountType;

  /** Normal balance side */
  normalBalance: NormalBalance;

  /** Currency code (ISO 4217) */
  currency: string;

  /** Parent account ID (for hierarchy) */
  parent?: string;

  /** Whether account is active */
  active: boolean;

  /** Account description */
  description?: string;

  /** Created timestamp */
  createdAt: Date;

  /** Created by (user ID) */
  createdBy: string;
}

/**
 * Ledger entry (immutable)
 */
export interface LedgerEntry {
  /** Unique entry ID */
  id: string;

  /** Auto-increment entry number */
  entryNumber: number;

  /** Entry timestamp */
  timestamp: Date;

  /** Transaction amount (always positive) */
  amount: number;

  /** Currency code */
  currency: string;

  /** Debit account */
  debitAccount: Account;

  /** Credit account */
  creditAccount: Account;

  /** Entry description */
  description: string;

  /** Transaction source */
  source: TransactionSource;

  /** Source reference ID (SMS ID, payroll batch ID, etc.) */
  sourceRef: string;

  /** Confidence score (for SMS-derived entries) */
  confidenceScore?: number;

  /** Entry reversed by another entry */
  reversedBy?: string;

  /** Is this entry a reversal */
  reversed: boolean;

  /** Additional metadata */
  metadata: Record<string, unknown>;

  /** Created by (user ID) */
  createdBy: string;

  /** Created timestamp */
  createdAt: Date;
}

/**
 * Transaction (wraps one or more ledger entries)
 */
export interface Transaction {
  /** Unique transaction ID */
  id: string;

  /** Transaction date */
  date: Date;

  /** Transaction description */
  description: string;

  /** Ledger entries */
  entries: LedgerEntry[];

  /** Total amount (sum of all entries) */
  totalAmount: number;

  /** Transaction source */
  source: TransactionSource;

  /** Source reference */
  sourceRef: string;

  /** Transaction status */
  status: 'PENDING' | 'POSTED' | 'REVERSED' | 'FAILED';

  /** Created by */
  createdBy: string;

  /** Created at */
  createdAt: Date;

  /** Posted at */
  postedAt?: Date;
}

/**
 * Account balance (derived from ledger)
 */
export interface AccountBalance {
  /** Account */
  account: Account;

  /** Balance amount */
  balance: number;

  /** Currency */
  currency: string;

  /** Last updated */
  asOf: Date;

  /** Number of entries contributing to balance */
  entryCount: number;
}

/**
 * Chart of Accounts
 */
export interface ChartOfAccounts {
  /** All accounts */
  accounts: Account[];

  /** Root accounts (no parent) */
  rootAccounts: Account[];

  /** Get account by ID */
  getAccount(id: string): Account | undefined;

  /** Get account by code */
  getAccountByCode(code: string): Account | undefined;

  /** Get child accounts */
  getChildAccounts(parentId: string): Account[];

  /** Get accounts by type */
  getAccountsByType(type: AccountType): Account[];
}

/**
 * Ledger validation error
 */
export interface LedgerValidationError {
  /** Error type */
  type: 'UNBALANCED' | 'INVALID_ACCOUNT' | 'NEGATIVE_AMOUNT' | 'CURRENCY_MISMATCH' | 'DUPLICATE_ENTRY';

  /** Error message */
  message: string;

  /** Related entry ID */
  entryId?: string;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Ledger statistics
 */
export interface LedgerStatistics {
  /** Total entries */
  totalEntries: number;

  /** Entries by source */
  bySource: Record<TransactionSource, number>;

  /** Entries by account type */
  byAccountType: Record<AccountType, number>;

  /** Total transaction volume */
  totalVolume: number;

  /** Date range */
  dateRange: {
    earliest: Date;
    latest: Date;
  };

  /** Currency breakdown */
  currencies: {
    code: string;
    entries: number;
    volume: number;
  }[];
}

/**
 * Standard chart of accounts codes
 */
export const STANDARD_ACCOUNT_CODES = {
  // Assets (1000-1999)
  CASH: '1000-CASH',
  BANK_ACCOUNTS: '1100-BANK',
  ACCOUNTS_RECEIVABLE: '1200-AR',
  PREPAID_EXPENSES: '1300-PREPAID',

  // Liabilities (2000-2999)
  ACCOUNTS_PAYABLE: '2000-AP',
  CREDIT_CARDS: '2100-CARDS',
  ACCRUED_EXPENSES: '2200-ACCRUED',
  TAXES_PAYABLE: '2300-TAX-PAYABLE',

  // Equity (3000-3999)
  OWNERS_EQUITY: '3000-EQUITY',
  RETAINED_EARNINGS: '3100-RETAINED',

  // Revenue (4000-4999)
  OPERATING_REVENUE: '4000-REVENUE',
  OTHER_INCOME: '4900-OTHER-INCOME',

  // Expenses (5000-5999)
  OPERATING_EXPENSES: '5000-OPERATING',
  PAYROLL_EXPENSES: '5100-PAYROLL',
  TAX_EXPENSES: '5200-TAX',
  INTEREST_EXPENSES: '5300-INTEREST',
  DEPRECIATION: '5400-DEPRECIATION'
} as const;
