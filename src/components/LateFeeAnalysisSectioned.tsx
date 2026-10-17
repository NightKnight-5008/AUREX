import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ChevronDown, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react';
import type { CompanyCard } from '@/types/financial';
import { formatCurrencyWithLocale } from '@/lib/country-config';

interface LateFeeAnalysisSectionedProps {
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
}

interface LateFeeData {
  cardId: string;
  lastFourDigits: string;
  issuingBank: string;
  lateFees: number;
  totalHistorical: number;
}

export function LateFeeAnalysisSectioned({
  cards,
  countryCode,
  locale,
}: LateFeeAnalysisSectionedProps) {
  // Collapsible section state - ALL sections collapsed by default (global UX rule)
  const [top1PercentExpanded, setTop1PercentExpanded] = useState(false);
  const [top20PercentExpanded, setTop20PercentExpanded] = useState(false);
  const [remainingExpanded, setRemainingExpanded] = useState(false);

  // Generate simulated late fees data (would come from transaction history in production)
  const lateFeesData: LateFeeData[] = cards
    .map(card => ({
      cardId: card.id,
      lastFourDigits: card.lastFourDigits,
      issuingBank: card.issuingBank,
      lateFees: Math.random() * 500, // Current month
      totalHistorical: Math.random() * 2000, // All time
    }))
    .sort((a, b) => b.lateFees - a.lateFees); // Sort by highest late fees first

  // Calculate tier thresholds
  const totalCards = lateFeesData.length;
  const top1PercentCount = Math.max(1, Math.ceil(totalCards * 0.01)); // At least 1 card
  const top20PercentCount = Math.max(1, Math.ceil(totalCards * 0.20)); // At least 1 card

  // Divide into tiers (sorted highest to lowest)
  const top1Percent = lateFeesData.slice(0, top1PercentCount);
  const top20Percent = lateFeesData.slice(top1PercentCount, top20PercentCount);
  const remaining = lateFeesData.slice(top20PercentCount);

  // Calculate totals per tier
  const top1Total = top1Percent.reduce((sum, lf) => sum + lf.lateFees, 0);
  const top20Total = top20Percent.reduce((sum, lf) => sum + lf.lateFees, 0);
  const remainingTotal = remaining.reduce((sum, lf) => sum + lf.lateFees, 0);

  // Render individual card late fee row
  const renderLateFeeCard = (lf: LateFeeData) => (
    <div
      key={lf.cardId}
      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 ease-in-out"
    >
      <div className="flex items-center gap-3">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <div>
          <div className="font-medium text-sm">****{lf.lastFourDigits}</div>
          <p className="text-xs text-muted-foreground">{lf.issuingBank}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-red-600 dark:text-red-400">
          {formatCurrencyWithLocale(lf.lateFees, countryCode, locale)} this month
        </div>
        <p className="text-xs text-muted-foreground">
          {formatCurrencyWithLocale(lf.totalHistorical, countryCode, locale)} total
        </p>
      </div>
    </div>
  );

  // Render collapsible section
  const renderSection = (
    title: string,
    description: string,
    count: number,
    total: number,
    data: LateFeeData[],
    expanded: boolean,
    setExpanded: (value: boolean) => void,
    colorScheme: 'red' | 'orange' | 'gray'
  ) => {
    const borderColors = {
      red: 'border-red-500 dark:border-red-600',
      orange: 'border-orange-500 dark:border-orange-600',
      gray: 'border-gray-400 dark:border-gray-600',
    };

    const bgColors = {
      red: 'bg-red-50 dark:bg-red-950/30',
      orange: 'bg-orange-50 dark:bg-orange-950/30',
      gray: 'bg-gray-50 dark:bg-gray-900/30',
    };

    const textColors = {
      red: 'text-red-700 dark:text-red-300',
      orange: 'text-orange-700 dark:text-orange-300',
      gray: 'text-gray-700 dark:text-gray-300',
    };

    const iconColors = {
      red: 'text-red-600 dark:text-red-400',
      orange: 'text-orange-600 dark:text-orange-400',
      gray: 'text-gray-600 dark:text-gray-400',
    };

    return (
      <div className={`border-2 rounded-lg ${borderColors[colorScheme]} ${bgColors[colorScheme]}`}>
        {/* Section Header - Collapsible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity duration-150 ease-in-out"
        >
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDown className={`w-5 h-5 ${iconColors[colorScheme]}`} />
            ) : (
              <ChevronRight className={`w-5 h-5 ${iconColors[colorScheme]}`} />
            )}
            {colorScheme === 'red' && <AlertTriangle className={`w-5 h-5 ${iconColors[colorScheme]}`} />}
            {colorScheme === 'orange' && <TrendingUp className={`w-5 h-5 ${iconColors[colorScheme]}`} />}
            <div className="text-left">
              <div className={`font-bold text-base ${textColors[colorScheme]}`}>{title}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-white dark:bg-gray-900">
              {count} {count === 1 ? 'card' : 'cards'}
            </Badge>
            <div className="text-right">
              <div className={`font-bold text-sm ${textColors[colorScheme]}`}>
                {formatCurrencyWithLocale(total, countryCode, locale)}
              </div>
              <p className="text-xs text-muted-foreground">this month</p>
            </div>
          </div>
        </button>

        {/* Section Content - Cards List */}
        {expanded && data.length > 0 && (
          <div className="px-4 pb-4 space-y-2">
            {data.map(renderLateFeeCard)}
          </div>
        )}

        {/* Empty State */}
        {expanded && data.length === 0 && (
          <div className="px-4 pb-4 text-center text-sm text-muted-foreground">
            No cards in this tier
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Late Fees Analysis
        </CardTitle>
        <CardDescription>
          Historical late fee costs by spending tier (highest first)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tier 1: Top 1% Highest Late Fees */}
        {renderSection(
          'Top 1% - Highest Late Fees',
          `Highest ${top1PercentCount} card${top1PercentCount === 1 ? '' : 's'} by late fee spending`,
          top1Percent.length,
          top1Total,
          top1Percent,
          top1PercentExpanded,
          setTop1PercentExpanded,
          'red'
        )}

        {/* Tier 2: Top 20% (excluding top 1%) */}
        {top20Percent.length > 0 && renderSection(
          'Top 20% - High Late Fees',
          `Next ${top20Percent.length} card${top20Percent.length === 1 ? '' : 's'} with high late fees`,
          top20Percent.length,
          top20Total,
          top20Percent,
          top20PercentExpanded,
          setTop20PercentExpanded,
          'orange'
        )}

        {/* Tier 3: Remaining Cards */}
        {remaining.length > 0 && renderSection(
          'Remaining Cards',
          `${remaining.length} card${remaining.length === 1 ? '' : 's'} with lower late fees`,
          remaining.length,
          remainingTotal,
          remaining,
          remainingExpanded,
          setRemainingExpanded,
          'gray'
        )}

        {/* Summary Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Note:</strong> Cards are ranked by late fee spending this month. Focus on top 1% to
            maximize cost reduction through timely payments and automated reminders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
