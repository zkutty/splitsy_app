import { PropsWithChildren, useMemo } from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { Theme, useAppTheme } from "../theme";

type AppTextProps = PropsWithChildren<{
  variant?: "eyebrow" | "title" | "sectionTitle" | "body" | "bodySm" | "meta";
  color?: "primary" | "secondary" | "muted" | "inverse" | "accent" | "success" | "danger";
  align?: "left" | "center";
  style?: StyleProp<TextStyle>;
}>;

export function AppText({ children, variant = "body", color = "primary", align = "left", style }: AppTextProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return <Text style={[styles.base, variantStyles[variant], styles[color], { textAlign: align }, style]}>{children}</Text>;
}

const variantStyles = StyleSheet.create({
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800"
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700"
  },
  body: {
    fontSize: 16,
    lineHeight: 24
  },
  bodySm: {
    fontSize: 14,
    lineHeight: 20
  },
  meta: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase"
  }
});

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      color: theme.colors.text.primary
    },
    primary: { color: theme.colors.text.primary },
    secondary: { color: theme.colors.text.secondary },
    muted: { color: theme.colors.text.muted },
    inverse: { color: theme.colors.text.inverse },
    accent: { color: theme.colors.text.accent },
    success: { color: theme.colors.status.success },
    danger: { color: theme.colors.status.error }
  });
}
