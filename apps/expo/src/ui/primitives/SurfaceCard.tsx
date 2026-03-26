import { PropsWithChildren, useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { Theme, useAppTheme } from "../theme";

type SurfaceCardProps = PropsWithChildren<{
  tone?: "default" | "hero" | "muted";
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({ children, tone = "default", style }: SurfaceCardProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return <View style={[styles.base, styles[tone], style]}>{children}</View>;
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      borderRadius: theme.radius.xl,
      padding: theme.spacing.lg,
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
