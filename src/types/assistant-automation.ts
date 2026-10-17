/**
 * Assistant/Automation Tab Types
 *
 * Types for Google Calendar, Tasks, and Docs automation features
 * showing live activity and what the app is actively doing for the user
 */

export type ActivityStatus = 'completed' | 'upcoming' | 'overdue';
export type ServiceType = 'calendar' | 'tasks' | 'docs';
export type ReportFrequency = 'manual' | 'weekly' | 'monthly';

/**
 * Live activity feed item showing what the app is doing
 */
export interface LiveActivityItem {
  id: string;
  type: 'payment_reminder' | 'task_due' | 'report_generated' | 'card_monitored';
  status: ActivityStatus;
  timestamp: Date;
  cardId?: string; // Associated card if applicable
  message: string; // User-friendly message
  actionRequired?: boolean;
}

/**
 * Google Calendar reminder configuration and status
 */
export interface CalendarReminder {
  id: string;
  cardId: string;
  cardName: string;
  lastFourDigits: string;
  dueDate: Date;
  reminderDate: Date;
  leadTimeDays: number; // Days before due date (2-3 days default)
  isActive: boolean;
  isPaused: boolean;
  lastSyncTime: Date;
}

/**
 * Google Tasks managed by the app
 */
export interface ManagedTask {
  id: string;
  cardId: string;
  cardName: string;
  lastFourDigits: string;
  taskTitle: string;
  dueDate?: Date;
  status: 'active' | 'completed' | 'overdue' | 'ignored';
  createdAt: Date;
  completedAt?: Date;
  autoCompleted: boolean; // True if auto-completed after payment confirmation
  lastSyncTime: Date;
}

/**
 * Google Docs financial report
 */
export interface FinancialReport {
  id: string;
  title: string;
  generatedAt: Date;
  coveragePeriodStart: Date;
  coveragePeriodEnd: Date;
  documentUrl?: string;
  status: 'generating' | 'ready' | 'error';
  nextScheduledReport?: Date;
  frequency: ReportFrequency;
  lastSyncTime: Date;
}

/**
 * Google service sync status and permissions
 */
export interface GoogleServiceStatus {
  serviceType: ServiceType;
  isConnected: boolean;
  lastSyncTime?: Date;
  syncStatus: 'synced' | 'syncing' | 'error' | 'disconnected';
  permissionsGranted: string[]; // e.g., "read calendar events", "create tasks"
  dataAccessed: string[]; // What data the app accesses
  dataNeverTouched: string[]; // What the app never accesses (for trust)
}

/**
 * Summary of what the app is actively doing
 */
export interface AutomationSummary {
  totalActiveReminders: number;
  totalActiveTasks: number;
  totalReportsGenerated: number;
  nextPaymentReminder?: CalendarReminder;
  nextTaskDue?: ManagedTask;
  lastReportGenerated?: FinancialReport;
  highRiskCardsMonitored: number;
}

/**
 * Complete assistant/automation state
 */
export interface AssistantState {
  liveActivities: LiveActivityItem[];
  calendarReminders: CalendarReminder[];
  managedTasks: ManagedTask[];
  financialReports: FinancialReport[];
  googleServices: GoogleServiceStatus[];
  summary: AutomationSummary;
  lastGlobalSync: Date;
}
