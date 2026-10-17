import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShoppingBag, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { useShopify } from '@/hooks/use-shopify';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/financial-data';

interface ShopifySettingsProps {
  countryCode?: string;
}

export function ShopifySettings({ countryCode = 'US' }: ShopifySettingsProps) {
  const { config, isConnected, isLoading, error, metrics, connect, disconnect, fetchMetrics } = useShopify();

  const [shopDomain, setShopDomain] = useState(config?.shopDomain || '');
  const [accessToken, setAccessToken] = useState(config?.accessToken || '');
  const [showToken, setShowToken] = useState(false);

  const handleConnect = async () => {
    const success = await connect({
      shopDomain: shopDomain.trim(),
      accessToken: accessToken.trim(),
      apiVersion: '2024-10',
    });

    if (success) {
      setShowToken(false);
    }
  };

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect from Shopify?')) {
      disconnect();
      setShopDomain('');
      setAccessToken('');
    }
  };

  return (
    <div className="space-y-6">
      <Card className={isConnected ? 'border-green-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <CardTitle>Shopify Integration</CardTitle>
            </div>
            {isConnected ? (
              <Badge className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline">
                <XCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          <CardDescription>
            Connect your Shopify store to sync real-time website metrics, orders, and product data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="shopDomain">Shop Domain</Label>
                <Input
                  id="shopDomain"
                  placeholder="your-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Enter just the store name (e.g., "your-store") or full domain (your-store.myshopify.com)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessToken">Admin API Access Token</Label>
                <div className="relative">
                  <Input
                    id="accessToken"
                    type={showToken ? 'text' : 'password'}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxx"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    disabled={isLoading}
                    className={accessToken && !accessToken.startsWith('shpat_') && !accessToken.startsWith('shpca_') ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? 'Hide' : 'Show'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token must start with "shpat_" (Admin API) or "shpca_" (Custom App)
                </p>
              </div>

              <Alert>
                <AlertDescription className="text-xs space-y-2">
                  <div>
                    <strong>Setup Steps:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Go to Shopify Admin → Settings → Apps and sales channels</li>
                      <li>Click "Develop apps" → "Create an app"</li>
                      <li>Configure Admin API scopes: read_orders, read_products, read_inventory</li>
                      <li>Install app and copy the Admin API access token</li>
                    </ol>
                  </div>
                  <a
                    href="https://help.shopify.com/en/manual/apps/custom-apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    View detailed guide
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleConnect}
                disabled={!shopDomain || !accessToken || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Connect to Shopify
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Shop Domain</p>
                    <p className="text-xs text-muted-foreground">{config?.shopDomain}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300">
                    Active
                  </Badge>
                </div>

                {metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Orders</p>
                      <p className="text-lg font-bold">{formatNumber(metrics.totalOrders)}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Total Revenue</p>
                      <p className="text-lg font-bold">{formatCurrency(metrics.totalRevenue, countryCode)}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Avg Order Value</p>
                      <p className="text-lg font-bold">{formatCurrency(metrics.averageOrderValue, countryCode)}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground">Conversion Rate</p>
                      <p className="text-lg font-bold">{formatPercent(metrics.conversionRate)}</p>
                    </div>
                  </div>
                )}

                {metrics && (
                  <p className="text-xs text-muted-foreground text-center">
                    Last updated: {metrics.lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={() => fetchMetrics()} disabled={isLoading} variant="outline" className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Data'
                  )}
                </Button>
                <Button onClick={handleDisconnect} variant="destructive">
                  Disconnect
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <Alert>
          <AlertDescription>
            <strong>Live Sync Enabled:</strong> Your website metrics are automatically updating every 5 minutes with real-time data from Shopify.
            Orders, revenue, and conversion data will reflect in the Metrics → Website tab.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
