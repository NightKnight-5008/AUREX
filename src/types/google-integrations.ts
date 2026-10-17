import type { CompanyCard, FinancialTransaction, Employee, FinancialMetrics } from './financial';

// ===============================================
// PAYMENT REMINDER TYPES
// ===============================================

export type PaymentReminderType = 'card_minimum' | 'card_full' | 'card_overdue' | 'payroll' | 'tax';

export interface PaymentReminder {
  id: string;
  type: PaymentReminderType;
  title: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'paid' | 'unpaid' | 'overdue';

  // Card-specific
  cardId?: string;
  cardLastFour?: string;
  cardholderName?: string;
  bankName?: string;

  // Payroll-specific
  employeeId?: string;
  employeeName?: string;

  // Tax-specific
  taxType?: string;

  // Google integration IDs
  calendarEventId?: string;
  taskId?: string;

  // Metadata
  appLink?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderGenerationResult {
  created: PaymentReminder[];
  updated: PaymentReminder[];
  deleted: string[];
  errors: Array<{ reminderId: string; error: string }>;
}

// ===============================================
// FINANCIAL REPORT TYPES
// ===============================================

export type ReportType =
  | 'card_payments'
  | 'card_overdue'
  | 'payroll'
  | 'tax'
  | 'expenses'
  | 'revenue'
  | 'profit_loss'
  | 'monthly_summary'
  | 'quarterly_summary';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface ReportConfig {
  type: ReportType;
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeDetails?: boolean;
  groupBy?: 'cardholder' | 'bank' | 'department' | 'category';
}

export interface GeneratedReport {
  id: string;
  type: ReportType;
  title: string;
  period: ReportPeriod;
  startDate: Date;
  endDate: Date;

  // Google Docs integration
  documentId?: string;
  documentUrl?: string;

  // Report metadata
  generatedAt: Date;
  dataPoints: number;
  sections: string[];

  // Summary metrics
  totalAmount?: number;
  transactionCount?: number;
  status: 'generating' | 'completed' | 'failed';
  error?: string;
}

// ===============================================
// CARD PAYMENT REPORT DATA
// ===============================================

export interface CardPaymentReportData {
  period: string;
  totalCards: number;
  paidCards: number;
  unpaidCards: number;
  overdueCards: number;
  totalOutstanding: number;
  totalPaid: number;
  payments: Array<{
    cardLastFour: string;
    cardholderName: string;
    bankName: string;
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: 'paid' | 'unpaid' | 'overdue';
  }>;
}

// ===============================================
// PAYROLL REPORT DATA
// ===============================================

export interface PayrollReportData {
  period: string;
  totalEmployees: number;
  totalPayroll: number;
  paymentsMade: number;
  paymentsMissed: number;
  payments: Array<{
    employeeId: string;
    employeeName: string;
    department: string;
    salary: number;
    paidDate?: Date;
    status: 'paid' | 'pending' | 'missed';
  }>;
}

// ===============================================
// TAX REPORT DATA
// ===============================================

export interface TaxReportData {
  period: string;
  totalTaxObligation: number;
  taxesPaid: number;
  taxesPending: number;
  taxesMissed: number;
  deadlinesMet: number;
  deadlinesMissed: number;
  payments: Array<{
    taxType: string;
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: 'paid' | 'pending' | 'overdue';
  }>;
}

// ===============================================
// EXPENSE REPORT DATA
// ===============================================

export interface ExpenseReportData {
  period: string;
  totalExpenses: number;
  transactionCount: number;
  byCategory: Record<string, {
    amount: number;
    count: number;
    percentage: number;
  }>;
  byCard: Record<string, {
    cardLastFour: string;
    bankName: string;
    amount: number;
    count: number;
  }>;
  topExpenses: Array<{
    description: string;
    category: string;
    amount: number;
    date: Date;
    cardId?: string;
  }>;
}

// ===============================================
// REVENUE REPORT DATA
// ===============================================

export interface RevenueReportData {
  period: string;
  totalRevenue: number;
  transactionCount: number;
  byCategory: Record<string, {
    amount: number;
    count: number;
    percentage: number;
  }>;
  byMonth: Record<string, number>;
  topRevenue: Array<{
    description: string;
    category: string;
    amount: number;
    date: Date;
  }>;
}

// ===============================================
// PROFIT & LOSS REPORT DATA
// ===============================================

export interface ProfitLossReportData {
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  totalPayroll: number;
  totalTaxes: number;
  netProfit: number;
  profitMargin: number;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    expenses: number;
    payroll: number;
    taxes: number;
    profit: number;
  }>;
}

// ===============================================
// GOOGLE INTEGRATION SETTINGS
// ===============================================

export interface GoogleIntegrationSettings {
  calendarEnabled: boolean;
  tasksEnabled: boolean;
  docsEnabled: boolean;

  // Reminder settings
  autoCreateReminders: boolean;
  reminderDaysBeforeDue: number[];
  escalateOverdue: boolean;

  // Report settings
  autoGenerateReports: boolean;
  reportSchedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  reportTypes: ReportType[];

  // OAuth tokens (encrypted)
  calendarToken?: string;
  tasksToken?: string;
  docsToken?: string;

  lastSync?: Date;
}
