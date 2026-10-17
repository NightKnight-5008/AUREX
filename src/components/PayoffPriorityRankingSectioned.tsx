import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import type { CompanyCard, CardUtilization } from '@/types/financial';
import { formatCurrency, getDaysUntilDue, formatNumber, formatPercent } from '@/lib/financial-data';

interface PayoffPriorityRankingSectionedProps {
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
}

interface CardUtilizationWithCard extends CardUtilization {
  card: CompanyCard;
}

export function PayoffPriorityRankingSectioned({
  cards,
  countryCode,
  locale,
}: PayoffPriorityRankingSectionedProps) {
  // Calculate card utilization and priority scores
  const cardUtilizations: CardUtilizationWithCard[] = useMemo(() => {
    return cards
      .filter((card) => card.cardType === 'credit')
      .map((card) => {
        const outstandingBalance = card.outstandingDebt || 0;

        // Correct utilization: outstanding debt / credit limit
        const utilizationPercent =
          card.creditLimit > 0 ? (outstandingBalance / card.creditLimit) * 100 : 0;

        const daysUntilDue = card.dueDate ? getDaysUntilDue(card.dueDate) : 999;

        // Simulated interest rates (would come from backend in real app)
        const interestRate = 18 + Math.random() * 12; // 18-30%

        // Priority score: higher utilization + higher interest + closer due date = higher priority
        // Weights: utilization 40%, interest rate 40%, days until due 20%
        const priorityScore =
          utilizationPercent * 0.4 + interestRate * 1.33 + (30 - Math.min(daysUntilDue, 30)) * 0.67;

        return {
          cardId: card.id,
          utilizationPercent,
          outstandingBalance,
          creditLimit: card.creditLimit,
          daysUntilDue,
          interestRate,
          priorityScore,
          card,
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [cards]);

  // Calculate dynamic score ranges
  const topScore = cardUtilizations[0]?.priorityScore || 100;
  const tier1Max = topScore;
  const tier1Min = topScore - 50;
  const tier2Min = tier1Min - 25;
  const tier3Min = tier2Min - 25;

  // Section cards into 4 dynamic tiers based on priority score
  const tier1 = useMemo(
    () => cardUtilizations.filter((cu) => cu.priorityScore >= tier1Min && cu.priorityScore <= tier1Max),
    [cardUtilizations, tier1Min, tier1Max]
  );

  const tier2 = useMemo(
    () => cardUtilizations.filter((cu) => cu.priorityScore >= tier2Min && cu.priorityScore < tier1Min),
    [cardUtilizations, tier2Min, tier1Min]
  );

  const tier3 = useMemo(
    () => cardUtilizations.filter((cu) => cu.priorityScore >= tier3Min && cu.priorityScore < tier2Min),
    [cardUtilizations, tier3Min, tier2Min]
  );

  const tier4 = useMemo(
    () => cardUtilizations.filter((cu) => cu.priorityScore < tier3Min),
    [cardUtilizations, tier3Min]
  );

  // Collapsible state - ALL sections collapsed by default (global UX rule)
  const [tier1Expanded, setTier1Expanded] = useState(false);
  const [tier2Expanded, setTier2Expanded] = useState(false);
  const [tier3Expanded, setTier3Expanded] = useState(false);
  const [tier4Expanded, setTier4Expanded] = useState(false);

  // If no cards, show empty state
  if (cardUtilizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payoff Priority Ranking</CardTitle>
          <CardDescription>Optimized debt payoff order</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No credit cards found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payoff Priority Ranking</CardTitle>
        <CardDescription>
          Dynamic priority tiers - {cardUtilizations.length} cards ranked by urgency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Tier 1: Highest Priority (Top Score - 50 points) */}
        {tier1.length > 0 && (
          <div className="border-2 border-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setTier1Expanded(!tier1Expanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {tier1Expanded ? (
                  <ChevronDown className="w-5 h-5 text-red-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-red-600 transition-transform duration-150" />
                )}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-900 dark:text-red-100">#1 Highest Priority</span>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-red-300">
                  {tier1.length}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Score: {tier1Min.toFixed(0)}-{tier1Max.toFixed(0)}
                </div>
                <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                  {formatCurrency(
                    tier1.reduce((sum, cu) => sum + cu.outstandingBalance, 0),
                    countryCode
                  )}
                </div>
              </div>
            </button>
            {tier1Expanded && (
              <div className="border-t-2 border-red-200 p-4 space-y-3 bg-white dark:bg-red-950/10">
                {tier1.map((cu, index) => (
                  <PriorityCard
                    key={cu.cardId}
                    cu={cu}
                    rank={index + 1}
                    countryCode={countryCode}
                    isTopPriority={index === 0}
                    tierColor="red"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tier 2: High Priority (Tier 1 Min - 25 points) */}
        {tier2.length > 0 && (
          <div className="border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setTier2Expanded(!tier2Expanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-orange-100/50 dark:hover:bg-orange-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {tier2Expanded ? (
                  <ChevronDown className="w-5 h-5 text-orange-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-orange-600 transition-transform duration-150" />
                )}
                <span className="font-semibold text-orange-900 dark:text-orange-100">#2 High Priority</span>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-orange-300">
                  {tier2.length}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  Score: {tier2Min.toFixed(0)}-{tier1Min.toFixed(0)}
                </div>
                <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                  {formatCurrency(
                    tier2.reduce((sum, cu) => sum + cu.outstandingBalance, 0),
                    countryCode
                  )}
                </div>
              </div>
            </button>
            {tier2Expanded && (
              <div className="border-t-2 border-orange-200 p-4 space-y-3 bg-white dark:bg-orange-950/10">
                {tier2.map((cu, index) => (
                  <PriorityCard
                    key={cu.cardId}
                    cu={cu}
                    rank={tier1.length + index + 1}
                    countryCode={countryCode}
                    isTopPriority={false}
                    tierColor="orange"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tier 3: Moderate Priority (Tier 2 Min - 25 points) */}
        {tier3.length > 0 && (
          <div className="border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setTier3Expanded(!tier3Expanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {tier3Expanded ? (
                  <ChevronDown className="w-5 h-5 text-amber-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-amber-600 transition-transform duration-150" />
                )}
                <span className="font-semibold text-amber-900 dark:text-amber-100">#3 Moderate Priority</span>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-amber-300">
                  {tier3.length}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Score: {tier3Min.toFixed(0)}-{tier2Min.toFixed(0)}
                </div>
                <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {formatCurrency(
                    tier3.reduce((sum, cu) => sum + cu.outstandingBalance, 0),
                    countryCode
                  )}
                </div>
              </div>
            </button>
            {tier3Expanded && (
              <div className="border-t-2 border-amber-200 p-4 space-y-3 bg-white dark:bg-amber-950/10">
                {tier3.map((cu, index) => (
                  <PriorityCard
                    key={cu.cardId}
                    cu={cu}
                    rank={tier1.length + tier2.length + index + 1}
                    countryCode={countryCode}
                    isTopPriority={false}
                    tierColor="amber"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tier 4: Lower Priority (< Tier 3 Min) */}
        {tier4.length > 0 && (
          <div className="border-2 border-gray-400 bg-gray-50 dark:bg-gray-950/20 rounded-lg overflow-hidden">
            <button
              onClick={() => setTier4Expanded(!tier4Expanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-100/50 dark:hover:bg-gray-900/20 transition-all duration-150 ease-in-out"
            >
              <div className="flex items-center gap-3">
                {tier4Expanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-600 transition-transform duration-150" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-600 transition-transform duration-150" />
                )}
                <span className="font-semibold text-gray-900 dark:text-gray-100">#4 Lower Priority</span>
                <Badge variant="outline" className="bg-white dark:bg-gray-900 border-gray-300">
                  {tier4.length}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Score: &lt;{tier3Min.toFixed(0)}
                </div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatCurrency(
                    tier4.reduce((sum, cu) => sum + cu.outstandingBalance, 0),
                    countryCode
                  )}
                </div>
              </div>
            </button>
            {tier4Expanded && (
              <div className="border-t-2 border-gray-200 p-4 space-y-3 bg-white dark:bg-gray-950/10">
                {tier4.map((cu, index) => (
                  <PriorityCard
                    key={cu.cardId}
                    cu={cu}
                    rank={tier1.length + tier2.length + tier3.length + index + 1}
                    countryCode={countryCode}
                    isTopPriority={false}
                    tierColor="gray"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Methodology Note */}
        <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          <strong>Priority Methodology:</strong> Based on utilization (40%), interest rate (40%), and
          days until due (20%). Pay off high-priority cards first to minimize interest costs.
        </div>
      </CardContent>
    </Card>
  );
}

// Individual priority card component
function PriorityCard({
  cu,
  rank,
  countryCode,
  isTopPriority,
  tierColor,
}: {
  cu: CardUtilizationWithCard;
  rank: number;
  countryCode: string;
  isTopPriority: boolean;
  tierColor: 'red' | 'orange' | 'amber' | 'gray';
}) {
  const rankBadgeColor =
    tierColor === 'red'
      ? 'text-red-700 dark:text-red-300'
      : tierColor === 'orange'
        ? 'text-orange-700 dark:text-orange-300'
        : tierColor === 'amber'
          ? 'text-amber-700 dark:text-amber-300'
          : 'text-gray-700 dark:text-gray-300';

  return (
    <div className="p-3 rounded-lg border bg-white dark:bg-gray-900/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`font-bold ${rankBadgeColor}`}>
            #{rank}
          </Badge>
          <div className="min-w-0">
            <div className="font-semibold text-sm">****{cu.card.lastFourDigits}</div>
            <p className="text-xs text-muted-foreground truncate">{cu.card.issuingBank}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-sm">{formatCurrency(cu.outstandingBalance, countryCode)}</div>
          <p className="text-xs text-muted-foreground">{formatPercent(cu.interestRate || 0)} APR</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Utilization</span>
          <span className="font-medium">{formatPercent(cu.utilizationPercent)}</span>
        </div>
        <Progress value={Math.min(cu.utilizationPercent, 100)} />
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted-foreground">Priority Score</span>
          <span className="font-medium">{formatNumber(cu.priorityScore)}</span>
        </div>

        {isTopPriority && (
          <Badge className="w-full justify-center mt-2" variant="default">
            <TrendingUp className="w-3 h-3 mr-1" />
            Pay This First
          </Badge>
        )}
      </div>
    </div>
  );
}
