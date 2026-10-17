/**
 * Upcoming Payment Reminders Component
 *
 * Displays list of upcoming WhatsApp payment reminders with delivery status
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useUpcomingReminders, useMarkPaymentPaid, type PaymentReminder } from '@/hooks/use-whatsapp-reminders';
import { formatCurrency } from '@/lib/financial-data';

interface UpcomingRemindersProps {
  limit?: number;
  countryCode?: string;
}

export function UpcomingReminders({ limit = 5, countryCode = 'US' }: UpcomingRemindersProps) {
  const { data: reminders, isLoading, refetch, isRefetching } = useUpcomingReminders({ limit });
  const { mutateAsync: markPaid, isPending: isMarkingPaid } = useMarkPaymentPaid();

  const handleMarkPaid = async (reminderId: string) => {
    try {
      await markPaid(reminderId);
      refetch(); // Refresh list after marking as paid
    } catch (error) {
      console.error('Failed to mark payment as paid:', error);
    }
  };

  const getStatusBadge = (reminder: PaymentReminder) => {
    if (reminder.paymentStatus === 'paid') {
      return (
        <Badge variant="default" className="bg-green-600">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Paid
        </Badge>
      );
    }

    if (reminder.paymentStatus === 'overdue') {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Overdue
        </Badge>
      );
    }

    if (reminder.reminderSent) {
      return (
        <Badge variant="default" className="bg-blue-600">
          <MessageSquare className="mr-1 h-3 w-3" />
          Sent
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="mr-1 h-3 w-3" />
        Scheduled
      </Badge>
    );
  };

  const getDeliveryStatusBadge = (deliveryStatus: string) => {
    switch (deliveryStatus) {
      case 'delivered':
        return (
          <Badge variant="outline" className="border-green-600 text-green-600">
            Delivered
          </Badge>
        );
      case 'sent':
        return (
          <Badge variant="outline" className="border-blue-600 text-blue-600">
            Sent
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="border-red-600 text-red-600">
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-gray-400 text-gray-600">
            Pending
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 0) return `In ${diffDays} days`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Payment Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasReminders = reminders && reminders.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Upcoming Payment Reminders</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          WhatsApp reminders scheduled for your payment due dates
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasReminders && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No upcoming payment reminders. Reminders are automatically created when you add credit card
              payments.
            </AlertDescription>
          </Alert>
        )}

        {hasReminders && (
          <div className="space-y-4">
            {reminders.map((reminder) => (
              <div
                key={reminder.reminderId}
                className="flex items-start justify-between rounded-lg border p-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {formatCurrency(reminder.paymentAmount, countryCode)}
                    </span>
                    {getStatusBadge(reminder)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Due: {formatDate(reminder.paymentDueDate)}</span>
                    </div>
                    {reminder.reminderSent && reminder.reminderSentAt && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>Sent: {formatDate(reminder.reminderSentAt)}</span>
                      </div>
                    )}
                  </div>

                  {reminder.reminderSent && (
                    <div className="flex items-center gap-2 text-sm">
                      <span>Delivery:</span>
                      {getDeliveryStatusBadge(reminder.deliveryStatus)}
                      {reminder.attemptCount > 1 && (
                        <span className="text-muted-foreground">
                          ({reminder.attemptCount} attempts)
                        </span>
                      )}
                    </div>
                  )}

                  {reminder.deliveryError && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        {reminder.deliveryError}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {reminder.paymentStatus === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkPaid(reminder.reminderId)}
                    disabled={isMarkingPaid}
                  >
                    {isMarkingPaid ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Mark Paid'
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
