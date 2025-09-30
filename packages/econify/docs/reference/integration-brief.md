# Econify Integration Brief: Enhanced Explain Structure & FX Dates

## Overview

Econify has been enhanced with a **clean component structure** (v0.2.6) and **FX
date transparency** (v0.2.7) for optimal frontend integration. This brief covers
the changes needed in your consumer repository.

## 🎯 Key Changes

### 1. Clean Component Structure (v0.2.6)

- **Before**: Nested `units.original/normalized` structure requiring string
  parsing
- **After**: Direct access fields: `currency`, `scale`, `timeScale`

### 2. FX Date Transparency (v0.2.7)

- **New**: `FXTable.dates` field for rate timestamps
- **New**: `explain.fx.asOf` field in metadata

---

> Note: For per-indicator auto-targeting (currency, magnitude, time) and the
> explain.targetSelection payload used to drive UI transparency, see:
>
> - README section: “Auto‑Target by Indicator: targetSelection in Explain”
> - Example: examples/auto_targets_example.ts (prints targetSelection with
>   selected values, shares, and reason strings)

## 📊 Updated Explain Structure

### New Structure (v0.2.7)

```typescript
interface Explain {
  // 🆕 Direct access components (no string parsing needed)
  currency?: {
    original?: string; // "XOF", "EUR"
    normalized: string; // "USD"
  };
  scale?: {
    original?: Scale; // "billions", "millions"
    normalized: Scale; // "millions"
  };
  timeScale?: {
    original?: TimeScale; // "quarter", "year"
    normalized?: TimeScale; // "month"
  };

  // 🆕 Enhanced FX with dates
  fx?: {
    currency: string; // "XOF"
    base: "USD";
    rate: number; // 558.16
    asOf?: string; // "2024-01-15T10:30:00Z" ← NEW!
    source: "live" | "fallback";
    sourceId?: string; // "SNP"
  };

  // Existing fields (unchanged)
  units?: {
    originalUnit?: string;
    normalizedUnit: string;
    originalFullUnit?: string;
    normalizedFullUnit?: string;
  };
  magnitude?: {/* ... */};
  periodicity?: {/* ... */};
  conversion?: {/* ... */};
}
```

---

## 🔧 Frontend Integration Changes

### Before (String Parsing Required)

```javascript
// ❌ Old way - required string parsing
const unitString = item.explain.units?.originalUnit; // "XOF billions"
const currency = extractCurrencyFromString(unitString); // Manual parsing
const scale = extractScaleFromString(unitString); // Manual parsing
```

### After (Direct Access)

```javascript
// ✅ New way - direct property access
const currency = item.explain.currency?.original; // "XOF"
const scale = item.explain.scale?.original; // "billions"
const timeScale = item.explain.timeScale?.original; // "quarter"

// ✅ Easy conditional logic
const currencyChanged =
  item.explain.currency?.original !== item.explain.currency?.normalized;
const scaleChanged =
  item.explain.scale?.original !== item.explain.scale?.normalized;

// ✅ FX date information
const fxDate = item.explain.fx?.asOf; // "2024-01-15T10:30:00Z"
const rateAge = fxDate ? new Date() - new Date(fxDate) : null;
```

---

## 🔄 Required Updates in Consumer Repo

### 1. Update FX Fallback Configuration

**Before:**

```typescript
const fxFallback = {
  base: "USD",
  rates: {
    XOF: 558.16,
    EUR: 0.92,
  },
};
```

**After (with SNP database dates):**

```typescript
const fxFallback = {
  base: "USD",
  rates: {
    XOF: 558.16,
    EUR: 0.92,
  },
  dates: {
    XOF: "2024-01-15T10:30:00Z", // From SNP database
    EUR: "2024-01-15T09:45:00Z", // From SNP database
  },
};
```

### 2. Update Frontend Components

**Conversion Display Component:**

```typescript
const ConversionDisplay = ({ item }: { item: ProcessedData }) => {
  const { explain } = item;

  return (
    <div className="conversion-display">
      {/* Currency conversion */}
      {explain?.currency && (
        <div className="currency-conversion">
          <span className="original">{explain.currency.original}</span>
          <span className="arrow">→</span>
          <span className="normalized">{explain.currency.normalized}</span>
        </div>
      )}

      {/* Scale conversion */}
      {explain?.scale && (
        <div className="scale-conversion">
          <span className="original">{explain.scale.original}</span>
          <span className="arrow">→</span>
          <span className="normalized">{explain.scale.normalized}</span>
        </div>
      )}

      {/* FX rate with date */}
      {explain?.fx && (
        <div className="fx-info">
          <span>Rate: {explain.fx.rate}</span>
          {explain.fx.asOf && (
            <span className="fx-date">
              Updated: {formatDate(explain.fx.asOf)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
```

**Tooltip Component:**

```typescript
const ConversionTooltip = ({ item }: { item: ProcessedData }) => {
  const { explain } = item;

  const buildTooltipText = () => {
    const parts = [];

    if (explain?.currency?.original !== explain?.currency?.normalized) {
      parts.push(
        `${explain.currency.original} → ${explain.currency.normalized}`,
      );
    }

    if (explain?.scale?.original !== explain?.scale?.normalized) {
      parts.push(`${explain.scale.original} → ${explain.scale.normalized}`);
    }

    if (explain?.timeScale?.original !== explain?.timeScale?.normalized) {
      parts.push(
        `${explain.timeScale.original} → ${explain.timeScale.normalized}`,
      );
    }

    return parts.join(", ");
  };

  return (
    <div className="tooltip">
      <div>{buildTooltipText()}</div>
      {explain?.fx?.asOf && (
        <div className="rate-freshness">
          Rate from {formatDate(explain.fx.asOf)}
        </div>
      )}
    </div>
  );
};
```

### 3. Update Data Processing Pipeline

**SNP Database Integration:**

```typescript
// Fetch FX rates with dates from SNP database
const fetchFXRatesFromSNP = async (): Promise<FXTable> => {
  const rates = await snpDatabase.getFXRates();

  return {
    base: "USD",
    rates: rates.reduce((acc, rate) => {
      acc[rate.currency] = rate.value;
      return acc;
    }, {}),
    dates: rates.reduce((acc, rate) => {
      acc[rate.currency] = rate.updated_at; // ISO string from database
      return acc;
    }, {}),
  };
};

// Use in econify processing
const result = await processEconomicData(data, {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  fxFallback: await fetchFXRatesFromSNP(),
  explain: true,
});
```

---

## 🧪 Testing Checklist

- [ ] Update unit tests to use new component structure
- [ ] Test FX date display in UI components
- [ ] Verify backward compatibility with existing data
- [ ] Test SNP database FX date integration
- [ ] Validate tooltip and conversion displays
- [ ] Check rate freshness indicators

---

## 📦 Version Requirements

- **Econify**: Upgrade to `v0.2.7` or later
- **Breaking Changes**: None - fully backward compatible
- **Optional**: FX dates are optional, existing code works unchanged

---

## 🚀 Benefits After Integration

1. **🎯 No String Parsing**: Direct property access eliminates parsing logic
2. **📅 Rate Transparency**: Users see when each FX rate was last updated
3. **🔧 Easier UI Building**: Clean component structure perfect for React/Vue
4. **🌐 Localization Ready**: Easy to map currency codes to localized names
5. **📊 Better UX**: Rate freshness indicators improve user confidence
6. **🔍 Debug Friendly**: Clear separation of conversion components

This structure is optimized for frontend consumption and eliminates the need for
string parsing while providing full transparency into FX rate freshness.

---

## 📋 Quick Migration Summary

### For the Other Agent:

**Priority 1 - Essential Updates:**

1. Update econify to `v0.2.7`
2. Add `dates` field to FX fallback configuration from SNP database
3. Update frontend components to use direct property access:
   - `item.explain.currency.original` instead of parsing strings
   - `item.explain.scale.normalized` instead of parsing strings
   - `item.explain.fx.asOf` for rate timestamps

**Priority 2 - UI Enhancements:**

1. Add rate freshness indicators using `explain.fx.asOf`
2. Update tooltips to show conversion components clearly
3. Add conditional styling for currency/scale changes

**Priority 3 - Testing:**

1. Verify all existing functionality works (backward compatible)
2. Test new FX date display
3. Validate SNP database integration

**Key Files to Update:**

- FX configuration (add dates from SNP)
- Conversion display components
- Tooltip components
- Data processing pipeline
- Unit tests

The new structure provides the exact clean component access you requested - no
more string parsing needed!
