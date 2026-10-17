/**
 * Upcoming Payments - Sectioned Card Layout
 *
 * Enterprise-grade payment overview designed for high-volume users (CEOs, CFOs, accountants).
 * Optimized for managing 1,000+ card payments with instant scanability.
 *
 * Sections (in priority order):
 * 1. Overdue - Payments past due date
 * 2. Due Soon - Payments due in 1-3 days
 * 3. Upcoming - Payments due in 4-7 days
 * 4. Payment in > 7 Days - Payments due beyond 7 days
 *
 * Design Principles:
 * - Text-only status (no icons, dots, pills, backgrounds)
 * - Compact vertical spacing for fast scanning
 * - Collapsible sections with smart defaults
 * - Executive clean aesthetic
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CompanyCard } from '@/types/financial';
import { formatCurrency } from '@/lib/financial-data';
import { useReminderPreferences } from '@/hooks/use-whatsapp-reminders';

interface Payment {
  cardId: string;
  cardName: string;
  lastFour: string;
  amount: number;
  dueDate: Date;
  daysTillDue: number;
  whatsappReminderScheduled?: boolean;
}

interface UpcomingPaymentsSectionedProps {
  cards: CompanyCard[];
  countryCode: string;
}

export function UpcomingPaymentsSectioned({
  cards,
  countryCode,
}: UpcomingPaymentsSectionedProps) {
  // Get WhatsApp reminder preferences
  const { data: preferences } = useReminderPreferences();
  const whatsappRemindersEnabled = preferences?.remindersEnabled || false;
  // Calculate payments
  const payments: Payment[] = cards
    .filter((card) => card.cardType === 'credit' && card.dueDate && card.minimumPayment && card.minimumPayment > 0)
    .map((card) => {
      const daysTillDue = Math.ceil(
        (new Date(card.dueDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        cardId: card.id,
        cardName: card.cardholderName || 'Credit Card',
        lastFour: card.lastFourDigits,
        amount: card.minimumPayment || 0,
        dueDate: new Date(card.dueDate!),
        daysTillDue,
        whatsappReminderScheduled: whatsappRemindersEnabled && daysTillDue <= 7,
      };
    })
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  // Section payments
  const overdue = payments.filter((p) => p.daysTillDue < 0);
  const dueSoon = payments.filter((p) => p.daysTillDue >= 0 && p.daysTillDue <= 3);
  const upcoming = payments.filter((p) => p.daysTillDue >= 4 && p.daysTillDue <= 7);
  const later = payments.filter((p) => p.daysTillDue > 7);

  // All sections closed by default; user must explicitly open them.
  // Component is remounted (via key prop from parent) when the tab changes,
  // which naturally resets all section states back to closed.
  const [overdueExpanded, setOverdueExpanded] = useState(false);
  const [dueSoonExpanded, setDueSoonExpanded] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(false);

  return (
    <div className="space-y-1">
      {payments.length === 0 && (
        <div className="text-sm text-gray-600 dark:text-muted-foreground py-8 text-center">No upcoming payments scheduled</div>
      )}

      {/* Overdue Section */}
      {overdue.length > 0 && (
        <PaymentSection
          title="Overdue"
          count={overdue.length}
          payments={overdue}
          expanded={overdueExpanded}
          onToggle={() => setOverdueExpanded(!overdueExpanded)}
          countryCode={countryCode}
          sectionType="overdue"
        />
      )}

      {/* Due Soon Section */}
      {dueSoon.length > 0 && (
        <PaymentSection
          title="Due Soon"
          count={dueSoon.length}
          payments={dueSoon}
          expanded={dueSoonExpanded}
          onToggle={() => setDueSoonExpanded(!dueSoonExpanded)}
          countryCode={countryCode}
          sectionType="due-soon"
        />
      )}

      {/* Upcoming Section */}
      {upcoming.length > 0 && (
        <PaymentSection
          title="Upcoming"
          count={upcoming.length}
          payments={upcoming}
          expanded={upcomingExpanded}
          onToggle={() => setUpcomingExpanded(!upcomingExpanded)}
          countryCode={countryCode}
          sectionType="upcoming"
        />
      )}

      {/* Later Section */}
      {later.length > 0 && (
        <PaymentSection
          title="Payment in > 7 Days"
          count={later.length}
          payments={later}
          expanded={laterExpanded}
          onToggle={() => setLaterExpanded(!laterExpanded)}
          countryCode={countryCode}
          sectionType="later"
        />
      )}
    </div>
  );
}

interface PaymentSectionProps {
  title: string;
  count: number;
  payments: Payment[];
  expanded: boolean;
  onToggle: () => void;
  countryCode: string;
  sectionType: 'overdue' | 'due-soon' | 'upcoming' | 'later';
}

function PaymentSection({
  title,
  count,
  payments,
  expanded,
  onToggle,
  countryCode,
  sectionType,
}: PaymentSectionProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-muted-foreground" />
          )}
          <span className="font-medium text-sm text-gray-900 dark:text-white">{title}</span>
          <Badge variant="outline" className="text-xs border-gray-300 dark:border-gray-700">
            {count}
          </Badge>
        </div>
      </button>

      {/* Section Content */}
      {expanded && (
        <div className="space-y-0.5 pb-2">
          {payments.map((payment) => (
            <PaymentRow
              key={payment.cardId}
              payment={payment}
              countryCode={countryCode}
              sectionType={sectionType}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PaymentRowProps {
  payment: Payment;
  countryCode: string;
  sectionType: 'overdue' | 'due-soon' | 'upcoming' | 'later';
}

function PaymentRow({ payment, countryCode, sectionType }: PaymentRowProps) {
  // Status text with color (text-only, no backgrounds/pills)
  const getStatusText = () => {
    switch (sectionType) {
      case 'overdue':
        return <span className="text-red-600 dark:text-red-400 text-xs font-medium">Overdue</span>;
      case 'due-soon':
        return <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Due Soon</span>;
      case 'upcoming':
        return <span className="text-muted-foreground text-xs">Upcoming</span>;
      case 'later':
        return <span className="text-muted-foreground/70 text-xs">Scheduled</span>;
    }
  };

  // Format due date
  const formatDueDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Card Name & Last Four */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {payment.cardName}
          </span>
          <span className="text-xs text-gray-600 dark:text-muted-foreground font-mono">•••• {payment.lastFour}</span>
        </div>

        {/* Center: Amount */}
        <div className="text-sm font-semibold text-gray-900 dark:text-white">
          {formatCurrency(payment.amount, countryCode)}
        </div>

        {/* Right: Due Date */}
        <div className="text-xs text-gray-600 dark:text-muted-foreground min-w-[80px] text-right">
          {formatDueDate(payment.dueDate)}
        </div>

        {/* Status */}
        <div className="min-w-[70px] text-right">
          {getStatusText()}
        </div>
      </div>

      {/* WhatsApp Reminder Indicator (if enabled) */}
      {payment.whatsappReminderScheduled && (
        <div className="text-xs text-gray-500 dark:text-muted-foreground/70 mt-1 pl-3">
          WhatsApp reminder scheduled
        </div>
      )}
    </div>
  );
}
