# Currency Conversion System - Complete Guide

## Overview

AUREX now features a comprehensive, enterprise-grade currency conversion system with:

- ✅ **Real Currency Conversion** - Not just display formatting, actual conversion calculations
- ✅ **Online Exchange Rates** - Fetches live rates from multiple APIs when online
- ✅ **Offline Fallback** - Uses cached rates when internet is unavailable
- ✅ **Weekly Auto-Updates** - Automatically refreshes rates weekly
- ✅ **Manual Refresh** - Users can force-update rates anytime
- ✅ **Visual Indicators** - Shows rate source, age, and conversion status

---

## How It Works

### 1. **Base Architecture**

All financial data in AUREX is stored in the **base currency of the selected country**:
- Egypt (EG) → Base currency: **EGP**
- United States (US) → Base currency: **USD**
- India (IN) → Base currency: **INR**

When a user changes the display currency in Settings, the system **converts values in real-time** using live exchange rates.

### 2. **Exchange Rate APIs**

The system uses two free API providers with automatic fallback:

#### Primary: ExchangeRate-API
- URL: `https://api.exchangerate-api.com/v4/latest/USD`
- Free tier: 1,500 requests/month
- No API key required
- Updates multiple times daily

#### Fallback: Frankfurter
- URL: `https://api.frankfurter.app/latest?from=USD`
- Completely free
- No API key required
- European Central Bank data

If both APIs fail, the system uses hardcoded fallback rates (updated 2024).

### 3. **Caching Strategy**

**LocalStorage Keys:**
- `aurex-exchange-rates` → Cached exchange rate data
- `aurex-rates-last-check` → Timestamp of last update check

**Cache Duration:** 7 days

**Update Logic:**
1. On app load, check if rates exist in cache
2. If cache is older than 7 days, fetch new rates online
3. If online fetch fails, use cached rates
4. If no cache exists and APIs fail, use fallback rates

### 4. **Conversion Formula**

When converting from Currency A to Currency B:

```typescript
// Example: Convert 1000 EGP to USD

1. Get rate for EGP: 47.0 (1 USD = 47 EGP)
2. Get rate for USD: 1.0
3. Convert EGP to USD: amountInUSD = 1000 / 47.0 = 21.28 USD
4. Result: 1000 EGP = 21.28 USD
```

**Implementation:**
```typescript
const amountInUSD = amount / fromRate;
const convertedAmount = amountInUSD * toRate;
```

---

## User Experience

### In the Header

When the user selects a currency different from their country's default, a **compact badge** appears in the header showing:

- 🟢 **Green "Online" badge** → Using live exchange rates
- 🔴 **Gray "Offline" badge** → Using cached/fallback rates
- Current exchange rate (e.g., "EGP/USD: 0.0213")
- Hover tooltip with detailed info

**Example:**
```
[🟢 Online] EGP/USD: 0.0213
   ↑
   Tooltip: Last updated 5 minutes ago
```

### In Settings

The **Currency & Regional Settings** section shows a detailed card when currency differs from country default:

**"Exchange Rate Status" Card includes:**
- Current exchange rate (e.g., 1 EGP = 0.0213 USD)
- Source: Online API or Cached Data
- Last updated timestamp
- Age of data (e.g., "5 minutes ago")
- Manual refresh button
- Info box explaining the system

---

## Files Modified/Created

### New Files

1. **`src/lib/currency-converter.ts`** (358 lines)
   - Main conversion service
   - API integration
   - Cache management
   - Rate calculation logic

2. **`src/components/CurrencyStatusIndicator.tsx`** (128 lines)
   - Compact badge for header
   - Full card for settings
   - Real-time rate display
   - Manual refresh functionality

3. **`CURRENCY_CONVERSION_GUIDE.md`** (this file)
   - Complete documentation

### Modified Files

1. **`src/lib/country-config.ts`**
   - Updated `formatCurrencyWithLocale()` to perform **real conversion**
   - Now uses `CurrencyConverter.convert()` when currencies differ

2. **`src/components/GlobalHeader.tsx`**
   - Added `currency` prop
   - Displays `CurrencyStatusIndicator` when currency ≠ country default

3. **`src/components/GeneralSettings.tsx`**
   - Added `CurrencyStatusIndicator` to settings
   - Shows full exchange rate card

4. **`src/routes/index.tsx`**
   - Passes `currency` prop to `GlobalHeader`

---

## Example Scenarios

### Scenario 1: Egyptian User Viewing in USD

**Setup:**
- Country: Egypt (EG)
- Base Currency: EGP (all data stored in EGP)
- Display Currency: USD (user preference)

**What Happens:**
1. User selects "USD" in Settings → Currency Selector
2. System checks if online → fetches latest EGP/USD rate
3. Rate found: 1 EGP = 0.0213 USD (1 USD = 47 EGP)
4. All amounts automatically convert:
   - Salary: 50,000 EGP → 1,064 USD
   - Card Limit: 100,000 EGP → 2,128 USD
   - Transaction: 5,000 EGP → 106 USD

5. Header shows: `[🟢 Online] EGP/USD: 0.0213`
6. Settings shows full rate card with refresh button

### Scenario 2: Offline User with Cached Rates

**Setup:**
- No internet connection
- Last rate update: 3 days ago

**What Happens:**
1. System loads cached rates from localStorage
2. Conversions use 3-day-old rates
3. Header shows: `[🔴 Offline] EGP/USD: 0.0213`
4. Settings card shows: "Source: 🔴 Cached Data, Last updated 3 days ago"
5. Manual refresh button attempts to fetch new rates (will fail offline)

### Scenario 3: Weekly Auto-Update

**Setup:**
- User opened app 8 days ago
- Cache is stale (>7 days)

**What Happens:**
1. App detects cache age > 7 days
2. Automatically fetches new rates from API
3. Updates cache with fresh data
4. User sees: `[🟢 Online] EGP/USD: 0.0214` (rate changed slightly)
5. All conversions use new rate going forward

---

## Technical Details

### Supported Currencies

The system supports 15 major world currencies:

```typescript
USD, EUR, GBP, EGP, INR, CAD, AUD, JPY, CNY, CHF, SAR, AED, KWD, QAR, BHD
```

### Fallback Rates (Updated 2024)

```typescript
USD: 1
EGP: 47.0   (1 USD = 47 EGP)
EUR: 0.92
GBP: 0.79
INR: 83.0
CAD: 1.35
AUD: 1.52
JPY: 148.0
// ... etc
```

### API Response Format

**ExchangeRate-API:**
```json
{
  "base": "USD",
  "rates": {
    "EGP": 47.0,
    "EUR": 0.92,
    "GBP": 0.79,
    ...
  }
}
```

### Cache Format (localStorage)

```json
{
  "rates": {
    "USD": 1,
    "EGP": 47.0,
    "EUR": 0.92,
    ...
  },
  "timestamp": 1734567890123,
  "lastUpdated": "2024-12-18T10:30:00.123Z"
}
```

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Initialization**
   - Converter initializes only once on first use
   - Rates cached in memory after first load

2. **Smart Caching**
   - 7-day cache prevents excessive API calls
   - Weekly auto-update runs in background

3. **Fast Conversion**
   - Simple arithmetic: `amount / fromRate * toRate`
   - No network calls during conversion

4. **Minimal Re-renders**
   - Uses React memoization
   - Updates only when rates change

### API Usage Limits

With 1,500 requests/month on ExchangeRate-API free tier:

- **Per user:** ~50 requests/month (1-2 manual refreshes/day)
- **Supports:** ~30 concurrent users safely
- **Fallback:** Frankfurter API has no limits

---

## Troubleshooting

### Issue: "Rates not updating"

**Solution:**
1. Check internet connection
2. Clear browser cache (localStorage)
3. Click "Refresh Rates Now" in Settings
4. Check browser console for API errors

### Issue: "Showing offline rates when online"

**Solution:**
1. Cache may be fresh (< 7 days old)
2. Click "Refresh Rates Now" to force update
3. Check if APIs are accessible (CORS, firewall)

### Issue: "Wrong conversion amounts"

**Solution:**
1. Verify country selection matches data currency
2. Check if custom currency is selected
3. Refresh rates to ensure latest data
4. Clear cache and reload app

---

## Future Enhancements

### Planned Features

1. **Multi-Base Currency Support**
   - Allow data storage in multiple currencies
   - Convert between any currency pair

2. **Historical Rates**
   - Track rate changes over time
   - Show conversion history

3. **Custom Rate Override**
   - Let admins set custom rates
   - Override API rates for specific pairs

4. **Rate Alerts**
   - Notify when rate changes significantly
   - Set target exchange rates

5. **More API Providers**
   - Add more fallback options
   - Support paid APIs for higher accuracy

---

## Summary

✅ **Real-time conversion** using live exchange rates
✅ **Offline-first** with intelligent caching
✅ **Auto-updates** weekly for fresh data
✅ **Manual refresh** for on-demand updates
✅ **Visual indicators** for rate source and age
✅ **Multiple APIs** with automatic fallback
✅ **15 currencies** supported out of the box
✅ **Enterprise-grade** reliability and performance

The system provides a seamless, reliable currency conversion experience that works online and offline, with minimal user intervention required.
