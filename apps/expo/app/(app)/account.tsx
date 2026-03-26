import { StyleSheet, View } from "react-native";

import { useSession } from "../../src/providers/session-provider";
import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppText } from "../../src/ui/primitives/AppText";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { theme } from "../../src/ui/theme";

export default function AccountScreen() {
  const session = useSession();
  const { currentUser, signOut } = useTrips();

  return (
    <AppScreen maxWidth={880}>
      <SurfaceCard tone="hero" style={styles.heroCard}>
        <AppText variant="eyebrow" color="accent">
          Account
        </AppText>
        <AppText variant="title" color="inverse">
          Your SplitTrip profile
        </AppText>
        <AppText variant="bodySm" color="accent">
          Keep identity and access details in one stable place instead of duplicating them across workspace screens.
        </AppText>
      </SurfaceCard>

      <SurfaceCard style={styles.profileCard}>
        <View style={styles.avatar}>
          <AppText variant="sectionTitle" color="inverse">
            {(currentUser.displayName || "T").slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.profileCopy}>
          <AppText variant="meta" color="muted">
            Signed in as
          </AppText>
          <AppText variant="sectionTitle">{currentUser.displayName}</AppText>
          <AppText variant="bodySm" color="muted">
            {currentUser.email ?? "No email available"}
          </AppText>
        </View>
      </SurfaceCard>

      <View style={styles.infoGrid}>
        <SurfaceCard style={styles.infoCard}>
          <AppText variant="meta" color="muted">
            Auth mode
          </AppText>
          <AppText variant="sectionTitle">{session.authMode === "supabase" ? "Supabase Cloud" : "Demo"}</AppText>
          <AppText variant="bodySm" color="muted">
            Google sign-in is the intended production flow for the app.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.infoCard}>
          <AppText variant="meta" color="muted">
            Session
          </AppText>
          <AppText variant="sectionTitle">{session.isAuthenticated ? "Active" : "Signed out"}</AppText>
          <AppText variant="bodySm" color="muted">
            Use this page to confirm who is signed in before inviting people to trips.
          </AppText>
        </SurfaceCard>
      </View>

      <SurfaceCard style={styles.actionsCard}>
        <AppText variant="sectionTitle">Account actions</AppText>
        <AppText variant="bodySm" color="muted">
          End the current session here when you need to switch accounts.
        </AppText>
        <AppButton onPress={signOut} variant="secondary">
          Sign out
        </AppButton>
      </SurfaceCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: theme.spacing.md
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  profileCopy: {
    gap: theme.spacing.xxs
  },
  infoGrid: {
    gap: theme.spacing.md
  },
  infoCard: {
    gap: theme.spacing.sm
  },
  actionsCard: {
    gap: theme.spacing.md
  }
});
