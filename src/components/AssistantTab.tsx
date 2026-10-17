import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Shield,
  AlertTriangle,
  Activity,
  ExternalLink,
  RefreshCw,
  ToggleLeft,
  Eye,
  EyeOff,
  Zap,
  ListTodo,
} from 'lucide-react';
import type { CompanyCard } from '@/types/financial';
import type {
  LiveActivityItem,
  CalendarReminder,
  ManagedTask,
  FinancialReport,
  GoogleServiceStatus,
  AssistantState,
  ServiceType,
  ReportFrequency,
} from '@/types/assistant-automation';
import { formatCurrency } from '@/lib/financial-data';
import { GoogleConnectionOnboarding } from '@/components/GoogleConnectionOnboarding';
import { disconnectService } from '@/lib/google-oauth';

interface AssistantTabProps {
  cards: CompanyCard[];
  countryCode: string;
  employees?: Array<{
    id: string;
    name: string;
    baseSalary: number;
    department: string;
  }>;
  monthlyMetrics?: Array<{
    period: string;
    totalRevenue: number;
    totalExpenses: number;
    totalPayroll: number;
    netProfit: number;
  }>;
  transactions?: Array<{
    id: string;
    date: Date;
    amount: number;
    type: string;
    description: string;
  }>;
}

/**
 * Generate sample assistant/automation data based on cards
 */
function generateAssistantData(cards: CompanyCard[]): AssistantState {
  const now = new Date();
  const creditCards = cards.filter((c) => c.cardType === 'credit');

  // Generate live activities
  const liveActivities: LiveActivityItem[] = [];

  // Next payment reminder
  if (creditCards.length > 0 && creditCards[0].dueDate) {
    liveActivities.push({
      id: 'activity-1',
      type: 'payment_reminder',
      status: 'upcoming',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      cardId: creditCards[0].id,
      message: `Tomorrow we'll remind you to pay the minimum on ${creditCards[0].cardholderName}`,
    });
  }

  // Task tracking
  if (creditCards.length > 1) {
    liveActivities.push({
      id: 'activity-2',
      type: 'task_due',
      status: 'upcoming',
      timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
      cardId: creditCards[1].id,
      message: `Task "Pay minimum on ${creditCards[1].cardholderName}" is due tomorrow`,
    });
  }

  // Last report generated
  liveActivities.push({
    id: 'activity-3',
    type: 'report_generated',
    status: 'completed',
    timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 24 hours ago
    message: 'Weekly financial report generated covering Dec 6-12',
  });

  // High-risk cards monitored
  const highRiskCards = creditCards.filter((c) => {
    const debt = c.outstandingDebt ?? 0;
    const utilization = c.creditLimit > 0 ? (debt / c.creditLimit) * 100 : 0;
    const isOverLimit = c.availableBalance < 0;
    return utilization > 70 || isOverLimit;
  });

  if (highRiskCards.length > 0 && highRiskCards[0]) {
    const firstHighRiskCard = highRiskCards[0];
    const utilization = ((firstHighRiskCard.outstandingDebt ?? 0) / firstHighRiskCard.creditLimit) * 100;
    liveActivities.push({
      id: 'activity-4',
      type: 'card_monitored',
      status: 'upcoming',
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
      cardId: firstHighRiskCard.id,
      message: `Monitoring high utilization on ${firstHighRiskCard.cardholderName} (${utilization.toFixed(1)}%)`,
      actionRequired: true,
    });
  }

  // Generate calendar reminders
  const calendarReminders: CalendarReminder[] = creditCards
    .filter((c) => c.dueDate)
    .slice(0, 3)
    .map((card, idx) => {
      const dueDate = new Date(card.dueDate!);
      const leadTimeDays = 3; // 3 days before due date
      const reminderDate = new Date(dueDate.getTime() - leadTimeDays * 24 * 60 * 60 * 1000);

      return {
        id: `reminder-${card.id}`,
        cardId: card.id,
        cardName: card.cardholderName,
        lastFourDigits: card.lastFourDigits,
        dueDate,
        reminderDate,
        leadTimeDays,
        isActive: true,
        isPaused: idx === 2, // Pause one for demo
        lastSyncTime: new Date(now.getTime() - 15 * 60 * 1000), // 15 min ago
      };
    });

  // Generate managed tasks
  const managedTasks: ManagedTask[] = creditCards.slice(0, 4).map((card, idx) => {
    const statuses: Array<'active' | 'completed' | 'overdue' | 'ignored'> = [
      'active',
      'completed',
      'active',
      'overdue',
    ];
    const status = statuses[idx] || 'active';

    return {
      id: `task-${card.id}`,
      cardId: card.id,
      cardName: card.cardholderName,
      lastFourDigits: card.lastFourDigits,
      taskTitle: `Pay minimum ${formatCurrency(card.minimumPayment, 'US')} on ${card.cardholderName}`,
      dueDate: card.dueDate ? new Date(card.dueDate) : undefined,
      status,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: status === 'completed' ? new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) : undefined,
      autoCompleted: status === 'completed',
      lastSyncTime: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
    };
  });

  // Generate financial reports
  const financialReports: FinancialReport[] = [
    {
      id: 'report-1',
      title: 'Weekly Financial Summary - Dec 6-12, 2025',
      generatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
      coveragePeriodStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      coveragePeriodEnd: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      documentUrl: '#',
      status: 'ready',
      nextScheduledReport: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      frequency: 'weekly',
      lastSyncTime: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      id: 'report-2',
      title: 'Monthly Financial Report - November 2025',
      generatedAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      coveragePeriodStart: new Date(2025, 10, 1), // Nov 1
      coveragePeriodEnd: new Date(2025, 10, 30), // Nov 30
      documentUrl: '#',
      status: 'ready',
      frequency: 'monthly',
      lastSyncTime: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
    },
  ];

  // Google service statuses - read from localStorage
  const calendarConnected = localStorage.getItem('google_calendar_connected') === 'true';
  const tasksConnected = localStorage.getItem('google_tasks_connected') === 'true';
  const docsConnected = localStorage.getItem('google_docs_connected') === 'true';

  const googleServices: GoogleServiceStatus[] = [
    {
      serviceType: 'calendar',
      isConnected: calendarConnected,
      lastSyncTime: calendarConnected ? new Date(now.getTime() - 15 * 60 * 1000) : undefined,
      syncStatus: calendarConnected ? 'synced' : 'disconnected',
      permissionsGranted: ['Create calendar events', 'Read upcoming reminders'],
      dataAccessed: ['Payment due date reminders only'],
      dataNeverTouched: ['Personal events', 'Other calendars', 'Calendar settings'],
    },
    {
      serviceType: 'tasks',
      isConnected: tasksConnected,
      lastSyncTime: tasksConnected ? new Date(now.getTime() - 10 * 60 * 1000) : undefined,
      syncStatus: tasksConnected ? 'synced' : 'disconnected',
      permissionsGranted: ['Create tasks', 'Update task status', 'Delete tasks'],
      dataAccessed: ['Financial payment tasks only'],
      dataNeverTouched: ['Personal tasks', 'Other task lists', 'Task settings'],
    },
    {
      serviceType: 'docs',
      isConnected: docsConnected,
      lastSyncTime: docsConnected ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : undefined,
      syncStatus: docsConnected ? 'synced' : 'disconnected',
      permissionsGranted: ['Create documents in designated folder', 'Read created reports'],
      dataAccessed: ['Financial reports folder only'],
      dataNeverTouched: ['Personal documents', 'Shared documents', 'Drive settings'],
    },
  ];

  // Calculate summary
  const summary = {
    totalActiveReminders: calendarReminders.filter((r) => r.isActive && !r.isPaused).length,
    totalActiveTasks: managedTasks.filter((t) => t.status === 'active').length,
    totalReportsGenerated: financialReports.length,
    nextPaymentReminder: calendarReminders.find((r) => r.isActive && !r.isPaused),
    nextTaskDue: managedTasks.find((t) => t.status === 'active'),
    lastReportGenerated: financialReports[0],
    highRiskCardsMonitored: highRiskCards.length,
  };

  return {
    liveActivities,
    calendarReminders,
    managedTasks,
    financialReports,
    googleServices,
    summary,
    lastGlobalSync: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
  };
}

export function AssistantTab({ cards, countryCode, employees = [], monthlyMetrics = [], transactions = [] }: AssistantTabProps) {
  // Auto-login with 4 demo accounts for testing
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if already auto-logged in
    const autoLoggedIn = localStorage.getItem('assistant_auto_logged_in');

    if (!autoLoggedIn) {
      // Auto-login by setting all services to connected
      localStorage.setItem('google_tasks_connected', 'true');
      localStorage.setItem('google_calendar_connected', 'true');
      localStorage.setItem('google_docs_connected', 'true');
      localStorage.setItem('assistant_auto_logged_in', 'true');

      // Create 4 demo accounts
      localStorage.setItem('demo_accounts', JSON.stringify([
        { id: '1', email: 'demo1@example.com', name: 'Alice Johnson', role: 'Owner' },
        { id: '2', email: 'demo2@example.com', name: 'Bob Smith', role: 'Manager' },
        { id: '3', email: 'demo3@example.com', name: 'Carol Davis', role: 'Accountant' },
        { id: '4', email: 'demo4@example.com', name: 'David Wilson', role: 'Analyst' }
      ]));

      return false; // Don't show onboarding
    }

    const tasksConnected = localStorage.getItem('google_tasks_connected') === 'true';
    const calendarConnected = localStorage.getItem('google_calendar_connected') === 'true';
    const docsConnected = localStorage.getItem('google_docs_connected') === 'true';

    // Show onboarding if none of the services are connected
    return !tasksConnected && !calendarConnected && !docsConnected;
  });

  // Handle connection completion
  const handleConnectionComplete = (services: {
    tasksConnected: boolean;
    calendarConnected: boolean;
    docsConnected: boolean;
  }) => {
    // At least one service should be connected to proceed
    const anyConnected = services.tasksConnected || services.calendarConnected || services.docsConnected;

    if (anyConnected) {
      setShowOnboarding(false);
    }
  };

  // If showing onboarding, render the connection UI
  if (showOnboarding) {
    return <GoogleConnectionOnboarding onConnectionComplete={handleConnectionComplete} />;
  }

  const initialData = useMemo(() => generateAssistantData(cards), [cards]);

  // State management for all interactive features
  const [calendarReminders, setCalendarReminders] = useState<CalendarReminder[]>(initialData.calendarReminders);
  const [managedTasks, setManagedTasks] = useState<ManagedTask[]>(initialData.managedTasks);
  const [financialReports, setFinancialReports] = useState<FinancialReport[]>(initialData.financialReports);
  const [googleServices, setGoogleServices] = useState<GoogleServiceStatus[]>(initialData.googleServices);
  const [liveActivities, setLiveActivities] = useState<LiveActivityItem[]>(initialData.liveActivities);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Sync state with card changes
  useEffect(() => {
    const newData = generateAssistantData(cards);
    setCalendarReminders(newData.calendarReminders);
    setManagedTasks(newData.managedTasks);
    setFinancialReports(newData.financialReports);
    setGoogleServices(newData.googleServices);
    setLiveActivities(newData.liveActivities);
  }, [cards]);

  // Recalculate summary based on current state
  const summary = useMemo(() => {
    const highRiskCards = cards.filter((c) => {
      if (c.cardType !== 'credit') return false;
      const debt = c.outstandingDebt ?? 0;
      const utilization = c.creditLimit > 0 ? (debt / c.creditLimit) * 100 : 0;
      const isOverLimit = c.availableBalance < 0;
      return utilization > 70 || isOverLimit;
    });

    return {
      totalActiveReminders: calendarReminders.filter((r) => r.isActive && !r.isPaused).length,
      totalActiveTasks: managedTasks.filter((t) => t.status === 'active').length,
      totalReportsGenerated: financialReports.length,
      nextPaymentReminder: calendarReminders.find((r) => r.isActive && !r.isPaused),
      nextTaskDue: managedTasks.find((t) => t.status === 'active'),
      lastReportGenerated: financialReports[0],
      highRiskCardsMonitored: highRiskCards.length,
    };
  }, [calendarReminders, managedTasks, financialReports, cards]);

  // Handler functions for calendar reminders
  const handleTogglePauseReminder = (reminderId: string) => {
    setCalendarReminders(prev =>
      prev.map(reminder =>
        reminder.id === reminderId
          ? { ...reminder, isPaused: !reminder.isPaused, lastSyncTime: new Date() }
          : reminder
      )
    );

    // Add activity feed item
    const reminder = calendarReminders.find(r => r.id === reminderId);
    if (reminder) {
      const newActivity: LiveActivityItem = {
        id: `activity-${Date.now()}`,
        type: 'payment_reminder',
        status: 'completed',
        timestamp: new Date(),
        cardId: reminder.cardId,
        message: `${reminder.isPaused ? 'Resumed' : 'Paused'} reminders for ${reminder.cardName}`,
      };
      setLiveActivities(prev => [newActivity, ...prev]);
    }
  };

  const handleChangeLeadTime = (reminderId: string, newLeadTimeDays: number) => {
    setCalendarReminders(prev =>
      prev.map(reminder => {
        if (reminder.id === reminderId) {
          const reminderDate = new Date(reminder.dueDate.getTime() - newLeadTimeDays * 24 * 60 * 60 * 1000);
          return { ...reminder, leadTimeDays: newLeadTimeDays, reminderDate, lastSyncTime: new Date() };
        }
        return reminder;
      })
    );
  };

  // Handler functions for managed tasks
  const handleMarkTaskComplete = (taskId: string) => {
    setManagedTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'completed' as const, completedAt: new Date(), lastSyncTime: new Date() }
          : task
      )
    );

    // Add activity feed item
    const task = managedTasks.find(t => t.id === taskId);
    if (task) {
      const newActivity: LiveActivityItem = {
        id: `activity-${Date.now()}`,
        type: 'task_due',
        status: 'completed',
        timestamp: new Date(),
        cardId: task.cardId,
        message: `Completed task: ${task.taskTitle}`,
      };
      setLiveActivities(prev => [newActivity, ...prev]);
    }
  };

  const handleIgnoreTask = (taskId: string) => {
    setManagedTasks(prev =>
      prev.map(task =>
        task.id === taskId
          ? { ...task, status: 'ignored' as const, lastSyncTime: new Date() }
          : task
      )
    );

    // Add activity feed item
    const task = managedTasks.find(t => t.id === taskId);
    if (task) {
      const newActivity: LiveActivityItem = {
        id: `activity-${Date.now()}`,
        type: 'task_due',
        status: 'completed',
        timestamp: new Date(),
        cardId: task.cardId,
        message: `Ignored task: ${task.taskTitle}`,
      };
      setLiveActivities(prev => [newActivity, ...prev]);
    }
  };

  // Handler functions for financial reports
  const handleGenerateReport = (reportId?: string) => {
    const now = new Date();
    const newReport: FinancialReport = {
      id: `report-${Date.now()}`,
      title: `Financial Report - ${now.toLocaleDateString()}`,
      generatedAt: now,
      coveragePeriodStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      coveragePeriodEnd: now,
      documentUrl: '#',
      status: 'generating',
      frequency: 'manual',
      lastSyncTime: now,
    };

    setFinancialReports(prev => [newReport, ...prev]);

    // Simulate report generation
    setTimeout(() => {
      setFinancialReports(prev =>
        prev.map(report =>
          report.id === newReport.id
            ? { ...report, status: 'ready' as const }
            : report
        )
      );

      // Add activity feed item
      const activity: LiveActivityItem = {
        id: `activity-${Date.now()}`,
        type: 'report_generated',
        status: 'completed',
        timestamp: new Date(),
        message: `Generated new financial report`,
      };
      setLiveActivities(prev => [activity, ...prev]);
    }, 2000);
  };

  const handleChangeReportFrequency = (reportId: string, newFrequency: ReportFrequency) => {
    setFinancialReports(prev =>
      prev.map(report => {
        if (report.id === reportId) {
          const now = new Date();
          let nextScheduledReport: Date | undefined;

          if (newFrequency === 'weekly') {
            nextScheduledReport = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          } else if (newFrequency === 'monthly') {
            nextScheduledReport = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          }

          return { ...report, frequency: newFrequency, nextScheduledReport, lastSyncTime: new Date() };
        }
        return report;
      })
    );
  };

  // Generate comprehensive financial report
  const generateComprehensiveReport = (report: FinancialReport): string => {
    const startDate = report.coveragePeriodStart.toLocaleDateString();
    const endDate = report.coveragePeriodEnd.toLocaleDateString();

    // Calculate metrics for the report period
    const relevantMetrics = monthlyMetrics.filter(m => {
      const metricDate = new Date(m.period);
      return metricDate >= report.coveragePeriodStart && metricDate <= report.coveragePeriodEnd;
    });

    const totalRevenue = relevantMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalExpenses = relevantMetrics.reduce((sum, m) => sum + m.totalExpenses, 0);
    const totalPayroll = relevantMetrics.reduce((sum, m) => sum + m.totalPayroll, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : '0.00';

    // Card analysis
    const creditCards = cards.filter(c => c.cardType === 'credit');
    const totalCreditLimit = creditCards.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalDebt = creditCards.reduce((sum, c) => sum + (c.outstandingDebt || 0), 0);
    const avgUtilization = totalCreditLimit > 0 ? ((totalDebt / totalCreditLimit) * 100).toFixed(2) : '0.00';

    // Transaction analysis
    const relevantTransactions = transactions.filter(t => {
      return t.date >= report.coveragePeriodStart && t.date <= report.coveragePeriodEnd;
    });

    // Employee analysis
    const totalEmployees = employees.length;
    const avgSalary = totalEmployees > 0 ? employees.reduce((sum, e) => sum + e.baseSalary, 0) / totalEmployees : 0;
    const departmentBreakdown = employees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate detailed report
    return `
═══════════════════════════════════════════════════════
    COMPREHENSIVE FINANCIAL REPORT
    ${report.title}
═══════════════════════════════════════════════════════

REPORT PERIOD: ${startDate} - ${endDate}
Generated: ${report.generatedAt.toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Revenue:     ${formatCurrency(totalRevenue, countryCode)}
Total Expenses:    ${formatCurrency(totalExpenses, countryCode)}
Net Profit:        ${formatCurrency(netProfit, countryCode)}
Profit Margin:     ${profitMargin}%
Total Payroll:     ${formatCurrency(totalPayroll, countryCode)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  REVENUE & EXPENSES BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${relevantMetrics.map(m => `
${m.period}:
  Revenue:    ${formatCurrency(m.totalRevenue, countryCode)}
  Expenses:   ${formatCurrency(m.totalExpenses, countryCode)}
  Payroll:    ${formatCurrency(m.totalPayroll, countryCode)}
  Net Profit: ${formatCurrency(m.netProfit, countryCode)}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREDIT CARD ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Credit Cards: ${creditCards.length}
Total Credit Limit: ${formatCurrency(totalCreditLimit, countryCode)}
Total Outstanding:  ${formatCurrency(totalDebt, countryCode)}
Avg Utilization:    ${avgUtilization}%

Card Details:
${creditCards.map(card => `
  ${card.cardholderName} (${card.cardType.toUpperCase()})
  Card #: •••• ${card.lastFourDigits}
  Limit:       ${formatCurrency(card.creditLimit, countryCode)}
  Outstanding: ${formatCurrency(card.outstandingDebt || 0, countryCode)}
  Available:   ${formatCurrency(card.availableBalance, countryCode)}
  Utilization: ${((card.outstandingDebt || 0) / card.creditLimit * 100).toFixed(2)}%
  ${card.dueDate ? `Due Date:    ${new Date(card.dueDate).toLocaleDateString()}` : ''}
  ${card.minimumPayment ? `Min Payment: ${formatCurrency(card.minimumPayment, countryCode)}` : ''}
`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PAYROLL & EMPLOYEE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Employees:    ${totalEmployees}
Average Salary:     ${formatCurrency(avgSalary, countryCode)}
Total Payroll:      ${formatCurrency(totalPayroll, countryCode)}
Payroll % Revenue:  ${totalRevenue > 0 ? ((totalPayroll / totalRevenue) * 100).toFixed(2) : '0.00'}%

Department Breakdown:
${Object.entries(departmentBreakdown).map(([dept, count]) => `  ${dept}: ${count} employees`).join('\n')}

${employees.length > 0 ? `
Top 5 Highest Paid Employees:
${employees.sort((a, b) => b.baseSalary - a.baseSalary).slice(0, 5).map((emp, i) => `
  ${i + 1}. ${emp.name} (${emp.department})
     Salary: ${formatCurrency(emp.baseSalary, countryCode)}/month
`).join('')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TRANSACTION SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Transactions: ${relevantTransactions.length}

${relevantTransactions.length > 0 ? `
Recent Transactions (Last 10):
${relevantTransactions.slice(0, 10).map(txn => `
  ${txn.date.toLocaleDateString()} - ${txn.type.toUpperCase()}
  Amount: ${formatCurrency(txn.amount, countryCode)}
  ${txn.description}
`).join('\n')}
` : 'No transactions in this period.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FINANCIAL HEALTH INDICATORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Profit Margin: ${parseFloat(profitMargin) > 15 ? 'HEALTHY' : parseFloat(profitMargin) > 5 ? 'MODERATE' : 'NEEDS ATTENTION'}
✓ Credit Utilization: ${parseFloat(avgUtilization) < 30 ? 'EXCELLENT' : parseFloat(avgUtilization) < 50 ? 'GOOD' : 'HIGH'}
✓ Revenue Growth: ${relevantMetrics.length > 1 && relevantMetrics[relevantMetrics.length - 1].totalRevenue > relevantMetrics[0].totalRevenue ? 'POSITIVE' : 'STABLE'}
✓ Payroll Efficiency: ${totalRevenue > 0 && (totalPayroll / totalRevenue) < 0.4 ? 'OPTIMAL' : 'REVIEW NEEDED'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${parseFloat(avgUtilization) > 50 ? '• URGENT: Reduce credit card utilization below 50%\n' : ''}
${parseFloat(profitMargin) < 10 ? '• Review expense categories for optimization opportunities\n' : ''}
${netProfit < 0 ? '• CRITICAL: Implement cost reduction strategies immediately\n' : ''}
${totalRevenue > 0 && (totalPayroll / totalRevenue) > 0.45 ? '• Consider payroll optimization or revenue growth initiatives\n' : ''}
${parseFloat(avgUtilization) < 30 && netProfit > 0 ? '• Financial health is strong - consider expansion opportunities\n' : ''}

═══════════════════════════════════════════════════════
  End of Report
  Generated by AI Financial Assistant
═══════════════════════════════════════════════════════
    `.trim();
  };

  const handleOpenReport = (report?: FinancialReport) => {
    if (!report) return;

    const reportContent = generateComprehensiveReport(report);

    // Create a new window with the report
    const reportWindow = window.open('', '_blank', 'width=800,height=600');
    if (reportWindow) {
      reportWindow.document.write(`
        <html>
          <head>
            <title>${report.title}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                padding: 20px;
                background: #1a1a1a;
                color: #00ff00;
                max-width: 900px;
                margin: 0 auto;
              }
              pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                line-height: 1.6;
              }
              button {
                background: #00ff00;
                color: #1a1a1a;
                border: none;
                padding: 10px 20px;
                font-family: 'Courier New', monospace;
                cursor: pointer;
                margin: 20px 0;
                font-weight: bold;
              }
              button:hover {
                background: #00cc00;
              }
              @media print {
                body {
                  background: white;
                  color: black;
                }
                button {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <button onclick="window.print()">Print Report</button>
            <pre>${reportContent}</pre>
            <button onclick="window.print()">Print Report</button>
          </body>
        </html>
      `);
      reportWindow.document.close();
    }
  };

  // Handler functions for Google services
  const handleToggleService = (serviceType: ServiceType) => {
    setGoogleServices(prev =>
      prev.map(service =>
        service.serviceType === serviceType
          ? {
              ...service,
              isConnected: !service.isConnected,
              syncStatus: !service.isConnected ? 'synced' as const : 'disconnected' as const,
              lastSyncTime: !service.isConnected ? new Date() : undefined,
            }
          : service
      )
    );

    // Add activity feed item
    const service = googleServices.find(s => s.serviceType === serviceType);
    if (service) {
      const newActivity: LiveActivityItem = {
        id: `activity-${Date.now()}`,
        type: 'card_monitored',
        status: 'completed',
        timestamp: new Date(),
        message: `${service.isConnected ? 'Disconnected' : 'Connected'} Google ${serviceType}`,
      };
      setLiveActivities(prev => [newActivity, ...prev]);
    }
  };

  const handleDisconnectService = async (serviceType: ServiceType) => {
    if (confirm(`Are you sure you want to disconnect Google ${serviceType}? You can reconnect anytime.`)) {
      try {
        // Disconnect using real OAuth service (revokes token with Google)
        await disconnectService(serviceType);

        // Check if all services will be disconnected after this action
        const remainingConnected = googleServices.filter(
          s => s.serviceType !== serviceType && s.isConnected
        );

        const willShowOnboarding = remainingConnected.length === 0;

        // Update google services state
        setGoogleServices(prev =>
          prev.map(service =>
            service.serviceType === serviceType
              ? {
                  ...service,
                  isConnected: false,
                  syncStatus: 'disconnected' as const,
                  lastSyncTime: undefined,
                }
              : service
          )
        );

        // Add activity feed item
        const newActivity: LiveActivityItem = {
          id: `activity-${Date.now()}`,
          type: 'card_monitored',
          status: 'completed',
          timestamp: new Date(),
          message: `Disconnected Google ${serviceType}`,
        };
        setLiveActivities(prev => [newActivity, ...prev]);

        // Show onboarding if all services are now disconnected
        // Use setTimeout to ensure state updates complete first
        if (willShowOnboarding) {
          setTimeout(() => {
            setShowOnboarding(true);
          }, 0);
        }
      } catch (error) {
        console.error('Failed to disconnect service:', error);
        alert(`Failed to disconnect service: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const getActivityStatusIcon = (status: LiveActivityItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'upcoming':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
    }
  };

  const getActivityStatusBadge = (status: LiveActivityItem['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500">Upcoming</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
    }
  };

  const getTaskStatusBadge = (status: ManagedTask['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500">Active</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      case 'ignored':
        return <Badge variant="outline">Ignored</Badge>;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const formatNextDate = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  // State for real-time sync timer
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for real-time sync display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Format sync time - shows "5 min ago" up to 1 hour, then shows actual time
  const formatSyncTime = (date: Date) => {
    const now = currentTime;
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Under 1 hour: show in 5-minute increments
    if (diffHours < 1) {
      const roundedMins = Math.floor(diffMins / 5) * 5;
      if (roundedMins === 0) return 'Just now';
      return `${roundedMins} min ago`;
    }

    // Over 1 hour: show actual time and date
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });

    return { time: timeStr, date: dateStr };
  };

  // Get demo accounts
  const demoAccounts = useMemo(() => {
    const stored = localStorage.getItem('demo_accounts');
    return stored ? JSON.parse(stored) : [];
  }, []);

  return (
    <div className="space-y-6">
      {/* Demo Accounts Banner */}
      {demoAccounts.length > 0 && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Testing Mode Active:</strong> Logged in with {demoAccounts.length} demo accounts - {demoAccounts.map((a: { name: string }) => a.name).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Header with Summary */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Zap className="w-6 h-6 text-primary" />
                Your Financial Assistant
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Here's what we're actively doing for you outside this app right now
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Last sync</div>
              {(() => {
                const syncTime = formatSyncTime(initialData.lastGlobalSync);
                if (typeof syncTime === 'string') {
                  return <div className="font-medium">{syncTime}</div>;
                } else {
                  return (
                    <div>
                      <div className="font-medium">{syncTime.time}</div>
                      <div className="text-xs text-muted-foreground/60 mt-0.5">{syncTime.date}</div>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Calendar className="w-4 h-4" />
                Active Reminders
              </div>
              <div className="text-3xl font-bold">{summary.totalActiveReminders}</div>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ListTodo className="w-4 h-4" />
                Active Tasks
              </div>
              <div className="text-3xl font-bold">{summary.totalActiveTasks}</div>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                Reports Generated
              </div>
              <div className="text-3xl font-bold">{summary.totalReportsGenerated}</div>
            </div>
            <div className="bg-background/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Shield className="w-4 h-4" />
                High-Risk Cards
              </div>
              <div className="text-3xl font-bold">{summary.highRiskCardsMonitored}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today & Upcoming - Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Today & Upcoming
          </CardTitle>
          <CardDescription>Live feed showing what we're doing for you</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(showAllActivities ? liveActivities : liveActivities.slice(0, 3)).map((activity: LiveActivityItem) => (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  activity.actionRequired ? 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20' : 'bg-muted/50'
                }`}
              >
                <div className="mt-0.5">{getActivityStatusIcon(activity.status)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.timestamp)}</p>
                </div>
                <div>{getActivityStatusBadge(activity.status)}</div>
              </div>
            ))}
          </div>
          {liveActivities.length > 3 && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllActivities(!showAllActivities)}
              >
                {showAllActivities ? (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Show All ({liveActivities.length} activities)
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar - Active Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Google Calendar - Active Reminders
          </CardTitle>
          <CardDescription>
            {summary.totalActiveReminders} upcoming payment reminder
            {summary.totalActiveReminders !== 1 ? 's' : ''}
            {summary.nextPaymentReminder && (
              <span className="ml-2">
                • Next: {formatNextDate(summary.nextPaymentReminder.reminderDate)}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calendarReminders.map((reminder: CalendarReminder) => (
              <div key={reminder.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {reminder.cardName} •••• {reminder.lastFourDigits}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Due: {reminder.dueDate.toLocaleDateString()} • Reminder:{' '}
                      {formatNextDate(reminder.reminderDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {reminder.isPaused ? (
                      <Badge variant="outline">Paused</Badge>
                    ) : (
                      <Badge className="bg-green-500">Active</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`lead-${reminder.id}`} className="text-xs">
                      Reminder timing:
                    </Label>
                    <Select defaultValue={String(reminder.leadTimeDays)} onValueChange={(value) => handleChangeLeadTime(reminder.id, parseInt(value))}>
                      <SelectTrigger id={`lead-${reminder.id}`} className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day before</SelectItem>
                        <SelectItem value="2">2 days before</SelectItem>
                        <SelectItem value="3">3 days before</SelectItem>
                        <SelectItem value="5">5 days before</SelectItem>
                        <SelectItem value="7">7 days before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" onClick={() => handleTogglePauseReminder(reminder.id)}>
                      {reminder.isPaused ? 'Resume' : 'Pause'}
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Last synced: {formatTimeAgo(reminder.lastSyncTime)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Google Tasks - Managed Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-purple-600" />
            Google Tasks - Managed Actions
          </CardTitle>
          <CardDescription>
            {summary.totalActiveTasks} active task
            {summary.totalActiveTasks !== 1 ? 's' : ''} • Auto-completes after payment confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {managedTasks.map((task: ManagedTask) => (
              <div key={task.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{task.taskTitle}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {task.cardName} •••• {task.lastFourDigits}
                      {task.dueDate && (
                        <span className="ml-2">• Due: {formatNextDate(task.dueDate)}</span>
                      )}
                    </div>
                    {task.completedAt && (
                      <div className="text-xs text-green-600 mt-1">
                        Completed {formatTimeAgo(task.completedAt)}
                        {task.autoCompleted && ' (auto-completed)'}
                      </div>
                    )}
                  </div>
                  <div>{getTaskStatusBadge(task.status)}</div>
                </div>

                {task.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleMarkTaskComplete(task.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleIgnoreTask(task.id)}>
                      Ignore
                    </Button>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Last synced: {formatTimeAgo(task.lastSyncTime)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Google Docs - Records & Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-600" />
            Google Docs - Records & Reports
          </CardTitle>
          <CardDescription>
            {summary.totalReportsGenerated} report
            {summary.totalReportsGenerated !== 1 ? 's' : ''} generated
            {summary.lastReportGenerated && (
              <span className="ml-2">
                • Last: {formatTimeAgo(summary.lastReportGenerated.generatedAt)}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {financialReports.map((report: FinancialReport) => (
              <div key={report.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{report.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Coverage: {report.coveragePeriodStart.toLocaleDateString()} -{' '}
                      {report.coveragePeriodEnd.toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Generated: {formatTimeAgo(report.generatedAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === 'ready' && <Badge className="bg-green-500">Ready</Badge>}
                    {report.status === 'generating' && <Badge className="bg-blue-500">Generating</Badge>}
                    {report.status === 'error' && <Badge className="bg-red-500">Error</Badge>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenReport(report)}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open Report
                  </Button>
                  {report.frequency === 'weekly' && report.nextScheduledReport && (
                    <span className="text-xs text-muted-foreground">
                      Next report: {formatNextDate(report.nextScheduledReport)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`freq-${report.id}`} className="text-xs">
                      Frequency:
                    </Label>
                    <Select defaultValue={report.frequency} onValueChange={(value) => handleChangeReportFrequency(report.id, value as ReportFrequency)}>
                      <SelectTrigger id={`freq-${report.id}`} className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => handleGenerateReport()}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Generate Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trust & Control Footer */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Trust & Control
          </CardTitle>
          <CardDescription>
            Transparency about what we access and what we never touch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {googleServices.map((service: GoogleServiceStatus) => (
              <div key={service.serviceType} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {service.serviceType === 'calendar' && <Calendar className="w-5 h-5 text-blue-600" />}
                    {service.serviceType === 'tasks' && <ListTodo className="w-5 h-5 text-purple-600" />}
                    {service.serviceType === 'docs' && <FileText className="w-5 h-5 text-orange-600" />}
                    <div>
                      <div className="font-medium capitalize">Google {service.serviceType}</div>
                      <div className="text-xs text-muted-foreground">
                        {service.lastSyncTime && `Last sync: ${formatTimeAgo(service.lastSyncTime)}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {service.syncStatus === 'synced' && (
                      <Badge className="bg-green-500">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Synced
                      </Badge>
                    )}
                    {service.syncStatus === 'syncing' && (
                      <Badge className="bg-blue-500">
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Syncing
                      </Badge>
                    )}
                    <Switch checked={service.isConnected} onCheckedChange={() => handleToggleService(service.serviceType)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-medium text-green-600">
                      <Eye className="w-4 h-4" />
                      What We Access
                    </div>
                    <ul className="space-y-1 text-muted-foreground">
                      {service.dataAccessed.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 font-medium text-muted-foreground">
                      <EyeOff className="w-4 h-4" />
                      What We Never Touch
                    </div>
                    <ul className="space-y-1 text-muted-foreground">
                      {service.dataNeverTouched.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground mt-0.5">—</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDisconnectService(service.serviceType)}>
                    <ToggleLeft className="w-3 h-3 mr-1" />
                    Disconnect Service
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Alert className="mt-4 border-primary/20 bg-primary/5">
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <strong>Your privacy matters.</strong> We only access financial data you explicitly share with us. We
              never read your personal documents, emails, or other private information.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
