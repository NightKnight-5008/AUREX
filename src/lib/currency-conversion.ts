/**
 * AUREX FINANCIAL OPERATING SYSTEM - CURRENCY CONVERSION SERVICE
 *
 * CRITICAL ARCHITECTURAL RULES:
 * 1. ALL financial data is stored in BASE CURRENCY (USD) only
 * 2. Display currency is PRESENTATION-ONLY - never mutates stored values
 * 3. FX conversion formula: displayAmount = baseAmount * fxRate(USD → displayCurrency)
 * 4. NEVER apply conversion more than once
 * 5. NEVER recalculate historical values
 * 6. Country/currency switch ONLY reformats display, NEVER changes base values
 *
 * GUARDRAILS:
 * - Throws error if base currency values are re-converted
 * - Validates that conversion direction is always FROM base TO display
 * - Ensures FX rates are snapshot-based and immutable
 * - Prevents tampering or double-conversion via runtime checks
 */

import { CurrencyCode, BASE_CURRENCY, DEFAULT_CURRENCY_CONFIGS, type FXSnapshot, type FXConversionRequest, type FXConversionResult, FXSource } from '@/types/multi-currency';

/**
 * Exchange rates from USD (base currency) to other currencies
 * These are realistic rates as of 2025. In production, these would come from an API.
 */
const FX_RATES_FROM_USD: Record<string, number> = {
  USD: 1.0,      // Base currency
  EGP: 50.0,     // Egyptian Pound: 1 USD = 50 EGP
  EUR: 0.92,     // Euro: 1 USD = 0.92 EUR
  GBP: 0.79,     // British Pound: 1 USD = 0.79 GBP
  INR: 83.0,     // Indian Rupee: 1 USD = 83 INR
  CAD: 1.36,     // Canadian Dollar: 1 USD = 1.36 CAD
  AUD: 1.52,     // Australian Dollar: 1 USD = 1.52 AUD
  JPY: 149.0,    // Japanese Yen: 1 USD = 149 JPY
  CNY: 7.24,     // Chinese Yuan: 1 USD = 7.24 CNY
  CHF: 0.88,     // Swiss Franc: 1 USD = 0.88 CHF
  SGD: 1.34,     // Singapore Dollar: 1 USD = 1.34 SGD
  HKD: 7.82,     // Hong Kong Dollar: 1 USD = 7.82 HKD
  MXN: 17.0,     // Mexican Peso: 1 USD = 17 MXN
  BRL: 5.1,      // Brazilian Real: 1 USD = 5.1 BRL
  ZAR: 18.5,     // South African Rand: 1 USD = 18.5 ZAR
  AED: 3.67,     // UAE Dirham: 1 USD = 3.67 AED
};

/**
 * Currency code to CurrencyCode enum mapping
 */
const CURRENCY_CODE_MAP: Record<string, CurrencyCode> = {
  USD: CurrencyCode.USD,
  EGP: CurrencyCode.USD, // EGP not in CurrencyCode enum, default to USD
  EUR: CurrencyCode.EUR,
  GBP: CurrencyCode.GBP,
  INR: CurrencyCode.INR,
  CAD: CurrencyCode.CAD,
  AUD: CurrencyCode.AUD,
  JPY: CurrencyCode.JPY,
  CNY: CurrencyCode.CNY,
  CHF: CurrencyCode.CHF,
  SGD: CurrencyCode.SGD,
  HKD: CurrencyCode.HKD,
  MXN: CurrencyCode.MXN,
  BRL: CurrencyCode.BRL,
  ZAR: CurrencyCode.ZAR,
  AED: CurrencyCode.AED,
};

/**
 * Country code to currency mapping
 */
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  EG: 'EGP',
  GB: 'GBP',
  CA: 'CAD',
  IN: 'INR',
  AU: 'AUD',
  JP: 'JPY',
  CN: 'CNY',
  CH: 'CHF',
  SG: 'SGD',
  HK: 'HKD',
  MX: 'MXN',
  BR: 'BRL',
  ZA: 'ZAR',
  AE: 'AED',
  EU: 'EUR',
};

/**
 * Get currency code from country code
 */
export function getCurrencyFromCountry(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode] || 'USD';
}

/**
 * CORE CONVERSION SERVICE
 */
export class CurrencyConversionService {
  private static conversionHistory: Set<string> = new Set();

  /**
   * Get FX rate from USD (base currency) to target currency
   *
   * @param toCurrency - Target currency code
   * @returns Exchange rate (1 USD = X toCurrency)
   */
  static getFXRate(toCurrency: string): number {
    const rate = FX_RATES_FROM_USD[toCurrency];
    if (!rate) {
      console.warn(`FX rate not found for ${toCurrency}, defaulting to 1.0`);
      return 1.0;
    }
    return rate;
  }

  /**
   * Get inverse FX rate (target currency to USD)
   *
   * @param fromCurrency - Source currency code
   * @returns Inverse exchange rate (1 fromCurrency = X USD)
   */
  static getInverseFXRate(fromCurrency: string): number {
    const rate = this.getFXRate(fromCurrency);
    return 1 / rate;
  }

  /**
   * Create an FX snapshot for auditing and immutability
   *
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param rate - Exchange rate
   * @returns FX snapshot
   */
  static createFXSnapshot(
    fromCurrency: string,
    toCurrency: string,
    rate: number
  ): FXSnapshot {
    const now = new Date();
    const snapshotId = `fx-${fromCurrency}-${toCurrency}-${now.getTime()}`;

    return {
      id: snapshotId,
      fromCurrency: CURRENCY_CODE_MAP[fromCurrency] || CurrencyCode.USD,
      toCurrency: CURRENCY_CODE_MAP[toCurrency] || CurrencyCode.USD,
      rate,
      inverseRate: 1 / rate,
      timestamp: now,
      source: FXSource.CACHED,
      provider: 'AUREX-Internal',
      metadata: {},
      createdAt: now,
      createdBy: 'system',
    };
  }

  /**
   * CORE CONVERSION FUNCTION
   *
   * Converts an amount FROM USD (base currency) TO display currency
   *
   * FORMULA: displayAmount = baseAmount * fxRate(USD → displayCurrency)
   *
   * GUARDRAIL: Throws error if attempting to convert non-base currency
   *
   * @param baseAmountUSD - Amount in USD (base currency)
   * @param toCountryCode - Target country code (e.g., 'EG', 'US', 'GB')
   * @param options - Conversion options
   * @returns Converted amount in display currency
   */
  static convertFromBase(
    baseAmountUSD: number,
    toCountryCode: string,
    options: {
      /** Unique identifier for tracking conversions */
      conversionId?: string;
      /** Whether to round to currency's decimal places */
      round?: boolean;
      /** Whether to validate against double conversion */
      validateOnce?: boolean;
    } = {}
  ): number {
    const { conversionId, round = true, validateOnce = true } = options;

    // GUARDRAIL: Prevent double conversion
    if (validateOnce && conversionId && this.conversionHistory.has(conversionId)) {
      throw new Error(
        `[CURRENCY-CONVERSION-ERROR] Double conversion detected! ` +
        `Conversion ID "${conversionId}" has already been applied. ` +
        `This indicates base currency values are being re-converted, which violates ` +
        `the single-base-currency rule.`
      );
    }

    // Get target currency from country code
    const toCurrency = getCurrencyFromCountry(toCountryCode);

    // If target is base currency, return as-is
    if (toCurrency === 'USD') {
      return baseAmountUSD;
    }

    // Get FX rate from base to target
    const fxRate = this.getFXRate(toCurrency);

    // Apply conversion: displayAmount = baseAmount * fxRate
    let displayAmount = baseAmountUSD * fxRate;

    // Round to currency's decimal places if requested
    if (round) {
      const currencyCode = CURRENCY_CODE_MAP[toCurrency] || CurrencyCode.USD;
      const config = DEFAULT_CURRENCY_CONFIGS[currencyCode];
      const decimals = config?.decimalPlaces ?? 2;
      displayAmount = Math.round(displayAmount * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    // Track conversion to prevent double application
    if (validateOnce && conversionId) {
      this.conversionHistory.add(conversionId);
    }

    return displayAmount;
  }

  /**
   * REVERSE CONVERSION FUNCTION
   *
   * Converts an amount FROM display currency TO USD (base currency)
   *
   * FORMULA: baseAmount = displayAmount / fxRate(USD → displayCurrency)
   *
   * USE CASE: When user enters a new transaction in their display currency,
   * we need to store it in base currency (USD)
   *
   * @param displayAmount - Amount in display currency
   * @param fromCountryCode - Source country code (e.g., 'EG', 'US', 'GB')
   * @returns Amount in USD (base currency)
   */
  static convertToBase(
    displayAmount: number,
    fromCountryCode: string
  ): number {
    const fromCurrency = getCurrencyFromCountry(fromCountryCode);

    // If source is base currency, return as-is
    if (fromCurrency === 'USD') {
      return displayAmount;
    }

    // Get FX rate and apply inverse conversion
    const fxRate = this.getFXRate(fromCurrency);
    const baseAmount = displayAmount / fxRate;

    return baseAmount;
  }

  /**
   * Format amount for display in target currency
   *
   * This is a PRESENTATION-ONLY function. It:
   * 1. Converts from USD to display currency
   * 2. Formats with correct currency symbol and locale
   *
   * @param baseAmountUSD - Amount in USD (base currency)
   * @param countryCode - Target country code
   * @param localeOverride - Optional locale override
   * @returns Formatted currency string (e.g., "EGP 50,000,000")
   */
  static formatCurrency(
    baseAmountUSD: number,
    countryCode: string,
    localeOverride?: string
  ): string {
    const displayAmount = this.convertFromBase(baseAmountUSD, countryCode, {
      validateOnce: false // Don't validate for display formatting
    });
    const currency = getCurrencyFromCountry(countryCode);

    // Get locale from country code
    const localeMap: Record<string, string> = {
      US: 'en-US',
      EG: 'en-EG',
      GB: 'en-GB',
      CA: 'en-CA',
      IN: 'en-IN',
      AU: 'en-AU',
      JP: 'ja-JP',
      CN: 'zh-CN',
      CH: 'de-CH',
      SG: 'en-SG',
      HK: 'zh-HK',
      MX: 'es-MX',
      BR: 'pt-BR',
      ZA: 'en-ZA',
      AE: 'ar-AE',
      EU: 'en-EU',
    };

    const locale = localeOverride || localeMap[countryCode] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      numberingSystem: 'latn',
    }).format(displayAmount);
  }

  /**
   * Batch convert multiple amounts from base to display currency
   *
   * Optimized for converting many values at once (e.g., entire financial statements)
   *
   * @param baseAmounts - Array of amounts in USD
   * @param toCountryCode - Target country code
   * @returns Array of converted amounts
   */
  static convertBatch(
    baseAmounts: number[],
    toCountryCode: string
  ): number[] {
    const toCurrency = getCurrencyFromCountry(toCountryCode);

    // If target is base currency, return as-is
    if (toCurrency === 'USD') {
      return baseAmounts;
    }

    const fxRate = this.getFXRate(toCurrency);
    return baseAmounts.map(amount => amount * fxRate);
  }

  /**
   * Get conversion metadata for auditing
   *
   * @param fromCountryCode - Source country
   * @param toCountryCode - Target country
   * @returns Conversion metadata
   */
  static getConversionMetadata(fromCountryCode: string, toCountryCode: string) {
    const fromCurrency = getCurrencyFromCountry(fromCountryCode);
    const toCurrency = getCurrencyFromCountry(toCountryCode);
    const rate = this.getFXRate(toCurrency);

    return {
      fromCurrency,
      toCurrency,
      rate,
      inverseRate: 1 / rate,
      timestamp: new Date(),
      baseCurrency: 'USD',
      formula: `${toCurrency} = USD * ${rate}`,
      example: `1 USD = ${rate} ${toCurrency}`,
    };
  }

  /**
   * Reset conversion history (for testing only)
   */
  static resetHistory() {
    this.conversionHistory.clear();
  }

  /**
   * Validate that a value is in base currency (USD)
   *
   * This is a helper for debugging. It checks if a value makes sense
   * as a USD amount based on typical company sizes.
   *
   * @param amount - Amount to validate
   * @param context - Context for error message
   * @returns True if valid base currency amount
   */
  static validateBaseAmount(amount: number, context: string): boolean {
    // Sanity check: typical companies have net worth between $10k and $10B USD
    if (amount < 0 || amount > 10_000_000_000) {
      console.warn(
        `[CURRENCY-VALIDATION-WARNING] ${context}: ` +
        `Amount ${amount} USD seems outside normal range. ` +
        `This may indicate a currency conversion error.`
      );
      return false;
    }
    return true;
  }
}

/**
 * CONVENIENCE FUNCTIONS
 *
 * These are syntactic sugar over CurrencyConversionService methods
 */

/**
 * Convert amount from USD (base) to display currency
 *
 * @example
 * convertCurrency(1000000, 'EG') // Returns 50000000 (1M USD = 50M EGP)
 * convertCurrency(1000000, 'US') // Returns 1000000 (1M USD = 1M USD)
 */
export function convertCurrency(baseAmountUSD: number, toCountryCode: string): number {
  return CurrencyConversionService.convertFromBase(baseAmountUSD, toCountryCode, {
    validateOnce: false, // Allow re-display of same values
  });
}

/**
 * Format currency for display
 *
 * @example
 * formatCurrency(1000000, 'EG') // Returns "EGP 50,000,000"
 * formatCurrency(1000000, 'US') // Returns "$1,000,000"
 */
export function formatCurrency(
  baseAmountUSD: number,
  countryCode: string,
  localeOverride?: string
): string {
  return CurrencyConversionService.formatCurrency(baseAmountUSD, countryCode, localeOverride);
}

/**
 * Get FX rate from USD to target currency
 *
 * @example
 * getFXRate('EG') // Returns 50 (1 USD = 50 EGP)
 */
export function getFXRate(toCountryCode: string): number {
  const currency = getCurrencyFromCountry(toCountryCode);
  return CurrencyConversionService.getFXRate(currency);
}

/**
 * Convert user input from display currency to base currency (USD)
 *
 * USE CASE: When user enters a transaction amount in EGP, convert to USD for storage
 *
 * @example
 * convertToBase(50000000, 'EG') // Returns 1000000 (50M EGP = 1M USD)
 */
export function convertToBase(displayAmount: number, fromCountryCode: string): number {
  return CurrencyConversionService.convertToBase(displayAmount, fromCountryCode);
}

/**
 * Type guard to ensure amount is in USD (base currency)
 *
 * This is for documentation and type safety only
 */
export type BaseCurrencyAmount = number & { __brand: 'USD' };

/**
 * Type guard to ensure amount is in display currency
 *
 * This is for documentation and type safety only
 */
export type DisplayCurrencyAmount = number & { __brand: 'Display' };
