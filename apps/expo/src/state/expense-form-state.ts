import { PRESET_CATEGORIES } from "@splitsy/domain";
import type { Expense, ExpenseCategoryId, ExpenseDraft, Member, MemberGroup, SplitMode } from "@splitsy/domain";

import type { ExpenseDefaults } from "../lib/expense-defaults";

// ZKU-60: Pure, framework-free state helpers for the expense add/edit form.
// Kept separate from useExpenseFormState (the React hook that wires these into
// useState) so the core form logic — building a draft, toggling member/group
// selection, computing which members should show as chips — can be unit
// tested without rendering React Native components.

export type ExpenseFormValues = {
  amount: string;
  expenseDate: string;
  currencyCode: string;
  category: ExpenseCategoryId;
  customCategory: string;
  note: string;
  paidByMemberId: string;
  selectedMembers: string[];
  splitMode: SplitMode;
  splitShares: Record<string, string>;
};

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Values for a fresh "add expense" form — seeded from the trip's remembered defaults. */
export function createBlankFormValues(options: {
  tripCurrencyCode: string;
  defaults: ExpenseDefaults | null;
  activeMembers: Member[];
}): ExpenseFormValues {
  const { tripCurrencyCode, defaults, activeMembers } = options;

  return {
    amount: "",
    expenseDate: todayIsoDate(),
    currencyCode: tripCurrencyCode,
    category: defaults?.category ?? PRESET_CATEGORIES[0].id,
    customCategory: "",
    note: "",
    paidByMemberId: defaults?.paidByMemberId ?? activeMembers[0]?.id ?? "",
    selectedMembers: defaults?.involvedMemberIds ?? activeMembers.map((member) => member.id),
    splitMode: defaults?.splitMode ?? "equal",
    splitShares: {}
  };
}

/** Values for editing an existing expense — mirrors the expense's stored fields. */
export function createFormValuesFromExpense(expense: Expense): ExpenseFormValues {
  return {
    amount: String(expense.amount),
    expenseDate: expense.expenseDate,
    currencyCode: expense.currencyCode,
    category: expense.category,
    customCategory: expense.customCategory ?? "",
    note: expense.note ?? "",
    paidByMemberId: expense.paidByMemberId,
    selectedMembers: expense.involvedMemberIds,
    splitMode: expense.splitMode ?? "equal",
    splitShares: expense.splitShares
      ? Object.fromEntries(Object.entries(expense.splitShares).map(([k, v]) => [k, String(v)]))
      : {}
  };
}

export function toggleMemberSelection(selectedMembers: string[], memberId: string): string[] {
  return selectedMembers.includes(memberId)
    ? selectedMembers.filter((id) => id !== memberId)
    : [...selectedMembers, memberId];
}

export function isGroupFullySelected(selectedMembers: string[], group: MemberGroup): boolean {
  return group.memberIds.every((id) => selectedMembers.includes(id));
}

export function toggleGroupSelection(selectedMembers: string[], group: MemberGroup): string[] {
  const allSelected = isGroupFullySelected(selectedMembers, group);

  if (allSelected) {
    return selectedMembers.filter((id) => !group.memberIds.includes(id));
  }

  const newMembers = group.memberIds.filter((id) => !selectedMembers.includes(id));
  return [...selectedMembers, ...newMembers];
}

/**
 * Members eligible to show as chips in the form: active members, plus any
 * (removed/departed) member who is already selected as payer or participant —
 * e.g. when editing an old expense that involved someone no longer active.
 */
export function computeExpenseFormMembers(
  members: Member[],
  paidByMemberId: string,
  selectedMembers: string[]
): Member[] {
  return members.filter(
    (member) =>
      (member.status ?? "active") === "active" ||
      member.id === paidByMemberId ||
      selectedMembers.includes(member.id)
  );
}

export function buildExpenseDraft(values: ExpenseFormValues): ExpenseDraft {
  const numericAmount = Number(values.amount);
  const numericShares: Record<string, number> | null =
    values.splitMode !== "equal"
      ? Object.fromEntries(values.selectedMembers.map((id) => [id, Number(values.splitShares[id] || 0)]))
      : null;

  return {
    expenseDate: values.expenseDate,
    amount: numericAmount,
    currencyCode: values.currencyCode.toUpperCase(),
    category: values.category,
    customCategory: values.customCategory,
    note: values.note,
    paidByMemberId: values.paidByMemberId,
    involvedMemberIds: values.selectedMembers,
    splitMode: values.splitMode,
    splitShares: numericShares
  };
}

export function splitShareTotal(splitShares: Record<string, string>): number {
  return Object.values(splitShares).reduce((sum, value) => sum + (Number(value) || 0), 0);
}
