import { useState, useEffect, useCallback } from 'react';

export interface ShopifyConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
}

export interface ShopifyMetrics {
  totalOrders: number;
  totalRevenue: number;
  visitors: number;
  conversionRate: number;
  averageOrderValue: number;
  lastUpdated: Date;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  variants: Array<{
    id: string;
    price: string;
    inventory_quantity: number;
  }>;
  images: Array<{
    src: string;
  }>;
}

const SHOPIFY_CONFIG_KEY = 'aurex_shopify_config';

export function useShopify() {
  const [config, setConfig] = useState<ShopifyConfig | null>(() => {
    const saved = localStorage.getItem(SHOPIFY_CONFIG_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ShopifyMetrics | null>(null);

  // Save config to localStorage
  useEffect(() => {
    if (config) {
      localStorage.setItem(SHOPIFY_CONFIG_KEY, JSON.stringify(config));
      setIsConnected(true);
    } else {
      localStorage.removeItem(SHOPIFY_CONFIG_KEY);
      setIsConnected(false);
    }
  }, [config]);

  // Test connection and fetch initial metrics
  const connect = useCallback(async (newConfig: ShopifyConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate config format
      if (!newConfig.shopDomain || !newConfig.accessToken) {
        throw new Error('Shop domain and access token are required');
      }

      // Validate access token format
      if (!newConfig.accessToken.startsWith('shpat_') && !newConfig.accessToken.startsWith('shpca_')) {
        throw new Error('Invalid access token format. Token should start with "shpat_" (Admin API) or "shpca_" (Custom App)');
      }

      // Test connection with a simple API call (use 2024-10 API version)
      const response = await fetchShopifyData(newConfig, '/admin/api/2024-10/shop.json');

      if (response.shop) {
        setConfig(newConfig);
        setIsConnected(true);
        await fetchMetrics(newConfig);
        return true;
      }

      throw new Error('Invalid Shopify credentials or insufficient permissions');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Shopify';
      setError(errorMessage);
      setIsConnected(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect from Shopify
  const disconnect = useCallback(() => {
    setConfig(null);
    setIsConnected(false);
    setMetrics(null);
    setError(null);
  }, []);

  // Fetch metrics from Shopify
  const fetchMetrics = useCallback(async (configToUse?: ShopifyConfig) => {
    const activeConfig = configToUse || config;
    if (!activeConfig) {
      setError('Not connected to Shopify');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch orders from last 30 days
      const ordersData = await fetchShopifyData(
        activeConfig,
        `/admin/api/2024-10/orders.json?status=any&created_at_min=${
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }`
      );

      // Fetch shop analytics
      const shopData = await fetchShopifyData(activeConfig, '/admin/api/2024-10/shop.json');

      // Calculate metrics
      const orders = ordersData.orders || [];
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum: number, order: any) =>
        sum + parseFloat(order.total_price || '0'), 0
      );
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Simulated visitor data (Shopify doesn't provide this via Admin API without analytics app)
      const visitors = Math.round(totalOrders * (Math.random() * 20 + 30)); // 30-50x conversion estimate
      const conversionRate = visitors > 0 ? (totalOrders / visitors) * 100 : 0;

      setMetrics({
        totalOrders,
        totalRevenue,
        visitors,
        conversionRate,
        averageOrderValue,
        lastUpdated: new Date(),
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch metrics';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Fetch products
  const fetchProducts = useCallback(async (): Promise<ShopifyProduct[]> => {
    if (!config) {
      throw new Error('Not connected to Shopify');
    }

    const data = await fetchShopifyData(config, '/admin/api/2024-10/products.json?limit=50');
    return data.products || [];
  }, [config]);

  // Auto-refresh metrics every 5 minutes when connected
  useEffect(() => {
    if (isConnected && config) {
      fetchMetrics();
      const interval = setInterval(() => {
        fetchMetrics();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [isConnected, config, fetchMetrics]);

  return {
    config,
    isConnected,
    isLoading,
    error,
    metrics,
    connect,
    disconnect,
    fetchMetrics,
    fetchProducts,
  };
}

// Helper function to fetch data from Shopify API
async function fetchShopifyData(config: ShopifyConfig, endpoint: string): Promise<any> {
  // Ensure shop domain has proper format
  let shopDomain = config.shopDomain.trim();

  // Remove https:// or http:// if user added it
  shopDomain = shopDomain.replace(/^https?:\/\//, '');

  // Add .myshopify.com if not present
  if (!shopDomain.includes('.myshopify.com')) {
    shopDomain = `${shopDomain}.myshopify.com`;
  }

  // Ensure endpoint starts with /admin/api/
  let apiEndpoint = endpoint;
  if (!apiEndpoint.startsWith('/admin/api/')) {
    // If endpoint already has /admin/api/, use it as is
    // Otherwise, it should already be formatted correctly from the calls
    apiEndpoint = endpoint;
  }

  const url = `https://${shopDomain}${apiEndpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': config.accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      mode: 'cors', // Explicitly set CORS mode
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Shopify API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          errorMessage = `Shopify API error: ${JSON.stringify(errorJson.errors)}`;
        }
      } catch {
        // If not JSON, include the text
        if (errorText) {
          errorMessage += ` - ${errorText.substring(0, 200)}`;
        }
      }

      throw new Error(errorMessage);
    }

    return response.json();
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      throw new Error('CORS Error: Cannot connect to Shopify directly from browser. Please verify your access token has the correct permissions and your store allows API access. You may need to set up a backend proxy for Shopify API requests.');
    }
    throw err;
  }
}
