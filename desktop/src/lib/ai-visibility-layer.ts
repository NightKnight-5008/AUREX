/**
 * AUREX Desktop - AI Modes Visibility Layer
 *
 * User-facing abstraction layer that hides technical implementation details
 *
 * DESIGN PRINCIPLE:
 * Users should NEVER see:
 * - SMS trust scores
 * - Ledger entries (raw)
 * - FX snapshots (raw)
 * - Encryption metadata
 * - Database internals
 * - Technical error messages
 *
 * Users SHOULD see:
 * - Clean balances ("You have $5,234.56")
 * - Trends ("Up 12% this month")
 * - Insights ("Your spending on groceries increased")
 * - Narratives ("Based on your transactions...")
 * - Simple actions ("Add transaction", "View report")
 *
 * SECURITY NOTE:
 * This layer also prevents accidental exposure of sensitive internal state
 */

/**
 * Transaction summary (user-facing)
 */
export interface TransactionSummary {
  // User-friendly fields
  date: string;              // "Jan 15, 2026"
  description: string;       // "Grocery shopping at Whole Foods"
  amount: string;            // "$45.67" or "-$45.67"
  category: string;          // "Groceries"
  balance: string;           // "$5,234.56"

  // Hidden: trust score, ledger entry ID, FX rate, encryption metadata
}

/**
 * Account balance (user-facing)
 */
export interface AccountBalance {
  currency: string;          // "USD"
  amount: string;            // "$5,234.56"
  trend: 'UP' | 'DOWN' | 'STABLE';
  changePercent: string;     // "+12.5%"
  changeAmount: string;      // "+$652.00"
  period: string;            // "this month"

  // Hidden: FX snapshot IDs, recalculation logic, ledger totals
}

/**
 * AI Insight (user-facing)
 */
export interface AIInsight {
  type: 'TREND' | 'ANOMALY' | 'SUGGESTION' | 'FORECAST';
  title: string;             // "Spending Trend Detected"
  message: string;           // "Your grocery spending increased by 23% this month"
  severity: 'INFO' | 'WARNING' | 'SUCCESS';
  actionLabel?: string;      // "View Details"
  actionUrl?: string;        // "/reports/groceries"

  // Hidden: confidence scores, model outputs, raw data
}

/**
 * Financial Report (user-facing)
 */
export interface FinancialReport {
  title: string;             // "Monthly Summary - January 2026"
  period: string;            // "Jan 1 - Jan 31, 2026"
  currency: string;          // "USD"

  income: string;            // "$8,500.00"
  expenses: string;          // "$6,234.00"
  netIncome: string;         // "+$2,266.00"
  savingsRate: string;       // "26.7%"

  topCategories: Array<{
    name: string;            // "Groceries"
    amount: string;          // "$1,234.00"
    percent: string;         // "19.8%"
  }>;

  insights: AIInsight[];

  // Hidden: ledger entry queries, FX conversions, trust filtering
}

/**
 * Visibility Layer - transforms internal data to user-facing format
 */
export class AIVisibilityLayer {
  /**
   * Transform ledger entries to transaction summaries
   */
  static transformTransactions(
    ledgerEntries: any[]
  ): TransactionSummary[] {
    return ledgerEntries.map(entry => {
      // Extract only user-relevant fields
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      const amount = this.formatCurrency(entry.amount, entry.currency);
      const balance = this.formatCurrency(entry.balance, entry.currency);

      return {
        date,
        description: entry.description || 'Transaction',
        amount: entry.type === 'DEBIT' ? `-${amount}` : amount,
        category: entry.category || 'Uncategorized',
        balance
      };
    });
  }

  /**
   * Calculate account balance with trend
   */
  static calculateBalance(
    ledgerEntries: any[],
    currency: string = 'USD'
  ): AccountBalance {
    if (ledgerEntries.length === 0) {
      return {
        currency,
        amount: '$0.00',
        trend: 'STABLE',
        changePercent: '0%',
        changeAmount: '$0.00',
        period: 'this month'
      };
    }

    // Get current balance (from latest entry)
    const currentBalance = ledgerEntries[ledgerEntries.length - 1]?.balance || 0;

    // Calculate balance 30 days ago
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const oldEntries = ledgerEntries.filter(e => e.timestamp < thirtyDaysAgo);
    const oldBalance = oldEntries.length > 0
      ? oldEntries[oldEntries.length - 1].balance
      : 0;

    // Calculate change
    const changeAmount = currentBalance - oldBalance;
    const changePercent = oldBalance !== 0
      ? ((changeAmount / oldBalance) * 100).toFixed(1)
      : '0';

    const trend: 'UP' | 'DOWN' | 'STABLE' =
      changeAmount > 0 ? 'UP' :
      changeAmount < 0 ? 'DOWN' :
      'STABLE';

    return {
      currency,
      amount: this.formatCurrency(currentBalance, currency),
      trend,
      changePercent: `${changeAmount >= 0 ? '+' : ''}${changePercent}%`,
      changeAmount: `${changeAmount >= 0 ? '+' : ''}${this.formatCurrency(changeAmount, currency)}`,
      period: 'this month'
    };
  }

  /**
   * Generate AI insights from transaction data
   */
  static generateInsights(
    ledgerEntries: any[],
    aiCache?: any[]
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    // If AI cache exists, use it (hiding confidence scores)
    if (aiCache && aiCache.length > 0) {
      for (const cached of aiCache) {
        if (cached.type === 'trend' && cached.confidence > 0.7) {
          insights.push({
            type: 'TREND',
            title: 'Spending Trend Detected',
            message: cached.insight || 'Your spending patterns have changed',
            severity: 'INFO'
          });
        }
      }
    }

    // Generate simple insights from transaction data
    const recentEntries = ledgerEntries.slice(-30); // Last 30 transactions

    // Anomaly detection (hidden: trust scores)
    const highAmountEntries = recentEntries.filter(e => Math.abs(e.amount) > 1000);
    if (highAmountEntries.length > 0) {
      insights.push({
        type: 'ANOMALY',
        title: 'Large Transaction Detected',
        message: `You had ${highAmountEntries.length} transaction${highAmountEntries.length > 1 ? 's' : ''} over $1,000 recently`,
        severity: 'WARNING'
      });
    }

    // Savings suggestion
    const totalSpent = recentEntries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    if (totalSpent > 0) {
      insights.push({
        type: 'SUGGESTION',
        title: 'Track Your Spending',
        message: `You spent ${this.formatCurrency(totalSpent, 'USD')} in recent transactions`,
        severity: 'INFO',
        actionLabel: 'View Report',
        actionUrl: '/reports'
      });
    }

    return insights;
  }

  /**
   * Generate financial report
   */
  static generateReport(
    ledgerEntries: any[],
    startDate: Date,
    endDate: Date
  ): FinancialReport {
    const periodStart = startDate.getTime();
    const periodEnd = endDate.getTime();

    // Filter entries in period
    const periodEntries = ledgerEntries.filter(
      e => e.timestamp >= periodStart && e.timestamp <= periodEnd
    );

    // Calculate totals
    const income = periodEntries
      .filter(e => e.type === 'CREDIT')
      .reduce((sum, e) => sum + e.amount, 0);

    const expenses = periodEntries
      .filter(e => e.type === 'DEBIT')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const netIncome = income - expenses;
    const savingsRate = income > 0
      ? ((netIncome / income) * 100).toFixed(1)
      : '0';

    // Group by category
    const categoryTotals: Record<string, number> = {};
    periodEntries
      .filter(e => e.type === 'DEBIT')
      .forEach(e => {
        const category = e.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + Math.abs(e.amount);
      });

    // Top categories
    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({
        name,
        amount: this.formatCurrency(amount, 'USD'),
        percent: `${((amount / expenses) * 100).toFixed(1)}%`
      }));

    // Generate insights for this period
    const insights = this.generateInsights(periodEntries);

    return {
      title: `Monthly Summary - ${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      period: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      currency: 'USD',
      income: this.formatCurrency(income, 'USD'),
      expenses: this.formatCurrency(expenses, 'USD'),
      netIncome: `${netIncome >= 0 ? '+' : ''}${this.formatCurrency(netIncome, 'USD')}`,
      savingsRate: `${savingsRate}%`,
      topCategories,
      insights
    };
  }

  /**
   * Format currency (hide raw numbers)
   */
  private static formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Sanitize error messages (hide technical details)
   */
  static sanitizeError(error: Error): string {
    // Never show raw error messages to users
    const errorMap: Record<string, string> = {
      'ECONNREFUSED': 'Unable to connect to the server. Please check your internet connection.',
      'ETIMEDOUT': 'The request timed out. Please try again.',
      'ENOTFOUND': 'Server not found. Please check your internet connection.',
      'Authentication failed': 'Invalid username or password.',
      'Token expired': 'Your session has expired. Please sign in again.',
      'Insufficient permissions': 'You don\'t have permission to perform this action.',
      'Database locked': 'The database is temporarily unavailable. Please try again.'
    };

    // Check for known error patterns
    for (const [pattern, message] of Object.entries(errorMap)) {
      if (error.message.includes(pattern)) {
        return message;
      }
    }

    // Generic friendly message
    return 'Something went wrong. Please try again or contact support if the problem persists.';
  }

  /**
   * Hide technical metadata from objects
   */
  static stripMetadata<T extends Record<string, any>>(obj: T): Partial<T> {
    const sanitized = { ...obj };

    // Remove technical fields
    const technicalFields = [
      'id',
      'created_at',
      'updated_at',
      'encrypted',
      'classification',
      'trust_score',
      'confidence',
      'ledger_entry_id',
      'fx_snapshot_id',
      'signature',
      'hash',
      '__v',
      '_id'
    ];

    for (const field of technicalFields) {
      delete sanitized[field];
    }

    return sanitized;
  }
}
