import { useState } from 'react';
import type { PaymentAlert, CompanyCard } from '@/types/financial';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, getDaysUntilDue } from '@/lib/financial-data';
import { AlertTriangle, X, CreditCard, Clock } from 'lucide-react';

interface PaymentAlertsBannerProps {
  alerts: PaymentAlert[];
  cards: CompanyCard[];
}

export function PaymentAlertsBanner({ alerts, cards }: PaymentAlertsBannerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const activeAlerts = alerts.filter(
    (alert) =>
      !dismissedAlerts.has(alert.id) &&
      alert.alertStatus === 'sent' &&
      getDaysUntilDue(alert.dueDate) >= 0
  );

  if (activeAlerts.length === 0) {
    return null;
  }

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertId]));
  };

  const getAlertSeverity = (dueDate: Date) => {
    const daysUntil = getDaysUntilDue(dueDate);
    if (daysUntil === 0) return 'critical';
    if (daysUntil === 1) return 'high';
    return 'medium';
  };

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-950 text-orange-900 dark:text-orange-100';
      default:
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100';
    }
  };

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert) => {
        const card = cards.find((c) => c.id === alert.cardId);
        if (!card) return null;

        const severity = getAlertSeverity(alert.dueDate);
        const daysUntil = getDaysUntilDue(alert.dueDate);

        return (
          <Alert key={alert.id} className={getAlertStyles(severity)}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div className="flex-1">
                <AlertTitle className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Due for Card •••• {card.lastFourDigits}
                  {daysUntil === 0 && (
                    <Badge variant="destructive" className="ml-2">
                      DUE TODAY
                    </Badge>
                  )}
                  {daysUntil === 1 && (
                    <Badge variant="destructive" className="ml-2 bg-orange-600">
                      DUE TOMORROW
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-semibold">Cardholder: </span>
                      {card.cardholderName}
                    </div>
                    <div>
                      <span className="font-semibold">Bank: </span>
                      {card.issuingBank}
                    </div>
                    <div>
                      <span className="font-semibold">Account: </span>
                      {card.linkedBankAccount}
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="font-semibold">Due Date: </span>
                      {formatDate(alert.dueDate)}
                      {daysUntil > 0 && (
                        <span className="text-xs">
                          ({daysUntil} {daysUntil === 1 ? 'day' : 'days'} remaining)
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold">Minimum Payment: </span>
                      <span className="text-base font-bold">{formatCurrency(alert.minimumPayment)}</span>
                    </div>
                  </div>
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.id)}
                className="text-current hover:bg-black/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}
