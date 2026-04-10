import { Link, Redirect } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { useSession } from "../src/providers/session-provider";
import { AuthScreen } from "../src/ui/layout/AuthScreen";
import { BrandMark } from "../src/ui/navigation/BrandMark";
import { AppButton } from "../src/ui/primitives/AppButton";
import { AppText } from "../src/ui/primitives/AppText";
import { SurfaceCard } from "../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../src/ui/theme";

/* ------------------------------------------------------------------ */
/*  Feature cards shown in the "How it works" section                  */
/* ------------------------------------------------------------------ */
const STEPS = [
  {
    number: "1",
    heading: "Create a trip",
    body: "Name it, pick a base currency, and set the dates. You can change details later.",
  },
  {
    number: "2",
    heading: "Invite your group",
    body: "Share a link — anyone with it can join. No app download required on web.",
  },
  {
    number: "3",
    heading: "Log expenses",
    body: "Add costs in any currency. SplitTrip converts to the trip currency automatically.",
  },
  {
    number: "4",
    heading: "Settle up",
    body: "One tap to see who owes whom. SplitTrip calculates the minimum number of payments. Someone leaving early? They can settle up and go — the rest of the trip adjusts automatically.",
  },
] as const;

const FEATURES = [
  {
    accent: "primary" as const,
    heading: "Multi-currency support",
    body: "Traveling across borders? Log each expense in the local currency. SplitTrip stores the original amount alongside the trip-converted total.",
  },
  {
    accent: "success" as const,
    heading: "Real-time balances",
    body: "Every member sees an up-to-date running balance. No waiting, no spreadsheet refreshes — just open the trip.",
  },
  {
    accent: "purple" as const,
    heading: "Minimum repayments",
    body: "When the trip ends, SplitTrip reduces all debts to the fewest possible transfers so nobody chases five people for $12.",
  },
  {
    accent: "primary" as const,
    heading: "Early departures",
    body: "Someone leaving the trip early? They can settle their share and be done. Future expenses won't involve them, and the final settlement adjusts automatically.",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function LandingScreen() {
  const { isAuthenticated, isLoading, getPendingPostAuthPath } = useSession();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const compact = width < 768;
  const pendingPostAuthPath = getPendingPostAuthPath();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background.canvas }} />;
  }

  if (isAuthenticated) {
    return <Redirect href={(pendingPostAuthPath ?? "/home") as any} />;
  }

  return (
    <AuthScreen>
      {/* ---------- HERO ---------- */}
      <View style={[styles.hero, wide ? styles.heroWide : null]}>
        <View style={styles.heroText}>
          <BrandMark size="hero" style={styles.brandMark} />

          <AppText variant="title">
            Split travel expenses with zero hassle.
          </AppText>
          <AppText variant="body" color="secondary">
            SplitTrip lets groups track shared costs in any currency, then
            calculates the fewest payments needed to settle up. No spreadsheet.
            No arguments.
          </AppText>

          <Link href="/sign-in" asChild>
            <Pressable>
              <AppButton fullWidth={false}>Get started free</AppButton>
            </Pressable>
          </Link>
        </View>

        <SurfaceCard tone="hero" style={[styles.heroCard, wide ? styles.heroCardWide : styles.heroCardCompact]}>
          <AppText variant="eyebrow" color="accent">
            Why SplitTrip?
          </AppText>
          <AppText variant="sectionTitle" color="inverse">
            Travel together. Track every shared cost. Settle in one pass.
          </AppText>
          <AppText variant="bodySm" color="accent">
            Create a trip, invite friends with a link, log expenses in any
            currency, and let SplitTrip calculate the minimum repayments for the
            group.
          </AppText>
        </SurfaceCard>
      </View>

      {/* ---------- HOW IT WORKS ---------- */}
      <View style={styles.section}>
        <AppText variant="sectionTitle" align="center">
          How it works
        </AppText>
        <View style={[styles.stepsGrid, wide ? styles.stepsGridWide : null]}>
          {STEPS.map((step) => (
            <SurfaceCard key={step.number} style={styles.stepCard}>
              <View style={[styles.stepBadge, { backgroundColor: theme.colors.accent.primary }]}>
                <AppText variant="bodySm" color="inverse" style={styles.stepBadgeText}>
                  {step.number}
                </AppText>
              </View>
              <AppText variant="sectionTitle">{step.heading}</AppText>
              <AppText variant="bodySm" color="secondary">{step.body}</AppText>
            </SurfaceCard>
          ))}
        </View>
      </View>

      {/* ---------- FEATURES ---------- */}
      <View style={styles.section}>
        <AppText variant="sectionTitle" align="center">
          Built for group travel
        </AppText>
        <View style={[styles.featuresGrid, wide ? styles.featuresGridWide : null]}>
          {FEATURES.map((feature) => (
            <SurfaceCard key={feature.heading} style={styles.featureCard}>
              <View style={[styles.dot, { backgroundColor: theme.colors.accent[feature.accent] }]} />
              <AppText variant="sectionTitle">{feature.heading}</AppText>
              <AppText variant="bodySm" color="secondary">{feature.body}</AppText>
            </SurfaceCard>
          ))}
        </View>
      </View>

      {/* ---------- FINAL CTA ---------- */}
      <SurfaceCard tone="hero" style={styles.ctaCard}>
        <AppText variant="sectionTitle" color="inverse" align="center">
          Ready to ditch the spreadsheet?
        </AppText>
        <AppText variant="bodySm" color="accent" align="center">
          Sign up in seconds — no credit card, no downloads.
        </AppText>
        <Link href="/sign-in" asChild>
          <Pressable>
            <AppButton fullWidth={false}>Get started free</AppButton>
          </Pressable>
        </Link>
      </SurfaceCard>

      {/* ---------- FOOTER ---------- */}
      <View style={styles.footer}>
        <AppText variant="meta" color="muted" align="center">
          SplitTrip — shared travel expenses made simple.
        </AppText>
      </View>
    </AuthScreen>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */
function createStyles(theme: Theme) {
  return StyleSheet.create({
    /* Hero */
    hero: {
      gap: theme.spacing.xl,
    },
    heroWide: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroText: {
      flex: 1,
      gap: theme.spacing.md,
      maxWidth: 560,
    },
    brandMark: {
      alignSelf: "flex-start",
      marginBottom: theme.spacing.xs,
    },
    heroCard: {
      width: "100%",
      gap: theme.spacing.md,
    },
    heroCardCompact: {
      minHeight: 0,
      alignSelf: "stretch",
    },
    heroCardWide: {
      minHeight: 280,
      maxWidth: 420,
      justifyContent: "center",
    },

    /* Section common */
    section: {
      gap: theme.spacing.lg,
      marginTop: theme.spacing.xl,
    },

    /* Steps */
    stepsGrid: {
      gap: theme.spacing.md,
    },
    stepsGridWide: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    stepCard: {
      flex: 1,
      minWidth: 200,
      gap: theme.spacing.sm,
    },
    stepBadge: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    stepBadgeText: {
      fontWeight: theme.type.weight.bold,
    },

    /* Features */
    featuresGrid: {
      gap: theme.spacing.md,
    },
    featuresGridWide: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    featureCard: {
      flex: 1,
      minWidth: 260,
      gap: theme.spacing.sm,
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 999,
    },

    /* CTA */
    ctaCard: {
      gap: theme.spacing.md,
      alignItems: "center",
      marginTop: theme.spacing.xl,
    },

    /* Footer */
    footer: {
      paddingVertical: theme.spacing.lg,
    },
  });
}
