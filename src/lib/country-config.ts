import type { CountryConfig } from '@/types/financial';

// Country configurations with Egypt as default
export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  EG: {
    code: 'EG',
    name: 'Egypt',
    currency: 'EGP',
    locale: 'ar-EG',
    taxBrackets: [
      { bracket: '0-30K', rate: 0, minIncome: 0, maxIncome: 30000 },
      { bracket: '30K-45K', rate: 10, minIncome: 30000, maxIncome: 45000 },
      { bracket: '45K-60K', rate: 15, minIncome: 45000, maxIncome: 60000 },
      { bracket: '60K-200K', rate: 20, minIncome: 60000, maxIncome: 200000 },
      { bracket: '200K-400K', rate: 22.5, minIncome: 200000, maxIncome: 400000 },
      { bracket: '400K+', rate: 25, minIncome: 400000, maxIncome: Infinity },
    ],
    commonBanks: [
      'National Bank of Egypt',
      'Banque Misr',
      'Commercial International Bank (CIB)',
      'Bank of Alexandria',
      'QNB Alahli',
      'Arab African International Bank',
      'Banque du Caire',
      'HSBC Egypt',
      'Credit Agricole Egypt',
      'Egyptian Gulf Bank',
    ],
  },
  IN: {
    code: 'IN',
    name: 'India',
    currency: 'INR',
    locale: 'en-IN',
    taxBrackets: [
      { bracket: '0-2.5L', rate: 0, minIncome: 0, maxIncome: 250000 },
      { bracket: '2.5L-5L', rate: 5, minIncome: 250000, maxIncome: 500000 },
      { bracket: '5L-10L', rate: 20, minIncome: 500000, maxIncome: 1000000 },
      { bracket: '10L+', rate: 30, minIncome: 1000000, maxIncome: Infinity },
    ],
    commonBanks: [
      'HDFC Bank',
      'ICICI Bank',
      'State Bank of India',
      'Axis Bank',
      'Kotak Mahindra Bank',
      'Punjab National Bank',
      'Bank of Baroda',
    ],
  },
  US: {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    locale: 'en-US',
    taxBrackets: [
      { bracket: '0-50K', rate: 10, minIncome: 0, maxIncome: 50000 },
      { bracket: '50K-100K', rate: 12, minIncome: 50000, maxIncome: 100000 },
      { bracket: '100K-200K', rate: 22, minIncome: 100000, maxIncome: 200000 },
      { bracket: '200K+', rate: 32, minIncome: 200000, maxIncome: Infinity },
    ],
    commonBanks: [
      'Chase Bank',
      'Bank of America',
      'Wells Fargo',
      'Citibank',
      'US Bank',
      'Capital One',
      'PNC Bank',
    ],
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    locale: 'en-GB',
    taxBrackets: [
      { bracket: '0-50K', rate: 20, minIncome: 0, maxIncome: 50000 },
      { bracket: '50K-150K', rate: 40, minIncome: 50000, maxIncome: 150000 },
      { bracket: '150K+', rate: 45, minIncome: 150000, maxIncome: Infinity },
    ],
    commonBanks: [
      'HSBC UK',
      'Barclays',
      'Lloyds Bank',
      'NatWest',
      'Santander UK',
      'TSB Bank',
      'Nationwide',
    ],
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    locale: 'en-CA',
    taxBrackets: [
      { bracket: '0-50K', rate: 15, minIncome: 0, maxIncome: 50000 },
      { bracket: '50K-100K', rate: 20.5, minIncome: 50000, maxIncome: 100000 },
      { bracket: '100K-150K', rate: 26, minIncome: 100000, maxIncome: 150000 },
      { bracket: '150K+', rate: 33, minIncome: 150000, maxIncome: Infinity },
    ],
    commonBanks: [
      'Royal Bank of Canada',
      'TD Canada Trust',
      'Bank of Nova Scotia',
      'Bank of Montreal',
      'CIBC',
      'National Bank of Canada',
    ],
  },
};

// Default country (Egypt)
export const DEFAULT_COUNTRY = 'EG';

// Get country config
export function getCountryConfig(countryCode: string): CountryConfig {
  return COUNTRY_CONFIGS[countryCode] || COUNTRY_CONFIGS[DEFAULT_COUNTRY];
}

// Format currency based on country
export function formatCurrencyByCountry(
  amount: number,
  countryCode: string = DEFAULT_COUNTRY
): string {
  const config = getCountryConfig(countryCode);
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date based on country locale
export function formatDateByCountry(date: Date, countryCode: string = DEFAULT_COUNTRY): string {
  const config = getCountryConfig(countryCode);
  return new Intl.DateTimeFormat(config.locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

// Get available countries for dropdown
export function getAvailableCountries(): Array<{ code: string; name: string }> {
  return Object.values(COUNTRY_CONFIGS).map((config) => ({
    code: config.code,
    name: config.name,
  }));
}

// Language/Locale options
export const LANGUAGE_OPTIONS = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'ar-EG', name: 'العربية (Arabic)', flag: '🇪🇬' },
];

// Currency options - comprehensive list of major world currencies
export const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', flag: '🇰🇼' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'QR', flag: '🇶🇦' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'BD', flag: '🇧🇭' },
];

// Format currency with custom locale and currency override
// Now with REAL currency conversion (not just formatting)
export function formatCurrencyWithLocale(
  amount: number,
  countryCode: string = DEFAULT_COUNTRY,
  localeOverride?: string,
  currencyOverride?: string
): string {
  const config = getCountryConfig(countryCode);
  const locale = localeOverride || config.locale;
  const baseCurrency = config.currency; // Base currency (e.g., EGP from country)
  const targetCurrency = currencyOverride || baseCurrency; // Target currency (e.g., USD from user selection)

  // Import converter dynamically to avoid circular dependencies
  let convertedAmount = amount;

  // Only convert if currencies differ
  if (baseCurrency !== targetCurrency) {
    try {
      // Dynamic import to avoid issues
      const { CurrencyConverter } = require('./currency-converter');
      convertedAmount = CurrencyConverter.convert(amount, baseCurrency, targetCurrency);
    } catch (error) {
      console.warn('[formatCurrencyWithLocale] Conversion failed, using original amount:', error);
    }
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(convertedAmount);
}

// Format date with custom locale override
export function formatDateWithLocale(
  date: Date,
  countryCode: string = DEFAULT_COUNTRY,
  localeOverride?: string
): string {
  const config = getCountryConfig(countryCode);
  const locale = localeOverride || config.locale;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
