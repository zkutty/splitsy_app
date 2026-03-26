import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { MAJOR_CURRENCIES } from "../src/lib/rates";
import { useSession } from "../src/providers/session-provider";
import { useTrips } from "../src/providers/trips-provider";
import { AppScreen } from "../src/ui/layout/AppScreen";
import { AppButton } from "../src/ui/primitives/AppButton";
import { AppInput } from "../src/ui/primitives/AppInput";
import { AppText } from "../src/ui/primitives/AppText";
import { Chip } from "../src/ui/primitives/Chip";
import { SurfaceCard } from "../src/ui/primitives/SurfaceCard";
import { theme } from "../src/ui/theme";

export default function TripsScreen() {
  const session = useSession();
  const { trips, signOut, authMode, currentUser, isLoading, createTrip } = useTrips();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [tripCurrencyCode, setTripCurrencyCode] = useState("USD");
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [createTripError, setCreateTripError] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 960;

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }

    return "Unable to create trip.";
  };

  if (!session.isLoading && !session.isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <AppScreen>
      <View style={[styles.header, wide ? styles.headerWide : null]}>
        <View style={styles.headerCopy}>
          <AppText variant="meta" color="secondary">
            Workspace
          </AppText>
          <AppText variant="title">Trips</AppText>
          <AppText variant="bodySm" color="muted">
            {authMode === "supabase" ? "Persisted via Supabase" : "Running on demo fixtures until env is configured"}
          </AppText>
        </View>
        <AppButton onPress={signOut} variant="secondary" fullWidth={!wide} style={wide ? styles.signOutButton : undefined}>
          Sign out
        </AppButton>
      </View>

      <View style={[styles.topGrid, wide ? styles.topGridWide : null]}>
        <SurfaceCard style={styles.createCard}>
          <AppText variant="sectionTitle">Start a trip</AppText>
          <AppText variant="bodySm" color="muted">
            Invite friends, track shared costs, and keep balances consistent across currencies.
          </AppText>
          <AppInput label="Trip name" value={name} onChangeText={setName} placeholder="Summer in Lisbon" />
          <AppInput label="Destination" value={destination} onChangeText={setDestination} placeholder="Lisbon" />
          <View style={styles.selectorGroup}>
            <AppText variant="meta" color="muted">
              Trip currency
            </AppText>
            <View style={styles.selectorWrap}>
              {MAJOR_CURRENCIES.map((currency) => (
                <Chip
                  key={currency.code}
                  label={currency.code}
                  selected={tripCurrencyCode === currency.code}
                  onPress={() => setTripCurrencyCode(currency.code)}
                />
              ))}
            </View>
            <AppText variant="bodySm" color="muted">
              Use the settlement currency for the trip.
            </AppText>
          </View>
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
                  tripCurrencyCode: tripCurrencyCode.trim().toUpperCase() || "USD"
                });
                setName("");
                setDestination("");
                setTripCurrencyCode("USD");
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
        </SurfaceCard>

        <SurfaceCard tone="muted" style={styles.summaryCard}>
          <AppText variant="eyebrow" color="secondary">
            SplitTrip
          </AppText>
          <AppText variant="sectionTitle">Split travel expenses without the math.</AppText>
          <AppText variant="bodySm" color="secondary">
            Keep receipts, balances, and settlements in one place instead of a shared spreadsheet.
          </AppText>
          <View style={styles.identityCard}>
            <View style={styles.identityCopy}>
              <AppText variant="meta" color="muted">
                Signed in as
              </AppText>
              <AppText variant="bodySm" color="secondary" style={styles.identityName}>
                {currentUser.displayName || "Traveler"}
              </AppText>
              {currentUser.email ? (
                <AppText variant="bodySm" color="muted">
                  {currentUser.email}
                </AppText>
              ) : (
                <AppText variant="bodySm" color="muted">
                  Demo workspace
                </AppText>
              )}
            </View>
            <View style={styles.identityAvatar}>
              <AppText variant="bodySm" color="inverse" style={styles.identityAvatarText}>
                {(currentUser.displayName || "T").slice(0, 1).toUpperCase()}
              </AppText>
            </View>
          </View>
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <AppText variant="meta" color="muted">
                Trips
              </AppText>
              <AppText variant="sectionTitle">{trips.length}</AppText>
            </View>
            <View style={styles.statCard}>
              <AppText variant="meta" color="muted">
                Mode
              </AppText>
              <AppText variant="sectionTitle">{authMode === "supabase" ? "Cloud" : "Demo"}</AppText>
            </View>
          </View>
        </SurfaceCard>
      </View>

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
            Create a trip, invite your group, and let SplitTrip handle the settlement math at the end.
          </AppText>
        </SurfaceCard>
      ) : null}

      <View style={styles.tripList}>
        {trips.map((trip) => (
          <Link href={{ pathname: "/trip/[tripId]", params: { tripId: trip.id } }} key={trip.id} asChild>
            <Pressable style={styles.linkWrapper}>
              <SurfaceCard style={styles.tripCard}>
                <View style={styles.tripHeader}>
                  <View style={styles.tripBadge}>
                    <AppText variant="meta" color="inverse">
                      Trip
                    </AppText>
                  </View>
                  <AppText variant="bodySm" color="muted">
                    {trip.tripCurrencyCode}
                  </AppText>
                </View>
                <AppText variant="sectionTitle">{trip.name}</AppText>
                <AppText variant="bodySm" color="secondary">
                  {trip.destination ?? "Destination coming soon"}
                </AppText>
                <AppText variant="bodySm" color="muted">
                  {trip.members.length} members
                </AppText>
              </SurfaceCard>
            </Pressable>
          </Link>
        ))}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.md
  },
  headerWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  headerCopy: {
    gap: theme.spacing.xs
  },
  signOutButton: {
    minWidth: 120
  },
  topGrid: {
    gap: theme.spacing.md
  },
  topGridWide: {
    flexDirection: "row"
  },
  createCard: {
    flex: 1,
    gap: theme.spacing.md
  },
  summaryCard: {
    flex: 1,
    gap: theme.spacing.md
  },
  identityCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface.base,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle
  },
  identityCopy: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  identityName: {
    fontWeight: theme.type.weight.semibold
  },
  identityAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  identityAvatarText: {
    fontWeight: theme.type.weight.bold
  },
  selectorGroup: {
    gap: theme.spacing.sm
  },
  selectorWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  statRow: {
    flexDirection: "row",
    gap: theme.spacing.md
  },
  statCard: {
    flex: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface.base,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle
  },
  emptyState: {
    gap: theme.spacing.sm
  },
  tripList: {
    gap: theme.spacing.md
  },
  linkWrapper: {
    borderRadius: theme.radius.xl
  },
  tripCard: {
    gap: theme.spacing.sm
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  tripBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accent.primary
  }
});
