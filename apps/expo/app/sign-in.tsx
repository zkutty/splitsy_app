import { Redirect } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { useSession } from "../src/providers/session-provider";
import { AuthScreen } from "../src/ui/layout/AuthScreen";
import { AppButton } from "../src/ui/primitives/AppButton";
import { AppText } from "../src/ui/primitives/AppText";
import { SurfaceCard } from "../src/ui/primitives/SurfaceCard";
import { theme } from "../src/ui/theme";

export default function SignInScreen() {
  const { signIn, authMode, isLoading, isAuthenticated } = useSession();
  const { width } = useWindowDimensions();
  const wide = width >= 960;

  if (!isLoading && isAuthenticated) {
    return <Redirect href={"/home" as any} />;
  }

  return (
    <AuthScreen>
      <View style={[styles.layout, wide ? styles.layoutWide : null]}>
        <View style={styles.brandColumn}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <View style={[styles.logoStroke, styles.logoStrokeUp]} />
              <View style={[styles.logoStroke, styles.logoStrokeDown]} />
            </View>
            <View style={styles.logoText}>
              <AppText variant="meta" color="secondary">
                SplitTrip
              </AppText>
              <AppText variant="bodySm" color="muted">
                Split travel expenses without the math.
              </AppText>
            </View>
          </View>

          <View style={styles.heroCopy}>
            <AppText variant="title">Travel together. Track every shared cost. Settle in one pass.</AppText>
            <AppText variant="body" color="secondary">
              Create a trip, add expenses in any currency, and let SplitTrip calculate the minimum repayments for the
              group.
            </AppText>
          </View>

          <View style={styles.valueList}>
            <View style={styles.valueItem}>
              <View style={[styles.dot, styles.dotPrimary]} />
              <AppText variant="bodySm" color="secondary">
                Invite friends and track balances in real time.
              </AppText>
            </View>
            <View style={styles.valueItem}>
              <View style={[styles.dot, styles.dotSuccess]} />
              <AppText variant="bodySm" color="secondary">
                Store the original currency and the trip-converted amount.
              </AppText>
            </View>
            <View style={styles.valueItem}>
              <View style={[styles.dot, styles.dotPurple]} />
              <AppText variant="bodySm" color="secondary">
                Settle instantly without spreadsheet cleanup.
              </AppText>
            </View>
          </View>
        </View>

        <SurfaceCard tone="hero" style={styles.heroCard}>
          <AppText variant="eyebrow" color="accent">
            Welcome to SplitTrip
          </AppText>
          <AppText variant="sectionTitle" color="inverse">
            Split travel expenses without the math.
          </AppText>
          <AppText variant="bodySm" color="accent">
            {authMode === "supabase"
              ? "Use Google sign-in to sync your trips with Supabase."
              : "The app is running in demo mode until Supabase credentials are configured."}
          </AppText>
          <AppButton onPress={signIn}>
            {isLoading ? "Loading..." : authMode === "supabase" ? "Continue with Google" : "Continue with demo data"}
          </AppButton>
        </SurfaceCard>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  layout: {
    gap: theme.spacing.lg
  },
  layoutWide: {
    flexDirection: "row",
    alignItems: "stretch"
  },
  brandColumn: {
    flex: 1,
    gap: theme.spacing.lg,
    justifyContent: "center"
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoStroke: {
    position: "absolute",
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: theme.colors.text.inverse
  },
  logoStrokeUp: {
    transform: [{ rotate: "-45deg" }, { translateY: -6 }]
  },
  logoStrokeDown: {
    transform: [{ rotate: "135deg" }, { translateY: -6 }]
  },
  logoText: {
    gap: theme.spacing.xxs
  },
  heroCopy: {
    gap: theme.spacing.md
  },
  valueList: {
    gap: theme.spacing.sm
  },
  valueItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999
  },
  dotPrimary: {
    backgroundColor: theme.colors.accent.primary
  },
  dotSuccess: {
    backgroundColor: theme.colors.accent.success
  },
  dotPurple: {
    backgroundColor: theme.colors.accent.purple
  },
  heroCard: {
    flex: 1,
    minHeight: 360,
    justifyContent: "center",
    gap: theme.spacing.md
  }
});
