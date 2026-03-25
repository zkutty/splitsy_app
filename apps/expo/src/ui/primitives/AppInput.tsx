import { ComponentProps } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { AppText } from "./AppText";
import { theme } from "../theme";

type AppInputProps = ComponentProps<typeof TextInput> & {
  label: string;
  helperText?: string;
  errorText?: string | null;
};

export function AppInput({ label, helperText, errorText, style, ...props }: AppInputProps) {
  return (
    <View style={styles.wrapper}>
      <AppText variant="meta" color="muted">
        {label}
      </AppText>
      <TextInput placeholderTextColor={theme.colors.text.muted} style={[styles.input, style]} {...props} />
      {errorText ? (
        <AppText variant="bodySm" color="danger">
          {errorText}
        </AppText>
      ) : helperText ? (
        <AppText variant="bodySm" color="muted">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs
  },
  input: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.surface.base,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text.primary,
    fontSize: theme.type.size.body
  }
});
