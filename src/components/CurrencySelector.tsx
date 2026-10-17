import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Info } from 'lucide-react';
import { CURRENCY_OPTIONS, getCountryConfig } from '@/lib/country-config';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CurrencySelectorProps {
  selectedCurrency?: string;
  onCurrencyChange: (currency: string) => void;
  countryCode: string;
}

export function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  countryCode,
}: CurrencySelectorProps) {
  const countryConfig = getCountryConfig(countryCode);
  const currentCurrency = selectedCurrency || countryConfig.currency;
  const selectedCurrencyInfo = CURRENCY_OPTIONS.find(c => c.code === currentCurrency);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Display Currency
            </CardTitle>
            <CardDescription>
              Choose the currency for displaying all financial values in the app
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currency">Select Currency</Label>
          <Select value={currentCurrency} onValueChange={onCurrencyChange}>
            <SelectTrigger id="currency" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                  <div className="flex items-center gap-2">
                    <span>{currency.flag}</span>
                    <span>{currency.name} ({currency.symbol})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Alert className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <AlertDescription className="text-purple-900 dark:text-purple-200">
            <div className="space-y-1 text-sm">
              <div>
                <strong>Selected Currency:</strong> {selectedCurrencyInfo?.name} ({selectedCurrencyInfo?.code})
              </div>
              <div>
                <strong>Symbol:</strong> {selectedCurrencyInfo?.symbol}
              </div>
              <div className="pt-2 text-xs">
                💡 <strong>Note:</strong> This setting only changes how amounts are displayed.
                Your country setting ({countryConfig.name}) determines tax brackets and banking information.
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {currentCurrency !== countryConfig.currency && (
          <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-900 dark:text-amber-200 text-sm">
              You've selected a different currency ({currentCurrency}) from your country's default ({countryConfig.currency}).
              All amounts will be displayed in {selectedCurrencyInfo?.name}.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
