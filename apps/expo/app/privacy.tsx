import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppScreen } from "../src/ui/layout/AppScreen";
import { AppText } from "../src/ui/primitives/AppText";
import { SurfaceCard } from "../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../src/ui/theme";

export default function PrivacyPolicyScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppScreen maxWidth={720}>
      <View style={styles.page}>
        <AppText variant="title">Privacy Policy</AppText>
        <AppText variant="bodySm" color="muted">
          Effective date: April 2026
        </AppText>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">What data we collect</AppText>
          <AppText variant="body" color="secondary">
            When you sign in with Google, SplitTrip receives your display name and email address from your Google account. Beyond that, the app stores only the data you create:
          </AppText>
          <View style={styles.list}>
            <AppText variant="bodySm" color="secondary">
              • Trip details — name, destination, dates, and base currency
            </AppText>
            <AppText variant="bodySm" color="secondary">
              • Expense records — amounts, dates, categories, notes, and which members are involved
            </AppText>
            <AppText variant="bodySm" color="secondary">
              • Member information — display names and email addresses for people added to trips
            </AppText>
            <AppText variant="bodySm" color="secondary">
              • Payment method handles — your Venmo, PayPal, or Cash App username, if you choose to save one
            </AppText>
            <AppText variant="bodySm" color="secondary">
              • Settlement records — payment logs created when trips are settled
            </AppText>
          </View>
          <AppText variant="body" color="secondary">
            On the web, SplitTrip also saves your theme preference in your browser's local storage.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">How we use your data</AppText>
          <AppText variant="body" color="secondary">
            Your data is used only to power the features you see in the app — tracking shared trip expenses, calculating balances, and determining the minimum repayments between members. We do not use your data for advertising, analytics profiling, or any purpose beyond running SplitTrip.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Third-party sharing</AppText>
          <AppText variant="body" color="secondary">
            We do not sell, rent, or share your personal data with third parties. Trip data is stored in Supabase (our database provider) and is accessible only to authenticated members of each trip.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Data storage and security</AppText>
          <AppText variant="body" color="secondary">
            Your data is stored securely in Supabase. Authentication is handled through Google sign-in, so SplitTrip never sees or stores your password. Access to trip data is restricted to members who have been added to that trip.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Contact</AppText>
          <AppText variant="body" color="secondary">
            If you have questions about this privacy policy or your data, reach out to privacy@splittrip.app.
          </AppText>
        </SurfaceCard>
      </View>
    </AppScreen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    page: {
      gap: theme.spacing.lg
    },
    section: {
      gap: theme.spacing.md
    },
    list: {
      gap: theme.spacing.xs,
      paddingLeft: theme.spacing.xs
    }
  });
}
