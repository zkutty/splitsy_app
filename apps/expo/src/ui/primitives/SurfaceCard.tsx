import { PropsWithChildren, useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";

import { Theme, useAppTheme } from "../theme";

type SurfaceCardProps = PropsWithChildren<{
  tone?: "default" | "hero" | "muted";
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({ children, tone = "default", style }: SurfaceCardProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);

  return <View style={[styles.base, styles[tone], style]}>{children}</View>;
}

function createStyles(theme: Theme, compact: boolean) {
  return StyleSheet.create({
    base: {
      borderRadius: compact ? theme.radius.lg : theme.radius.xl,
      padding: compact ? theme.spacing.md : theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle
    },
    default: {
      backgroundColor: theme.colors.surface.base,
      ...theme.shadow.card
    },
    hero: {
      backgroundColor: theme.colors.surface.hero,
      borderColor: theme.colors.border.strong
    },
    muted: {
      backgroundColor: theme.colors.background.muted
    }
  });
}
