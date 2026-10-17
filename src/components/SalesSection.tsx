import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package } from 'lucide-react';
import type { FinancialMetrics, Product, SalesMetrics } from '@/types/financial';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/financial-data';

interface SalesSectionProps {
  monthlyMetrics: FinancialMetrics[];
  products: Product[];
  countryCode: string;
  locale?: string;
}

const COLORS = ['#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#6366f1', '#84cc16'];

export function SalesSection({ monthlyMetrics, products, countryCode, locale }: SalesSectionProps) {
  if (!monthlyMetrics || monthlyMetrics.length === 0) {
    return (
      <Card className="p-6">
        <CardHeader className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle>No Sales Data Available</CardTitle>
          <CardDescription>Add transactions or compile metrics to see sales performance and profitability analysis.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate sales metrics
  const currentMonth = monthlyMetrics[monthlyMetrics.length - 1];
  const previousMonth = monthlyMetrics[monthlyMetrics.length - 2];

  const totalRevenue = monthlyMetrics.reduce((sum, m) => sum + m.totalRevenue, 0);
  const totalExpenses = monthlyMetrics.reduce((sum, m) => sum + m.totalExpenses, 0);
  const totalProfit = monthlyMetrics.reduce((sum, m) => sum + m.netProfit, 0);

  const avgSalesPerMonth = totalRevenue / monthlyMetrics.length;
  const avgSalesPerDay = avgSalesPerMonth / 30;

  // Calculate expense composition
  const expenseData = [
    { name: 'Payroll', value: monthlyMetrics.reduce((sum, m) => sum + m.totalPayroll, 0), color: COLORS[0] },
    { name: 'VAT', value: monthlyMetrics.reduce((sum, m) => sum + m.totalTaxes, 0), color: COLORS[1] },
    { name: 'Operating Expenses', value: monthlyMetrics.reduce((sum, m) => sum + m.totalExpenses, 0), color: COLORS[2] },
  ];

  // Financial trend data
  const trendData = monthlyMetrics.map((m) => ({
    month: m.period.split('-')[1],
    revenue: m.totalRevenue,
    expenses: m.totalExpenses,
    profit: m.netProfit,
  }));

  // Top selling products
  const topProducts = [...products]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Calculate gross margin
  const totalCOGS = products.reduce((sum, p) => sum + (p.costOfGoods || 0), 0);
  const productRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
  const grossMargin = productRevenue > 0 ? ((productRevenue - totalCOGS) / productRevenue) * 100 : 0;

  // Calculate AOV (Average Order Value)
  const totalOrders = products.reduce((sum, p) => sum + p.unitsSold, 0);
  const avgOrderValue = totalOrders > 0 ? productRevenue / totalOrders : 0;

  // Simulated repeat customer rate
  const repeatCustomerRate = 32.5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales Analytics</h2>
          <p className="text-muted-foreground">Profitability and commercial performance</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <TrendingUp className="w-4 h-4 mr-2" />
          Gross Margin: {formatPercent(grossMargin)}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Sales/Day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgSalesPerDay, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on 6-month average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Sales/Month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgSalesPerMonth, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlyMetrics.length} months tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Order Value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgOrderValue, countryCode)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {formatNumber(totalOrders)} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Repeat Customer Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repeatCustomerRate}%</div>
            <Progress value={repeatCustomerRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Financial Trend */}
      <Card>
        <CardHeader>
          <CardTitle>6-Month Financial Trend</CardTitle>
          <CardDescription>Revenue, expenses, and profit over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value), countryCode)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#ec4899" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="profit" stroke="#14b8a6" strokeWidth={2} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Composition */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Composition</CardTitle>
            <CardDescription>Breakdown of business expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${formatPercent(percent * 100, 0)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value), countryCode)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {expenseData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(item.value, countryCode)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Products</CardTitle>
            <CardDescription>Best performers by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value), countryCode)} />
                <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span>{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.revenue, countryCode)}</div>
                    <div className="text-xs text-muted-foreground">{product.unitsSold} units</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
