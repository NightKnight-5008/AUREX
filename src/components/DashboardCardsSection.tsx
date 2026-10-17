/**
 * Dashboard Cards Section
 *
 * Enterprise-grade cards overview with text-based status indicators.
 * Removes all circular indicators, dots, and icon-only status UI.
 *
 * Design Principles:
 * - Text-based status only (Healthy, Attention, Critical, Inactive)
 * - Color applied to text only (no backgrounds, pills, containers)
 * - Optimized for fast scanning with 1,000+ cards
 * - Clean, professional financial UI aesthetic
 */

import { useState, useMemo } from 'react';
import type { CompanyCard } from '@/types/financial';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrencyWithLocale } from '@/lib/country-config';
import { enhanceCardWithRisk, type CardWithRisk } from '@/lib/card-risk';
import {
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
} from 'lucide-react';

interface DashboardCardsSectionProps {
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
  currency?: string;
}

type MetricFilter = 'all' | 'active' | 'inactive' | 'overdue' | 'high-risk' | 'exceptions';

interface CardMetric {
  id: MetricFilter;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  delta?: number;
}

export function DashboardCardsSection({ cards, countryCode, locale, currency }: DashboardCardsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<MetricFilter>('all');

  // Enhance cards with risk data
  const enhancedCards = useMemo(() => {
    return cards.map(card => enhanceCardWithRisk(card));
  }, [cards]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const activeCards = enhancedCards.filter(c => c.paymentStatus === 'paid');
    const inactiveCards = enhancedCards.filter(c => c.paymentStatus === 'unpaid');
    const overdueCards = enhancedCards.filter(c => c.daysOverdue !== null && c.daysOverdue > 0);
    const highRiskCards = enhancedCards.filter(c => c.risk.level === 'critical' || c.risk.level === 'attention');
    const exceptionCards = enhancedCards.filter(c =>
      c.risk.level === 'critical' && c.risk.score >= 50
    );

    const cardMetrics: CardMetric[] = [
      {
        id: 'all',
        label: 'Total Cards',
        value: enhancedCards.length,
        icon: CreditCard,
        status: 'neutral',
      },
      {
        id: 'active',
        label: 'Paid',
        value: activeCards.length,
        icon: CheckCircle2,
        status: 'success',
      },
      {
        id: 'inactive',
        label: 'Unpaid',
        value: inactiveCards.length,
        icon: XCircle,
        status: 'warning',
      },
      {
        id: 'overdue',
        label: 'Overdue',
        value: overdueCards.length,
        icon: AlertTriangle,
        status: 'danger',
      },
      {
        id: 'high-risk',
        label: 'At Risk',
        value: highRiskCards.length,
        icon: TrendingDown,
        status: 'warning',
      },
      {
        id: 'exceptions',
        label: 'Critical',
        value: exceptionCards.length,
        icon: AlertTriangle,
        status: 'danger',
      },
    ];

    return cardMetrics;
  }, [enhancedCards]);

  // Filter cards based on active metric
  const filteredCards = useMemo(() => {
    switch (activeFilter) {
      case 'active':
        return enhancedCards.filter(c => c.paymentStatus === 'paid');
      case 'inactive':
        return enhancedCards.filter(c => c.paymentStatus === 'unpaid');
      case 'overdue':
        return enhancedCards.filter(c => c.daysOverdue !== null && c.daysOverdue > 0);
      case 'high-risk':
        return enhancedCards.filter(c => c.risk.level === 'critical' || c.risk.level === 'attention');
      case 'exceptions':
        return enhancedCards.filter(c =>
          c.risk.level === 'critical' && c.risk.score >= 50
        );
      default:
        return enhancedCards;
    }
  }, [enhancedCards, activeFilter]);

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20';
      case 'danger': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getBorderColor = (status?: string) => {
    switch (status) {
      case 'success': return 'border-green-200 dark:border-green-800';
      case 'warning': return 'border-yellow-200 dark:border-yellow-800';
      case 'danger': return 'border-red-200 dark:border-red-800';
      default: return 'border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Cards Overview
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {filteredCards.length} of {cards.length} shown
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Strip */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            const isActive = activeFilter === metric.id;
            return (
              <button
                key={metric.id}
                onClick={() => setActiveFilter(metric.id)}
                className={`
                  p-3 rounded-lg border-2 text-left transition-all
                  hover:shadow-md
                  ${isActive
                    ? `${getBorderColor(metric.status)} ${getStatusColor(metric.status)} shadow-sm`
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isActive ? '' : 'text-muted-foreground'}`} />
                </div>
                <div className={`text-2xl font-bold ${isActive ? '' : 'text-foreground'}`}>
                  {metric.value}
                </div>
                <div className={`text-xs ${isActive ? 'opacity-90' : 'text-muted-foreground'}`}>
                  {metric.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* Cards List - Compressed View */}
        <div className="border rounded-lg">
          <ScrollArea className="h-[400px]">
            {filteredCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <CreditCard className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">No cards match this filter</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredCards.slice(0, 100).map((card) => (
                  <CompactCardRow
                    key={card.id}
                    card={card}
                    countryCode={countryCode}
                    locale={locale}
                    currency={currency}
                  />
                ))}
                {filteredCards.length > 100 && (
                  <div className="p-4 text-center text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-950/10">
                    Showing 100 of {filteredCards.length} cards. Use filters to narrow results.
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact Card Row Component
 *
 * Enterprise-grade card row with text-based status (NO circular indicators)
 *
 * Layout: Card Name | •••• 1234 | Bank | Type | Balance | Status
 * Status is TEXT-ONLY with color applied to text
 */
function CompactCardRow({
  card,
  countryCode,
  locale,
  currency
}: {
  card: CardWithRisk;
  countryCode: string;
  locale?: string;
  currency?: string;
}) {
  // Get status text and color (TEXT-ONLY, no backgrounds/pills)
  const getStatusText = () => {
    switch (card.risk.level) {
      case 'critical':
        return <span className="text-red-600 dark:text-red-400 text-xs font-medium">Critical</span>;
      case 'attention':
        return <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Attention</span>;
      case 'healthy':
        return <span className="text-green-600 dark:text-green-400 text-xs font-medium">Healthy</span>;
      default:
        return <span className="text-muted-foreground/70 text-xs">Inactive</span>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid': return <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">Paid</Badge>;
      case 'unpaid': return <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">Unpaid</Badge>;
      default: return <Badge variant="outline" className="text-xs">{paymentStatus}</Badge>;
    }
  };

  return (
    <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Card Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{card.cardholderName}</span>
              {getPaymentStatusBadge(card.paymentStatus)}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono">•••• {card.lastFourDigits}</span>
              <span>•</span>
              <span className="truncate">{card.issuingBank}</span>
              <span>•</span>
              <span>{card.cardType === 'credit' ? 'Credit' : 'Debit'}</span>
            </div>
          </div>
        </div>

        {/* Right: Balance & Status (TEXT-ONLY) */}
        <div className="flex items-center gap-6 text-right">
          {/* Balance */}
          <div>
            <div className="font-semibold text-sm">
              {formatCurrencyWithLocale(card.availableBalance, countryCode, locale, currency)}
            </div>
          </div>

          {/* Status - TEXT ONLY (no backgrounds, no pills, no icons) */}
          <div className="min-w-[70px] text-right">
            {getStatusText()}
          </div>
        </div>
      </div>
    </div>
  );
}
