export const MAJOR_CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "MXN", label: "Mexican Peso" }
] as const;

// Seeded sample rates: value of 1 unit of currency expressed in EUR.
export const SAMPLE_RATES_TO_EUR: Record<string, number> = {
  USD: 0.92,
  EUR: 1,
  GBP: 1.17,
  CAD: 0.68,
  AUD: 0.61,
  JPY: 0.0062,
  CHF: 1.04,
  MXN: 0.054
};

export const getConversionRate = (fromCurrencyCode: string, toCurrencyCode: string) => {
  const fromRate = SAMPLE_RATES_TO_EUR[fromCurrencyCode] ?? 1;
  const toRate = SAMPLE_RATES_TO_EUR[toCurrencyCode] ?? 1;

  return fromRate / toRate;
};

