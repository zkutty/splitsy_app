import { Redirect } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { useSession } from "../src/providers/session-provider";
import { AuthScreen } from "../src/ui/layout/AuthScreen";
import { BrandMark } from "../src/ui/navigation/BrandMark";
import { AppButton } from "../src/ui/primitives/AppButton";
import { AppText } from "../src/ui/primitives/AppText";
import { SurfaceCard } from "../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../src/ui/theme";

export default function SignInScreen() {
  const { signIn, authMode, isLoading, isAuthenticated, getPendingPostAuthPath } = useSession();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const compact = width < 768;
  const pendingPostAuthPath = getPendingPostAuthPath();

  if (!isLoading && isAuthenticated) {
    return <Redirect href={(pendingPostAuthPath ?? "/home") as any} />;
  }

  return (
    <AuthScreen>
      <View style={[styles.layout, wide ? styles.layoutWide : null]}>
        <View style={styles.brandColumn}>
          <BrandMark size="hero" style={styles.brandMark} />

          <View style={styles.heroCopy}>
            <AppText variant={compact ? "sectionTitle" : "title"}>
              Travel together. Track every shared cost. Settle in one pass.
            </AppText>
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
            <View style={styles.valueItem}>
              <View style={[styles.dot, styles.dotPrimary]} />
              <AppText variant="bodySm" color="secondary">
                Someone leaving early? They settle up and go — the trip adjusts.
              </AppText>
            </View>
          </View>
        </View>

        <SurfaceCard tone="hero" style={[styles.heroCard, wide ? styles.heroCardWide : styles.heroCardCompact]}>
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
  layout: {
    gap: theme.spacing.xl
  },
  layoutWide: {
    flexDirection: "row",
    alignItems: "center"
  },
  brandColumn: {
    flex: 1,
    gap: theme.spacing.xl,
    justifyContent: "flex-start",
    maxWidth: 560
  },
  brandMark: {
    alignSelf: "flex-start",
    marginTop: theme.spacing.xs
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
    width: "100%",
    gap: theme.spacing.md
  },
  heroCardCompact: {
    minHeight: 0,
    alignSelf: "stretch"
  },
  heroCardWide: {
    minHeight: 360,
    maxWidth: 420,
    justifyContent: "center"
  }
  });
}
