import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";

import { ALL_CURRENCIES, MAJOR_CURRENCIES } from "../../lib/rates";
import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

type CurrencyPickerProps = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  label?: string;
};

const MAJOR_CODES = new Set<string>(MAJOR_CURRENCIES.map((c) => c.code as string));

export function CurrencyPicker({ value, onChange, disabled, label }: CurrencyPickerProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<TextInput>(null);
  const { height: windowHeight } = useWindowDimensions();

  const selectedLabel = ALL_CURRENCIES.find((c) => c.code === value)?.label ?? value;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const majorItems = MAJOR_CURRENCIES.map((c) => ({
      code: c.code,
      label: c.label,
      isMajor: true
    }));

    const otherItems = ALL_CURRENCIES.filter((c) => !MAJOR_CODES.has(c.code)).map((c) => ({
      code: c.code,
      label: c.label,
      isMajor: false
    }));

    const all = [...majorItems, ...otherItems];

    if (!q) return all;

    return all.filter(
      (c) => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
    );
  }, [search]);

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const renderItem = useCallback(
    ({ item }: { item: { code: string; label: string; isMajor: boolean } }) => {
      const isSelected = item.code === value;

      return (
        <Pressable
          onPress={() => handleSelect(item.code)}
          style={({ pressed }) => [
            styles.option,
            isSelected ? styles.optionSelected : null,
            pressed ? styles.optionPressed : null
          ]}
        >
          <AppText
            variant="bodySm"
            color={isSelected ? "inverse" : "primary"}
            style={styles.optionCode}
          >
            {item.code}
          </AppText>
          <AppText variant="bodySm" color={isSelected ? "inverse" : "muted"}>
            {item.label}
          </AppText>
        </Pressable>
      );
    },
    [value, handleSelect, styles]
  );

  const keyExtractor = useCallback((item: { code: string }) => item.code, []);

  // Find the index where "other" currencies start (after major ones in filtered list)
  const separatorIndex = useMemo(() => {
    if (search.trim()) return -1; // No separator when searching
    return filtered.findIndex((c) => !c.isMajor);
  }, [filtered, search]);

  const getItemLayout = useCallback(
    (_data: unknown, index: number) => ({
      length: 48,
      offset: 48 * index + (separatorIndex > 0 && index >= separatorIndex ? 28 : 0),
      index
    }),
    [separatorIndex]
  );

  const ItemSeparator = useCallback(
    ({ leadingItem }: { leadingItem: { code: string; label: string; isMajor: boolean } }) => {
      if (leadingItem.isMajor && separatorIndex > 0) {
        // This is the boundary between major and other currencies
        const nextItem = filtered[filtered.indexOf(leadingItem) + 1];
        if (nextItem && !nextItem.isMajor) {
          return (
            <View style={styles.separator}>
              <AppText variant="meta" color="muted">
                All currencies
              </AppText>
            </View>
          );
        }
      }
      return null;
    },
    [filtered, separatorIndex, styles]
  );

  const listMaxHeight = Math.min(windowHeight * 0.55, 400);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="meta" color="muted">
          {label}
        </AppText>
      ) : null}
      <Pressable
        onPress={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
        style={({ pressed }) => [
          styles.trigger,
          disabled ? styles.triggerDisabled : null,
          pressed && !disabled ? styles.triggerPressed : null
        ]}
      >
        <AppText variant="bodySm" color="primary" style={styles.triggerCode}>
          {value}
        </AppText>
        <AppText variant="bodySm" color="muted" style={styles.triggerLabel}>
          {selectedLabel}
        </AppText>
        <AppText variant="bodySm" color="muted">
          {"\u25BE"}
        </AppText>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setOpen(false);
          setSearch("");
        }}
        statusBarTranslucent
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            setOpen(false);
            setSearch("");
          }}
        >
          <Pressable
            style={styles.dropdown}
            onPress={(e) => e.stopPropagation()}
          >
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search currencies..."
              placeholderTextColor={theme.colors.text.muted}
              value={search}
              onChangeText={setSearch}
              autoFocus={Platform.OS === "web"}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <FlatList
              data={filtered}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              ItemSeparatorComponent={ItemSeparator as any}
              style={{ maxHeight: listMaxHeight }}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              windowSize={5}
            />

            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <AppText variant="bodySm" color="muted">
                  No currencies match "{search}"
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      gap: theme.spacing.xs
    },
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minHeight: 48,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      backgroundColor: theme.colors.surface.base,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    triggerDisabled: {
      opacity: 0.5
    },
    triggerPressed: {
      opacity: 0.88
    },
    triggerCode: {
      fontWeight: theme.type.weight.semibold
    },
    triggerLabel: {
      flex: 1
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg
    },
    dropdown: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: theme.colors.surface.base,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      overflow: "hidden",
      ...theme.shadow.card
    },
    searchInput: {
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
      fontSize: theme.type.size.body
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minHeight: 48,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    optionSelected: {
      backgroundColor: theme.colors.accent.primary
    },
    optionPressed: {
      backgroundColor: theme.colors.background.muted
    },
    optionCode: {
      fontWeight: theme.type.weight.semibold,
      width: 44
    },
    separator: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      backgroundColor: theme.colors.background.muted
    },
    emptyState: {
      padding: theme.spacing.lg,
      alignItems: "center"
    }
  });
}
