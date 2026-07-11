import type { ExpenseDraft, Member } from "./domain";
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
        // Percentages are always out of 100, independent of currency minor units.
        const total = roundCurrency(
          Object.values(draft.splitShares).reduce((sum, v) => sum + v, 0)
        );
        if (Math.abs(total - 100) > 0.01) {
          errors.push(`Percentage shares must add up to 100% (currently ${total}%).`);
        }
      }

      if (draft.splitMode === "byAmount") {
        const total = roundCurrency(
          Object.values(draft.splitShares).reduce((sum, v) => sum + v, 0),
          draft.currencyCode
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

/**
 * Guard against adding/editing an expense that involves a member who has
 * already departed the trip.
 *
 * Early-departure settlements (see settleEarlyDeparture in settlement.ts)
 * are computed once, at the moment a member departs, and stored as final.
 * If a later expense pulls a departed member back in — either as the payer
 * or as one of the involved/split members — their stored settlement no
 * longer reflects reality: the residual either has to be silently dropped
 * (breaking the "transfers sum to zero" invariant) or the trip needs to be
 * re-settled for a member who's supposed to be done. We choose to block
 * this outright rather than silently produce an inconsistent settlement.
 *
 * Throws a plain Error with a message safe to surface directly to the user.
 * Historical expenses recorded before the member departed are unaffected —
 * this only guards new/edited expenses.
 */
export const assertNoDepartedMembersInExpense = (
  draft: { paidByMemberId: string; involvedMemberIds: string[] },
  members: Member[]
): void => {
  const departedMemberIds = new Set(
    members.filter((member) => member.status === "departed").map((member) => member.id)
  );

  if (departedMemberIds.size === 0) {
    return;
  }

  const offendingIds = [draft.paidByMemberId, ...draft.involvedMemberIds].filter((id) =>
    departedMemberIds.has(id)
  );

  if (offendingIds.length === 0) {
    return;
  }

  const offendingNames = [...new Set(offendingIds)]
    .map((id) => members.find((member) => member.id === id)?.displayName ?? id)
    .join(", ");

  throw new Error(
    `Can't save this expense: ${offendingNames} already departed and settled up on this trip. ` +
      `Ask the trip owner to have them rejoin before including them in an expense.`
  );
};
