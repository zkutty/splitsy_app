import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import type { Expense, Member, Trip, TripSettlement, TripSettlementTransfer } from "@splitsy/domain";

import { exportTripCsv } from "../lib/export";
import { AppButton } from "../ui/primitives/AppButton";
import { AppText } from "../ui/primitives/AppText";
import { CurrencyPicker } from "../ui/primitives/CurrencyPicker";
import { SurfaceCard } from "../ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../ui/theme";

// ZKU-60: The trip hero/summary card (name, dates, status, total, currency
// display picker, and the complete/export/archive actions), extracted out
// of trip/[tripId].tsx.

export type TripSummaryCardProps = {
  trip: Trip;
  compact: boolean;
  tripCreator: Member | undefined;
  currentMember: Member | undefined;
  settlement: TripSettlement | null;
  expenses: Expense[];
  persistedTransfers: TripSettlementTransfer[];
  mayCompleteTrip: boolean;
  fmt: (amount: number, overrideCurrency?: string) => string;
  displayCurrency: string;
  onDisplayCurrencyChange: (code: string) => void;
  isDisplayConverted: boolean;
  displayRateSource: "live" | "fallback" | "same";
  onCompleteTrip: () => Promise<void>;
  onArchiveTrip: () => Promise<void>;
  onUnarchiveTrip: () => Promise<void>;
};

export function TripSummaryCard({
  trip,
  compact,
  tripCreator,
  currentMember,
  settlement,
  expenses,
  persistedTransfers,
  mayCompleteTrip,
  fmt,
  displayCurrency,
  onDisplayCurrencyChange,
  isDisplayConverted,
  displayRateSource,
  onCompleteTrip,
  onArchiveTrip,
  onUnarchiveTrip
}: TripSummaryCardProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isTogglingArchive, setIsTogglingArchive] = useState(false);

  const runCompleteTrip = async () => {
    if (!mayCompleteTrip) {
      return;
    }

    setIsCompletingTrip(true);

    try {
      await onCompleteTrip();
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setIsCompletingTrip(false);
    }
  };

  const toggleArchive = async () => {
    setIsTogglingArchive(true);

    try {
      if (trip.isArchived) {
        await onUnarchiveTrip();
      } else {
        await onArchiveTrip();
      }
    } finally {
      setIsTogglingArchive(false);
    }
  };

  return (
    <SurfaceCard tone="hero" style={styles.summaryCard}>
      <AppText variant="eyebrow" color="accent">
        Trip Summary
      </AppText>
      <AppText variant={compact ? "sectionTitle" : "title"} color="inverse">
        {trip.name}
      </AppText>
      <AppText variant="bodySm" color="accent">
        {trip.destination ?? "No destination"} · settle in {trip.tripCurrencyCode}
      </AppText>
      <AppText variant="bodySm" color="accent">
        {trip.startDate ? `${trip.startDate}${trip.endDate ? ` to ${trip.endDate}` : ""}` : "Dates not set"}
      </AppText>
      <AppText variant="bodySm" color="accent">
        Status: {trip.status ?? "active"}
      </AppText>
      <AppText variant="bodySm" color="accent">
        {tripCreator ? `Created by ${tripCreator.displayName}` : "Creator metadata unavailable"} ·{" "}
        {currentMember ? `Signed in as ${currentMember.displayName}` : "You are viewing this trip as a guest member"}
      </AppText>
      <AppText variant="sectionTitle" color="inverse">
        {settlement ? fmt(settlement.totalTripSpend) : ""}
      </AppText>
      <CurrencyPicker label="View amounts in" value={displayCurrency} onChange={onDisplayCurrencyChange} />
      {isDisplayConverted && displayRateSource === "fallback" ? (
        <AppText variant="bodySm" color="accent">
          Using approximate rate — live rate unavailable.
        </AppText>
      ) : null}
      <View style={styles.summaryActions}>
        {mayCompleteTrip ? (
          <AppButton onPress={runCompleteTrip} disabled={isCompletingTrip} fullWidth={false}>
            {isCompletingTrip ? "Completing..." : "Complete trip"}
          </AppButton>
        ) : null}
        {expenses.length > 0 ? (
          <AppButton
            onPress={async () => {
              setIsExporting(true);
              try {
                await exportTripCsv(trip, expenses, settlement, persistedTransfers);
              } finally {
                setIsExporting(false);
              }
            }}
            variant="secondary"
            fullWidth={false}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export CSV"}
          </AppButton>
        ) : null}
        {currentMember ? (
          <AppButton onPress={toggleArchive} variant="secondary" fullWidth={false} disabled={isTogglingArchive}>
            {isTogglingArchive ? "…" : trip.isArchived ? "Unarchive" : "Archive"}
          </AppButton>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    summaryCard: {
      gap: theme.spacing.sm
    },
    summaryActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    }
  });
}
