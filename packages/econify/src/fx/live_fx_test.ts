/**
 * Tests for live FX rates module
 */

import { assert, assertEquals } from "jsr:@std/assert";
import { fetchLiveFXRates } from "./live_fx.ts";
import type { FXTable } from "../types.ts";

// Mock FX data for testing
const mockFXData = {
  USD: {
    // ECB format
    ecb: {
      base: "USD",
      rates: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 110.0,
        CAD: 1.36,
        AUD: 1.52,
        CHF: 0.91,
        CNY: 7.2,
      },
      date: "2024-01-15",
    },
    // ExchangeRate-API format
    exchangeRate: {
      base: "USD",
      rates: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 110.0,
        CAD: 1.36,
        AUD: 1.52,
        CHF: 0.91,
        CNY: 7.2,
      },
    },
  },
  EUR: {
    // ECB format
    ecb: {
      base: "EUR",
      rates: {
        USD: 1.087,
        GBP: 0.859,
        JPY: 119.6,
        CAD: 1.478,
        AUD: 1.652,
        CHF: 0.989,
        CNY: 7.83,
      },
      date: "2024-01-15",
    },
    // ExchangeRate-API format
    exchangeRate: {
      base: "EUR",
      rates: {
        USD: 1.087,
        GBP: 0.859,
        JPY: 119.6,
        CAD: 1.478,
        AUD: 1.652,
        CHF: 0.989,
        CNY: 7.83,
      },
    },
  },
};

// Mock fetch function
const originalFetch = globalThis.fetch;
function mockFetch(url: string | URL | Request): Promise<Response> {
  const urlString = typeof url === "string" ? url : url.toString();

  // Mock ECB API
  if (urlString.includes("api.frankfurter.app")) {
    const base = urlString.endsWith("/EUR") ? "EUR" : "USD";
    const data = mockFXData[base].ecb;
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // Mock ExchangeRate-API
  if (urlString.includes("api.exchangerate-api.com")) {
    const base = urlString.endsWith("/EUR") ? "EUR" : "USD";
    const data = mockFXData[base].exchangeRate;
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // Fallback to original fetch for other URLs
  return originalFetch(url);
}

// Setup and teardown for mocking
function setupMocks() {
  globalThis.fetch = mockFetch as typeof fetch;
}

function teardownMocks() {
  globalThis.fetch = originalFetch;
}

Deno.test("fetchLiveFXRates - basic functionality", async () => {
  setupMocks();

  try {
    const result = await fetchLiveFXRates("USD", {
      cache: false, // Disable cache for testing
    });

    assert(typeof result === "object", "Should return an object");
    assert(result.base === "USD", "Should have correct base currency");
    assert(typeof result.rates === "object", "Should have rates object");
    assert(
      Object.keys(result.rates).length > 0,
      "Should have at least one rate",
    );

    // Check that rates are reasonable numbers
    Object.values(result.rates).forEach((rate) => {
      assert(typeof rate === "number", "All rates should be numbers");
      assert(rate > 0, "All rates should be positive");
      assert(rate < 1000, "Rates should be reasonable (< 1000)");
    });

    // Check specific expected rates from mock
    assertEquals(result.rates.EUR, 0.92);
    assertEquals(result.rates.GBP, 0.79);
    assertEquals(result.rates.JPY, 110.0);
  } finally {
    teardownMocks();
  }
});

Deno.test("fetchLiveFXRates - with fallback", async () => {
  setupMocks();

  try {
    const fallbackRates: FXTable = {
      base: "USD",
      rates: {
        EUR: 0.85,
        GBP: 0.75,
        JPY: 100.0,
      },
    };

    const result = await fetchLiveFXRates("USD", {
      fallback: fallbackRates,
      cache: false,
    });

    assert(typeof result === "object", "Should return an object");
    assert(result.base === "USD", "Should have correct base currency");
    assert(typeof result.rates === "object", "Should have rates object");

    // Should return live rates (not fallback) since mock is working
    assert(Object.keys(result.rates).length > 0, "Should have rates");
    assertEquals(result.rates.EUR, 0.92); // From mock, not fallback
  } finally {
    teardownMocks();
  }
});

Deno.test("fetchLiveFXRates - different base currency", async () => {
  setupMocks();

  try {
    const result = await fetchLiveFXRates("EUR", {
      cache: false,
    });

    assert(result.base === "EUR", "Should have EUR as base currency");
    assert(
      typeof result.rates.USD === "number",
      "Should have USD rate when base is EUR",
    );
    assertEquals(result.rates.USD, 1.087); // From mock data
  } finally {
    teardownMocks();
  }
});

Deno.test("fetchLiveFXRates - rate validation", async () => {
  setupMocks();

  try {
    const result = await fetchLiveFXRates("USD", {
      cache: false,
    });

    // Validate rate structure
    Object.entries(result.rates).forEach(([currency, rate]) => {
      assert(typeof currency === "string", "Currency code should be string");
      assert(currency.length === 3, "Currency code should be 3 characters");
      assert(
        currency === currency.toUpperCase(),
        "Currency code should be uppercase",
      );

      assert(typeof rate === "number", "Rate should be number");
      assert(!isNaN(rate), "Rate should not be NaN");
      assert(isFinite(rate), "Rate should be finite");
      assert(rate > 0, "Rate should be positive");
    });
  } finally {
    teardownMocks();
  }
});

Deno.test("fetchLiveFXRates - common currency pairs", async () => {
  setupMocks();

  try {
    const result = await fetchLiveFXRates("USD", {
      cache: false,
    });

    // Check for major currency pairs
    const majorCurrencies = ["EUR", "GBP", "JPY", "CAD", "AUD"];
    majorCurrencies.forEach((currency) => {
      if (result.rates[currency]) {
        assert(
          typeof result.rates[currency] === "number",
          `${currency} rate should be number`,
        );
        assert(
          result.rates[currency] > 0,
          `${currency} rate should be positive`,
        );
      }
    });

    // Verify specific mock rates
    assertEquals(result.rates.EUR, 0.92);
    assertEquals(result.rates.GBP, 0.79);
    assertEquals(result.rates.JPY, 110.0);
  } finally {
    teardownMocks();
  }
});

Deno.test("fetchLiveFXRates - rate reasonableness", async () => {
  setupMocks();

  try {
    const result = await fetchLiveFXRates("USD", {
      cache: false,
    });

    // Check that rates are within reasonable ranges
    if (result.rates.EUR) {
      assert(
        result.rates.EUR > 0.5 && result.rates.EUR < 2.0,
        "EUR/USD should be reasonable",
      );
    }

    if (result.rates.GBP) {
      assert(
        result.rates.GBP > 0.5 && result.rates.GBP < 2.0,
        "GBP/USD should be reasonable",
      );
    }

    if (result.rates.JPY) {
      assert(
        result.rates.JPY > 50 && result.rates.JPY < 200,
        "JPY/USD should be reasonable",
      );
    }

    if (result.rates.CAD) {
      assert(
        result.rates.CAD > 0.8 && result.rates.CAD < 2.0,
        "CAD/USD should be reasonable",
      );
    }

    // Verify exact mock values
    assertEquals(result.rates.EUR, 0.92);
    assertEquals(result.rates.GBP, 0.79);
    assertEquals(result.rates.JPY, 110.0);
    assertEquals(result.rates.CAD, 1.36);
  } finally {
    teardownMocks();
  }
});
