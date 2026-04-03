import { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import type { ExpenseCategoryId, Member } from "@splitsy/domain";
import { PRESET_CATEGORIES } from "@splitsy/domain";
import { useAppTheme, type Theme } from "../theme";
import { AppText } from "./AppText";
import { AppInput } from "./AppInput";
import { DatePicker } from "./DatePicker";
import { Chip } from "./Chip";
import { AppButton } from "./AppButton";

type ExpenseFiltersProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateFrom: string | null;
  onDateFromChange: (date: string | null) => void;
  dateTo: string | null;
  onDateToChange: (date: string | null) => void;
  selectedCategories: Set<ExpenseCategoryId>;
  onCategoriesChange: (categories: Set<ExpenseCategoryId>) => void;
  selectedPayerId: string | null;
  onPayerChange: (payerId: string | null) => void;
  members: Member[];
  activeFilterCount: number;
  onClearAll: () => void;
  compact: boolean;
  initiallyOpen?: boolean;
};

export function ExpenseFilters({
  searchQuery,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  selectedCategories,
  onCategoriesChange,
  selectedPayerId,
  onPayerChange,
  members,
  activeFilterCount,
  onClearAll,
  compact,
  initiallyOpen = true
}: ExpenseFiltersProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);
  const [isExpanded, setIsExpanded] = useState(initiallyOpen);

  const toggleCategory = (categoryId: ExpenseCategoryId) => {
    const newSet = new Set(selectedCategories);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    onCategoriesChange(newSet);
  };

  const clearDateFrom = () => onDateFromChange(null);
  const clearDateTo = () => onDateToChange(null);

  return (
    <View style={styles.container}>
      {compact && (
        <Pressable
          style={styles.header}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.headerContent}>
            <AppText variant="bodySm" color="muted" style={styles.expandIcon}>
              {isExpanded ? "▼" : "▶"}
            </AppText>
            <AppText variant="meta" color="muted">
              Filters
            </AppText>
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <AppText variant="bodySm" color="inverse">
                  {activeFilterCount}
                </AppText>
              </View>
            )}
          </View>
          {activeFilterCount > 0 && !isExpanded && (
            <AppButton onPress={onClearAll} variant="secondary" fullWidth={false}>
              Clear
            </AppButton>
          )}
        </Pressable>
      )}

      {(isExpanded || !compact) && (
        <View style={styles.content}>
          {!compact && activeFilterCount > 0 && (
            <View style={styles.activeFilters}>
              <AppText variant="bodySm" color="muted">
                Active: {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
              </AppText>
              <AppButton onPress={onClearAll} variant="secondary" fullWidth={false}>
                Clear all
              </AppButton>
            </View>
          )}

          <AppInput
            label="Search"
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search by note or category..."
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DatePicker
                label="From"
                value={dateFrom ?? ""}
                onChange={(date) => onDateFromChange(date || null)}
              />
              {dateFrom && (
                <AppButton onPress={clearDateFrom} variant="secondary" fullWidth={false}>
                  Clear
                </AppButton>
              )}
            </View>

            <View style={styles.dateField}>
              <DatePicker
                label="To"
                value={dateTo ?? ""}
                onChange={(date) => onDateToChange(date || null)}
              />
              {dateTo && (
                <AppButton onPress={clearDateTo} variant="secondary" fullWidth={false}>
                  Clear
                </AppButton>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="meta" color="muted">
              Categories
            </AppText>
            <View style={styles.chipWrap}>
              {PRESET_CATEGORIES.filter(c => c.id !== "settle_up").map((cat) => (
                <Chip
                  key={cat.id}
                  label={cat.label}
                  selected={selectedCategories.has(cat.id)}
                  onPress={() => toggleCategory(cat.id)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="meta" color="muted">
              Paid by
            </AppText>
            <View style={styles.chipWrap}>
              <Chip
                label="All"
                selected={selectedPayerId === null}
                onPress={() => onPayerChange(null)}
              />
              {members.map((member) => (
                <Chip
                  key={member.id}
                  label={member.displayName}
                  selected={selectedPayerId === member.id}
                  onPress={() => onPayerChange(member.id)}
                />
              ))}
            </View>
          </View>

          {compact && activeFilterCount > 0 && (
            <AppButton onPress={onClearAll} variant="secondary" fullWidth>
              Clear all filters
            </AppButton>
          )}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.sm
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs
    },
    expandIcon: {
      width: 16
    },
    badge: {
      backgroundColor: theme.colors.accent.primary,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.radius.sm,
      minWidth: 20,
      alignItems: "center",
      justifyContent: "center"
    },
    content: {
      gap: theme.spacing.md
    },
    activeFilters: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
    },
    dateRow: {
      flexDirection: "row",
      gap: theme.spacing.md
    },
    dateField: {
      flex: 1,
      gap: theme.spacing.xs
    },
    section: {
      gap: theme.spacing.sm
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    }
  });
}
