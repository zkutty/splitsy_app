import { PropsWithChildren, useMemo } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

type AppButtonProps = PropsWithChildren<{
  onPress?: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger";
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
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed, hovered }) => [
        styles.base,
        styles[variant],
        fullWidth ? styles.fullWidth : styles.autoWidth,
        (pressed || hovered) && !disabled ? styles.interactive : null,
        disabled ? styles.disabled : null,
        style
      ]}
    >
      <AppText variant="bodySm" color={variant === "secondary" ? "primary" : "inverse"} style={styles.label}>
        {children}
      </AppText>
    </Pressable>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
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
    },
    primary: {
      backgroundColor: theme.colors.accent.primary,
      borderColor: theme.colors.accent.primary
    },
    secondary: {
      backgroundColor: theme.colors.surface.base,
      borderColor: theme.colors.border.strong
    },
    danger: {
      backgroundColor: theme.colors.status.error,
      borderColor: theme.colors.status.error
    }
  });
}
