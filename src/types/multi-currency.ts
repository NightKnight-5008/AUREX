/**
 * AUREX FINANCIAL OPERATING SYSTEM - MULTI-CURRENCY TYPES
 *
 * Multi-currency support with FX rate snapshots.
 *
 * PRINCIPLES:
 * - Never recalculate historical FX rates
 * - Every transaction captures FX rate at time of execution
 * - Base currency (USD) for reporting
 * - Supports multiple exchange rate sources
 * - Immutable FX snapshots linked to transactions
 *
 * USE CASES:
 * - International card transactions
 * - Multi-currency payroll
 * - Cross-border vendor payments
 * - Consolidated reporting in base currency
 */

/**
 * Supported currency codes (ISO 4217)
 */
export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CNY = 'CNY',
  INR = 'INR',
  AUD = 'AUD',
  CAD = 'CAD',
  CHF = 'CHF',
  SGD = 'SGD',
  HKD = 'HKD',
  MXN = 'MXN',
  BRL = 'BRL',
  ZAR = 'ZAR',
  AED = 'AED'
}

/**
 * FX rate source
 */
export enum FXSource {
  /** Live API rate (e.g., exchangerate-api.com) */
  API = 'API',

  /** Manually entered rate */
  MANUAL = 'MANUAL',

  /** Bank/card issuer rate */
  BANK = 'BANK',

  /** Market mid-rate */
  MARKET = 'MARKET',

  /** Cached/historical rate */
  CACHED = 'CACHED'
}

/**
 * FX rate snapshot (immutable, captured at transaction time)
 */
export interface FXSnapshot {
  /** Unique snapshot ID */
  id: string;

  /** Source currency */
  fromCurrency: CurrencyCode;

  /** Target currency */
  toCurrency: CurrencyCode;

  /** Exchange rate (1 fromCurrency = rate toCurrency) */
  rate: number;

  /** Inverse rate (for quick reverse conversions) */
  inverseRate: number;

  /** When this rate was captured */
  timestamp: Date;

  /** Source of the rate */
  source: FXSource;

  /** Provider name (e.g., "exchangerate-api", "manual entry") */
  provider: string;

  /** Linked transaction ID (if applicable) */
  transactionId?: string;

  /** Linked ledger entry ID (if applicable) */
  ledgerEntryId?: string;

  /** Additional metadata */
  metadata: {
    /** Bid rate (if available) */
    bid?: number;

    /** Ask rate (if available) */
    ask?: number;

    /** Spread percentage */
    spread?: number;

    /** Provider-specific data */
    providerData?: Record<string, unknown>;
  };

  /** Created timestamp */
  createdAt: Date;

  /** Created by (user ID or 'system') */
  createdBy: string;
}

/**
 * Multi-currency amount
 */
export interface MultiCurrencyAmount {
  /** Original amount in original currency */
  originalAmount: number;

  /** Original currency code */
  originalCurrency: CurrencyCode;

  /** Converted amount in base currency */
  baseCurrencyAmount: number;

  /** Base currency code (typically USD) */
  baseCurrency: CurrencyCode;

  /** FX rate used for conversion */
  fxRate: number;

  /** FX snapshot ID (reference to immutable snapshot) */
  fxSnapshotId: string;

  /** When the conversion was performed */
  convertedAt: Date;
}

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  /** Currency code */
  code: CurrencyCode;

  /** Display name */
  name: string;

  /** Symbol (e.g., "$", "€", "¥") */
  symbol: string;

  /** Decimal places for display */
  decimalPlaces: number;

  /** Whether this is the base currency */
  isBaseCurrency: boolean;

  /** Whether this currency is active */
  active: boolean;

  /** Symbol position (before or after amount) */
  symbolPosition: 'before' | 'after';

  /** Thousands separator */
  thousandsSeparator: string;

  /** Decimal separator */
  decimalSeparator: string;
}

/**
 * FX rate cache entry
 */
export interface FXRateCache {
  /** Cache key: "FROM-TO" (e.g., "USD-EUR") */
  key: string;

  /** Exchange rate */
  rate: number;

  /** When cached */
  cachedAt: Date;

  /** Cache TTL in milliseconds */
  ttl: number;

  /** Expiration timestamp */
  expiresAt: Date;

  /** Source of cached rate */
  source: FXSource;

  /** Provider name */
  provider: string;
}

/**
 * FX conversion request
 */
export interface FXConversionRequest {
  /** Amount to convert */
  amount: number;

  /** Source currency */
  fromCurrency: CurrencyCode;

  /** Target currency */
  toCurrency: CurrencyCode;

  /** Preferred FX source (optional) */
  preferredSource?: FXSource;

  /** Whether to use cached rates */
  allowCache?: boolean;

  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTtl?: number;

  /** Transaction reference (for snapshot linking) */
  transactionRef?: string;

  /** Created by */
  createdBy: string;
}

/**
 * FX conversion result
 */
export interface FXConversionResult {
  /** Original amount */
  originalAmount: number;

  /** Original currency */
  originalCurrency: CurrencyCode;

  /** Converted amount */
  convertedAmount: number;

  /** Converted currency */
  convertedCurrency: CurrencyCode;

  /** Exchange rate used */
  rate: number;

  /** FX snapshot (immutable record) */
  snapshot: FXSnapshot;

  /** Whether rate was from cache */
  fromCache: boolean;

  /** Conversion timestamp */
  timestamp: Date;
}

/**
 * FX rate provider interface
 */
export interface FXRateProvider {
  /** Provider name */
  name: string;

  /** Fetch live rate */
  getRate(from: CurrencyCode, to: CurrencyCode): Promise<{
    rate: number;
    timestamp: Date;
    metadata?: Record<string, unknown>;
  }>;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;
}

/**
 * FX statistics
 */
export interface FXStatistics {
  /** Total conversions performed */
  totalConversions: number;

  /** Conversions by source */
  bySource: Record<FXSource, number>;

  /** Conversions by currency pair */
  byCurrencyPair: Map<string, number>;

  /** Total snapshots created */
  totalSnapshots: number;

  /** Cache hit rate percentage */
  cacheHitRate: number;

  /** Date range */
  dateRange: {
    earliest: Date;
    latest: Date;
  };

  /** Most converted pairs */
  topPairs: Array<{
    pair: string;
    count: number;
    totalVolume: number;
  }>;
}

/**
 * Base currency configuration (default: USD)
 */
export const BASE_CURRENCY: CurrencyCode = CurrencyCode.USD;

/**
 * Default currency configurations
 */
export const DEFAULT_CURRENCY_CONFIGS: Record<CurrencyCode, CurrencyConfig> = {
  [CurrencyCode.USD]: {
    code: CurrencyCode.USD,
    name: 'US Dollar',
    symbol: '$',
    decimalPlaces: 2,
    isBaseCurrency: true,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.EUR]: {
    code: CurrencyCode.EUR,
    name: 'Euro',
    symbol: '€',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: '.',
    decimalSeparator: ','
  },
  [CurrencyCode.GBP]: {
    code: CurrencyCode.GBP,
    name: 'British Pound',
    symbol: '£',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.JPY]: {
    code: CurrencyCode.JPY,
    name: 'Japanese Yen',
    symbol: '¥',
    decimalPlaces: 0,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.CNY]: {
    code: CurrencyCode.CNY,
    name: 'Chinese Yuan',
    symbol: '¥',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.INR]: {
    code: CurrencyCode.INR,
    name: 'Indian Rupee',
    symbol: '₹',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.AUD]: {
    code: CurrencyCode.AUD,
    name: 'Australian Dollar',
    symbol: 'A$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.CAD]: {
    code: CurrencyCode.CAD,
    name: 'Canadian Dollar',
    symbol: 'C$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.CHF]: {
    code: CurrencyCode.CHF,
    name: 'Swiss Franc',
    symbol: 'CHF',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.SGD]: {
    code: CurrencyCode.SGD,
    name: 'Singapore Dollar',
    symbol: 'S$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.HKD]: {
    code: CurrencyCode.HKD,
    name: 'Hong Kong Dollar',
    symbol: 'HK$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.MXN]: {
    code: CurrencyCode.MXN,
    name: 'Mexican Peso',
    symbol: 'MX$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.BRL]: {
    code: CurrencyCode.BRL,
    name: 'Brazilian Real',
    symbol: 'R$',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: '.',
    decimalSeparator: ','
  },
  [CurrencyCode.ZAR]: {
    code: CurrencyCode.ZAR,
    name: 'South African Rand',
    symbol: 'R',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  },
  [CurrencyCode.AED]: {
    code: CurrencyCode.AED,
    name: 'UAE Dirham',
    symbol: 'AED',
    decimalPlaces: 2,
    isBaseCurrency: false,
    active: true,
    symbolPosition: 'before',
    thousandsSeparator: ',',
    decimalSeparator: '.'
  }
};

/**
 * Default cache TTL for FX rates (1 hour)
 */
export const DEFAULT_FX_CACHE_TTL = 60 * 60 * 1000;
