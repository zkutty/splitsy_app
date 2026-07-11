import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { PRESET_CATEGORIES } from "@splitsy/domain";
import type { Expense, ExpenseCategoryId, Member } from "@splitsy/domain";

import { formatCurrency } from "../lib/format";
import { calculateSummary, matchesSearch } from "../lib/expense-utils";
import { AppButton } from "../ui/primitives/AppButton";
import { AppText } from "../ui/primitives/AppText";
import { Chip } from "../ui/primitives/Chip";
import { ExpenseFilters } from "../ui/primitives/ExpenseFilters";
import { ExpenseSummaryView } from "../ui/primitives/ExpenseSummaryView";
import { SectionCard } from "../ui/primitives/SectionCard";
import { Theme, useAppTheme } from "../ui/theme";

// ZKU-60: The expense list — view toggle, search/filter bar, and the
// list/summary content itself — extracted out of trip/[tripId].tsx.

export type ExpenseListSectionProps = {
  expenses: Expense[];
  members: Member[];
  activeMembers: Member[];
  compact: boolean;
  tripStatus: string;
  tripCurrencyCode: string;
  fmt: (amount: number, overrideCurrency?: string) => string;
  canEditExpense: (expenseId: string) => boolean;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => Promise<void>;
};

export function ExpenseListSection({
  expenses,
  members,
  activeMembers,
  compact,
  tripStatus,
  tripCurrencyCode,
  fmt,
  canEditExpense,
  onEditExpense,
  onDeleteExpense
}: ExpenseListSectionProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [viewMode, setViewMode] = useState<"list" | "summary">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategoryId>>(new Set());
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      if (searchQuery && !matchesSearch(expense, searchQuery)) return false;
      if (dateFrom && expense.expenseDate < dateFrom) return false;
      if (dateTo && expense.expenseDate > dateTo) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(expense.category)) return false;
      if (selectedPayerId && expense.paidByMemberId !== selectedPayerId) return false;
      return true;
    });
  }, [expenses, searchQuery, dateFrom, dateTo, selectedCategories, selectedPayerId]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (selectedCategories.size > 0) count++;
    if (selectedPayerId) count++;
    return count;
  }, [searchQuery, dateFrom, dateTo, selectedCategories, selectedPayerId]);

  const summaryData = useMemo(
    () => calculateSummary(filteredExpenses, members, tripCurrencyCode),
    [filteredExpenses, members, tripCurrencyCode]
  );

  const clearAllFilters = () => {
    setSearchQuery("");
    setDateFrom(null);
    setDateTo(null);
    setSelectedCategories(new Set());
    setSelectedPayerId(null);
  };

  return (
    <SectionCard
      title="Expenses"
      collapsible
      badge={activeFilterCount > 0 ? `${filteredExpenses.length} of ${expenses.length}` : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
      description="Every expense keeps the original amount and the converted trip value."
    >
      <View style={styles.viewToggle}>
        <Chip label="List" selected={viewMode === "list"} onPress={() => setViewMode("list")} />
        <Chip label="Summary" selected={viewMode === "summary"} onPress={() => setViewMode("summary")} />
      </View>

      <ExpenseFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        selectedPayerId={selectedPayerId}
        onPayerChange={setSelectedPayerId}
        members={activeMembers}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAllFilters}
        compact={compact}
        initiallyOpen={!compact}
      />

      {viewMode === "list" ? (
        filteredExpenses.length ? (
          filteredExpenses.map((expense) => (
            <View key={expense.id} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
              <View style={styles.rowCopy}>
                <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                  {expense.note || PRESET_CATEGORIES.find((c) => c.id === expense.category)?.label || expense.category}
                </AppText>
                <AppText variant="bodySm" color="muted">
                  {formatCurrency(expense.amount, expense.currencyCode)} {"->"} {fmt(expense.tripAmount)}
                </AppText>
                <AppText variant="bodySm" color="muted">
                  On {expense.expenseDate}
                </AppText>
                <AppText variant="bodySm" color="muted">
                  Added by {members.find((member) => member.userId === expense.createdByUserId)?.displayName ?? "Unknown"}
                </AppText>
              </View>
              <View style={[styles.expenseMeta, compact ? styles.expenseMetaCompact : null]}>
                <AppText variant="bodySm" color="muted">
                  Split{expense.splitMode && expense.splitMode !== "equal" ? ` (${expense.splitMode === "byAmount" ? "by amount" : "by %"})` : ""}:{" "}
                  {expense.involvedMemberIds
                    .map((id) => {
                      const name = members.find((m) => m.id === id)?.displayName ?? "Unknown";
                      if (expense.splitShares?.[id] != null && expense.splitMode !== "equal") {
                        const share = expense.splitShares[id];
                        return `${name} (${expense.splitMode === "byPercentage" ? `${share}%` : formatCurrency(share, expense.currencyCode)})`;
                      }
                      return name;
                    })
                    .join(", ")}
                </AppText>
                {canEditExpense(expense.id) ? (
                  <View style={[styles.expenseActions, compact ? styles.expenseActionsCompact : null]}>
                    <AppButton onPress={() => onEditExpense(expense)} variant="secondary" fullWidth={false}>
                      Edit
                    </AppButton>
                    <AppButton onPress={() => onDeleteExpense(expense.id)} variant="secondary" fullWidth={false}>
                      Delete
                    </AppButton>
                  </View>
                ) : (
                  <AppText variant="bodySm" color="muted">
                    {tripStatus === "active" ? "View only" : "Locked after completion"}
                  </AppText>
                )}
              </View>
            </View>
          ))
        ) : (
          <AppText variant="bodySm" color="muted">
            {expenses.length === 0
              ? "No expenses yet. Add the first one above to start balancing the trip."
              : "No expenses match your filters."}
          </AppText>
        )
      ) : (
        <ExpenseSummaryView summary={summaryData} formatAmount={fmt} compact={compact} />
      )}
    </SectionCard>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    viewToggle: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    rowCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle
    },
    rowCopy: {
      flex: 1,
      gap: theme.spacing.xxs
    },
    rowCardCompact: {
      flexDirection: "column"
    },
    rowTitle: {
      fontWeight: theme.type.weight.semibold
    },
    expenseMeta: {
      alignItems: "flex-end",
      gap: theme.spacing.sm
    },
    expenseMetaCompact: {
      width: "100%",
      alignItems: "flex-start"
    },
    expenseActions: {
      flexDirection: "row",
      gap: theme.spacing.xs
    },
    expenseActionsCompact: {
      flexWrap: "wrap",
      justifyContent: "flex-start"
    }
  });
}
