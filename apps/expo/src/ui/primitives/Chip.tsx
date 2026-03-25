import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { theme } from "../theme";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: "default" | "success";
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected = false, onPress, tone = "default", style }: ChipProps) {
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
    <Pressable hitSlop={6} onPress={onPress}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
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
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0"
  },
  label: {
    fontWeight: theme.type.weight.semibold
  }
});
