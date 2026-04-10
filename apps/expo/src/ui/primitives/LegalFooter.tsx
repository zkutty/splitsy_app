import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Link } from "expo-router";

import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

export function LegalFooter() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <AppText variant="meta" color="muted" align="center">
        © 2026 Zach Kutlow. All rights reserved.
      </AppText>
      <View style={styles.links}>
        <Link href="/privacy" asChild>
          <Pressable hitSlop={4}>
            <AppText variant="meta" color="muted" style={styles.link}>
              Privacy Policy
            </AppText>
          </Pressable>
        </Link>
        <AppText variant="meta" color="muted">
          |
        </AppText>
        <Link href="/terms" asChild>
          <Pressable hitSlop={4}>
            <AppText variant="meta" color="muted" style={styles.link}>
              Terms of Service
            </AppText>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.lg,
      gap: theme.spacing.xs,
      alignItems: "center"
    },
    links: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    link: {
      textDecorationLine: "underline"
    }
  });
}
