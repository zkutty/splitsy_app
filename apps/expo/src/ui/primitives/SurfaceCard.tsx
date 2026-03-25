import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { theme } from "../theme";

type SurfaceCardProps = PropsWithChildren<{
  tone?: "default" | "hero" | "muted";
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({ children, tone = "default", style }: SurfaceCardProps) {
  return <View style={[styles.base, toneStyles[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle
  }
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.surface.base,
    ...theme.shadow.card
  },
  hero: {
    backgroundColor: theme.colors.surface.hero,
    borderColor: "#1E293B"
  },
  muted: {
    backgroundColor: theme.colors.background.muted
  }
});
