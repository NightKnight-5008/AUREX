/**
 * Enhanced Financial Types with Data Trust, Accuracy, and Reliability Layer
 *
 * This file extends the base financial types with metadata for tracking:
 * - Data source reliability (SMS, inferred, calculated)
 * - Confidence scores (high, medium, low)
 * - Change history and audit trails
 * - Financial stress indicators
 */

import type { CompanyCard } from './financial';

export type DataSourceType = 'sms' | 'inferred' | 'calculated' | 'manual' | 'api';
export type ConfidenceScore = 'high' | 'medium' | 'low';

export type CardStatus =
  | 'paid'           // Fully settled, no outstanding debt
  | 'minimum_paid'   // Minimum payment made, balance remains
  | 'partially_paid' // Some payment made, less than minimum
  | 'unpaid'         // No payment made
  | 'grace_period'   // Within grace period after due date
  | 'overdue'        // Past due date and grace period
  | 'over_limit';    // Exceeded credit limit

export interface FieldMetadata {
  fieldName: string;
  sourceType: DataSourceType;
  confidenceScore: ConfidenceScore;
  lastConfirmedTimestamp: Date;
  estimatedValue?: boolean; // True if value is estimated/inferred
}

export interface FieldChangeRecord {
  fieldName: string;
  oldValue: any;
  newValue: any;
  changeTimestamp: Date;
  changeSource: DataSourceType;
  triggeredBy: string; // SMS ID, user action, etc.
  reason?: string;
}

export interface EnhancedCompanyCard extends CompanyCard {
  // Enhanced status
  status: CardStatus;
  statusReason?: string; // Plain-language explanation
  statusLastUpdated: Date;

  // Reliability metadata for each financial field
  metadata: {
    creditLimit: FieldMetadata;
    availableBalance: FieldMetadata;
    outstandingDebt: FieldMetadata;
    minimumPayment: FieldMetadata;
    dueDate: FieldMetadata;
  };

  // Change history (last 50 changes)
  changeHistory: FieldChangeRecord[];

  // Data freshness
  lastDataUpdate: Date;
  dataFreshnessHours: number; // Hours since last confirmed update

  // Risk indicators
  utilizationPercentage: number; // (outstandingDebt / creditLimit) * 100
  daysUntilDue: number | null;
  isOverLimit: boolean;

  // Payment tracking
  lastPaymentDate?: Date;
  lastPaymentAmount?: number;
  paymentsThisCycle: number; // Number of payments made this billing cycle
}

export interface FinancialStressIndex {
  score: number; // 0-100 (0 = no stress, 100 = maximum stress)
  level: 'safe' | 'watchlist' | 'high_risk';
  timestamp: Date;
  contributingFactors: {
    utilizationImpact: number; // 0-40 points
    statusImpact: number; // 0-25 points
    dueDateProximityImpact: number; // 0-20 points
    activeCardsImpact: number; // 0-10 points
    overLimitImpact: number; // 0-5 points
  };
  breakdown: string[]; // Plain-language explanations
}

export interface CardRecommendation {
  cardId: string;
  recommendationScore: number; // 0-100
  reason: string;
  impacts: {
    utilizationChange: number;
    availableBalanceAfter: number;
    statusChange?: CardStatus;
    riskImpact: 'positive' | 'neutral' | 'negative';
  };
}

export interface SpendingSimulation {
  id: string;
  amount: number;
  selectedCardId: string;
  timestamp: Date;
  beforeState: {
    utilization: number;
    availableBalance: number;
    status: CardStatus;
    stressScore: number;
  };
  afterState: {
    utilization: number;
    availableBalance: number;
    status: CardStatus;
    stressScore: number;
  };
  recommendation: CardRecommendation[];
}

export interface TrendData {
  period: '7d' | '30d' | '90d';
  metrics: {
    totalDebtTrend: number[]; // Daily/weekly snapshots
    utilizationTrend: number[];
    availableBalanceTrend: number[];
    stressIndexTrend: number[];
    dates: Date[];
  };
  insights: string[]; // Plain-language trend insights
}

export interface WeeklySummary {
  weekStartDate: Date;
  weekEndDate: Date;
  improvements: string[];
  risksAvoided: string[];
  behavioralTrends: string[];
  nextWeekRecommendations: string[];
}

export interface GoogleIntegrationSettings {
  calendar: {
    enabled: boolean;
    token?: string;
    reminderDaysBefore: number[]; // e.g., [2, 3] for 2 days and 3 days before
    onDueDateReminder: boolean;
  };
  tasks: {
    enabled: boolean;
    token?: string;
    syncPayments: boolean;
    syncRisks: boolean;
    twoWaySync: boolean;
  };
  docs: {
    enabled: boolean;
    token?: string;
    autoGenerateMonthly: boolean;
    lastReportGenerated?: Date;
  };
}

export interface UserPreferences {
  animationsEnabled: boolean;
  onboardingCompleted: boolean;
  demoMode: boolean;
  offlineMode: boolean;
  googleIntegrations: GoogleIntegrationSettings;
}
