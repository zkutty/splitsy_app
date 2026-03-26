import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { theme } from "../theme";

type AppButtonProps = PropsWithChildren<{
  onPress?: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function AppButton({
  children,
  onPress,
  variant = "primary",
  disabled = false,
  fullWidth = true,
  style
}: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed, hovered }) => [
        styles.base,
        variantStyles[variant],
        fullWidth ? styles.fullWidth : styles.autoWidth,
        (pressed || hovered) && !disabled ? styles.interactive : null,
        disabled ? styles.disabled : null,
        style
      ]}
    >
      <AppText variant="bodySm" color={variant === "primary" ? "inverse" : "primary"} style={styles.label}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1
  },
  fullWidth: {
    width: "100%"
  },
  autoWidth: {
    alignSelf: "flex-start"
  },
  interactive: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.6
  },
  label: {
    fontWeight: theme.type.weight.bold
  }
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.accent.primary,
    borderColor: theme.colors.accent.primary
  },
  secondary: {
    backgroundColor: theme.colors.surface.base,
    borderColor: theme.colors.border.strong
  }
});
