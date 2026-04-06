import type { ExpenseCategoryId, SplitMode } from "@splitsy/domain";

export type ExpenseDefaults = {
  paidByMemberId: string;
  involvedMemberIds: string[];
  splitMode: SplitMode;
  category: ExpenseCategoryId;
};

const STORAGE_KEY_PREFIX = "__splittrip_expense_defaults_";

function storageKey(tripId: string): string {
  return `${STORAGE_KEY_PREFIX}${tripId}__`;
}

export function saveExpenseDefaults(tripId: string, defaults: ExpenseDefaults): void {
  try {
    window.localStorage.setItem(storageKey(tripId), JSON.stringify(defaults));
  } catch {
    // localStorage unavailable (native) — silently ignore
  }
}

export function loadExpenseDefaults(tripId: string): ExpenseDefaults | null {
  try {
    const raw = window.localStorage.getItem(storageKey(tripId));
    if (!raw) return null;
    return JSON.parse(raw) as ExpenseDefaults;
  } catch {
    return null;
  }
}
