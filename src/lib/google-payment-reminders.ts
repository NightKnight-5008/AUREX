import type { CompanyCard, FinancialTransaction, Employee } from '@/types/financial';
import type { PaymentReminder, PaymentReminderType, ReminderGenerationResult } from '@/types/google-integrations';
import { formatCurrencyWithLocale, formatDateWithLocale } from './country-config';

/**
 * Payment Reminder Service
 *
 * Generates professional payment reminders for Google Calendar and Google Tasks
 * with structured, actionable context for financial obligations.
 */

// ===============================================
// REMINDER GENERATION FOR CARDS
// ===============================================

/**
 * Generate payment reminders for all company cards
 */
export function generateCardPaymentReminders(
  cards: CompanyCard[],
  countryCode: string = 'EG',
  locale?: string
): PaymentReminder[] {
  const reminders: PaymentReminder[] = [];
  const today = new Date();

  for (const card of cards) {
    if (card.cardType !== 'credit' || !card.dueDate) continue;

    const daysUntilDue = Math.ceil((card.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;
    const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 7;

    // Determine payment status
    let status: 'paid' | 'unpaid' | 'overdue' = card.paymentStatus;
    if (isOverdue && card.paymentStatus === 'unpaid') {
      status = 'overdue';
    }

    // Determine reminder type and priority
    let type: PaymentReminderType;
    let priority: 'low' | 'medium' | 'high' | 'critical';
    let amount: number;

    if (isOverdue) {
      type = 'card_overdue';
      priority = 'critical';
      amount = card.outstandingDebt || 0;
    } else if (card.paymentStatus === 'unpaid') {
      // Check if minimum payment or full payment
      const shouldPayFull = (card.outstandingDebt || 0) > (card.creditLimit * 0.7); // High utilization
      type = shouldPayFull ? 'card_full' : 'card_minimum';
      priority = isUrgent ? 'high' : 'medium';
      amount = shouldPayFull ? (card.outstandingDebt || 0) : card.minimumPayment;
    } else {
      continue; // Skip paid cards
    }

    // Generate structured title
    const title = generateCardReminderTitle(card, type, amount, countryCode, locale);

    // Generate detailed description
    const description = generateCardReminderDescription(card, type, amount, daysUntilDue, countryCode, locale);

    // App link back to card details
    const appLink = `/dashboard?tab=cards&cardId=${card.id}`;

    reminders.push({
      id: `card-${card.id}-${type}`,
      type,
      title,
      description,
      amount,
      dueDate: card.dueDate,
      status,
      cardId: card.id,
      cardLastFour: card.lastFourDigits,
      cardholderName: card.cardholderName,
      bankName: card.issuingBank,
      appLink,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return reminders;
}

/**
 * Generate reminder title for card payment
 */
function generateCardReminderTitle(
  card: CompanyCard,
  type: PaymentReminderType,
  amount: number,
  countryCode: string,
  locale?: string
): string {
  const paymentType = type === 'card_minimum' ? 'Minimum Payment' :
                     type === 'card_full' ? 'Full Payment' :
                     'OVERDUE Payment';

  const formattedAmount = formatCurrencyWithLocale(amount, countryCode, locale);

  return `${paymentType} – ${card.cardholderName} – ****${card.lastFourDigits}
Amount: ${formattedAmount}
Bank: ${card.issuingBank}`;
}

/**
 * Generate detailed description for card payment reminder
 */
function generateCardReminderDescription(
  card: CompanyCard,
  type: PaymentReminderType,
  amount: number,
  daysUntilDue: number,
  countryCode: string,
  locale?: string
): string {
  const formattedAmount = formatCurrencyWithLocale(amount, countryCode, locale);
  const formattedDueDate = formatDateWithLocale(card.dueDate!, countryCode, locale);
  const formattedOutstanding = formatCurrencyWithLocale(card.outstandingDebt || 0, countryCode, locale);
  const formattedLimit = formatCurrencyWithLocale(card.creditLimit, countryCode, locale);

  const urgencyText = type === 'card_overdue'
    ? `OVERDUE by ${Math.abs(daysUntilDue)} days`
    : daysUntilDue <= 7
    ? `Due in ${daysUntilDue} days`
    : `Due in ${daysUntilDue} days`;

  const paymentTypeText = type === 'card_minimum'
    ? 'Minimum Payment Required'
    : type === 'card_full'
    ? 'Full Payment Recommended (High Utilization)'
    : 'OVERDUE - Immediate Action Required';

  return `${paymentTypeText}

CARD DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Cardholder: ${card.cardholderName}
Card: ****${card.lastFourDigits}
Bank: ${card.issuingBank}
Card Type: ${card.cardType === 'credit' ? 'Credit Card' : 'Debit Card'}

PAYMENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Amount Due: ${formattedAmount}
Total Outstanding: ${formattedOutstanding}
Credit Limit: ${formattedLimit}
Due Date: ${formattedDueDate}
Status: ${urgencyText}

${type === 'card_overdue' ? `
LATE FEES MAY APPLY
This payment is overdue. Pay immediately to avoid:
• Additional late fees
• Interest charges
• Negative credit impact
• Account restrictions
` : ''}

Take Action: Open app to view details and make payment`;
}

// ===============================================
// REMINDER GENERATION FOR PAYROLL
// ===============================================

/**
 * Generate payroll payment reminders
 */
export function generatePayrollReminders(
  employees: Employee[],
  payrollDate: Date,
  countryCode: string = 'EG',
  locale?: string
): PaymentReminder[] {
  const reminders: PaymentReminder[] = [];
  const today = new Date();
  const daysUntilPayroll = Math.ceil((payrollDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Group by department for batch reminders
  const departmentTotals = employees.reduce((acc, emp) => {
    if (!acc[emp.department]) {
      acc[emp.department] = { count: 0, total: 0, employees: [] };
    }
    acc[emp.department].count++;
    acc[emp.department].total += emp.baseSalary;
    acc[emp.department].employees.push(emp);
    return acc;
  }, {} as Record<string, { count: number; total: number; employees: Employee[] }>);

  // Create reminder for each department
  for (const [department, data] of Object.entries(departmentTotals)) {
    const title = `Payroll Due – ${department} Department
${data.count} Employees • ${formatCurrencyWithLocale(data.total, countryCode, locale)}`;

    const description = `PAYROLL PAYMENT DUE

DEPARTMENT: ${department}
━━━━━━━━━━━━━━━━━━━━━━
Employees: ${data.count}
Total Amount: ${formatCurrencyWithLocale(data.total, countryCode, locale)}
Payment Date: ${formatDateWithLocale(payrollDate, countryCode, locale)}
Days Until Due: ${daysUntilPayroll}

EMPLOYEES
━━━━━━━━━━━━━━━━━━━━━━
${data.employees.slice(0, 10).map(emp =>
  `• ${emp.name} - ${formatCurrencyWithLocale(emp.baseSalary, countryCode, locale)}`
).join('\n')}${data.employees.length > 10 ? `\n... and ${data.employees.length - 10} more` : ''}

Take Action: Open app to process payroll`;

    reminders.push({
      id: `payroll-${department}-${payrollDate.toISOString()}`,
      type: 'payroll',
      title,
      description,
      amount: data.total,
      dueDate: payrollDate,
      status: daysUntilPayroll < 0 ? 'overdue' : 'unpaid',
      priority: daysUntilPayroll <= 3 ? 'critical' : daysUntilPayroll <= 7 ? 'high' : 'medium',
      appLink: '/dashboard?tab=payroll',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return reminders;
}

// ===============================================
// REMINDER GENERATION FOR TAXES
// ===============================================

/**
 * Generate tax payment reminders
 */
export function generateTaxReminders(
  taxObligations: Array<{
    type: string;
    amount: number;
    dueDate: Date;
    status: 'paid' | 'pending';
  }>,
  countryCode: string = 'EG',
  locale?: string
): PaymentReminder[] {
  const reminders: PaymentReminder[] = [];
  const today = new Date();

  for (const tax of taxObligations) {
    if (tax.status === 'paid') continue;

    const daysUntilDue = Math.ceil((tax.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;

    const title = `${isOverdue ? 'OVERDUE ' : ''}Tax Payment – ${tax.type}
Amount: ${formatCurrencyWithLocale(tax.amount, countryCode, locale)}
Due: ${formatDateWithLocale(tax.dueDate, countryCode, locale)}`;

    const description = `${isOverdue ? 'OVERDUE ' : ''}TAX PAYMENT REQUIRED

TAX DETAILS
━━━━━━━━━━━━━━━━━━━━━━
Type: ${tax.type}
Amount: ${formatCurrencyWithLocale(tax.amount, countryCode, locale)}
Due Date: ${formatDateWithLocale(tax.dueDate, countryCode, locale)}
Status: ${isOverdue ? `OVERDUE by ${Math.abs(daysUntilDue)} days` : `Due in ${daysUntilDue} days`}

${isOverdue ? `
PENALTIES MAY APPLY
This tax payment is overdue. Pay immediately to avoid:
• Penalty fees
• Interest charges
• Legal consequences
• Business operation restrictions
` : ''}

📱 Take Action: Open app to process tax payment`;

    reminders.push({
      id: `tax-${tax.type}-${tax.dueDate.toISOString()}`,
      type: 'tax',
      title,
      description,
      amount: tax.amount,
      dueDate: tax.dueDate,
      status: isOverdue ? 'overdue' : 'unpaid',
      taxType: tax.type,
      priority: isOverdue ? 'critical' : daysUntilDue <= 7 ? 'high' : 'medium',
      appLink: '/dashboard?tab=taxes',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return reminders;
}

// ===============================================
// CALENDAR EVENT FORMATTING
// ===============================================

/**
 * Format reminder as Google Calendar event
 */
export function formatAsCalendarEvent(reminder: PaymentReminder) {
  // Set reminder times based on priority
  const reminderMinutes = reminder.priority === 'critical' ? [1440, 720, 180] : // 1 day, 12 hours, 3 hours
                          reminder.priority === 'high' ? [1440, 360] : // 1 day, 6 hours
                          [1440]; // 1 day

  // Color coding: 11=red (overdue/critical), 5=yellow (high), 10=green (paid), 9=blue (medium)
  const colorId = reminder.status === 'overdue' || reminder.priority === 'critical' ? '11' :
                  reminder.priority === 'high' ? '5' :
                  reminder.status === 'paid' ? '10' : '9';

  // Set event time to 9 AM on due date
  const startDateTime = new Date(reminder.dueDate);
  startDateTime.setHours(9, 0, 0, 0);
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(10, 0, 0, 0);

  return {
    summary: reminder.title,
    description: reminder.description,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Africa/Cairo',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Africa/Cairo',
    },
    reminders: {
      useDefault: false,
      overrides: reminderMinutes.map(minutes => ({
        method: 'popup' as const,
        minutes,
      })),
    },
    colorId,
    extendedProperties: {
      private: {
        reminderId: reminder.id,
        reminderType: reminder.type,
        cardId: reminder.cardId || '',
        priority: reminder.priority,
        appLink: reminder.appLink || '',
      },
    },
  };
}

/**
 * Format reminder as Google Task
 */
export function formatAsTask(reminder: PaymentReminder): {
  title: string;
  notes: string;
  due: string;
  status: 'needsAction' | 'completed';
} {
  return {
    title: reminder.title,
    notes: reminder.description,
    due: reminder.dueDate.toISOString(),
    status: reminder.status === 'paid' ? ('completed' as const) : ('needsAction' as const),
  };
}

// ===============================================
// REMINDER SYNC LOGIC
// ===============================================

/**
 * Determine which reminders need to be created, updated, or deleted
 */
export function syncReminders(
  currentReminders: PaymentReminder[],
  existingCalendarEvents: Array<{ id: string; extendedProperties?: { private?: Record<string, string> } }>,
  existingTasks: Array<{ id: string; title?: string }>
): ReminderGenerationResult {
  const result: ReminderGenerationResult = {
    created: [],
    updated: [],
    deleted: [],
    errors: [],
  };

  // Map existing events by reminder ID
  const existingEventMap = new Map(
    existingCalendarEvents
      .filter(e => e.extendedProperties?.private?.reminderId)
      .map(e => [e.extendedProperties!.private!.reminderId, e.id])
  );

  // Determine what to create/update
  for (const reminder of currentReminders) {
    if (existingEventMap.has(reminder.id)) {
      // Update existing
      reminder.calendarEventId = existingEventMap.get(reminder.id);
      result.updated.push(reminder);
      existingEventMap.delete(reminder.id);
    } else {
      // Create new
      result.created.push(reminder);
    }
  }

  // Delete orphaned events
  result.deleted = Array.from(existingEventMap.values());

  return result;
}
