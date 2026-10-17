/**
 * AUREX FINANCIAL OPERATING SYSTEM - ANALYST MODE
 *
 * Deterministic financial analysis based purely on ledger data.
 * NO AI, NO LLM - Only hard data and calculations.
 *
 * GUARANTEES:
 * - 100% deterministic results
 * - Source data always available
 * - Reproducible calculations
 * - No probabilistic inference
 *
 * CAPABILITIES:
 * - Account balances
 * - Expense/revenue breakdowns
 * - Cash flow analysis
 * - Period comparisons
 * - Trend calculations
 */

import { getLedger } from '@/lib/ledger/Ledger';
import { AccountType } from '@/types/ledger';
import {
  AIMode,
  DataSource,
  type AnalystInsight
} from '@/types/ai-modes';

/**
 * Analyst Mode Service
 */
export class AnalystMode {
  /**
   * Get account balance analysis
   */
  getBalanceAnalysis(params: {
    accountId: string;
    asOf?: Date;
    generatedBy: string;
  }): AnalystInsight {
    const ledger = getLedger();
    const balance = ledger.getAccountBalance(params.accountId, params.asOf);

    if (!balance) {
      throw new Error(`Account not found: ${params.accountId}`);
    }

    const entries = ledger.getEntriesForAccount(params.accountId);

    return {
      id: this.generateInsightId(),
      mode: AIMode.ANALYST,
      source: DataSource.LEDGER,
      timestamp: new Date(),
      generatedBy: params.generatedBy,
      reviewed: false,
      analysisType: 'BALANCE',
      title: `${balance.account.name} Balance`,
      description: `Current balance for ${balance.account.name} as of ${params.asOf ? params.asOf.toLocaleDateString() : 'now'}`,
      metrics: [
        {
          value: balance.balance,
          label: 'Current Balance',
          currency: balance.currency
        },
        {
          value: balance.entryCount,
          label: 'Total Entries'
        }
      ],
      ledgerEntryIds: entries.map(e => e.id),
      accountIds: [params.accountId],
      period: params.asOf
        ? {
            start: new Date(0),
            end: params.asOf
          }
        : undefined,
      sourceData: {
        balance: balance.balance,
        currency: balance.currency,
        entryCount: balance.entryCount,
        accountType: balance.account.type,
        normalBalance: balance.account.normalBalance
      },
      calculationMethod: 'Sum of all debit/credit entries based on account normal balance'
    };
  }

  /**
   * Get expense breakdown by category
   */
  getExpenseBreakdown(params: {
    startDate?: Date;
    endDate?: Date;
    generatedBy: string;
  }): AnalystInsight {
    const ledger = getLedger();
    const expenseAccounts = ledger
      .getAllAccounts()
      .filter(a => a.type === AccountType.EXPENSE);

    const metrics: AnalystInsight['metrics'] = [];
    const ledgerEntryIds: string[] = [];
    const accountIds: string[] = [];
    let totalExpenses = 0;

    for (const account of expenseAccounts) {
      const balance = ledger.getAccountBalance(account.id, params.endDate);
      if (balance && balance.balance > 0) {
        metrics.push({
          value: balance.balance,
          label: account.name,
          currency: account.currency
        });

        totalExpenses += balance.balance;
        accountIds.push(account.id);

        const entries = ledger.getEntriesForAccount(account.id);
        ledgerEntryIds.push(...entries.map(e => e.id));
      }
    }

    // Sort by value descending
    metrics.sort((a, b) => b.value - a.value);

    // Add total
    metrics.unshift({
      value: totalExpenses,
      label: 'Total Expenses',
      currency: 'USD'
    });

    const period = {
      start: params.startDate || new Date(0),
      end: params.endDate || new Date()
    };

    return {
      id: this.generateInsightId(),
      mode: AIMode.ANALYST,
      source: DataSource.LEDGER,
      timestamp: new Date(),
      generatedBy: params.generatedBy,
      reviewed: false,
      analysisType: 'EXPENSE_BREAKDOWN',
      title: 'Expense Breakdown',
      description: `Breakdown of all expenses from ${period.start.toLocaleDateString()} to ${period.end.toLocaleDateString()}`,
      metrics,
      ledgerEntryIds: Array.from(new Set(ledgerEntryIds)),
      accountIds,
      period,
      sourceData: {
        expenseAccountCount: expenseAccounts.length,
        totalExpenses
      },
      calculationMethod: 'Sum of all expense account balances grouped by expense category'
    };
  }

  /**
   * Get cash flow analysis
   */
  getCashFlowAnalysis(params: {
    startDate: Date;
    endDate: Date;
    generatedBy: string;
  }): AnalystInsight {
    const ledger = getLedger();

    // Get beginning and ending cash balance
    const beginningBalance = ledger.getAccountBalance('1000-CASH', params.startDate);
    const endingBalance = ledger.getAccountBalance('1000-CASH', params.endDate);

    const beginningValue = beginningBalance?.balance || 0;
    const endingValue = endingBalance?.balance || 0;
    const netChange = endingValue - beginningValue;
    const percentageChange = beginningValue !== 0
      ? ((netChange / beginningValue) * 100)
      : 0;

    // Get all cash account entries in period
    const entries = ledger.getEntriesForAccount('1000-CASH');
    const periodEntries = entries.filter(e =>
      e.timestamp >= params.startDate && e.timestamp <= params.endDate
    );

    return {
      id: this.generateInsightId(),
      mode: AIMode.ANALYST,
      source: DataSource.LEDGER,
      timestamp: new Date(),
      generatedBy: params.generatedBy,
      reviewed: false,
      analysisType: 'CASH_FLOW',
      title: 'Cash Flow Analysis',
      description: `Cash flow from ${params.startDate.toLocaleDateString()} to ${params.endDate.toLocaleDateString()}`,
      metrics: [
        {
          value: beginningValue,
          label: 'Beginning Balance',
          currency: 'USD'
        },
        {
          value: endingValue,
          label: 'Ending Balance',
          currency: 'USD'
        },
        {
          value: netChange,
          label: 'Net Change',
          currency: 'USD',
          comparisonValue: beginningValue,
          percentageChange
        },
        {
          value: periodEntries.length,
          label: 'Transactions in Period'
        }
      ],
      ledgerEntryIds: periodEntries.map(e => e.id),
      accountIds: ['1000-CASH'],
      period: {
        start: params.startDate,
        end: params.endDate
      },
      sourceData: {
        beginningBalance: beginningValue,
        endingBalance: endingValue,
        netChange,
        percentageChange,
        transactionCount: periodEntries.length
      },
      calculationMethod: 'Ending balance minus beginning balance for cash account'
    };
  }

  /**
   * Get period comparison
   */
  getPeriodComparison(params: {
    accountId: string;
    period1Start: Date;
    period1End: Date;
    period2Start: Date;
    period2End: Date;
    generatedBy: string;
  }): AnalystInsight {
    const ledger = getLedger();
    const account = ledger.getAccount(params.accountId);

    if (!account) {
      throw new Error(`Account not found: ${params.accountId}`);
    }

    const period1Balance = ledger.getAccountBalance(params.accountId, params.period1End);
    const period2Balance = ledger.getAccountBalance(params.accountId, params.period2End);

    const period1Value = period1Balance?.balance || 0;
    const period2Value = period2Balance?.balance || 0;
    const change = period2Value - period1Value;
    const percentageChange = period1Value !== 0
      ? ((change / period1Value) * 100)
      : 0;

    const allEntries = ledger.getEntriesForAccount(params.accountId);
    const period1Entries = allEntries.filter(e =>
      e.timestamp >= params.period1Start && e.timestamp <= params.period1End
    );
    const period2Entries = allEntries.filter(e =>
      e.timestamp >= params.period2Start && e.timestamp <= params.period2End
    );

    return {
      id: this.generateInsightId(),
      mode: AIMode.ANALYST,
      source: DataSource.LEDGER,
      timestamp: new Date(),
      generatedBy: params.generatedBy,
      reviewed: false,
      analysisType: 'COMPARISON',
      title: `${account.name} Period Comparison`,
      description: `Comparing two periods for ${account.name}`,
      metrics: [
        {
          value: period1Value,
          label: 'Period 1 Balance',
          currency: account.currency,
          comparisonPeriod: `${params.period1Start.toLocaleDateString()} - ${params.period1End.toLocaleDateString()}`
        },
        {
          value: period2Value,
          label: 'Period 2 Balance',
          currency: account.currency,
          comparisonPeriod: `${params.period2Start.toLocaleDateString()} - ${params.period2End.toLocaleDateString()}`
        },
        {
          value: change,
          label: 'Change',
          currency: account.currency,
          comparisonValue: period1Value,
          percentageChange
        }
      ],
      ledgerEntryIds: [...period1Entries, ...period2Entries].map(e => e.id),
      accountIds: [params.accountId],
      sourceData: {
        period1: {
          balance: period1Value,
          entries: period1Entries.length
        },
        period2: {
          balance: period2Value,
          entries: period2Entries.length
        },
        change,
        percentageChange
      },
      calculationMethod: 'Balance difference between two time periods'
    };
  }

  /**
   * Get expense trend over time
   */
  getExpenseTrend(params: {
    accountId: string;
    startDate: Date;
    endDate: Date;
    intervalDays: number;
    generatedBy: string;
  }): AnalystInsight {
    const ledger = getLedger();
    const account = ledger.getAccount(params.accountId);

    if (!account) {
      throw new Error(`Account not found: ${params.accountId}`);
    }

    const entries = ledger.getEntriesForAccount(params.accountId);
    const periodEntries = entries.filter(e =>
      e.timestamp >= params.startDate && e.timestamp <= params.endDate
    );

    // Group entries by interval
    const intervals: Array<{ start: Date; end: Date; total: number }> = [];
    let currentStart = new Date(params.startDate);

    while (currentStart < params.endDate) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + params.intervalDays);

      const intervalEntries = periodEntries.filter(e =>
        e.timestamp >= currentStart && e.timestamp < currentEnd
      );

      const total = intervalEntries.reduce((sum, entry) => {
        if (entry.debitAccount.id === params.accountId) {
          return sum + entry.amount;
        }
        return sum;
      }, 0);

      intervals.push({
        start: new Date(currentStart),
        end: new Date(currentEnd),
        total
      });

      currentStart = currentEnd;
    }

    const totalExpense = intervals.reduce((sum, interval) => sum + interval.total, 0);
    const avgExpense = intervals.length > 0 ? totalExpense / intervals.length : 0;

    const metrics: AnalystInsight['metrics'] = [
      {
        value: totalExpense,
        label: 'Total Expense',
        currency: account.currency
      },
      {
        value: avgExpense,
        label: `Average per ${params.intervalDays} days`,
        currency: account.currency
      },
      {
        value: intervals.length,
        label: 'Number of Intervals'
      }
    ];

    return {
      id: this.generateInsightId(),
      mode: AIMode.ANALYST,
      source: DataSource.LEDGER,
      timestamp: new Date(),
      generatedBy: params.generatedBy,
      reviewed: false,
      analysisType: 'TREND',
      title: `${account.name} Trend`,
      description: `Expense trend for ${account.name} over ${params.intervalDays}-day intervals`,
      metrics,
      ledgerEntryIds: periodEntries.map(e => e.id),
      accountIds: [params.accountId],
      period: {
        start: params.startDate,
        end: params.endDate
      },
      sourceData: {
        intervals: intervals.map(i => ({
          start: i.start.toISOString(),
          end: i.end.toISOString(),
          total: i.total
        })),
        totalExpense,
        avgExpense,
        intervalCount: intervals.length
      },
      calculationMethod: `Expenses grouped into ${params.intervalDays}-day intervals, summed per interval`
    };
  }

  /**
   * Generate unique insight ID
   */
  private generateInsightId(): string {
    return `ANALYST-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Global analyst mode instance
 */
let globalAnalystMode: AnalystMode | null = null;

/**
 * Get or create global analyst mode instance
 */
export function getAnalystMode(): AnalystMode {
  if (!globalAnalystMode) {
    globalAnalystMode = new AnalystMode();
  }
  return globalAnalystMode;
}
