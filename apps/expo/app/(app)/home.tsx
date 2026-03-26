import { Link } from "expo-router";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppText } from "../../src/ui/primitives/AppText";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { theme } from "../../src/ui/theme";

export default function HomeScreen() {
  const { trips, currentUser } = useTrips();
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const recentTrips = trips.slice(0, 3);
  const activeTripCount = trips.filter((trip) => (trip.status ?? "active") === "active").length;

  return (
    <AppScreen>
      <SurfaceCard tone="hero" style={styles.heroCard}>
        <AppText variant="eyebrow" color="accent">
          Home
        </AppText>
        <AppText variant="title" color="inverse">
          Welcome back, {currentUser.displayName}.
        </AppText>
        <AppText variant="body" color="accent">
          Move from planning to settlement without losing context. Your workspace now has a clear home base, trip list,
          and account area.
        </AppText>
        <View style={styles.heroActions}>
          <Link href="/trips" asChild>
            <Pressable>
              <AppButton fullWidth={false}>Open trips</AppButton>
            </Pressable>
          </Link>
          <Link href={"/account" as any} asChild>
            <Pressable>
              <AppButton variant="secondary" fullWidth={false}>
                View account
              </AppButton>
            </Pressable>
          </Link>
        </View>
      </SurfaceCard>

      <View style={[styles.statsGrid, wide ? styles.statsGridWide : null]}>
        <SurfaceCard style={styles.statCard}>
          <AppText variant="meta" color="muted">
            Active trips
          </AppText>
          <AppText variant="title">{activeTripCount}</AppText>
          <AppText variant="bodySm" color="muted">
            Every shared travel workspace currently in your account.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.statCard}>
          <AppText variant="meta" color="muted">
            Workflow
          </AppText>
          <AppText variant="sectionTitle">Create the trip, invite people, then log expenses.</AppText>
          <AppText variant="bodySm" color="muted">
            SplitTrip preserves the original amount and the settlement amount for every entry.
          </AppText>
        </SurfaceCard>
      </View>

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <AppText variant="sectionTitle">Recent trips</AppText>
            <AppText variant="bodySm" color="muted">
              Pick up where you left off.
            </AppText>
          </View>
        </View>

        <View style={styles.recentList}>
          {recentTrips.length ? (
            recentTrips.map((trip) => (
              <Link href={{ pathname: "/trip/[tripId]", params: { tripId: trip.id } }} key={trip.id} asChild>
                <Pressable style={styles.recentTrip}>
                  <View style={styles.recentTripCopy}>
                    <AppText variant="bodySm" color="secondary" style={styles.recentTripTitle}>
                      {trip.name}
                    </AppText>
                    <AppText variant="bodySm" color="muted">
                      {trip.destination ?? "Destination coming soon"} · {trip.tripCurrencyCode} · {trip.status ?? "active"}
                    </AppText>
                  </View>
                  <AppText variant="bodySm" color="muted">
                    {trip.members.length} members
                  </AppText>
                </Pressable>
              </Link>
            ))
          ) : (
            <AppText variant="bodySm" color="muted">
              No trips yet. Open Trips to create your first workspace.
            </AppText>
          )}
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: theme.spacing.md
  },
  heroActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  statsGrid: {
    gap: theme.spacing.md
  },
  statsGridWide: {
    flexDirection: "row"
  },
  statCard: {
    flex: 1,
    gap: theme.spacing.sm
  },
  sectionCard: {
    gap: theme.spacing.md
  },
  sectionHeader: {
    gap: theme.spacing.md
  },
  sectionCopy: {
    gap: theme.spacing.xs
  },
  recentList: {
    gap: theme.spacing.sm
  },
  recentTrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing.md,
    alignItems: "center",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle
  },
  recentTripCopy: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  recentTripTitle: {
    fontWeight: theme.type.weight.semibold
  }
});
