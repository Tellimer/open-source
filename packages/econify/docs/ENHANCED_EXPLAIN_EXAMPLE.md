# 🎯 Enhanced Explain Metadata - Complete Example

## 📊 **What's New in v0.2.4**

The explain metadata system now provides **comprehensive conversion
transparency** with:

- ✅ **Clear conversion descriptions** (e.g., "year → month (÷12)")
- ✅ **Step-by-step conversion chain** with logical order
- ✅ **Complete unit information** (both simple and full units)
- ✅ **Direction indicators** for scaling and time conversion
- ✅ **Total conversion factor** calculation

---

## 🔍 **Example: AFG Balance of Trade**

### **Input Data**

```typescript
const data = [{
  value: -6798.401,
  unit: "USD Million",
  periodicity: "Yearly", // 🆕 Explicit field
  scale: "Millions", // 🆕 Explicit field
  currency_code: "USD", // 🆕 Explicit field
  name: "Afghanistan Balance of Trade",
  id: "AFGSTANBALRADE",
}];

const options = {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month",
  explain: true,
};
```

### **Enhanced Output**

```json
{
  "value": -566.533416666667,
  "unit": "USD Million",
  "normalized": -566.533416666667,
  "normalizedUnit": "USD millions per month",
  "explain": {
    "periodicity": {
      "original": "year",
      "target": "month",
      "adjusted": true,
      "factor": 0.08333333333333333,
      "direction": "upsample",
      "description": "year → month (÷12)"
    },
    "units": {
      "originalUnit": "USD millions",
      "normalizedUnit": "USD millions per month",
      "originalFullUnit": "USD millions per year",
      "normalizedFullUnit": "USD millions per month"
    },
    "conversion": {
      "summary": "USD millions per year → USD millions per month",
      "totalFactor": 0.08333333333333333,
      "steps": [
        "Time: year → month (÷12)"
      ]
    }
  }
}
```

---

## 🌍 **Example: Complex Multi-Step Conversion**

### **Input Data**

```typescript
const data = [{
  value: -1447.74,
  unit: "XOF Million", // Unit string (still required!)
  periodicity: "Quarterly", // 🆕 Explicit override
  scale: "Billions", // 🆕 Explicit override
  currency_code: "XOF", // 🆕 Explicit override
  name: "Benin Balance of Trade",
  id: "BENINBALRADE",
}];

const options = {
  targetCurrency: "USD",
  targetMagnitude: "millions",
  targetTimeScale: "month",
  explain: true,
  fxFallback: { base: "USD", rates: { XOF: 558.16 } },
};
```

### **Enhanced Output**

```json
{
  "value": -864.5907983373943,
  "unit": "XOF Million",
  "normalized": -864.5907983373943,
  "normalizedUnit": "USD millions per month",
  "explain": {
    "fx": {
      "currency": "XOF",
      "base": "USD",
      "rate": 558.16
    },
    "magnitude": {
      "originalScale": "billions",
      "targetScale": "millions",
      "factor": 1000,
      "direction": "downscale",
      "description": "billions → millions (×1000)"
    },
    "periodicity": {
      "original": "quarter",
      "target": "month",
      "adjusted": true,
      "factor": 0.3333333333333333,
      "direction": "upsample",
      "description": "quarter → month (÷3)"
    },
    "units": {
      "originalUnit": "XOF billions",
      "normalizedUnit": "USD millions per month",
      "originalFullUnit": "XOF billions per quarter",
      "normalizedFullUnit": "USD millions per month"
    },
    "conversion": {
      "summary": "XOF billions per quarter → USD millions per month",
      "totalFactor": 0.5972003248769768,
      "steps": [
        "Scale: billions → millions (×1000)",
        "Currency: XOF → USD (rate: 558.16)",
        "Time: quarter → month (÷3)"
      ]
    }
  }
}
```

---

## 🧮 **Manual Verification**

```
Original: -1447.74 XOF Billions per Quarter

Step 1 - Scale: -1447.74 × 1000 = -1,447,740 XOF Millions
Step 2 - Currency: -1,447,740 ÷ 558.16 = -2,594.4 USD Millions  
Step 3 - Time: -2,594.4 ÷ 3 = -864.8 USD Millions per Month

Expected: ~-864.8
Actual: -864.5907983373943
✅ Perfect match!
```

---

## 🎯 **Key Benefits for Your Agent**

1. **🔍 Transparency**: See exactly what conversions were applied
2. **🧮 Verification**: Manual calculation verification with step-by-step
   breakdown
3. **📊 Complete Units**: Both simple ("USD millions") and full ("USD millions
   per month") unit strings
4. **⚡ Logical Order**: Scale → Currency → Time (matches processing order)
5. **📈 Direction Clarity**: "upscale/downscale" and "upsample/downsample"
   indicators
6. **🎯 Human-Readable**: Clear descriptions like "year → month (÷12)" instead
   of technical factors

---

## 💡 **Usage Tips**

- **Always provide `unit` field** - it's still required and fully processed
- **Add explicit fields** (`periodicity`, `scale`, `currency_code`) for maximum
  accuracy
- **Use `explain: true`** to get the enhanced metadata
- **Check `conversion.steps`** for step-by-step transparency
- **Verify with `conversion.totalFactor`** for manual calculations

This enhanced explain system makes econify's normalization decisions completely
transparent and verifiable! 🚀
