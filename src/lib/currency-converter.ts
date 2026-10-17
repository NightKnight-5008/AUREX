/**
 * Currency Conversion Service
 *
 * Features:
 * - Online exchange rate fetching from multiple APIs
 * - Offline fallback with cached rates
 * - Weekly automatic rate updates
 * - Real currency conversion (not just display formatting)
 */

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  timestamp: number;
  source: 'online' | 'offline';
}

interface CachedRates {
  rates: Record<string, number>;
  timestamp: number;
  lastUpdated: string;
}

const CACHE_KEY = 'aurex-exchange-rates';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const UPDATE_CHECK_KEY = 'aurex-rates-last-check';

// Fallback rates (updated 2024) - used when all APIs fail and no cache exists
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EGP: 47.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.0,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 148.0,
  CNY: 7.24,
  CHF: 0.88,
  SAR: 3.75,
  AED: 3.67,
  KWD: 0.31,
  QAR: 3.64,
  BHD: 0.38,
};

/**
 * Exchange rate API providers
 */
class ExchangeRateAPI {
  /**
   * Free API: ExchangeRate-API (1,500 requests/month free)
   * https://www.exchangerate-api.com/
   */
  static async fetchFromExchangeRateAPI(): Promise<ExchangeRates | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        base: 'USD',
        rates: data.rates,
        timestamp: Date.now(),
        source: 'online',
      };
    } catch (error) {
      console.warn('[CurrencyConverter] ExchangeRate-API failed:', error);
      return null;
    }
  }

  /**
   * Fallback API: Frankfurter (free, no API key required)
   * https://www.frankfurter.app/
   */
  static async fetchFromFrankfurter(): Promise<ExchangeRates | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://api.frankfurter.app/latest?from=USD', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      return {
        base: 'USD',
        rates: { ...data.rates, USD: 1 }, // Add USD = 1
        timestamp: Date.now(),
        source: 'online',
      };
    } catch (error) {
      console.warn('[CurrencyConverter] Frankfurter API failed:', error);
      return null;
    }
  }

  /**
   * Try all APIs in sequence until one succeeds
   */
  static async fetchRates(): Promise<ExchangeRates | null> {
    // Try primary API
    const primary = await this.fetchFromExchangeRateAPI();
    if (primary) return primary;

    // Try fallback API
    const fallback = await this.fetchFromFrankfurter();
    if (fallback) return fallback;

    return null;
  }
}

/**
 * Cache management
 */
class RateCache {
  static save(rates: ExchangeRates): void {
    const cached: CachedRates = {
      rates: rates.rates,
      timestamp: rates.timestamp,
      lastUpdated: new Date(rates.timestamp).toISOString(),
    };

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      localStorage.setItem(UPDATE_CHECK_KEY, Date.now().toString());
      console.log('[CurrencyConverter] Rates cached successfully');
    } catch (error) {
      console.error('[CurrencyConverter] Failed to cache rates:', error);
    }
  }

  static load(): ExchangeRates | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedRates = JSON.parse(cached);

      return {
        base: 'USD',
        rates: data.rates,
        timestamp: data.timestamp,
        source: 'offline',
      };
    } catch (error) {
      console.error('[CurrencyConverter] Failed to load cached rates:', error);
      return null;
    }
  }

  static shouldUpdate(): boolean {
    try {
      const lastCheck = localStorage.getItem(UPDATE_CHECK_KEY);
      if (!lastCheck) return true;

      const timeSinceLastCheck = Date.now() - parseInt(lastCheck);
      return timeSinceLastCheck > CACHE_DURATION;
    } catch {
      return true;
    }
  }

  static clear(): void {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(UPDATE_CHECK_KEY);
  }
}

/**
 * Main Currency Converter Service
 */
export class CurrencyConverter {
  private static currentRates: ExchangeRates | null = null;
  private static isInitialized = false;
  private static isFetching = false;

  /**
   * Initialize converter with rates (online or cached)
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('[CurrencyConverter] Initializing...');

    // Try to load from cache first
    const cached = RateCache.load();
    if (cached) {
      this.currentRates = cached;
      console.log(`[CurrencyConverter] Loaded cached rates from ${cached.source}`);
    } else {
      // Use fallback rates immediately if no cache
      this.currentRates = {
        base: 'USD',
        rates: FALLBACK_RATES,
        timestamp: Date.now(),
        source: 'offline',
      };
      console.log('[CurrencyConverter] Using fallback rates');
    }

    // Check if we should fetch new rates (non-blocking)
    if (RateCache.shouldUpdate() || !cached) {
      this.updateRates().catch(err => {
        console.warn('[CurrencyConverter] Background update failed:', err);
      });
    }

    this.isInitialized = true;
  }

  /**
   * Update rates from online APIs
   */
  static async updateRates(): Promise<boolean> {
    if (this.isFetching) return false;

    this.isFetching = true;
    console.log('[CurrencyConverter] Fetching new rates...');

    try {
      const onlineRates = await ExchangeRateAPI.fetchRates();

      if (onlineRates) {
        this.currentRates = onlineRates;
        RateCache.save(onlineRates);
        console.log('[CurrencyConverter] Rates updated successfully from online API');
        return true;
      }

      console.warn('[CurrencyConverter] All APIs failed, using existing cache/fallback');
      return false;
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Get current exchange rates
   */
  static getRates(): ExchangeRates {
    if (!this.currentRates) {
      // Use fallback rates if nothing is available
      console.warn('[CurrencyConverter] Using fallback rates');
      return {
        base: 'USD',
        rates: FALLBACK_RATES,
        timestamp: Date.now(),
        source: 'offline',
      };
    }

    return this.currentRates;
  }

  /**
   * Convert amount from one currency to another
   *
   * @param amount - Amount in source currency
   * @param fromCurrency - Source currency code (e.g., 'EGP')
   * @param toCurrency - Target currency code (e.g., 'USD')
   * @returns Converted amount
   */
  static convert(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;

    const rates = this.getRates();

    // Get rates relative to USD
    const fromRate = rates.rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
    const toRate = rates.rates[toCurrency] || FALLBACK_RATES[toCurrency] || 1;

    // Convert: amount -> USD -> target currency
    const amountInUSD = amount / fromRate;
    const convertedAmount = amountInUSD * toRate;

    return convertedAmount;
  }

  /**
   * Get exchange rate between two currencies
   */
  static getRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return 1;

    const rates = this.getRates();
    const fromRate = rates.rates[fromCurrency] || FALLBACK_RATES[fromCurrency] || 1;
    const toRate = rates.rates[toCurrency] || FALLBACK_RATES[toCurrency] || 1;

    return toRate / fromRate;
  }

  /**
   * Get rate source info for display
   */
  static getRateInfo(): { source: 'online' | 'offline'; lastUpdated: string; age: string } {
    const rates = this.getRates();
    const age = this.getAgeString(rates.timestamp);

    return {
      source: rates.source,
      lastUpdated: new Date(rates.timestamp).toLocaleString(),
      age,
    };
  }

  /**
   * Force refresh rates (useful for manual update button)
   */
  static async forceUpdate(): Promise<boolean> {
    return await this.updateRates();
  }

  /**
   * Check if converter is using online rates
   */
  static isOnline(): boolean {
    return this.currentRates?.source === 'online';
  }

  /**
   * Get human-readable age string
   */
  private static getAgeString(timestamp: number): string {
    const ageMs = Date.now() - timestamp;
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (ageMinutes < 60) return `${ageMinutes} minutes ago`;
    if (ageHours < 24) return `${ageHours} hours ago`;
    return `${ageDays} days ago`;
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    RateCache.clear();
    this.currentRates = null;
    this.isInitialized = false;
  }
}

/**
 * Auto-initialize on module load (disabled to prevent blocking)
 * Call CurrencyConverter.initialize() manually when needed
 */
// if (typeof window !== 'undefined') {
//   CurrencyConverter.initialize();
//
//   // Set up weekly auto-update check
//   setInterval(() => {
//     if (RateCache.shouldUpdate()) {
//       console.log('[CurrencyConverter] Weekly update check triggered');
//       CurrencyConverter.updateRates();
//     }
//   }, 24 * 60 * 60 * 1000); // Check daily
// }
