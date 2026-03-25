import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

import { theme } from "../theme";

type AppTextProps = PropsWithChildren<{
  variant?: "eyebrow" | "title" | "sectionTitle" | "body" | "bodySm" | "meta";
  color?: "primary" | "secondary" | "muted" | "inverse" | "accent" | "success" | "danger";
  align?: "left" | "center";
  style?: StyleProp<TextStyle>;
}>;

export function AppText({ children, variant = "body", color = "primary", align = "left", style }: AppTextProps) {
  return <Text style={[styles.base, variantStyles[variant], colorStyles[color], { textAlign: align }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  base: {
    color: theme.colors.text.primary
  }
});

const variantStyles = StyleSheet.create({
  eyebrow: {
    fontSize: theme.type.size.caption,
    fontWeight: theme.type.weight.bold,
    letterSpacing: 1.4,
    textTransform: "uppercase"
  },
  title: {
    fontSize: theme.type.size.titleLg,
    lineHeight: theme.type.lineHeight.titleLg,
    fontWeight: theme.type.weight.black
  },
  sectionTitle: {
    fontSize: theme.type.size.titleSm,
    lineHeight: theme.type.lineHeight.titleSm,
    fontWeight: theme.type.weight.bold
  },
  body: {
    fontSize: theme.type.size.body,
    lineHeight: theme.type.lineHeight.body
  },
  bodySm: {
    fontSize: theme.type.size.bodySm,
    lineHeight: theme.type.lineHeight.bodySm
  },
  meta: {
    fontSize: theme.type.size.caption,
    lineHeight: 18,
    fontWeight: theme.type.weight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  }
});

const colorStyles = StyleSheet.create({
  primary: { color: theme.colors.text.primary },
  secondary: { color: theme.colors.text.secondary },
  muted: { color: theme.colors.text.muted },
  inverse: { color: theme.colors.text.inverse },
  accent: { color: theme.colors.text.accent },
  success: { color: theme.colors.status.success },
  danger: { color: theme.colors.status.error }
});
