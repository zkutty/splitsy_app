import { View, StyleSheet } from "react-native";
import type { ExpenseSummary } from "../../lib/expense-utils";
import { getCategoryColor } from "../../lib/expense-utils";
import { useAppTheme, type Theme } from "../theme";
import { AppText } from "./AppText";
import { FinancialDisclaimer } from "./FinancialDisclaimer";
import { ProgressBar } from "./ProgressBar";
import { SurfaceCard } from "./SurfaceCard";

type ExpenseSummaryViewProps = {
  summary: ExpenseSummary;
  formatAmount: (amount: number) => string;
  compact: boolean;
};

export function ExpenseSummaryView({
  summary,
  formatAmount,
  compact
}: ExpenseSummaryViewProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme, compact);

  if (summary.totalSpend === 0) {
    return (
      <View style={styles.emptyState}>
        <AppText variant="bodySm" color="muted">
          No expenses match your filters.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Trip Total */}
      <SurfaceCard tone="muted" style={styles.totalCard}>
        <AppText variant="meta" color="muted">
          Filtered Total
        </AppText>
        <AppText variant={compact ? "sectionTitle" : "title"} color="primary">
          {formatAmount(summary.totalSpend)}
        </AppText>
      </SurfaceCard>

      {/* Category Breakdown */}
      <View style={styles.section}>
        <AppText variant="body" color="primary" style={styles.sectionTitle}>
          By Category
        </AppText>
        <View style={styles.categoryList}>
          {summary.categoryBreakdown.map((cat) => (
            <View key={cat.categoryId} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <AppText variant="body" color="secondary">
                  {cat.categoryLabel}
                </AppText>
                <View style={styles.categoryStats}>
                  <AppText variant="body" color="primary">
                    {formatAmount(cat.totalAmount)}
                  </AppText>
                  <AppText variant="bodySm" color="muted">
                    {cat.percentage.toFixed(1)}%
                  </AppText>
                </View>
              </View>
              <ProgressBar
                percentage={cat.percentage}
                color={getCategoryColor(cat.categoryId)}
                height={compact ? 6 : 8}
              />
              <AppText variant="bodySm" color="muted">
                {cat.expenseCount} expense{cat.expenseCount !== 1 ? "s" : ""}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      {/* Person Breakdown */}
      <View style={styles.section}>
        <AppText variant="body" color="primary" style={styles.sectionTitle}>
          By Person
        </AppText>
        <View style={styles.personList}>
          {summary.personBreakdown.map((person) => (
            <View key={person.memberId} style={styles.personItem}>
              <AppText variant="body" color="secondary" style={styles.personName}>
                {person.memberName}
              </AppText>
              <View style={styles.personStats}>
                <View style={styles.personStatRow}>
                  <AppText variant="bodySm" color="muted">
                    Paid:
                  </AppText>
                  <AppText variant="bodySm" color="secondary">
                    {formatAmount(person.totalPaid)}
                  </AppText>
                </View>
                <View style={styles.personStatRow}>
                  <AppText variant="bodySm" color="muted">
                    Owes:
                  </AppText>
                  <AppText variant="bodySm" color="secondary">
                    {formatAmount(person.totalOwed)}
                  </AppText>
                </View>
                <View style={styles.personStatRow}>
                  <AppText variant="bodySm" color="muted">
                    Net:
                  </AppText>
                  <AppText
                    variant="bodySm"
                    color={
                      person.netBalance > 0.01
                        ? "success"
                        : person.netBalance < -0.01
                        ? "danger"
                        : "muted"
                    }
                  >
                    {person.netBalance > 0 ? "+" : ""}
                    {formatAmount(person.netBalance)}
                  </AppText>
                </View>
              </View>
              <ProgressBar
                percentage={(person.totalPaid / summary.totalSpend) * 100}
                color={
                  person.netBalance > 0.01
                    ? theme.colors.accent.success
                    : person.netBalance < -0.01
                    ? theme.colors.accent.danger
                    : theme.colors.accent.primary
                }
                height={compact ? 6 : 8}
              />
            </View>
          ))}
        </View>
      </View>

      <FinancialDisclaimer />
    </View>
  );
}

function createStyles(theme: Theme, compact: boolean) {
  return StyleSheet.create({
    container: {
      gap: compact ? theme.spacing.md : theme.spacing.lg
    },
    emptyState: {
      paddingVertical: theme.spacing.xl,
      alignItems: "center"
    },
    totalCard: {
      padding: theme.spacing.md,
      gap: theme.spacing.xs
    },
    section: {
      gap: theme.spacing.md
    },
    sectionTitle: {
      fontWeight: theme.type.weight.semibold
    },
    categoryList: {
      gap: theme.spacing.md
    },
    categoryItem: {
      gap: theme.spacing.sm
    },
    categoryHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
    },
    categoryStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    personList: {
      gap: theme.spacing.md
    },
    personItem: {
      gap: theme.spacing.sm
    },
    personName: {
      fontWeight: theme.type.weight.semibold
    },
    personStats: {
      gap: theme.spacing.xs
    },
    personStatRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
    }
  });
}
