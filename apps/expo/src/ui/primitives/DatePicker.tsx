import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

type DatePickerProps = {
  label: string;
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  disabled?: boolean;
  helperText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function DatePicker({
  label,
  value,
  onChange,
  disabled = false,
  helperText,
  minimumDate,
  maximumDate
}: DatePickerProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showPicker, setShowPicker] = useState(false);

  // Parse YYYY-MM-DD string to Date
  const dateValue = useMemo(() => {
    if (!value) return new Date();
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }, [value]);

  // Format Date to YYYY-MM-DD string
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const displayValue = useMemo(() => {
    if (!value) return "";
    const date = dateValue;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }, [value, dateValue]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (selectedDate) {
      onChange(formatDate(selectedDate));
    }
  };

  const webInputStyle = {
    minHeight: 48,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: "solid" as const,
    borderColor: theme.colors.border.subtle,
    backgroundColor: disabled ? theme.colors.surface.muted : theme.colors.surface.base,
    color: disabled ? theme.colors.text.muted : theme.colors.text.primary,
    fontSize: theme.type.size.body,
    opacity: disabled ? 0.6 : 1,
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: "inherit"
  };

  // Web: use native HTML5 date input
  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <AppText variant="meta" color="secondary" style={styles.label}>
          {label}
        </AppText>
        {/* @ts-ignore - input is a valid web element */}
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          disabled={disabled}
          max={maximumDate ? formatDate(maximumDate) : undefined}
          min={minimumDate ? formatDate(minimumDate) : undefined}
          style={webInputStyle}
        />
        {helperText && (
          <AppText variant="bodySm" color="muted" style={styles.helperText}>
            {helperText}
          </AppText>
        )}
      </View>
    );
  }

  // iOS: show picker inline when pressed
  if (Platform.OS === "ios") {
    return (
      <View style={styles.container}>
        <AppText variant="meta" color="secondary" style={styles.label}>
          {label}
        </AppText>

        <Pressable onPress={() => !disabled && setShowPicker(!showPicker)} disabled={disabled}>
          <View style={[styles.inputContainer, disabled && styles.disabled]}>
            <AppText variant="body" color={disabled ? "muted" : "primary"}>
              {displayValue || "Select date"}
            </AppText>
          </View>
        </Pressable>

        {showPicker && !disabled && (
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              themeVariant="light"
            />
            <Pressable style={styles.doneButton} onPress={() => setShowPicker(false)}>
              <AppText variant="body" color="accent">
                Done
              </AppText>
            </Pressable>
          </View>
        )}

        {helperText && (
          <AppText variant="bodySm" color="muted" style={styles.helperText}>
            {helperText}
          </AppText>
        )}
      </View>
    );
  }

  // Android: show modal picker
  return (
    <View style={styles.container}>
      <AppText variant="meta" color="secondary" style={styles.label}>
        {label}
      </AppText>

      <Pressable onPress={() => !disabled && setShowPicker(true)} disabled={disabled}>
        <View style={[styles.inputContainer, disabled && styles.disabled]}>
          <AppText variant="body" color={disabled ? "muted" : "primary"}>
            {displayValue || "Select date"}
          </AppText>
        </View>
      </Pressable>

      {showPicker && !disabled && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}

      {helperText && (
        <AppText variant="bodySm" color="muted" style={styles.helperText}>
          {helperText}
        </AppText>
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs
    },
    label: {
      fontWeight: theme.type.weight.semibold
    },
    inputContainer: {
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.base,
      justifyContent: "center"
    },
    disabled: {
      backgroundColor: theme.colors.surface.muted,
      opacity: 0.6
    },
    pickerContainer: {
      backgroundColor: theme.colors.surface.base,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      overflow: "hidden"
    },
    doneButton: {
      padding: theme.spacing.md,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.subtle
    },
    helperText: {
      marginTop: theme.spacing.xxs
    }
  });
}
