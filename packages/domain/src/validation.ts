import type { ExpenseDraft } from "./domain";
import { roundCurrency } from "./money";

export type ValidationResult =
  | { ok: true }
  | {
      ok: false;
      errors: string[];
    };

export const validateExpenseDraft = (draft: ExpenseDraft): ValidationResult => {
  const errors: string[] = [];
  const isIsoDate = /^\d{4}-\d{2}-\d{2}$/;

  if (!draft.expenseDate || !isIsoDate.test(draft.expenseDate)) {
    errors.push("Expense date must use YYYY-MM-DD.");
  }

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

  // Validate split mode and shares
  if (draft.splitMode === "byAmount" || draft.splitMode === "byPercentage") {
    if (!draft.splitShares || Object.keys(draft.splitShares).length === 0) {
      errors.push("Split shares are required for custom splits.");
    } else {
      // Every involved member must have a share
      const missingMembers = draft.involvedMemberIds.filter(
        (id) => draft.splitShares![id] == null
      );
      if (missingMembers.length > 0) {
        errors.push("Every involved member must have a split share.");
      }

      // All shares must be positive
      const hasNegative = Object.values(draft.splitShares).some((v) => v < 0);
      if (hasNegative) {
        errors.push("Split shares cannot be negative.");
      }

      if (draft.splitMode === "byPercentage") {
        const total = roundCurrency(
          Object.values(draft.splitShares).reduce((sum, v) => sum + v, 0)
        );
        if (Math.abs(total - 100) > 0.01) {
          errors.push(`Percentage shares must add up to 100% (currently ${total}%).`);
        }
      }

      if (draft.splitMode === "byAmount") {
        const total = roundCurrency(
          Object.values(draft.splitShares).reduce((sum, v) => sum + v, 0)
        );
        if (Math.abs(total - draft.amount) > 0.01) {
          errors.push(
            `Amount shares must add up to the expense total (${draft.amount}). Currently ${total}.`
          );
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
};
