/**
 * High Utilization Sectioned Component
 *
 * Displays credit cards organized by utilization percentage in 4 collapsible sections:
 * - Over 100% (critical - over limit)
 * - 85-100% (high risk)
 * - 50-85% (moderate)
 * - 25-50% (watch list)
 *
 * Enterprise-grade styling with text-only status indicators.
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CompanyCard } from '@/types/financial';
import { formatCurrency } from '@/lib/financial-data';

interface HighUtilizationSectionedProps {
  cards: CompanyCard[];
  countryCode: string;
}

type SectionType = 'critical' | 'high' | 'moderate' | 'watch';

export function HighUtilizationSectioned({ cards, countryCode }: HighUtilizationSectionedProps) {
  // Filter credit cards and calculate utilization
  const creditCards = useMemo(() => {
    return cards
      .filter((c) => c.cardType === 'credit')
      .map((card) => {
        const utilization =
          card.creditLimit && card.outstandingDebt
            ? (card.outstandingDebt / card.creditLimit) * 100
            : 0;
        return {
          ...card,
          utilization,
        };
      })
      .filter((card) => card.utilization >= 25); // Only show cards with 25%+ utilization
  }, [cards]);

  // Section cards into 4 groups
  const critical = creditCards.filter((c) => c.utilization > 100);
  const high = creditCards.filter((c) => c.utilization > 85 && c.utilization <= 100);
  const moderate = creditCards.filter((c) => c.utilization > 50 && c.utilization <= 85);
  const watch = creditCards.filter((c) => c.utilization >= 25 && c.utilization <= 50);

  // All sections closed by default; user must explicitly open them.
  // Component is remounted (via key prop from parent) when the tab changes,
  // which naturally resets all section states back to closed.
  const [criticalExpanded, setCriticalExpanded] = useState(false);
  const [highExpanded, setHighExpanded] = useState(false);
  const [moderateExpanded, setModerateExpanded] = useState(false);
  const [watchExpanded, setWatchExpanded] = useState(false);

  // If no cards meet the criteria, don't render
  if (creditCards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No cards with elevated utilization
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground pb-1">
        {creditCards.length} {creditCards.length === 1 ? 'card' : 'cards'} with elevated utilization
      </p>

      {/* Critical: Over 100% */}
      {critical.length > 0 && (
        <SectionCard
          title="Over 100%"
          subtitle="Critical - Over Limit"
          count={critical.length}
          cards={critical}
          isExpanded={criticalExpanded}
          onToggle={() => setCriticalExpanded(!criticalExpanded)}
          sectionType="critical"
          countryCode={countryCode}
        />
      )}

      {/* High: 85-100% */}
      {high.length > 0 && (
        <SectionCard
          title="85-100%"
          subtitle="High Risk"
          count={high.length}
          cards={high}
          isExpanded={highExpanded}
          onToggle={() => setHighExpanded(!highExpanded)}
          sectionType="high"
          countryCode={countryCode}
        />
      )}

      {/* Moderate: 50-85% */}
      {moderate.length > 0 && (
        <SectionCard
          title="50-85%"
          subtitle="Moderate Utilization"
          count={moderate.length}
          cards={moderate}
          isExpanded={moderateExpanded}
          onToggle={() => setModerateExpanded(!moderateExpanded)}
          sectionType="moderate"
          countryCode={countryCode}
        />
      )}

      {/* Watch: 25-50% */}
      {watch.length > 0 && (
        <SectionCard
          title="25-50%"
          subtitle="Watch List"
          count={watch.length}
          cards={watch}
          isExpanded={watchExpanded}
          onToggle={() => setWatchExpanded(!watchExpanded)}
          sectionType="watch"
          countryCode={countryCode}
        />
      )}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  subtitle: string;
  count: number;
  cards: Array<CompanyCard & { utilization: number }>;
  isExpanded: boolean;
  onToggle: () => void;
  sectionType: SectionType;
  countryCode: string;
}

function SectionCard({
  title,
  subtitle,
  count,
  cards,
  isExpanded,
  onToggle,
  sectionType,
  countryCode,
}: SectionCardProps) {
  // Get section color based on type
  const getSectionColor = () => {
    switch (sectionType) {
      case 'critical':
        return 'border-red-600 bg-red-50 dark:bg-red-950/20';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case 'moderate':
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950/20';
      case 'watch':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    }
  };

  const getTitleColor = () => {
    switch (sectionType) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'high':
        return 'text-orange-600 dark:text-orange-400';
      case 'moderate':
        return 'text-amber-600 dark:text-amber-400';
      case 'watch':
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  return (
    <div className={`border rounded-lg ${getSectionColor()}`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-150 ease-in-out"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <div className="text-left">
            <div className={`font-semibold ${getTitleColor()}`}>{title}</div>
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          </div>
        </div>
        <Badge variant="secondary" className="bg-white dark:bg-gray-900">
          {count}
        </Badge>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-950"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {card.cardholderName || 'Credit Card'} •••• {card.lastFourDigits}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(card.outstandingDebt || 0, countryCode)} /{' '}
                    {formatCurrency(card.creditLimit || 0, countryCode)}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${getTitleColor()}`}>
                    {card.utilization.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
