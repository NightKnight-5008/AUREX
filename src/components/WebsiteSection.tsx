import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import { Globe, TrendingUp, AlertTriangle, ShoppingCart, Eye, MousePointer, ShoppingBag } from 'lucide-react';
import type { WebsiteMetrics, ConversionMetrics } from '@/types/financial';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/financial-data';
import { WorldHeatmap } from './WorldHeatmap';
import { useShopify } from '@/hooks/use-shopify';

interface WebsiteSectionProps {
  websiteMetrics: WebsiteMetrics[];
  countryCode: string;
  locale?: string;
}

const FUNNEL_COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

export function WebsiteSection({ websiteMetrics, countryCode, locale }: WebsiteSectionProps) {
  const { isConnected, metrics: shopifyMetrics } = useShopify();

  if (!websiteMetrics || websiteMetrics.length === 0) {
    return (
      <Card className="p-6">
        <CardHeader className="text-center">
          <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle>No Website Performance Data</CardTitle>
          <CardDescription>Connect an e-commerce platform or add website analytics metrics to start tracking conversion funnels and acquisition efficiency.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const currentMonth = websiteMetrics[websiteMetrics.length - 1];
  const previousMonth = websiteMetrics[websiteMetrics.length - 2];

  // Calculate conversion metrics
  const conversionRate = currentMonth.visitors > 0
    ? (currentMonth.completedPurchases / currentMonth.visitors) * 100
    : 0;

  const cartAbandonmentRate = currentMonth.addToCarts > 0
    ? ((currentMonth.addToCarts - currentMonth.checkoutInitiations) / currentMonth.addToCarts) * 100
    : 0;

  const checkoutCompletionRate = currentMonth.checkoutInitiations > 0
    ? (currentMonth.completedPurchases / currentMonth.checkoutInitiations) * 100
    : 0;

  const costPerAcquisition = currentMonth.completedPurchases > 0
    ? currentMonth.marketingSpend / currentMonth.completedPurchases
    : 0;

  const revenuePerVisitor = currentMonth.visitors > 0
    ? currentMonth.revenue / currentMonth.visitors
    : 0;

  // Check for price sensitivity (conversion rate drop correlating with revenue changes)
  const prevConversionRate = previousMonth?.visitors > 0
    ? (previousMonth.completedPurchases / previousMonth.visitors) * 100
    : 0;
  const conversionDrop = prevConversionRate - conversionRate;
  const priceSensitivityFlag = conversionDrop > 0.5; // >0.5% drop

  // Conversion funnel data
  const funnelData = [
    { name: 'Visitors', value: currentMonth.visitors, fill: FUNNEL_COLORS[0] },
    { name: 'Product Views', value: currentMonth.productViews, fill: FUNNEL_COLORS[1] },
    { name: 'Add to Cart', value: currentMonth.addToCarts, fill: FUNNEL_COLORS[2] },
    { name: 'Checkout', value: currentMonth.checkoutInitiations, fill: FUNNEL_COLORS[3] },
    { name: 'Purchased', value: currentMonth.completedPurchases, fill: FUNNEL_COLORS[4] },
  ];

  // Global orders data for heatmap-style visualization
  const countryData = Object.entries(currentMonth.ordersByCountry)
    .map(([code, orders]) => ({ country: code, orders }))
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 7);

  // Trend data
  const trendData = websiteMetrics.map((m) => ({
    month: m.period.split('-')[1],
    visitors: m.visitors,
    conversions: m.completedPurchases,
    conversionRate: m.visitors > 0 ? (m.completedPurchases / m.visitors) * 100 : 0,
  }));

  // Benchmark ranges
  const benchmarkMin = 1.0;
  const benchmarkMax = 3.0;
  const isAboveBenchmark = conversionRate > benchmarkMax;
  const isBelowBenchmark = conversionRate < benchmarkMin;

  return (
    <div className="space-y-6">
      {/* Shopify Live Data Indicator */}
      {isConnected && shopifyMetrics && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <ShoppingBag className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <strong>Live Shopify Data:</strong> Showing real-time metrics from your connected Shopify store.
            Last updated: {shopifyMetrics.lastUpdated.toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Website Performance</h2>
          <p className="text-muted-foreground">Acquisition and conversion efficiency</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <Badge className="bg-green-500">
              <ShoppingBag className="w-3 h-3 mr-1" />
              Live
            </Badge>
          )}
          <Badge variant={isAboveBenchmark ? "default" : isBelowBenchmark ? "destructive" : "secondary"} className="text-lg px-4 py-2">
            <Globe className="w-4 h-4 mr-2" />
            Conversion Rate: {formatPercent(conversionRate, 2)}
          </Badge>
        </div>
      </div>

      {/* Price Sensitivity Alert */}
      {priceSensitivityFlag && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800 dark:text-orange-200">
            <strong>Price Sensitivity Signal:</strong> Conversion rate decreased by {formatPercent(conversionDrop, 2)} from last month.
            This may indicate pricing pressure or market sensitivity.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(conversionRate, 2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Benchmark: {formatPercent(benchmarkMin, 1)}-{formatPercent(benchmarkMax, 1)}
            </div>
            <Progress value={(conversionRate / benchmarkMax) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cost Per Acquisition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(costPerAcquisition, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per customer acquired
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenue Per Visitor</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenuePerVisitor, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average value per visit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cart Abandonment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(cartAbandonmentRate)}</div>
            <Progress value={100 - cartAbandonmentRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(100 - cartAbandonmentRate)} complete checkout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics - Unique Card Layout */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-lg">Engagement Metrics</CardTitle>
          <CardDescription>Visitor interaction and conversion stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4 bg-background/60 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <MousePointer className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-1">Checkout Completion</div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatPercent(checkoutCompletionRate)}
                </div>
                <Progress value={checkoutCompletionRate} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(currentMonth.completedPurchases)} of {formatNumber(currentMonth.checkoutInitiations)} checkouts
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-background/60 rounded-lg border border-pink-200 dark:border-pink-800">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/40 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-1">Add-to-Cart Rate</div>
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                  {formatPercent((currentMonth.addToCarts / currentMonth.productViews) * 100)}
                </div>
                <Progress value={(currentMonth.addToCarts / currentMonth.productViews) * 100} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(currentMonth.addToCarts)} carts from {formatNumber(currentMonth.productViews)} views
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-background/60 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                <Eye className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground mb-1">Product View Rate</div>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {formatPercent((currentMonth.productViews / currentMonth.visitors) * 100)}
                </div>
                <Progress value={(currentMonth.productViews / currentMonth.visitors) * 100} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(currentMonth.productViews)} of {formatNumber(currentMonth.visitors)} visitors
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Visitor journey from landing to purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelData.map((step, index) => {
                const nextStep = funnelData[index + 1];
                const dropoffRate = nextStep
                  ? ((step.value - nextStep.value) / step.value) * 100
                  : 0;
                const percentage = (step.value / funnelData[0].value) * 100;

                return (
                  <div key={step.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{step.name}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(step.value)} ({formatPercent(percentage)})
                      </span>
                    </div>
                    <div className="relative h-8 w-full bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: step.fill
                        }}
                      />
                    </div>
                    {nextStep && dropoffRate > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(dropoffRate)} drop-off to next stage
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Global Orders Heatmap - True World Map */}
        <WorldHeatmap
          data={countryData.map(c => ({ code: c.country, orders: c.orders }))}
          title="Global Orders Heatmap"
          description="Real-time order distribution worldwide (current month)"
        />
      </div>

      {/* Conversion Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Trend (6 Months)</CardTitle>
          <CardDescription>Traffic and conversion performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="visitors" stroke="#8b5cf6" strokeWidth={2} name="Visitors" />
              <Line yAxisId="left" type="monotone" dataKey="conversions" stroke="#ec4899" strokeWidth={2} name="Conversions" />
              <Line yAxisId="right" type="monotone" dataKey="conversionRate" stroke="#14b8a6" strokeWidth={2} name="Conv. Rate %" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
