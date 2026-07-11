import { expect, test } from "bun:test";

import { getCurrencyMinorUnit, getCurrencyMinorUnitDigits, roundCurrency } from "./money";

// ---------------------------------------------------------------------------
// ZKU-53: Handle non-2-decimal currencies (JPY, KRW, BHD) in roundCurrency
// ---------------------------------------------------------------------------

test("getCurrencyMinorUnitDigits: defaults to 2 decimals for standard currencies", () => {
  expect(getCurrencyMinorUnitDigits("USD")).toBe(2);
  expect(getCurrencyMinorUnitDigits("EUR")).toBe(2);
  expect(getCurrencyMinorUnitDigits("GBP")).toBe(2);
});

test("getCurrencyMinorUnitDigits: 0-decimal currencies (JPY, KRW, VND)", () => {
  expect(getCurrencyMinorUnitDigits("JPY")).toBe(0);
  expect(getCurrencyMinorUnitDigits("KRW")).toBe(0);
  expect(getCurrencyMinorUnitDigits("VND")).toBe(0);
});

test("getCurrencyMinorUnitDigits: 3-decimal currencies (BHD, KWD, OMR)", () => {
  expect(getCurrencyMinorUnitDigits("BHD")).toBe(3);
  expect(getCurrencyMinorUnitDigits("KWD")).toBe(3);
  expect(getCurrencyMinorUnitDigits("OMR")).toBe(3);
});

test("getCurrencyMinorUnitDigits: falls back to 2 decimals for missing/unknown currency codes", () => {
  expect(getCurrencyMinorUnitDigits(undefined)).toBe(2);
  expect(getCurrencyMinorUnitDigits(null)).toBe(2);
  expect(getCurrencyMinorUnitDigits("")).toBe(2);
  expect(getCurrencyMinorUnitDigits("NOT_A_REAL_CODE")).toBe(2);
});

test("getCurrencyMinorUnitDigits: is case-insensitive", () => {
  expect(getCurrencyMinorUnitDigits("jpy")).toBe(0);
  expect(getCurrencyMinorUnitDigits("bhd")).toBe(3);
});

test("getCurrencyMinorUnit: returns the smallest representable increment", () => {
  expect(getCurrencyMinorUnit("USD")).toBeCloseTo(0.01, 10);
  expect(getCurrencyMinorUnit("JPY")).toBe(1);
  expect(getCurrencyMinorUnit("BHD")).toBeCloseTo(0.001, 10);
});

test("roundCurrency: rounds JPY to whole units", () => {
  expect(roundCurrency(1234.56, "JPY")).toBe(1235);
  expect(roundCurrency(1234.4, "JPY")).toBe(1234);
});

test("roundCurrency: rounds BHD to 3 decimals", () => {
  expect(roundCurrency(1.23456, "BHD")).toBe(1.235);
  expect(roundCurrency(1.2344, "BHD")).toBe(1.234);
});

test("roundCurrency: still rounds standard currencies to 2 decimals", () => {
  expect(roundCurrency(1.005, "USD")).toBe(1.01);
  expect(roundCurrency(100 / 3, "USD")).toBe(33.33);
});

test("roundCurrency: defaults to 2 decimals when currency is omitted (backward compatible)", () => {
  expect(roundCurrency(1.005)).toBe(1.01);
  expect(roundCurrency(100 / 3)).toBe(33.33);
});
