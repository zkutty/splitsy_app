// ---------------------------------------------------------------------------
// ISO 4217 minor-unit (decimal digit) exceptions.
// Most currencies use 2 decimal places; these are the well-known exceptions.
// Source: ISO 4217 minor unit table.
// ---------------------------------------------------------------------------
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG",
  "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF"
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  "BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"
]);

/** Default number of decimal places used when a currency is unknown/omitted. */
const DEFAULT_MINOR_UNIT_DIGITS = 2;

/**
 * Resolve the number of minor-unit decimal digits for a currency code
 * (e.g. 0 for JPY, 2 for USD, 3 for BHD), per ISO 4217.
 *
 * Falls back to Intl.NumberFormat's resolved options for currency codes not
 * present in the static exception tables above, and finally to the 2-decimal
 * default if the currency code is missing/unrecognized.
 */
export const getCurrencyMinorUnitDigits = (currencyCode?: string | null): number => {
  if (!currencyCode) {
    return DEFAULT_MINOR_UNIT_DIGITS;
  }

  const normalized = currencyCode.toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) {
    return 0;
  }

  if (THREE_DECIMAL_CURRENCIES.has(normalized)) {
    return 3;
  }

  try {
    const resolved = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalized
    }).resolvedOptions();

    if (typeof resolved.maximumFractionDigits === "number") {
      return resolved.maximumFractionDigits;
    }
  } catch {
    // Unknown/invalid ISO code — fall through to the default below.
  }

  return DEFAULT_MINOR_UNIT_DIGITS;
};

/** The smallest representable increment of a currency, e.g. 0.01 for USD, 1 for JPY, 0.001 for BHD. */
export const getCurrencyMinorUnit = (currencyCode?: string | null): number => {
  return 1 / Math.pow(10, getCurrencyMinorUnitDigits(currencyCode));
};

/**
 * Round a value to the correct number of decimal places for a given currency.
 * Defaults to 2 decimal places when the currency code is omitted/unknown so
 * existing callers that don't pass a currency keep their prior behavior.
 */
export const roundCurrency = (value: number, currencyCode?: string | null): number => {
  const factor = Math.pow(10, getCurrencyMinorUnitDigits(currencyCode));
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
