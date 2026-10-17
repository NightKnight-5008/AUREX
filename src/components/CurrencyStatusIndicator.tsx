import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RefreshCw, Wifi, WifiOff, Clock, TrendingUp } from 'lucide-react';
import { CurrencyConverter } from '@/lib/currency-converter';

interface CurrencyStatusIndicatorProps {
  fromCurrency?: string;
  toCurrency?: string;
  compact?: boolean;
}

export function CurrencyStatusIndicator({
  fromCurrency = 'EGP',
  toCurrency = 'USD',
  compact = false,
}: CurrencyStatusIndicatorProps) {
  const [rateInfo, setRateInfo] = useState(CurrencyConverter.getRateInfo());
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentRate, setCurrentRate] = useState(
    CurrencyConverter.getRate(fromCurrency, toCurrency)
  );

  // Update rate info periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRateInfo(CurrencyConverter.getRateInfo());
      setCurrentRate(CurrencyConverter.getRate(fromCurrency, toCurrency));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [fromCurrency, toCurrency]);

  const handleRefresh = async () => {
    setIsUpdating(true);
    try {
      const success = await CurrencyConverter.forceUpdate();
      if (success) {
        setRateInfo(CurrencyConverter.getRateInfo());
        setCurrentRate(CurrencyConverter.getRate(fromCurrency, toCurrency));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  // Compact badge version for header
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={rateInfo.source === 'online' ? 'default' : 'secondary'}
              className="flex items-center gap-1.5 cursor-help transition-opacity duration-150"
            >
              {rateInfo.source === 'online' ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              <span className="text-xs">
                {fromCurrency}/{toCurrency}: {currentRate.toFixed(2)}
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="text-xs font-semibold">Exchange Rate Status</p>
              <p className="text-xs">
                Source: {rateInfo.source === 'online' ? '🟢 Online' : '🔴 Offline (Cached)'}
              </p>
              <p className="text-xs">Last updated: {rateInfo.age}</p>
              <p className="text-xs">
                Rate: 1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full card version for settings
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base">Exchange Rate Status</CardTitle>
          </div>
          <Badge variant={rateInfo.source === 'online' ? 'default' : 'secondary'}>
            {rateInfo.source === 'online' ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
        </div>
        <CardDescription>Real-time currency conversion rates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Rate */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">Current Rate</span>
            <Clock className="w-3 h-3 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">
            1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Updated {rateInfo.age}
          </div>
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Source:</span>
            <div className="font-semibold">
              {rateInfo.source === 'online' ? '🟢 Live API' : '🔴 Cached Data'}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Last Updated:</span>
            <div className="font-semibold">{rateInfo.age}</div>
          </div>
        </div>

        {/* Info Box */}
        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
          <p className="font-semibold mb-1">💡 How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Rates update automatically when online</li>
            <li>Cached rates used when offline</li>
            <li>Auto-refresh weekly</li>
            <li>Manual refresh available below</li>
          </ul>
        </div>

        {/* Refresh Button */}
        <Button
          onClick={handleRefresh}
          disabled={isUpdating}
          className="w-full"
          variant="outline"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Rates Now
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
