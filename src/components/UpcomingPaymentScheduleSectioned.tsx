import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { CompanyCard } from '@/types/financial';
import { formatCurrency, getDaysUntilDue } from '@/lib/financial-data';

interface UpcomingPaymentScheduleSectionedProps {
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
}

interface PaymentWithDays extends CompanyCard {
  daysUntil: number;
}

export function UpcomingPaymentScheduleSectioned({
  cards,
  countryCode,
  locale,
}: UpcomingPaymentScheduleSectionedProps) {
  // Calculate upcoming payments with days until due
  const upcomingPayments: PaymentWithDays[] = useMemo(() => {
    return cards
      .filter((card) => card.dueDate && card.paymentStatus === 'unpaid')
      .map((card) => ({
        ...card,
        daysUntil: getDaysUntilDue(card.dueDate!),
      }))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [cards]);

  // Section payments into 3 time-based groups
  const lessThan7Days = useMemo(
    () => upcomingPayments.filter((p) => p.daysUntil < 7),
    [upcomingPayments]
  );

  const lessThan14Days = useMemo(
    () => upcomingPayments.filter((p) => p.daysUntil >= 7 && p.daysUntil < 14),
    [upcomingPayments]
  );

  const lessThan30Days = useMemo(
    () => upcomingPayments.filter((p) => p.daysUntil >= 14 && p.daysUntil < 30),
    [upcomingPayments]
  );

  // Collapsible state - ALL sections collapsed by default (global UX rule)
  const [sevenDaysExpanded, setSevenDaysExpanded] = useState(false);
  const [fourteenDaysExpanded, setFourteenDaysExpanded] = useState(false);
  const [thirtyDaysExpanded, setThirtyDaysExpanded] = useState(false);

  // If no upcoming payments, show empty state
  if (upcomingPayments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Payment Schedule</CardTitle>
          <CardDescription>Due dates and amounts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No upcoming payments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Payment Schedule</CardTitle>
        <CardDescription>Organized by urgency - {upcomingPayments.length} total payments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Section 1: < 7 Days (Most Urgent) */}
        {lessThan7Days.length > 0 && (
          <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setSevenDaysExpanded(!sevenDaysExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {sevenDaysExpanded ? (
                  <ChevronDown className="w-5 h-5 text-red-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-red-600 transition-transform duration-150" />
                )}
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900 dark:text-red-100">Next 7 Days</span>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-red-300">
                  {lessThan7Days.length}
                </Badge>
              </div>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {formatCurrency(
                  lessThan7Days.reduce((sum, p) => sum + (p.outstandingDebt || 0), 0),
                  countryCode
                )}
              </span>
            </button>
            {sevenDaysExpanded && (
              <div className="border-t-2 border-red-200 p-4 space-y-3 bg-white dark:bg-red-950/10">
                {lessThan7Days.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    countryCode={countryCode}
                    isUrgent={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: 7-14 Days */}
        {lessThan14Days.length > 0 && (
          <div className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setFourteenDaysExpanded(!fourteenDaysExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {fourteenDaysExpanded ? (
                  <ChevronDown className="w-5 h-5 text-orange-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-orange-600 transition-transform duration-150" />
                )}
                <span className="font-semibold text-orange-900 dark:text-orange-100">7-14 Days</span>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-orange-300">
                  {lessThan14Days.length}
                </Badge>
              </div>
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {formatCurrency(
                  lessThan14Days.reduce((sum, p) => sum + (p.outstandingDebt || 0), 0),
                  countryCode
                )}
              </span>
            </button>
            {fourteenDaysExpanded && (
              <div className="border-t-2 border-orange-200 p-4 space-y-3 bg-white dark:bg-orange-950/10">
                {lessThan14Days.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    countryCode={countryCode}
                    isUrgent={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 3: 14-30 Days */}
        {lessThan30Days.length > 0 && (
          <div className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setThirtyDaysExpanded(!thirtyDaysExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {thirtyDaysExpanded ? (
                  <ChevronDown className="w-5 h-5 text-amber-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-amber-600 transition-transform duration-150" />
                )}
                <span className="font-semibold text-amber-900 dark:text-amber-100">14-30 Days</span>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-amber-300">
                  {lessThan30Days.length}
                </Badge>
              </div>
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {formatCurrency(
                  lessThan30Days.reduce((sum, p) => sum + (p.outstandingDebt || 0), 0),
                  countryCode
                )}
              </span>
            </button>
            {thirtyDaysExpanded && (
              <div className="border-t-2 border-amber-200 p-4 space-y-3 bg-white dark:bg-amber-950/10">
                {lessThan30Days.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    countryCode={countryCode}
                    isUrgent={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual payment card component
function PaymentCard({
  payment,
  countryCode,
  isUrgent,
}: {
  payment: PaymentWithDays;
  countryCode: string;
  isUrgent: boolean;
}) {
  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-gray-900/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">****{payment.lastFourDigits}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {payment.cardholderName} • {payment.issuingBank}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Due in:</span>
              <span className={`ml-1 font-medium ${isUrgent ? 'text-red-600 dark:text-red-400' : ''}`}>
                {payment.daysUntil} {payment.daysUntil === 1 ? 'day' : 'days'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Min:</span>
              <span className="ml-1 font-medium">
                {formatCurrency(payment.minimumPayment, countryCode)}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold">
            {formatCurrency(payment.outstandingDebt || 0, countryCode)}
          </div>
          <p className="text-xs text-muted-foreground">Full balance</p>
        </div>
      </div>
    </div>
  );
}
