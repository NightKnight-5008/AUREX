/**
 * Currency Conversion Service Tests
 *
 * These tests validate the critical currency conversion logic to ensure:
 * 1. All values are stored in USD (base currency)
 * 2. Display conversion is correct and consistent
 * 3. No double conversion occurs
 * 4. Currency switching doesn't mutate stored values
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CurrencyConversionService,
  convertCurrency,
  formatCurrency,
  getFXRate,
  convertToBase,
  getCurrencyFromCountry,
} from '../currency-conversion';

describe('CurrencyConversionService', () => {
  beforeEach(() => {
    // Reset conversion history before each test
    CurrencyConversionService.resetHistory();
  });

  describe('FX Rates', () => {
    it('should return 1.0 for USD (base currency)', () => {
      expect(getFXRate('US')).toBe(1.0);
    });

    it('should return correct FX rate for EGP', () => {
      expect(getFXRate('EG')).toBe(50.0);
    });

    it('should return correct FX rate for GBP', () => {
      expect(getFXRate('GB')).toBeCloseTo(0.79, 2);
    });

    it('should return correct FX rate for EUR', () => {
      expect(getFXRate('EU')).toBeCloseTo(0.92, 2);
    });

    it('should return correct FX rate for INR', () => {
      expect(getFXRate('IN')).toBe(83.0);
    });
  });

  describe('Currency Conversion - Base to Display', () => {
    it('should convert 1M USD to 50M EGP correctly', () => {
      const baseAmountUSD = 1_000_000;
      const displayAmountEGP = convertCurrency(baseAmountUSD, 'EG');

      expect(displayAmountEGP).toBe(50_000_000);
    });

    it('should convert 10M USD to 500M EGP correctly', () => {
      const baseAmountUSD = 10_000_000;
      const displayAmountEGP = convertCurrency(baseAmountUSD, 'EG');

      expect(displayAmountEGP).toBe(500_000_000);
    });

    it('should not change USD when converting to US', () => {
      const baseAmountUSD = 1_000_000;
      const displayAmountUSD = convertCurrency(baseAmountUSD, 'US');

      expect(displayAmountUSD).toBe(1_000_000);
    });

    it('should convert USD to GBP correctly', () => {
      const baseAmountUSD = 1_000_000;
      const displayAmountGBP = convertCurrency(baseAmountUSD, 'GB');

      expect(displayAmountGBP).toBeCloseTo(790_000, -2);
    });

    it('should convert USD to INR correctly', () => {
      const baseAmountUSD = 1_000_000;
      const displayAmountINR = convertCurrency(baseAmountUSD, 'IN');

      expect(displayAmountINR).toBe(83_000_000);
    });
  });

  describe('Currency Conversion - Display to Base', () => {
    it('should convert 50M EGP back to 1M USD', () => {
      const displayAmountEGP = 50_000_000;
      const baseAmountUSD = convertToBase(displayAmountEGP, 'EG');

      expect(baseAmountUSD).toBeCloseTo(1_000_000, 0);
    });

    it('should convert 790K GBP back to 1M USD', () => {
      const displayAmountGBP = 790_000;
      const baseAmountUSD = convertToBase(displayAmountGBP, 'GB');

      expect(baseAmountUSD).toBeCloseTo(1_000_000, 0);
    });

    it('should not change USD when converting from US', () => {
      const displayAmountUSD = 1_000_000;
      const baseAmountUSD = convertToBase(displayAmountUSD, 'US');

      expect(baseAmountUSD).toBe(1_000_000);
    });
  });

  describe('Round-trip Conversion', () => {
    it('should maintain value through USD -> EGP -> USD round trip', () => {
      const originalUSD = 1_000_000;

      // Convert to EGP
      const egp = convertCurrency(originalUSD, 'EG');
      expect(egp).toBe(50_000_000);

      // Convert back to USD
      const backToUSD = convertToBase(egp, 'EG');
      expect(backToUSD).toBeCloseTo(originalUSD, 0);
    });

    it('should maintain value through USD -> GBP -> USD round trip', () => {
      const originalUSD = 1_000_000;

      // Convert to GBP
      const gbp = convertCurrency(originalUSD, 'GB');

      // Convert back to USD
      const backToUSD = convertToBase(gbp, 'GB');
      expect(backToUSD).toBeCloseTo(originalUSD, -2);
    });
  });

  describe('Currency Formatting', () => {
    it('should format USD correctly', () => {
      const formatted = formatCurrency(1_000_000, 'US');
      expect(formatted).toContain('1,000,000');
      expect(formatted).toContain('$');
    });

    it('should format EGP correctly after conversion', () => {
      const formatted = formatCurrency(1_000_000, 'EG');
      expect(formatted).toContain('50,000,000');
      expect(formatted).toContain('EGP');
    });

    it('should format GBP correctly after conversion', () => {
      const formatted = formatCurrency(1_000_000, 'GB');
      expect(formatted).toContain('790,000');
      expect(formatted).toContain('£');
    });
  });

  describe('Critical Bug Prevention', () => {
    it('should NOT apply conversion twice to the same value', () => {
      const baseAmountUSD = 1_000_000;

      // First conversion
      const firstConversion = convertCurrency(baseAmountUSD, 'EG');
      expect(firstConversion).toBe(50_000_000);

      // Second conversion of the SAME base value should give same result
      const secondConversion = convertCurrency(baseAmountUSD, 'EG');
      expect(secondConversion).toBe(50_000_000);

      // NOT 2,500,000,000 (which would be double conversion)
      expect(secondConversion).not.toBe(2_500_000_000);
    });

    it('should maintain stable values across multiple country switches', () => {
      const baseAmountUSD = 10_000_000; // 10M USD net worth

      // Switch to EG
      const asEGP = convertCurrency(baseAmountUSD, 'EG');
      expect(asEGP).toBe(500_000_000); // 500M EGP

      // Switch to US
      const backToUSD = convertCurrency(baseAmountUSD, 'US');
      expect(backToUSD).toBe(10_000_000); // Still 10M USD

      // Switch to GB
      const asGBP = convertCurrency(baseAmountUSD, 'GB');
      expect(asGBP).toBeCloseTo(7_900_000, -2); // ~7.9M GBP

      // Switch back to EG
      const backToEGP = convertCurrency(baseAmountUSD, 'EG');
      expect(backToEGP).toBe(500_000_000); // Still 500M EGP

      // All conversions from the SAME base value should be consistent
    });

    it('should detect and prevent double conversion with validation', () => {
      const baseAmountUSD = 1_000_000;
      const conversionId = 'test-conversion-1';

      // First conversion with ID should succeed
      const firstConversion = CurrencyConversionService.convertFromBase(
        baseAmountUSD,
        'EG',
        { conversionId, validateOnce: true }
      );
      expect(firstConversion).toBe(50_000_000);

      // Second conversion with same ID should throw error
      expect(() => {
        CurrencyConversionService.convertFromBase(
          baseAmountUSD,
          'EG',
          { conversionId, validateOnce: true }
        );
      }).toThrow(/Double conversion detected/);
    });
  });

  describe('Country to Currency Mapping', () => {
    it('should map US to USD', () => {
      expect(getCurrencyFromCountry('US')).toBe('USD');
    });

    it('should map EG to EGP', () => {
      expect(getCurrencyFromCountry('EG')).toBe('EGP');
    });

    it('should map GB to GBP', () => {
      expect(getCurrencyFromCountry('GB')).toBe('GBP');
    });

    it('should map IN to INR', () => {
      expect(getCurrencyFromCountry('IN')).toBe('INR');
    });

    it('should default to USD for unknown country', () => {
      expect(getCurrencyFromCountry('XX')).toBe('USD');
    });
  });

  describe('Real-world Scenario: Net Worth Display', () => {
    it('should display net worth correctly across currency switches', () => {
      // Company has $10.74M USD net worth (stored in base currency)
      const netWorthUSD = 10_740_000;

      // When displayed in Egypt
      const netWorthEGP = convertCurrency(netWorthUSD, 'EG');
      expect(netWorthEGP).toBe(537_000_000); // 537M EGP

      // When displayed in US
      const displayedUSD = convertCurrency(netWorthUSD, 'US');
      expect(displayedUSD).toBe(10_740_000); // 10.74M USD

      // When displayed in UK
      const netWorthGBP = convertCurrency(netWorthUSD, 'GB');
      expect(netWorthGBP).toBeCloseTo(8_484_600, -2); // ~8.48M GBP

      // When displayed in India
      const netWorthINR = convertCurrency(netWorthUSD, 'IN');
      expect(netWorthINR).toBe(891_420_000); // ~891M INR
    });
  });

  describe('Batch Conversion Performance', () => {
    it('should batch convert multiple values efficiently', () => {
      const baseAmounts = [1_000_000, 2_000_000, 5_000_000, 10_000_000];

      const converted = CurrencyConversionService.convertBatch(baseAmounts, 'EG');

      expect(converted).toEqual([50_000_000, 100_000_000, 250_000_000, 500_000_000]);
    });

    it('should handle batch conversion to USD without changes', () => {
      const baseAmounts = [1_000_000, 2_000_000];

      const converted = CurrencyConversionService.convertBatch(baseAmounts, 'US');

      expect(converted).toEqual([1_000_000, 2_000_000]);
    });
  });
});
