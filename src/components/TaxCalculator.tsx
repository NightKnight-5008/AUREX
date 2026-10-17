import { useState } from 'react';
import type { TaxConfiguration, FinancialMetrics } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getCountryConfig, formatCurrencyWithLocale } from '@/lib/country-config';
import { Calculator, TrendingUp, Calendar } from 'lucide-react';
import { useCountUp } from '@/hooks/use-count-up';
import { useInView } from '@/hooks/use-in-view';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TaxCalculatorProps {
  initialConfig: TaxConfiguration;
  yearlyMetrics: FinancialMetrics;
  countryCode: string;
  locale?: string;
}

export function TaxCalculator({ yearlyMetrics, countryCode, locale }: TaxCalculatorProps) {
  const [customIncome, setCustomIncome] = useState(yearlyMetrics.netProfit.toString());
  const config = getCountryConfig(countryCode);

  const calculateTax = (income: number) => {
    const rates = config.taxBrackets;
    if (!rates) return { total: 0, breakdown: [] };

    let remainingIncome = income;
    let totalTax = 0;
    const breakdown: Array<{ bracket: string; taxableAmount: number; rate: number; tax: number }> =
      [];

    for (const { bracket, rate, minIncome, maxIncome } of rates) {
      if (remainingIncome <= 0) break;

      const taxableInThisBracket = Math.min(
        remainingIncome,
        maxIncome - minIncome,
        income - minIncome
      );

      if (taxableInThisBracket > 0 && income > minIncome) {
        const tax = (taxableInThisBracket * rate) / 100;
        totalTax += tax;
        breakdown.push({
          bracket,
          taxableAmount: taxableInThisBracket,
          rate,
          tax,
        });
        remainingIncome -= taxableInThisBracket;
      }
    }

    return { total: totalTax, breakdown };
  };

  const income = parseFloat(customIncome) || 0;
  const { total: annualTax, breakdown } = calculateTax(income);
  const monthlyTax = annualTax / 12;
  const effectiveRate = income > 0 ? (annualTax / income) * 100 : 0;

  const AnimatedTaxValue = ({ value, delay = 0 }: { value: number; delay?: number }) => {
    const { ref, isInView } = useInView({ triggerOnce: true });
    const animatedValue = useCountUp({
      end: isInView ? value : 0,
      duration: 1500,
      decimals: 0,
      delay,
    });

    return (
      <div ref={ref} className="text-2xl font-bold text-red-600">
        {formatCurrencyWithLocale(animatedValue, countryCode, locale)}
      </div>
    );
  };

  const AnimatedIncomeValue = ({ value }: { value: number }) => {
    const { ref, isInView } = useInView({ triggerOnce: true });
    const animatedValue = useCountUp({
      end: isInView ? value : 0,
      duration: 1500,
      decimals: 0,
    });

    return (
      <div ref={ref} className="text-2xl font-bold">
        {formatCurrencyWithLocale(animatedValue, countryCode, locale)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="animate-on-mount animate-slideInUp">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tax Calculator - {config.name}</CardTitle>
              <CardDescription>
                Estimate taxes based on income (Currency: {config.currency})
              </CardDescription>
            </div>
            <Calculator className="w-6 h-6 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-2">
            <Label htmlFor="income">Annual Net Profit</Label>
            <Input
              id="income"
              type="number"
              value={customIncome}
              onChange={(e) => setCustomIncome(e.target.value)}
              placeholder="Enter annual income"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomIncome(yearlyMetrics.netProfit.toString())}
            >
              Use Current Year Profit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomIncome(yearlyMetrics.totalRevenue.toString())}
            >
              Use Total Revenue
            </Button>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Annual Income
              </div>
              <AnimatedIncomeValue value={income} />
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Estimated Annual Tax
              </div>
              <AnimatedTaxValue value={annualTax} delay={100} />
              <div className="text-xs text-gray-500">Effective Rate: {effectiveRate.toFixed(1)}%</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Estimated Monthly Tax
              </div>
              <AnimatedTaxValue value={monthlyTax} delay={200} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Breakdown */}
      {breakdown.length > 0 && (
        <Card className="animate-on-mount animate-fadeIn animation-delay-300">
          <CardHeader>
            <CardTitle>Tax Breakdown by Bracket</CardTitle>
            <CardDescription>Detailed calculation for {config.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Income Bracket</TableHead>
                  <TableHead className="text-right">Taxable Amount</TableHead>
                  <TableHead className="text-center">Tax Rate</TableHead>
                  <TableHead className="text-right">Tax Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.bracket}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrencyWithLocale(item.taxableAmount, countryCode, locale)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold">
                        {item.rate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-red-600">
                      {formatCurrencyWithLocale(item.tax, countryCode, locale)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 dark:bg-gray-800 font-bold">
                  <TableCell colSpan={3} className="text-right dark:text-gray-100">
                    Total Tax
                  </TableCell>
                  <TableCell className="text-right font-mono text-lg text-red-600 dark:text-red-400">
                    {formatCurrencyWithLocale(annualTax, countryCode, locale)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-900">
                <strong>After-Tax Income:</strong>{' '}
                <span className="text-lg font-bold ml-2">
                  {formatCurrencyWithLocale(income - annualTax, countryCode, locale)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
