import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppInput } from "../../src/ui/primitives/AppInput";
import { AppText } from "../../src/ui/primitives/AppText";
import { CurrencyPicker } from "../../src/ui/primitives/CurrencyPicker";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../../src/ui/theme";

export default function TripsScreen() {
  const { trips, authMode, currentUser, isLoading, createTrip } = useTrips();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [tripCurrencyCode, setTripCurrencyCode] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [createTripError, setCreateTripError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const compact = width < 768;

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }

    return "Unable to create trip.";
  };

  return (
    <AppScreen showHeaderMenu>
      <View style={styles.header}>
        <AppText variant="meta" color="secondary">
          Workspace
        </AppText>
        <AppText variant="title">Trips</AppText>
        <AppText variant="bodySm" color="muted">
          {authMode === "supabase"
            ? "Your trip workspaces are synced to Supabase."
            : "The app is running in demo mode until cloud auth is configured."}
        </AppText>
      </View>

      {/* Trip list — shown first for quick access */}
      {isLoading ? (
        <SurfaceCard>
          <AppText variant="bodySm" color="muted">
            Loading trips...
          </AppText>
        </SurfaceCard>
      ) : null}

      {!isLoading && trips.length === 0 ? (
        <SurfaceCard style={styles.emptyState}>
          <AppText variant="sectionTitle">Your first trip starts here.</AppText>
          <AppText variant="bodySm" color="muted">
            Create a trip, invite your group, and let SplitTrip handle the settlement math.
          </AppText>
        </SurfaceCard>
      ) : null}

      {!isLoading && trips.length > 0 ? (
        <View style={styles.tripList}>
          {trips.map((trip) => (
            <Link href={{ pathname: "/trip/[tripId]", params: { tripId: trip.id } }} key={trip.id} asChild>
              <Pressable style={({ pressed }) => [styles.linkWrapper, pressed ? styles.linkWrapperPressed : null]}>
                <SurfaceCard style={styles.tripCard}>
                  <View style={styles.tripTopRow}>
                    <View style={styles.tripBadge}>
                      <AppText variant="meta" color="inverse">
                        Trip
                      </AppText>
                    </View>
                    <AppText variant="bodySm" color="muted">
                      {trip.tripCurrencyCode} · {trip.members.length} members · {trip.status ?? "active"}
                    </AppText>
                  </View>
                  <AppText variant="sectionTitle">{trip.name}</AppText>
                  <View style={styles.tripMeta}>
                    <AppText variant="bodySm" color="secondary">
                      {trip.destination ?? "Destination TBD"}
                      {trip.startDate
                        ? ` · ${trip.startDate}${trip.endDate ? ` – ${trip.endDate}` : ""}`
                        : ""}
                    </AppText>
                  </View>
                </SurfaceCard>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      {/* Create trip — collapsible section */}
      <SurfaceCard style={styles.createCard}>
        <Pressable
          onPress={() => setShowCreateForm((prev) => !prev)}
          style={styles.createToggle}
          hitSlop={4}
        >
          <View style={styles.createToggleCopy}>
            <AppText variant="sectionTitle">Start a trip</AppText>
            <AppText variant="bodySm" color="muted">
              Create a new workspace for your group.
            </AppText>
          </View>
          <AppText variant="body" color="muted">
            {showCreateForm ? "−" : "+"}
          </AppText>
        </Pressable>

        {showCreateForm ? (
          <View style={styles.createForm}>
            <View style={compact ? styles.formFieldsCompact : styles.formFieldsWide}>
              <View style={styles.formField}>
                <AppInput label="Trip name" value={name} onChangeText={setName} placeholder="Summer in Lisbon" />
              </View>
              <View style={styles.formField}>
                <AppInput label="Destination" value={destination} onChangeText={setDestination} placeholder="Lisbon" />
              </View>
            </View>
            <View style={compact ? styles.formFieldsCompact : styles.formFieldsWide}>
              <View style={styles.formField}>
                <AppInput
                  label="Start date"
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="2026-06-10"
                  helperText="YYYY-MM-DD"
                />
              </View>
              <View style={styles.formField}>
                <AppInput
                  label="End date"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="2026-06-17"
                  helperText="YYYY-MM-DD"
                />
              </View>
            </View>
            <CurrencyPicker
              label="Trip currency"
              value={tripCurrencyCode}
              onChange={setTripCurrencyCode}
            />
            {createTripError ? (
              <AppText variant="bodySm" color="danger">
                {createTripError}
              </AppText>
            ) : null}
            <AppButton
              onPress={async () => {
                try {
                  setIsCreatingTrip(true);
                  setCreateTripError(null);
                  await createTrip({
                    name: name.trim() || "Untitled trip",
                    destination: destination.trim() || undefined,
                    tripCurrencyCode: tripCurrencyCode.trim().toUpperCase() || "USD",
                    startDate: startDate.trim() || undefined,
                    endDate: endDate.trim() || undefined
                  });
                  setName("");
                  setDestination("");
                  setTripCurrencyCode("USD");
                  setStartDate("");
                  setEndDate("");
                } catch (error) {
                  console.error("Create trip failed", error);
                  setCreateTripError(getErrorMessage(error));
                } finally {
                  setIsCreatingTrip(false);
                }
              }}
              disabled={isCreatingTrip}
            >
              {isCreatingTrip ? "Creating..." : "Create trip"}
            </AppButton>
          </View>
        ) : null}
      </SurfaceCard>

      {/* Summary — hidden on compact to save space */}
      {!compact ? (
        <SurfaceCard tone="muted" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCopy}>
              <AppText variant="eyebrow" color="secondary">
                SplitTrip
              </AppText>
              <AppText variant="bodySm" color="secondary">
                Organize travel spending without hunting through messages.
              </AppText>
            </View>
            <View style={[styles.statRow]}>
              <View style={styles.statCard}>
                <AppText variant="meta" color="muted">
                  Trips
                </AppText>
                <AppText variant="sectionTitle">{trips.length}</AppText>
              </View>
              <View style={styles.statCard}>
                <AppText variant="meta" color="muted">
                  Account
                </AppText>
                <AppText variant="sectionTitle">{authMode === "supabase" ? "Cloud" : "Demo"}</AppText>
              </View>
            </View>
          </View>
        </SurfaceCard>
      ) : null}
    </AppScreen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      gap: theme.spacing.xs
    },
    /* Trip list */
    tripList: {
      gap: theme.spacing.sm
    },
    linkWrapper: {
      borderRadius: theme.radius.xl
    },
    linkWrapperPressed: {
      opacity: 0.88
    },
    tripCard: {
      gap: theme.spacing.xs
    },
    tripTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    tripBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xxs,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accent.primary
    },
    tripMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.xs
    },
    /* Create trip section */
    createCard: {
      gap: theme.spacing.md
    },
    createToggle: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
    },
    createToggleCopy: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    createForm: {
      gap: theme.spacing.md
    },
    formFieldsCompact: {
      gap: theme.spacing.md
    },
    formFieldsWide: {
      flexDirection: "row",
      gap: theme.spacing.md
    },
    formField: {
      flex: 1
    },
    /* Summary section */
    summaryCard: {
      gap: theme.spacing.md
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.lg
    },
    summaryCopy: {
      flex: 1,
      gap: theme.spacing.xs
    },
    statRow: {
      flexDirection: "row",
      gap: theme.spacing.md
    },
    statCard: {
      gap: theme.spacing.xxs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface.base,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      alignItems: "center"
    },
    /* Empty state */
    emptyState: {
      gap: theme.spacing.sm
    }
  });
}
