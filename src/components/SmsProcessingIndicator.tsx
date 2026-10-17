import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { getSmsProcessingSummary } from '@/lib/sms-processor';
import type { SmsEvent, CompanyCard } from '@/types/financial';

interface SmsProcessingIndicatorProps {
  smsEvents: SmsEvent[];
  cards: CompanyCard[];
}

export function SmsProcessingIndicator({ smsEvents, cards }: SmsProcessingIndicatorProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [summary, setSummary] = useState(() => getSmsProcessingSummary(smsEvents, cards));

  useEffect(() => {
    const newSummary = getSmsProcessingSummary(smsEvents, cards);

    // Check if processing summary changed
    if (JSON.stringify(newSummary) !== JSON.stringify(summary)) {
      setShowAnimation(true);
      setSummary(newSummary);

      // Hide animation after 3 seconds
      const timer = setTimeout(() => setShowAnimation(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [smsEvents, cards]);

  if (smsEvents.length === 0) {
    return null;
  }

  return (
    <Card
      className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 transition-all duration-300 ${
        showAnimation ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''
      }`}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-blue-100 dark:bg-blue-900 ${showAnimation ? 'animate-pulse' : ''}`}>
              <RefreshCw className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${showAnimation ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">SMS Auto-Processing Active</h3>
                {showAnimation && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 animate-pulse">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Updated
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Cards are automatically updated based on incoming SMS messages
              </p>
            </div>
          </div>

          {/* Processing Stats */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-foreground">{summary.totalProcessed}</div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-green-600 dark:text-green-400">{summary.fullPayments}</div>
              <div className="text-xs text-muted-foreground">Full Paid</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-orange-600 dark:text-orange-400">{summary.partialPayments}</div>
              <div className="text-xs text-muted-foreground">Partial</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600 dark:text-blue-400">{summary.limitUpdates}</div>
              <div className="text-xs text-muted-foreground">Limits</div>
            </div>
            {summary.failed > 0 && (
              <div className="text-center">
                <div className="font-bold text-lg text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {summary.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            )}
          </div>
        </div>

        {/* Processing Details */}
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400"></div>
              <span>Full payment → Status: Paid, Debt: 0</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400"></div>
              <span>Partial payment → Status: Unpaid, Update metrics</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
              <span>Balance/Limit updates → Auto-sync</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
