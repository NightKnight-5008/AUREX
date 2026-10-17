export interface CompanyCard {
  id: string;
  lastFourDigits: string;
  cardholderName: string;
  linkedBankAccount: string;
  creditLimit: number;
  availableBalance: number;
  cardType: 'credit' | 'debit';
  issuingBank: string;
  paymentStatus: 'paid' | 'unpaid';
  minimumPayment: number;
  dueDate: Date | null;
  outstandingDebt?: number; // Total debt owed on credit card
}

export type TransactionType = 'expense' | 'revenue' | 'payroll' | 'tax' | 'credit_payment';

export interface PayrollEmployee {
  id: string;
  name: string;
  amount: number;
  department: string;
}

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: Date;
  relatedCardId?: string;
  status: 'pending' | 'completed' | 'cancelled';
  payrollEmployees?: PayrollEmployee[];
  photoData?: string; // Base64 encoded image data URI
  createdAt?: Date;
  updatedAt?: Date;
}

export type SmsEventType = 'payment_confirmation' | 'due_date_alert' | 'limit_update' | 'other';

export interface SmsEvent {
  id: string;
  smsContent: string;
  senderNumber: string;
  receivingPhoneNumber: string; // Phone number that received this SMS (1 of 4)
  parsedData: {
    paymentAmount?: number;
    dueDate?: Date;
    creditLimit?: number;
    availableBalance?: number;
  };
  relatedCardId?: string;
  eventType: SmsEventType;
  timestamp: Date;
  processingStatus: 'pending' | 'processed' | 'failed';
}

export interface PaymentAlert {
  id: string;
  cardId: string;
  dueDate: Date;
  alertDate: Date;
  alertStatus: 'pending' | 'sent' | 'dismissed';
  minimumPayment: number;
}

export interface TaxConfiguration {
  id: string;
  country: string;
  taxBracket: number;
  taxRate: number;
  taxYear: number;
  estimatedMonthlyTax: number;
  estimatedAnnualTax: number;
}

export interface FinancialMetrics {
  id: string;
  period: string; // e.g., "2024-01" for monthly, "2024" for yearly
  periodType: 'monthly' | 'yearly';
  totalRevenue: number;
  totalExpenses: number;
  totalPayroll: number;
  totalTaxes: number;
  netProfit: number;
  netWorth: number;
  stockPrice?: number;
}

export interface DashboardSummary {
  currentMonth: FinancialMetrics;
  currentYear: FinancialMetrics;
  cards: CompanyCard[];
  upcomingAlerts: PaymentAlert[];
  recentTransactions: FinancialTransaction[];
  recentSmsEvents: SmsEvent[];
}

export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  locale: string;
  taxBrackets: TaxBracket[];
  commonBanks: string[];
}

export interface TaxBracket {
  bracket: string;
  rate: number;
  minIncome: number;
  maxIncome: number;
}

// Extended types for Aurex Metrics & Payroll System

export interface Product {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  costOfGoods?: number;
}

export interface Employee {
  id: string;
  employeeId: string; // Immutable employee ID
  name: string;
  baseSalary: number;
  department: string;
  hireDate: Date;
  bonuses?: EmployeeBonus[];
  monthlySales?: EmployeeSalesData[];
}

export interface EmployeeBonus {
  id: string;
  employeeId: string;
  amount: number;
  date: Date;
  reason?: string;
}

export interface EmployeeSalesData {
  employeeId: string;
  month: string; // YYYY-MM format
  salesValue: number;
  numberOfSales: number;
  updatedAt: Date;
}

export interface WebsiteMetrics {
  id: string;
  period: string; // YYYY-MM format
  visitors: number;
  productViews: number;
  addToCarts: number;
  checkoutInitiations: number;
  completedPurchases: number;
  revenue: number;
  marketingSpend: number;
  ordersByCountry: { [countryCode: string]: number };
}

export interface PayrollKPIs {
  totalPayrollMonthly: number;
  totalPayrollYearly: number;
  payrollPercentOfRevenue: number;
  netPayroll: number; // After deductions
  payrollBurnRate: number; // Monthly average
}

export interface CardUtilization {
  cardId: string;
  utilizationPercent: number;
  outstandingBalance: number;
  creditLimit: number;
  daysUntilDue: number;
  interestRate?: number;
  priorityScore: number; // Calculated for payoff priority
}

export interface SalesMetrics {
  avgSalesPerDay: number;
  avgSalesPerMonth: number;
  averageOrderValue: number;
  repeatCustomerRate: number;
  grossMargin: number;
  topProducts: Product[];
}

export interface ConversionMetrics {
  conversionRate: number;
  cartAbandonmentRate: number;
  checkoutCompletionRate: number;
  costPerAcquisition: number;
  revenuePerVisitor: number;
  priceSensitivityFlag: boolean;
}
