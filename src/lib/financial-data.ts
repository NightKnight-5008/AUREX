import { DEFAULT_COUNTRY, getCountryConfig } from './country-config';
import { formatCurrency as formatCurrencyWithConversion } from './currency-conversion';

// ===============================================
// UTILITY FORMATTERS (using CurrencyConversionService)
// ===============================================

/**
 * Format currency with automatic FX conversion
 *
 * IMPORTANT: This assumes the input amount is in USD (base currency).
 * It will convert to the display currency and format appropriately.
 *
 * @param baseAmountUSD - Amount in USD (base currency)
 * @param countryCode - Target country code for display
 * @param localeOverride - Optional locale override
 * @returns Formatted currency string in display currency
 */
export function formatCurrency(baseAmountUSD: number, countryCode: string = DEFAULT_COUNTRY, localeOverride?: string): string {
  return formatCurrencyWithConversion(baseAmountUSD, countryCode, localeOverride);
}

export function formatDate(date: Date, countryCode: string = DEFAULT_COUNTRY): string {
  const config = getCountryConfig(countryCode);
  return new Intl.DateTimeFormat(config.locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getDaysUntilDue(dueDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    numberingSystem: 'latn',
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}
