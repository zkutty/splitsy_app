import type { Expense, ExpenseCategoryId, Member } from "@splitsy/domain";
import { PRESET_CATEGORIES } from "@splitsy/domain";

/**
 * Search function to match expenses by note, category, or custom category
 */
export function matchesSearch(expense: Expense, query: string): boolean {
  const searchTerm = query.toLowerCase().trim();
  if (!searchTerm) return true;

  // Search in note
  if (expense.note?.toLowerCase().includes(searchTerm)) return true;

  // Search in category label
  const categoryLabel = PRESET_CATEGORIES.find(c => c.id === expense.category)?.label ?? "";
  if (categoryLabel.toLowerCase().includes(searchTerm)) return true;

  // Search in custom category
  if (expense.customCategory?.toLowerCase().includes(searchTerm)) return true;

  return false;
}

/**
 * Calculate expense shares for each involved member based on split mode
 */
export function calculateExpenseShares(expense: Expense): Record<string, number> {
  const shares: Record<string, number> = {};

  if (expense.splitMode === "equal" || !expense.splitMode) {
    // Equal split
    const shareAmount = expense.tripAmount / expense.involvedMemberIds.length;
    expense.involvedMemberIds.forEach(memberId => {
      shares[memberId] = shareAmount;
    });
  } else if (expense.splitMode === "byAmount" && expense.splitShares) {
    // By amount - use shares directly
    expense.involvedMemberIds.forEach(memberId => {
      shares[memberId] = expense.splitShares?.[memberId] ?? 0;
    });
  } else if (expense.splitMode === "byPercentage" && expense.splitShares) {
    // By percentage - convert to amounts
    expense.involvedMemberIds.forEach(memberId => {
      const percentage = expense.splitShares?.[memberId] ?? 0;
      shares[memberId] = (expense.tripAmount * percentage) / 100;
    });
  }

  return shares;
}

/**
 * Get category label by ID
 */
export function getCategoryLabel(categoryId: ExpenseCategoryId): string {
  const category = PRESET_CATEGORIES.find(c => c.id === categoryId);
  return category?.label ?? categoryId;
}

/**
 * Get category color based on category ID (for progress bars)
 */
export function getCategoryColor(categoryId: ExpenseCategoryId): string {
  // Map categories to colors - using a simple hue rotation
  const categoryColors: Record<string, string> = {
    food: "#FF6B6B",
    transport: "#4ECDC4",
    lodging: "#45B7D1",
    activity: "#FFA07A",
    shopping: "#98D8C8",
    other: "#95A5A6",
    custom: "#BDC3C7"
  };

  return categoryColors[categoryId] ?? categoryColors.other;
}

export type CategorySummary = {
  categoryId: ExpenseCategoryId;
  categoryLabel: string;
  totalAmount: number;
  percentage: number;
  expenseCount: number;
};

export type PersonSummary = {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
};

export type ExpenseSummary = {
  totalSpend: number;
  categoryBreakdown: CategorySummary[];
  personBreakdown: PersonSummary[];
};

/**
 * Calculate summary data from expenses
 */
export function calculateSummary(
  expenses: Expense[],
  members: Member[],
  currencyCode: string
): ExpenseSummary {
  const billableExpenses = expenses.filter(e => e.category !== "settle_up");

  // Calculate total spend
  const totalSpend = billableExpenses.reduce((sum, e) => sum + e.tripAmount, 0);

  // Group by category
  const categoryMap = new Map<ExpenseCategoryId, number>();
  const categoryCountMap = new Map<ExpenseCategoryId, number>();

  billableExpenses.forEach(expense => {
    const current = categoryMap.get(expense.category) ?? 0;
    categoryMap.set(expense.category, current + expense.tripAmount);

    const count = categoryCountMap.get(expense.category) ?? 0;
    categoryCountMap.set(expense.category, count + 1);
  });

  // Build category breakdown (sorted by amount)
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([categoryId, amount]) => ({
      categoryId,
      categoryLabel: getCategoryLabel(categoryId),
      totalAmount: amount,
      percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      expenseCount: categoryCountMap.get(categoryId) ?? 0
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Calculate per-person totals
  const personMap = new Map<string, { paid: number; owed: number }>();

  billableExpenses.forEach(expense => {
    // Track paid
    const paidData = personMap.get(expense.paidByMemberId) ?? { paid: 0, owed: 0 };
    paidData.paid += expense.tripAmount;
    personMap.set(expense.paidByMemberId, paidData);

    // Calculate owed shares
    const shares = calculateExpenseShares(expense);
    expense.involvedMemberIds.forEach(memberId => {
      const owedData = personMap.get(memberId) ?? { paid: 0, owed: 0 };
      owedData.owed += shares[memberId] ?? 0;
      personMap.set(memberId, owedData);
    });
  });

  // Build person breakdown
  const personBreakdown = Array.from(personMap.entries())
    .map(([memberId, data]) => ({
      memberId,
      memberName: members.find(m => m.id === memberId)?.displayName ?? "Unknown",
      totalPaid: data.paid,
      totalOwed: data.owed,
      netBalance: data.paid - data.owed
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid);

  return { totalSpend, categoryBreakdown, personBreakdown };
}
