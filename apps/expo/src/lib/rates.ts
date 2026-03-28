// ---------------------------------------------------------------------------
// Common currencies shown at the top of the picker
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Extended currency list (ISO 4217 codes commonly supported by FX APIs)
// ---------------------------------------------------------------------------
export const ALL_CURRENCIES: ReadonlyArray<{ code: string; label: string }> = [
  { code: "AED", label: "UAE Dirham" },
  { code: "AFN", label: "Afghan Afghani" },
  { code: "ALL", label: "Albanian Lek" },
  { code: "AMD", label: "Armenian Dram" },
  { code: "ANG", label: "Netherlands Antillean Guilder" },
  { code: "AOA", label: "Angolan Kwanza" },
  { code: "ARS", label: "Argentine Peso" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "AWG", label: "Aruban Florin" },
  { code: "AZN", label: "Azerbaijani Manat" },
  { code: "BAM", label: "Bosnia-Herzegovina Convertible Mark" },
  { code: "BBD", label: "Barbadian Dollar" },
  { code: "BDT", label: "Bangladeshi Taka" },
  { code: "BGN", label: "Bulgarian Lev" },
  { code: "BHD", label: "Bahraini Dinar" },
  { code: "BIF", label: "Burundian Franc" },
  { code: "BMD", label: "Bermudian Dollar" },
  { code: "BND", label: "Brunei Dollar" },
  { code: "BOB", label: "Bolivian Boliviano" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "BSD", label: "Bahamian Dollar" },
  { code: "BTN", label: "Bhutanese Ngultrum" },
  { code: "BWP", label: "Botswanan Pula" },
  { code: "BYN", label: "Belarusian Ruble" },
  { code: "BZD", label: "Belize Dollar" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "CDF", label: "Congolese Franc" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "CLP", label: "Chilean Peso" },
  { code: "CNY", label: "Chinese Yuan" },
  { code: "COP", label: "Colombian Peso" },
  { code: "CRC", label: "Costa Rican Colon" },
  { code: "CUP", label: "Cuban Peso" },
  { code: "CVE", label: "Cape Verdean Escudo" },
  { code: "CZK", label: "Czech Koruna" },
  { code: "DJF", label: "Djiboutian Franc" },
  { code: "DKK", label: "Danish Krone" },
  { code: "DOP", label: "Dominican Peso" },
  { code: "DZD", label: "Algerian Dinar" },
  { code: "EGP", label: "Egyptian Pound" },
  { code: "ERN", label: "Eritrean Nakfa" },
  { code: "ETB", label: "Ethiopian Birr" },
  { code: "EUR", label: "Euro" },
  { code: "FJD", label: "Fijian Dollar" },
  { code: "FKP", label: "Falkland Islands Pound" },
  { code: "GBP", label: "British Pound" },
  { code: "GEL", label: "Georgian Lari" },
  { code: "GHS", label: "Ghanaian Cedi" },
  { code: "GIP", label: "Gibraltar Pound" },
  { code: "GMD", label: "Gambian Dalasi" },
  { code: "GNF", label: "Guinean Franc" },
  { code: "GTQ", label: "Guatemalan Quetzal" },
  { code: "GYD", label: "Guyanaese Dollar" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "HNL", label: "Honduran Lempira" },
  { code: "HRK", label: "Croatian Kuna" },
  { code: "HTG", label: "Haitian Gourde" },
  { code: "HUF", label: "Hungarian Forint" },
  { code: "IDR", label: "Indonesian Rupiah" },
  { code: "ILS", label: "Israeli New Shekel" },
  { code: "INR", label: "Indian Rupee" },
  { code: "IQD", label: "Iraqi Dinar" },
  { code: "IRR", label: "Iranian Rial" },
  { code: "ISK", label: "Icelandic Krona" },
  { code: "JMD", label: "Jamaican Dollar" },
  { code: "JOD", label: "Jordanian Dinar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "KES", label: "Kenyan Shilling" },
  { code: "KGS", label: "Kyrgystani Som" },
  { code: "KHR", label: "Cambodian Riel" },
  { code: "KMF", label: "Comorian Franc" },
  { code: "KRW", label: "South Korean Won" },
  { code: "KWD", label: "Kuwaiti Dinar" },
  { code: "KYD", label: "Cayman Islands Dollar" },
  { code: "KZT", label: "Kazakhstani Tenge" },
  { code: "LAK", label: "Laotian Kip" },
  { code: "LBP", label: "Lebanese Pound" },
  { code: "LKR", label: "Sri Lankan Rupee" },
  { code: "LRD", label: "Liberian Dollar" },
  { code: "LSL", label: "Lesotho Loti" },
  { code: "LYD", label: "Libyan Dinar" },
  { code: "MAD", label: "Moroccan Dirham" },
  { code: "MDL", label: "Moldovan Leu" },
  { code: "MGA", label: "Malagasy Ariary" },
  { code: "MKD", label: "Macedonian Denar" },
  { code: "MMK", label: "Myanma Kyat" },
  { code: "MNT", label: "Mongolian Tugrik" },
  { code: "MOP", label: "Macanese Pataca" },
  { code: "MRU", label: "Mauritanian Ouguiya" },
  { code: "MUR", label: "Mauritian Rupee" },
  { code: "MVR", label: "Maldivian Rufiyaa" },
  { code: "MWK", label: "Malawian Kwacha" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "MYR", label: "Malaysian Ringgit" },
  { code: "MZN", label: "Mozambican Metical" },
  { code: "NAD", label: "Namibian Dollar" },
  { code: "NGN", label: "Nigerian Naira" },
  { code: "NIO", label: "Nicaraguan Cordoba" },
  { code: "NOK", label: "Norwegian Krone" },
  { code: "NPR", label: "Nepalese Rupee" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "OMR", label: "Omani Rial" },
  { code: "PAB", label: "Panamanian Balboa" },
  { code: "PEN", label: "Peruvian Nuevo Sol" },
  { code: "PGK", label: "Papua New Guinean Kina" },
  { code: "PHP", label: "Philippine Peso" },
  { code: "PKR", label: "Pakistani Rupee" },
  { code: "PLN", label: "Polish Zloty" },
  { code: "PYG", label: "Paraguayan Guarani" },
  { code: "QAR", label: "Qatari Rial" },
  { code: "RON", label: "Romanian Leu" },
  { code: "RSD", label: "Serbian Dinar" },
  { code: "RUB", label: "Russian Ruble" },
  { code: "RWF", label: "Rwandan Franc" },
  { code: "SAR", label: "Saudi Riyal" },
  { code: "SBD", label: "Solomon Islands Dollar" },
  { code: "SCR", label: "Seychellois Rupee" },
  { code: "SDG", label: "Sudanese Pound" },
  { code: "SEK", label: "Swedish Krona" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "SHP", label: "Saint Helena Pound" },
  { code: "SLE", label: "Sierra Leonean Leone" },
  { code: "SOS", label: "Somali Shilling" },
  { code: "SRD", label: "Surinamese Dollar" },
  { code: "SSP", label: "South Sudanese Pound" },
  { code: "STN", label: "São Tomé and Príncipe Dobra" },
  { code: "SYP", label: "Syrian Pound" },
  { code: "SZL", label: "Swazi Lilangeni" },
  { code: "THB", label: "Thai Baht" },
  { code: "TJS", label: "Tajikistani Somoni" },
  { code: "TMT", label: "Turkmenistani Manat" },
  { code: "TND", label: "Tunisian Dinar" },
  { code: "TOP", label: "Tongan Pa'anga" },
  { code: "TRY", label: "Turkish Lira" },
  { code: "TTD", label: "Trinidad and Tobago Dollar" },
  { code: "TWD", label: "New Taiwan Dollar" },
  { code: "TZS", label: "Tanzanian Shilling" },
  { code: "UAH", label: "Ukrainian Hryvnia" },
  { code: "UGX", label: "Ugandan Shilling" },
  { code: "USD", label: "US Dollar" },
  { code: "UYU", label: "Uruguayan Peso" },
  { code: "UZS", label: "Uzbekistan Som" },
  { code: "VES", label: "Venezuelan Bolívar" },
  { code: "VND", label: "Vietnamese Dong" },
  { code: "VUV", label: "Vanuatu Vatu" },
  { code: "WST", label: "Samoan Tala" },
  { code: "XAF", label: "CFA Franc BEAC" },
  { code: "XCD", label: "East Caribbean Dollar" },
  { code: "XOF", label: "CFA Franc BCEAO" },
  { code: "XPF", label: "CFP Franc" },
  { code: "YER", label: "Yemeni Rial" },
  { code: "ZAR", label: "South African Rand" },
  { code: "ZMW", label: "Zambian Kwacha" },
  { code: "ZWL", label: "Zimbabwean Dollar" }
];

// ---------------------------------------------------------------------------
// Static fallback rates (value of 1 unit expressed in EUR)
// ---------------------------------------------------------------------------
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

/** Synchronous fallback when no network rate is available. */
export const getConversionRate = (fromCurrencyCode: string, toCurrencyCode: string) => {
  const fromRate = SAMPLE_RATES_TO_EUR[fromCurrencyCode] ?? 1;
  const toRate = SAMPLE_RATES_TO_EUR[toCurrencyCode] ?? 1;

  return fromRate / toRate;
};

// ---------------------------------------------------------------------------
// Date-based FX rate fetching (frankfurter.dev — free, no API key needed)
// ---------------------------------------------------------------------------
const rateCache = new Map<string, number>();

function cacheKey(from: string, to: string, date: string) {
  return `${from}:${to}:${date}`;
}

/**
 * Fetch the conversion rate for a given date.
 * Uses https://api.frankfurter.dev which supports historical rates.
 * Falls back to the static sample rates on network failure.
 */
export async function fetchConversionRate(
  fromCurrencyCode: string,
  toCurrencyCode: string,
  date: string
): Promise<{ rate: number; source: "live" | "fallback" }> {
  if (fromCurrencyCode === toCurrencyCode) {
    return { rate: 1, source: "live" };
  }

  const key = cacheKey(fromCurrencyCode, toCurrencyCode, date);
  const cached = rateCache.get(key);

  if (cached !== undefined) {
    return { rate: cached, source: "live" };
  }

  try {
    const url = `https://api.frankfurter.dev/${date}?from=${encodeURIComponent(fromCurrencyCode)}&to=${encodeURIComponent(toCurrencyCode)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!response.ok) {
      throw new Error(`FX API returned ${response.status}`);
    }

    const data = (await response.json()) as { rates?: Record<string, number> };
    const rate = data.rates?.[toCurrencyCode];

    if (rate === undefined || rate <= 0) {
      throw new Error("Invalid rate in API response");
    }

    rateCache.set(key, rate);

    // Also cache the inverse for free
    rateCache.set(cacheKey(toCurrencyCode, fromCurrencyCode, date), 1 / rate);

    return { rate, source: "live" };
  } catch {
    // Network or parse error — fall back to static rates
    return { rate: getConversionRate(fromCurrencyCode, toCurrencyCode), source: "fallback" };
  }
}
