import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

export function FinancialDisclaimer() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <AppText variant="bodySm" color="muted" style={styles.text}>
        Figures are estimates only. Verify all amounts before settling.
      </AppText>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.background.muted,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle
    },
    text: {
      fontStyle: "italic",
      textAlign: "center"
    }
  });
}
