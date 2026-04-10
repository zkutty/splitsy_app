import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppScreen } from "../src/ui/layout/AppScreen";
import { AppText } from "../src/ui/primitives/AppText";
import { SurfaceCard } from "../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../src/ui/theme";

export default function TermsOfServiceScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppScreen maxWidth={720}>
      <View style={styles.page}>
        <AppText variant="title">Terms of Service</AppText>
        <AppText variant="bodySm" color="muted">
          Effective date: April 2026
        </AppText>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Acceptance</AppText>
          <AppText variant="body" color="secondary">
            By using SplitTrip you agree to these terms. If you do not agree, please do not use the app.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">No warranty</AppText>
          <AppText variant="body" color="secondary">
            SplitTrip is provided "as is" with no warranties of any kind, whether express or implied. We do not guarantee that the app will be error-free, uninterrupted, or free of data loss.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Limitation of liability</AppText>
          <AppText variant="body" color="secondary">
            Zach Kutlow is not responsible for any errors, outages, or data loss that may occur while using SplitTrip. The app provides estimated expense splits and balances for convenience — you are responsible for verifying all amounts before settling with other people.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Your data</AppText>
          <AppText variant="body" color="secondary">
            You are responsible for the accuracy of any data you enter into SplitTrip, including expenses, member details, and payment information. We recommend keeping your own records as a backup.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Changes to the service</AppText>
          <AppText variant="body" color="secondary">
            Zach Kutlow reserves the right to modify, suspend, or discontinue SplitTrip at any time, with or without notice. We are not liable for any modification or discontinuation of the service.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Governing law</AppText>
          <AppText variant="body" color="secondary">
            These terms are governed by the laws of the State of California. Any disputes arising from the use of SplitTrip will be resolved under California law.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <AppText variant="sectionTitle">Contact</AppText>
          <AppText variant="body" color="secondary">
            Questions about these terms? Reach out to privacy@splittrip.app.
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
    }
  });
}
