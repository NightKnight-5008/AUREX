import { useMemo, useState } from 'react';
import type { FinancialMetrics, FinancialTransaction, CompanyCard } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrencyWithLocale } from '@/lib/country-config';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  PieChartIcon,
  BarChart3,
  ArrowUpDown,
  Target,
  Network,
  Zap,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  monthlyMetrics: FinancialMetrics[];
  yearlyMetrics: FinancialMetrics;
  transactions: FinancialTransaction[];
  cards: CompanyCard[];
  countryCode: string;
  locale?: string;
}

export function AnalyticsDashboard({
  monthlyMetrics,
  yearlyMetrics,
  transactions,
  cards,
  countryCode,
  locale,
}: AnalyticsDashboardProps) {
  const [sortBy, setSortBy] = useState<'limit' | 'available' | 'utilization'>('utilization');

  // ============================================================================
  // DATA PROCESSING & CALCULATIONS
  // ============================================================================

  // 1. Cash Flow & Performance Data
  const cashFlowData = useMemo(() => {
    return monthlyMetrics.map((metric) => ({
      period: metric.period,
      revenue: metric.totalRevenue,
      expenses: metric.totalExpenses,
      profit: metric.netProfit,
      cashBalance: metric.netWorth,
    }));
  }, [monthlyMetrics]);

  // P&L Data
  const plData = useMemo(() => {
    const latest = monthlyMetrics[monthlyMetrics.length - 1];
    return [
      { category: 'Revenue', value: latest.totalRevenue, fill: '#10b981' },
      { category: 'COGS', value: latest.totalExpenses * 0.4, fill: '#f59e0b' },
      { category: 'Operating', value: latest.totalExpenses * 0.6, fill: '#ef4444' },
      { category: 'Net Profit', value: latest.netProfit, fill: latest.netProfit >= 0 ? '#059669' : '#dc2626' },
    ];
  }, [monthlyMetrics]);

  // Cash Flow Waterfall Data
  const waterfallData = useMemo(() => {
    const latest = monthlyMetrics[monthlyMetrics.length - 1];
    const previous = monthlyMetrics[monthlyMetrics.length - 2] || latest;

    return [
      { name: 'Opening', value: previous.netWorth, cumulative: previous.netWorth },
      { name: 'Revenue', value: latest.totalRevenue, cumulative: previous.netWorth + latest.totalRevenue },
      { name: 'Expenses', value: -latest.totalExpenses, cumulative: previous.netWorth + latest.totalRevenue - latest.totalExpenses },
      { name: 'Payroll', value: -latest.totalPayroll, cumulative: previous.netWorth + latest.totalRevenue - latest.totalExpenses - latest.totalPayroll },
      { name: 'Taxes', value: -latest.totalTaxes, cumulative: latest.netWorth },
      { name: 'Closing', value: latest.netWorth, cumulative: latest.netWorth },
    ];
  }, [monthlyMetrics]);

  // 2. Expense & Category Analysis
  const expenseCategoryData = useMemo(() => {
    const categoryTotals = new Map<string, number>();

    transactions.forEach((txn) => {
      if (txn.type === 'expense' || txn.type === 'payroll' || txn.type === 'tax') {
        const current = categoryTotals.get(txn.category) || 0;
        categoryTotals.set(txn.category, current + txn.amount);
      }
    });

    return Array.from(categoryTotals.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [transactions]);

  // Stacked Bar Chart - Category Trends Across Months
  const categoryTrendsData = useMemo(() => {
    const monthlyCategories = new Map<string, Map<string, number>>();

    transactions.forEach((txn) => {
      if (txn.type === 'expense' || txn.type === 'payroll') {
        const date = new Date(txn.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyCategories.has(monthKey)) {
          monthlyCategories.set(monthKey, new Map());
        }

        const monthData = monthlyCategories.get(monthKey)!;
        const current = monthData.get(txn.category) || 0;
        monthData.set(txn.category, current + txn.amount);
      }
    });

    // Convert to array format for Recharts
    return Array.from(monthlyCategories.entries())
      .map(([month, categories]) => {
        const monthObj: any = { month };
        categories.forEach((value, category) => {
          monthObj[category] = value;
        });
        return monthObj;
      })
      .slice(-6); // Last 6 months
  }, [transactions]);

  // Get all unique categories for stacked bar
  const expenseCategories = useMemo(() => {
    const categories = new Set<string>();
    transactions.forEach((txn) => {
      if (txn.type === 'expense' || txn.type === 'payroll') {
        categories.add(txn.category);
      }
    });
    return Array.from(categories);
  }, [transactions]);

  // 3. Credit Card & Debt Visualization
  const cardMetrics = useMemo(() => {
    return cards
      .filter(card => card.cardType === 'credit')
      .map((card) => {
        const debt = card.outstandingDebt || (card.creditLimit - card.availableBalance);
        const utilization = (debt / card.creditLimit) * 100;

        return {
          id: card.id,
          name: `•••• ${card.lastFourDigits}`,
          fullName: card.cardholderName,
          limit: card.creditLimit,
          balance: debt,
          available: card.availableBalance,
          utilization,
          minimumPayment: card.minimumPayment,
        };
      });
  }, [cards]);

  // Sorted card rankings
  const sortedCards = useMemo(() => {
    const sorted = [...cardMetrics];
    switch (sortBy) {
      case 'limit':
        return sorted.sort((a, b) => b.limit - a.limit);
      case 'available':
        return sorted.sort((a, b) => b.available - a.available);
      case 'utilization':
        return sorted.sort((a, b) => b.utilization - a.utilization);
      default:
        return sorted;
    }
  }, [cardMetrics, sortBy]);

  // Total debt waterfall
  const debtWaterfallData = useMemo(() => {
    const totalDebt = cardMetrics.reduce((sum, card) => sum + card.balance, 0);
    const totalPayments = transactions
      .filter(txn => txn.type === 'credit_payment')
      .reduce((sum, txn) => sum + txn.amount, 0);

    return [
      { name: 'Initial Debt', value: totalDebt + totalPayments, cumulative: totalDebt + totalPayments },
      { name: 'Payments', value: -totalPayments, cumulative: totalDebt },
      { name: 'Current Debt', value: totalDebt, cumulative: totalDebt },
    ];
  }, [cardMetrics, transactions]);

  // 4. Transaction-Level Analytics
  const transactionScatterData = useMemo(() => {
    const txnFrequency = new Map<string, { count: number; total: number }>();

    transactions.forEach((txn) => {
      const current = txnFrequency.get(txn.category) || { count: 0, total: 0 };
      txnFrequency.set(txn.category, {
        count: current.count + 1,
        total: current.total + txn.amount,
      });
    });

    return Array.from(txnFrequency.entries()).map(([category, data]) => ({
      category,
      frequency: data.count,
      totalValue: data.total,
      avgValue: data.total / data.count,
    }));
  }, [transactions]);

  // Bubble chart data - transaction amounts
  const bubbleData = useMemo(() => {
    return transactions.slice(0, 50).map((txn) => {
      const date = new Date(txn.date);
      return {
        x: date.getDate(),
        y: txn.amount,
        z: txn.amount,
        category: txn.category,
        type: txn.type,
      };
    });
  }, [transactions]);

  // Heatmap data - spending by day/hour
  const heatmapData = useMemo(() => {
    const dayTotals = new Map<string, number>();

    transactions.forEach((txn) => {
      if (txn.type === 'expense' || txn.type === 'payroll') {
        const date = new Date(txn.date);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
        const current = dayTotals.get(dayKey) || 0;
        dayTotals.set(dayKey, current + txn.amount);
      }
    });

    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return daysOrder.map(day => ({
      day,
      spending: dayTotals.get(day) || 0,
    }));
  }, [transactions]);

  // 5. Forecasting & Predictions
  const forecastData = useMemo(() => {
    const historical = monthlyMetrics.map((metric) => ({
      period: metric.period,
      revenue: metric.totalRevenue,
      expenses: metric.totalExpenses,
      profit: metric.netProfit,
      isForecast: false,
    }));

    // Simple linear regression for forecasting
    const avgRevenueGrowth = monthlyMetrics.length > 1
      ? (monthlyMetrics[monthlyMetrics.length - 1].totalRevenue - monthlyMetrics[0].totalRevenue) / (monthlyMetrics.length - 1)
      : 0;

    const avgExpenseGrowth = monthlyMetrics.length > 1
      ? (monthlyMetrics[monthlyMetrics.length - 1].totalExpenses - monthlyMetrics[0].totalExpenses) / (monthlyMetrics.length - 1)
      : 0;

    const lastMetric = monthlyMetrics[monthlyMetrics.length - 1];
    const forecast = [];

    for (let i = 1; i <= 3; i++) {
      const forecastRevenue = lastMetric.totalRevenue + (avgRevenueGrowth * i);
      const forecastExpenses = lastMetric.totalExpenses + (avgExpenseGrowth * i);
      const confidenceInterval = forecastRevenue * 0.15; // ±15% confidence

      forecast.push({
        period: `Forecast +${i}`,
        revenue: forecastRevenue,
        expenses: forecastExpenses,
        profit: forecastRevenue - forecastExpenses - lastMetric.totalPayroll - lastMetric.totalTaxes,
        revenueUpper: forecastRevenue + confidenceInterval,
        revenueLower: Math.max(0, forecastRevenue - confidenceInterval),
        isForecast: true,
      });
    }

    return [...historical, ...forecast];
  }, [monthlyMetrics]);

  // 6. Flow & Structure - Sankey-like data
  const sankeyFlowData = useMemo(() => {
    const latest = monthlyMetrics[monthlyMetrics.length - 1];
    return [
      { source: 'Revenue', target: 'Operating Expenses', value: latest.totalExpenses },
      { source: 'Revenue', target: 'Payroll', value: latest.totalPayroll },
      { source: 'Revenue', target: 'Taxes', value: latest.totalTaxes },
      { source: 'Revenue', target: 'Profit', value: latest.netProfit > 0 ? latest.netProfit : 0 },
    ];
  }, [monthlyMetrics]);

  // Funnel data - transaction stages
  const funnelData = useMemo(() => {
    const revenueCount = transactions.filter(t => t.type === 'revenue').length;
    const expenseCount = transactions.filter(t => t.type === 'expense').length;
    const payrollCount = transactions.filter(t => t.type === 'payroll').length;

    return [
      { stage: 'All Transactions', count: transactions.length, fill: '#3b82f6' },
      { stage: 'Revenue', count: revenueCount, fill: '#10b981' },
      { stage: 'Expenses', count: expenseCount, fill: '#ef4444' },
      { stage: 'Payroll', count: payrollCount, fill: '#8b5cf6' },
    ];
  }, [transactions]);

  // 7. Comparative Analytics - Radar Chart
  const radarData = useMemo(() => {
    const latest = monthlyMetrics[monthlyMetrics.length - 1];
    const previous = monthlyMetrics[monthlyMetrics.length - 2] || latest;

    const normalize = (value: number, max: number) => (value / max) * 100;
    const maxRevenue = Math.max(latest.totalRevenue, previous.totalRevenue);
    const maxExpenses = Math.max(latest.totalExpenses, previous.totalExpenses);
    const maxProfit = Math.max(Math.abs(latest.netProfit), Math.abs(previous.netProfit));

    return [
      {
        metric: 'Revenue',
        current: normalize(latest.totalRevenue, maxRevenue),
        previous: normalize(previous.totalRevenue, maxRevenue),
      },
      {
        metric: 'Margin',
        current: latest.totalRevenue > 0 ? (latest.netProfit / latest.totalRevenue) * 100 : 0,
        previous: previous.totalRevenue > 0 ? (previous.netProfit / previous.totalRevenue) * 100 : 0,
      },
      {
        metric: 'Cash Flow',
        current: normalize(Math.abs(latest.netProfit), maxProfit),
        previous: normalize(Math.abs(previous.netProfit), maxProfit),
      },
      {
        metric: 'Efficiency',
        current: latest.totalRevenue > 0 ? 100 - normalize(latest.totalExpenses, latest.totalRevenue) : 0,
        previous: previous.totalRevenue > 0 ? 100 - normalize(previous.totalExpenses, previous.totalRevenue) : 0,
      },
    ];
  }, [monthlyMetrics]);

  // Box plot data - monthly revenue distribution
  const boxPlotData = useMemo(() => {
    const revenues = monthlyMetrics.map(m => m.totalRevenue).sort((a, b) => a - b);
    const expenses = monthlyMetrics.map(m => m.totalExpenses).sort((a, b) => a - b);

    const getQuartiles = (data: number[]) => {
      const q1 = data[Math.floor(data.length * 0.25)];
      const median = data[Math.floor(data.length * 0.5)];
      const q3 = data[Math.floor(data.length * 0.75)];
      return { min: data[0], q1, median, q3, max: data[data.length - 1] };
    };

    return [
      { category: 'Revenue', ...getQuartiles(revenues) },
      { category: 'Expenses', ...getQuartiles(expenses) },
    ];
  }, [monthlyMetrics]);

  // ============================================================================
  // CHART COLORS
  // ============================================================================

  const COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    categories: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'],
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Section 1: Cash Flow & Performance */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Performance Overview</h2>
            <p className="text-sm text-muted-foreground">Cash flow and financial performance metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Multi-series Line Chart */}
          <Card className="animate-slideInUp">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Revenue, Expenses & Profit Trend
              </CardTitle>
              <CardDescription>6-month performance comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke={COLORS.success} strokeWidth={2} name="Revenue" animationDuration={1000} />
                  <Line type="monotone" dataKey="expenses" stroke={COLORS.danger} strokeWidth={2} name="Expenses" animationDuration={1000} />
                  <Line type="monotone" dataKey="profit" stroke={COLORS.primary} strokeWidth={2} name="Profit" animationDuration={1000} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Area Chart - Cash Balance */}
          <Card className="animate-slideInUp animation-delay-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Total Cash Balance
              </CardTitle>
              <CardDescription>Net worth accumulation over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Area type="monotone" dataKey="cashBalance" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorBalance)" animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* P&L Column Chart */}
          <Card className="animate-slideInUp animation-delay-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                P&L Breakdown
              </CardTitle>
              <CardDescription>Current month profit & loss components</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={plData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Bar dataKey="value" animationDuration={1000}>
                    {plData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cash Flow Waterfall */}
          <Card className="animate-slideInUp animation-delay-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                Cash Flow Waterfall
              </CardTitle>
              <CardDescription>Monthly cash movement breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={waterfallData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(Math.abs(value), countryCode, locale)}
                  />
                  <Bar dataKey="value" animationDuration={1000}>
                    {waterfallData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value >= 0 ? COLORS.success : COLORS.danger}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 2: Expense & Category Analysis */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <PieChartIcon className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Expense Analysis</h2>
            <p className="text-sm text-muted-foreground">Category breakdown and spending patterns</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Donut Chart */}
          <Card className="animate-slideInUp animation-delay-400">
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    animationDuration={1000}
                  >
                    {expenseCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.categories[index % COLORS.categories.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stacked Bar Chart */}
          <Card className="animate-slideInUp animation-delay-500">
            <CardHeader>
              <CardTitle>Category Trends</CardTitle>
              <CardDescription>Monthly spending by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryTrendsData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Legend />
                  {expenseCategories.slice(0, 6).map((category, index) => (
                    <Bar
                      key={category}
                      dataKey={category}
                      stackId="a"
                      fill={COLORS.categories[index % COLORS.categories.length]}
                      animationDuration={1000}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 3: Credit Card & Debt Visualization */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Cards & Debt</h2>
            <p className="text-sm text-muted-foreground">Credit utilization and debt management</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gauge Charts - Credit Utilization */}
          <Card className="animate-slideInUp animation-delay-600">
            <CardHeader>
              <CardTitle>Credit Utilization</CardTitle>
              <CardDescription>Current usage percentage per card</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cardMetrics.map((card) => {
                  const utilizationColor =
                    card.utilization >= 80 ? COLORS.danger :
                    card.utilization >= 50 ? COLORS.warning :
                    COLORS.success;

                  return (
                    <div key={card.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{card.name}</span>
                        <Badge style={{ backgroundColor: utilizationColor, color: 'white' }}>
                          {card.utilization.toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${Math.min(card.utilization, 100)}%`,
                            backgroundColor: utilizationColor,
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrencyWithLocale(card.balance, countryCode, locale)} used</span>
                        <span>{formatCurrencyWithLocale(card.available, countryCode, locale)} available</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Ranking Bar Chart */}
          <Card className="animate-slideInUp animation-delay-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Card Rankings</CardTitle>
                  <CardDescription>Sorted by selected metric</CardDescription>
                </div>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limit">Highest Limit</SelectItem>
                    <SelectItem value="available">Most Available</SelectItem>
                    <SelectItem value="utilization">Utilization %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sortedCards} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) =>
                      sortBy === 'utilization'
                        ? `${value.toFixed(1)}%`
                        : formatCurrencyWithLocale(value, countryCode, locale)
                    }
                  />
                  <Bar
                    dataKey={sortBy === 'utilization' ? 'utilization' : sortBy}
                    fill={COLORS.primary}
                    animationDuration={1000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Debt Waterfall */}
          <Card className="animate-slideInUp animation-delay-800 lg:col-span-2">
            <CardHeader>
              <CardTitle>Debt Payment Impact</CardTitle>
              <CardDescription>Effect of payments on total liabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={debtWaterfallData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(Math.abs(value), countryCode, locale)}
                  />
                  <Bar dataKey="value" animationDuration={1000}>
                    {debtWaterfallData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.value >= 0 ? COLORS.danger : COLORS.success}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 4: Transaction Analytics */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Transaction Insights</h2>
            <p className="text-sm text-muted-foreground">Detailed transaction patterns and behavior</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Scatter Plot */}
          <Card className="animate-slideInUp animation-delay-900">
            <CardHeader>
              <CardTitle>Transaction Frequency vs Value</CardTitle>
              <CardDescription>Category spending patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" dataKey="frequency" name="Frequency" className="text-xs" />
                  <YAxis type="number" dataKey="totalValue" name="Total Value" className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Scatter data={transactionScatterData} fill={COLORS.primary} animationDuration={1000} />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Heatmap - Spending by Day */}
          <Card className="animate-slideInUp animation-delay-1000">
            <CardHeader>
              <CardTitle>Spending by Day of Week</CardTitle>
              <CardDescription>Weekly spending patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={heatmapData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                    formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                  />
                  <Bar dataKey="spending" fill={COLORS.cyan} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 5: Forecasting & Predictions */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Forecast & Predictions</h2>
            <p className="text-sm text-muted-foreground">Future performance projections with confidence intervals</p>
          </div>
        </div>

        <Card className="animate-slideInUp animation-delay-1100">
          <CardHeader>
            <CardTitle>3-Month Revenue Forecast</CardTitle>
            <CardDescription>Projected revenue with ±15% confidence interval</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={forecastData}>
                <defs>
                  <linearGradient id="confidenceArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => formatCurrencyWithLocale(value, countryCode, locale)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenueUpper"
                  fill="url(#confidenceArea)"
                  stroke="none"
                  name="Upper Bound"
                  animationDuration={1200}
                />
                <Area
                  type="monotone"
                  dataKey="revenueLower"
                  fill="url(#confidenceArea)"
                  stroke="none"
                  name="Lower Bound"
                  animationDuration={1200}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.success}
                  strokeWidth={2}
                  name="Revenue"
                  animationDuration={1200}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  name="Expenses"
                  animationDuration={1200}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Profit"
                  animationDuration={1200}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Section 6: Flow & Structure */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Network className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Flow & Structure</h2>
            <p className="text-sm text-muted-foreground">Money flow and transaction funnels</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Funnel Chart */}
          <Card className="animate-slideInUp animation-delay-1200">
            <CardHeader>
              <CardTitle>Transaction Funnel</CardTitle>
              <CardDescription>Transaction stages breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="stage" className="text-xs" width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                  />
                  <Bar dataKey="count" animationDuration={1000}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sankey-like Flow */}
          <Card className="animate-slideInUp animation-delay-1300">
            <CardHeader>
              <CardTitle>Revenue Distribution</CardTitle>
              <CardDescription>Where your revenue goes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sankeyFlowData.map((flow, index) => {
                  const latest = monthlyMetrics[monthlyMetrics.length - 1];
                  const percentage = (flow.value / latest.totalRevenue) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{flow.target}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
                          <Badge variant="secondary">
                            {formatCurrencyWithLocale(flow.value, countryCode, locale)}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: COLORS.categories[index % COLORS.categories.length],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 7: Comparative Analytics */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Comparative Analytics</h2>
            <p className="text-sm text-muted-foreground">KPI comparisons and distributions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Radar Chart */}
          <Card className="animate-slideInUp animation-delay-1400">
            <CardHeader>
              <CardTitle>KPI Comparison</CardTitle>
              <CardDescription>Current vs previous month performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="metric" className="text-xs" />
                  <PolarRadiusAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--card-foreground))' }}
                  />
                  <Legend />
                  <Radar
                    name="Current Month"
                    dataKey="current"
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.6}
                    animationDuration={1000}
                  />
                  <Radar
                    name="Previous Month"
                    dataKey="previous"
                    stroke={COLORS.purple}
                    fill={COLORS.purple}
                    fillOpacity={0.3}
                    animationDuration={1000}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Box Plot */}
          <Card className="animate-slideInUp animation-delay-1500">
            <CardHeader>
              <CardTitle>Monthly Distribution</CardTitle>
              <CardDescription>Revenue and expense variance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 py-4">
                {boxPlotData.map((box, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{box.category}</span>
                      <span className="text-xs text-muted-foreground">
                        Median: {formatCurrencyWithLocale(box.median, countryCode, locale)}
                      </span>
                    </div>
                    <div className="relative h-12 bg-muted rounded">
                      {/* Min-Max Range */}
                      <div
                        className="absolute h-1 bg-primary/30 top-1/2 -translate-y-1/2"
                        style={{
                          left: `${(box.min / box.max) * 100}%`,
                          width: `${((box.max - box.min) / box.max) * 100}%`,
                        }}
                      />
                      {/* Q1-Q3 Box */}
                      <div
                        className="absolute h-8 bg-primary/60 top-1/2 -translate-y-1/2 rounded"
                        style={{
                          left: `${(box.q1 / box.max) * 100}%`,
                          width: `${((box.q3 - box.q1) / box.max) * 100}%`,
                        }}
                      />
                      {/* Median Line */}
                      <div
                        className="absolute h-10 w-0.5 bg-foreground top-1/2 -translate-y-1/2"
                        style={{
                          left: `${(box.median / box.max) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Min: {formatCurrencyWithLocale(box.min, countryCode, locale)}</span>
                      <span>Max: {formatCurrencyWithLocale(box.max, countryCode, locale)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
