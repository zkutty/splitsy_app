import { useCallback, useEffect, useState } from "react";
import type { Trip } from "@splitsy/domain";

import { formatCurrency } from "../lib/format";
import { fetchConversionRate } from "../lib/rates";

// ZKU-60: The "view amounts in a different currency" behavior shared across
// the trip summary, settlement, and expense list sections — extracted out of
// trip/[tripId].tsx so those sections can all format amounts consistently
// without route-level prop soup.

export type RateSource = "live" | "fallback" | "same";

export function useDisplayCurrency(trip: Trip | undefined) {
  const [displayCurrency, setDisplayCurrency] = useState(trip?.tripCurrencyCode ?? "USD");
  const [displayRate, setDisplayRate] = useState(1);
  const [displayRateSource, setDisplayRateSource] = useState<RateSource>("same");

  const isDisplayConverted = displayCurrency !== trip?.tripCurrencyCode;

  // Format an amount that's stored in trip currency, converting to display currency
  const fmt = useCallback(
    (amount: number, overrideCurrency?: string) =>
      formatCurrency(
        isDisplayConverted ? Math.round(amount * displayRate * 100) / 100 : amount,
        overrideCurrency ?? displayCurrency
      ),
    [displayCurrency, displayRate, isDisplayConverted]
  );

  // Keep display currency in sync when trip loads
  useEffect(() => {
    if (trip && !isDisplayConverted) {
      setDisplayCurrency(trip.tripCurrencyCode);
    }
  }, [trip?.tripCurrencyCode]);

  // Fetch display conversion rate whenever displayCurrency changes
  useEffect(() => {
    if (!trip) return;

    if (displayCurrency === trip.tripCurrencyCode) {
      setDisplayRate(1);
      setDisplayRateSource("same");
      return;
    }

    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);

    fetchConversionRate(trip.tripCurrencyCode, displayCurrency, today).then(({ rate, source }) => {
      if (!cancelled) {
        setDisplayRate(rate);
        setDisplayRateSource(source);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [displayCurrency, trip?.tripCurrencyCode]);

  return { displayCurrency, setDisplayCurrency, fmt, isDisplayConverted, displayRateSource };
}
