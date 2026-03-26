import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useMemo } from "react";

import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "default" | "success";
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected = false, onPress, tone = "default", style }: ChipProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const content = (
    <View style={[styles.base, tone === "success" ? styles.success : null, selected ? styles.selected : null, style]}>
      <AppText variant="bodySm" color={selected ? "inverse" : tone === "success" ? "success" : "secondary"} style={styles.label}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable hitSlop={6} onPress={onPress} style={({ pressed }) => (pressed ? styles.pressablePressed : null)}>
      {content}
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    base: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 10,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.base
    },
    selected: {
      backgroundColor: theme.colors.accent.primary,
      borderColor: theme.colors.accent.primary
    },
    success: {
      backgroundColor: theme.colors.background.spotlight,
      borderColor: theme.colors.accent.success
    },
    pressablePressed: {
      opacity: 0.9
    },
    label: {
      fontWeight: theme.type.weight.semibold
    }
  });
}
