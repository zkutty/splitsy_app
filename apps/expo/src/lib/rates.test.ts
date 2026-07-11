import { afterEach, describe, expect, test } from "bun:test";

import {
  ALL_CURRENCIES,
  MAJOR_CURRENCIES,
  SAMPLE_RATES_TO_EUR,
  fetchConversionRate,
  getConversionRate
} from "./rates";

// ---------------------------------------------------------------------------
// ZKU-58: unit tests for rates.ts pure logic (currency lists + FX fallback
// flagging). Anything requiring a real network call is exercised via a
// stubbed global.fetch so these tests stay hermetic and fast.
// ---------------------------------------------------------------------------

describe("MAJOR_CURRENCIES", () => {
  test("contains the expected common currencies", () => {
    const codes = MAJOR_CURRENCIES.map((currency) => currency.code);
    expect(codes).toEqual(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "MXN"]);
  });

  test("has no duplicate codes", () => {
    const codes = MAJOR_CURRENCIES.map((currency) => currency.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test("every entry has a non-empty code and label", () => {
    for (const currency of MAJOR_CURRENCIES) {
      expect(currency.code.length).toBeGreaterThan(0);
      expect(currency.label.length).toBeGreaterThan(0);
    }
  });
});

describe("ALL_CURRENCIES", () => {
  test("has no duplicate codes", () => {
    const codes = ALL_CURRENCIES.map((currency) => currency.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test("is sorted alphabetically by code", () => {
    const codes = ALL_CURRENCIES.map((currency) => currency.code);
    const sorted = [...codes].sort((a, b) => a.localeCompare(b));
    expect(codes).toEqual(sorted);
  });

  test("every code is a 3-letter uppercase ISO 4217-style code", () => {
    for (const currency of ALL_CURRENCIES) {
      expect(currency.code).toMatch(/^[A-Z]{3}$/);
    }
  });

  test("is a superset of MAJOR_CURRENCIES", () => {
    const allCodes = new Set(ALL_CURRENCIES.map((currency) => currency.code));
    for (const major of MAJOR_CURRENCIES) {
      expect(allCodes.has(major.code)).toBe(true);
    }
  });
});

describe("getConversionRate (synchronous fallback)", () => {
  test("returns 1 when converting a currency to itself", () => {
    expect(getConversionRate("USD", "USD")).toBeCloseTo(1, 10);
  });

  test("converts using the static EUR-denominated sample rates", () => {
    // USD -> EUR should equal SAMPLE_RATES_TO_EUR.USD / SAMPLE_RATES_TO_EUR.EUR
    const expected = SAMPLE_RATES_TO_EUR.USD / SAMPLE_RATES_TO_EUR.EUR;
    expect(getConversionRate("USD", "EUR")).toBeCloseTo(expected, 10);
  });

  test("round-trips approximately: A->B->A ~= 1", () => {
    const aToB = getConversionRate("GBP", "JPY");
    const bToA = getConversionRate("JPY", "GBP");
    expect(aToB * bToA).toBeCloseTo(1, 10);
  });

  test("falls back to a rate of 1 for unknown currency codes", () => {
    expect(getConversionRate("XXX", "USD")).toBeCloseTo(1 / SAMPLE_RATES_TO_EUR.USD, 10);
    expect(getConversionRate("USD", "XXX")).toBeCloseTo(SAMPLE_RATES_TO_EUR.USD, 10);
    expect(getConversionRate("XXX", "YYY")).toBeCloseTo(1, 10);
  });
});

describe("fetchConversionRate (fallback-source flagging)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("returns source 'live' with rate 1 for identical currencies, without calling fetch", async () => {
    let fetchCalled = false;
    globalThis.fetch = (() => {
      fetchCalled = true;
      throw new Error("fetch should not be called for identical currencies");
    }) as unknown as typeof fetch;

    const result = await fetchConversionRate("EUR", "EUR", "2026-05-08");
    expect(result).toEqual({ rate: 1, source: "live" });
    expect(fetchCalled).toBe(false);
  });

  test("flags source as 'fallback' when the network request throws", async () => {
    globalThis.fetch = (() => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await fetchConversionRate("USD", "GBP", "2026-05-08");
    expect(result.source).toBe("fallback");
    expect(result.rate).toBeCloseTo(getConversionRate("USD", "GBP"), 10);
  });

  test("flags source as 'fallback' when the API responds with a non-ok status", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({}), { status: 500 })) as unknown as typeof fetch;

    const result = await fetchConversionRate("USD", "CAD", "2026-05-08");
    expect(result.source).toBe("fallback");
    expect(result.rate).toBeCloseTo(getConversionRate("USD", "CAD"), 10);
  });

  test("flags source as 'fallback' when the API response is missing the requested rate", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ rates: {} }), { status: 200 })) as unknown as typeof fetch;

    const result = await fetchConversionRate("USD", "AUD", "2026-05-08");
    expect(result.source).toBe("fallback");
    expect(result.rate).toBeCloseTo(getConversionRate("USD", "AUD"), 10);
  });

  test("flags source as 'fallback' when the API returns a non-positive rate", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ rates: { AUD: 0 } }), { status: 200 })) as unknown as typeof fetch;

    const result = await fetchConversionRate("USD", "AUD", "2026-05-08");
    expect(result.source).toBe("fallback");
  });

  test("flags source as 'live' and returns the API rate on success", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ rates: { GBP: 0.75 } }), { status: 200 })) as unknown as typeof fetch;

    const result = await fetchConversionRate("USD", "GBP", "2026-06-01");
    expect(result).toEqual({ rate: 0.75, source: "live" });
  });
});
