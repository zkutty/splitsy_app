import type { ExpenseDraft } from "./domain";

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      errors: string[];
    };

export const validateExpenseDraft = (draft: ExpenseDraft): ValidationResult => {
  const errors: string[] = [];

  if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
    errors.push("Amount must be greater than zero.");
  }

  if (!draft.currencyCode || draft.currencyCode.trim().length !== 3) {
    errors.push("Currency code must be a 3-letter ISO code.");
  }

  if (!draft.paidByMemberId) {
    errors.push("Payer is required.");
  }

  if (draft.involvedMemberIds.length === 0) {
    errors.push("At least one involved member is required.");
  }

  if (draft.category === "custom" && !draft.customCategory?.trim()) {
    errors.push("Custom category label is required.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
};

