import { useCallback, useEffect, useState } from "react";
import type { Expense, Member, MemberGroup, SplitMode } from "@splitsy/domain";

import { loadExpenseDefaults } from "../lib/expense-defaults";
import {
  type ExpenseFormValues,
  computeExpenseFormMembers,
  createBlankFormValues,
  createFormValuesFromExpense,
  isGroupFullySelected,
  toggleGroupSelection,
  toggleMemberSelection
} from "./expense-form-state";

export type UseExpenseFormStateOptions = {
  tripId: string;
  tripCurrencyCode: string;
  /** Whether the form is currently shown — fields (re)initialize whenever this flips to true. */
  visible: boolean;
  /** The expense being edited, or null when adding a new one. */
  editingExpense: Expense | null;
  /** All trip members (active + inactive) — used so an inactive member already on the expense still shows. */
  members: Member[];
  /** Active members only — used to seed defaults for a fresh "add expense" form. */
  activeMembers: Member[];
};

/**
 * Owns the expense add/edit form's field state. Initialization/reset logic is
 * delegated to the pure helpers in ./expense-form-state so it can be tested
 * without rendering this hook.
 */
export function useExpenseFormState({
  tripId,
  tripCurrencyCode,
  visible,
  editingExpense,
  members,
  activeMembers
}: UseExpenseFormStateOptions) {
  const [values, setValues] = useState<ExpenseFormValues>(() =>
    createBlankFormValues({ tripCurrencyCode, defaults: loadExpenseDefaults(tripId), activeMembers })
  );
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (editingExpense) {
      setValues(createFormValuesFromExpense(editingExpense));
    } else {
      setValues(
        createBlankFormValues({ tripCurrencyCode, defaults: loadExpenseDefaults(tripId), activeMembers })
      );
    }
    setErrors([]);
    // Intentionally only re-run when the form opens or the expense being edited changes —
    // not on every activeMembers/tripCurrencyCode change, to avoid clobbering in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editingExpense?.id]);

  const setField = useCallback(
    <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const toggleMember = useCallback((memberId: string) => {
    setValues((current) => ({
      ...current,
      selectedMembers: toggleMemberSelection(current.selectedMembers, memberId)
    }));
  }, []);

  const toggleGroup = useCallback((group: MemberGroup) => {
    setValues((current) => ({
      ...current,
      selectedMembers: toggleGroupSelection(current.selectedMembers, group)
    }));
  }, []);

  const isGroupSelected = useCallback(
    (group: MemberGroup) => isGroupFullySelected(values.selectedMembers, group),
    [values.selectedMembers]
  );

  const setSplitMode = useCallback((mode: SplitMode) => {
    setValues((current) => ({
      ...current,
      splitMode: mode,
      splitShares: mode === "equal" ? {} : current.splitShares
    }));
  }, []);

  const setSplitShare = useCallback((memberId: string, share: string) => {
    setValues((current) => ({
      ...current,
      splitShares: { ...current.splitShares, [memberId]: share }
    }));
  }, []);

  /** Clears the fields that shouldn't carry over after a successful "add expense" save. */
  const resetAfterAdd = useCallback(() => {
    setValues((current) => ({
      ...current,
      amount: "",
      note: "",
      customCategory: "",
      splitShares: {}
    }));
    setErrors([]);
  }, []);

  const expenseFormMembers = computeExpenseFormMembers(members, values.paidByMemberId, values.selectedMembers);

  return {
    values,
    errors,
    setErrors,
    setField,
    toggleMember,
    toggleGroup,
    isGroupSelected,
    setSplitMode,
    setSplitShare,
    resetAfterAdd,
    expenseFormMembers
  };
}
