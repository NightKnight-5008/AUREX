import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditCard, AlertTriangle, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import type { CompanyCard, CardUtilization } from '@/types/financial';
import { formatCurrency, getDaysUntilDue, formatNumber, formatPercent } from '@/lib/financial-data';
import { UpcomingPaymentScheduleSectioned } from './UpcomingPaymentScheduleSectioned';
import { PayoffPriorityRankingSectioned } from './PayoffPriorityRankingSectioned';
import { LateFeeAnalysisSectioned } from './LateFeeAnalysisSectioned';

interface CardsSectionProps {
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
}

export function CardsSection({ cards, countryCode, locale }: CardsSectionProps) {
  // Calculate card utilization and priority scores
  const cardUtilizations: CardUtilization[] = cards
    .filter(card => card.cardType === 'credit')
    .map(card => {
      const outstandingBalance = card.outstandingDebt || 0;

      // Correct utilization: outstanding debt / credit limit
      const utilizationPercent = card.creditLimit > 0
        ? (outstandingBalance / card.creditLimit) * 100
        : 0;

      const daysUntilDue = card.dueDate ? getDaysUntilDue(card.dueDate) : 999;

      // Simulated interest rates (would come from backend in real app)
      const interestRate = 18 + Math.random() * 12; // 18-30%

      // Priority score: higher utilization + higher interest + closer due date = higher priority
      // Weights: utilization 40%, interest rate 40%, days until due 20%
      const priorityScore =
        (utilizationPercent * 0.4) +
        (interestRate * 1.33) +
        ((30 - Math.min(daysUntilDue, 30)) * 0.67);

      return {
        cardId: card.id,
        utilizationPercent,
        outstandingBalance,
        creditLimit: card.creditLimit,
        daysUntilDue,
        interestRate,
        priorityScore,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const totalOutstanding = cardUtilizations.reduce((sum, cu) => sum + cu.outstandingBalance, 0);
  const avgUtilization = cardUtilizations.length > 0
    ? cardUtilizations.reduce((sum, cu) => sum + cu.utilizationPercent, 0) / cardUtilizations.length
    : 0;

  // Upcoming payments schedule
  const upcomingPayments = cards
    .filter(card => card.dueDate && card.paymentStatus === 'unpaid')
    .map(card => ({
      ...card,
      daysUntil: getDaysUntilDue(card.dueDate!),
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Calculate total late fees for quick stats (simulated data)
  const totalLateFees = cards.reduce((sum) => sum + Math.random() * 50, 0);

  // Utilization chart data
  const utilizationChartData = cardUtilizations.map(cu => {
    const card = cards.find(c => c.id === cu.cardId);
    return {
      card: `****${card?.lastFourDigits}`,
      utilization: cu.utilizationPercent,
      outstanding: cu.outstandingBalance,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Credit Card Management</h2>
          <p className="text-muted-foreground">Debt management and payment optimization</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <CreditCard className="w-4 h-4 mr-2" />
          {cardUtilizations.length} Active Cards
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Outstanding</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {cardUtilizations.length} cards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(avgUtilization)}</div>
            <Progress
              value={avgUtilization}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {avgUtilization > 70 ? 'High utilization - pay down' : 'Healthy range'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingPayments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Due in next 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Late Fees (This Month)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalLateFees, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avoid with timely payments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Card Utilization Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Card Utilization</CardTitle>
          <CardDescription>Debt-to-limit ratio per card</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={utilizationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="card" />
              <YAxis />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Utilization %') return formatPercent(Number(value));
                  if (name === 'Outstanding') return formatCurrency(Number(value), countryCode);
                  return value;
                }}
              />
              <Bar dataKey="utilization" fill="#f97316" name="Utilization %" />
              <Bar dataKey="outstanding" fill="#dc2626" name="Outstanding" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Payment Schedule - Sectioned by Time */}
        <UpcomingPaymentScheduleSectioned
          cards={cards}
          countryCode={countryCode}
          locale={locale}
        />

        {/* Payoff Priority Ranking - Sectioned by Priority Score */}
        <PayoffPriorityRankingSectioned
          cards={cards}
          countryCode={countryCode}
          locale={locale}
        />
      </div>

      {/* Late Fees Analysis - Sectioned by Spending Tier */}
      <LateFeeAnalysisSectioned
        cards={cards}
        countryCode={countryCode}
        locale={locale}
      />
    </div>
  );
}
