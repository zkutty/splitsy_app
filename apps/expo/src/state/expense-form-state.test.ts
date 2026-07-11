import { expect, test } from "bun:test";

import type { Expense, Member, MemberGroup } from "@splitsy/domain";

import {
  buildExpenseDraft,
  computeExpenseFormMembers,
  createBlankFormValues,
  createFormValuesFromExpense,
  isGroupFullySelected,
  splitShareTotal,
  toggleGroupSelection,
  toggleMemberSelection,
  type ExpenseFormValues
} from "./expense-form-state";

// ZKU-60: Unit tests for the pure logic extracted out of trip/[tripId].tsx's
// expense form. These exercise the form's core state transitions and
// validation-adjacent helpers directly, without rendering React Native
// components.

const alice: Member = { id: "m1", displayName: "Alice", status: "active" };
const bob: Member = { id: "m2", displayName: "Bob", status: "active" };
const carol: Member = { id: "m3", displayName: "Carol", status: "removed" };

function baseValues(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    amount: "48.00",
    expenseDate: "2026-07-01",
    currencyCode: "usd",
    category: "food",
    customCategory: "",
    note: "Dinner",
    paidByMemberId: "m1",
    selectedMembers: ["m1", "m2"],
    splitMode: "equal",
    splitShares: {},
    ...overrides
  };
}

test("createBlankFormValues: seeds from remembered defaults when present", () => {
  const values = createBlankFormValues({
    tripCurrencyCode: "USD",
    defaults: {
      paidByMemberId: "m2",
      involvedMemberIds: ["m2"],
      splitMode: "byAmount",
      category: "transport"
    },
    activeMembers: [alice, bob]
  });

  expect(values.amount).toBe("");
  expect(values.currencyCode).toBe("USD");
  expect(values.paidByMemberId).toBe("m2");
  expect(values.selectedMembers).toEqual(["m2"]);
  expect(values.splitMode).toBe("byAmount");
  expect(values.category).toBe("transport");
  expect(values.splitShares).toEqual({});
});

test("createBlankFormValues: falls back to first active member and 'equal' split with no defaults", () => {
  const values = createBlankFormValues({
    tripCurrencyCode: "EUR",
    defaults: null,
    activeMembers: [alice, bob]
  });

  expect(values.paidByMemberId).toBe("m1");
  expect(values.selectedMembers).toEqual(["m1", "m2"]);
  expect(values.splitMode).toBe("equal");
  expect(values.category).toBe("lodging"); // PRESET_CATEGORIES[0].id
});

test("createBlankFormValues: handles no active members gracefully", () => {
  const values = createBlankFormValues({ tripCurrencyCode: "USD", defaults: null, activeMembers: [] });

  expect(values.paidByMemberId).toBe("");
  expect(values.selectedMembers).toEqual([]);
});

test("createFormValuesFromExpense: maps an existing expense's fields, including numeric splitShares to strings", () => {
  const expense: Expense = {
    id: "e1",
    tripId: "t1",
    expenseDate: "2026-06-01",
    amount: 100,
    currencyCode: "USD",
    conversionRateToTripCurrency: 1,
    tripAmount: 100,
    category: "custom",
    customCategory: "Tickets",
    note: "Museum",
    paidByMemberId: "m1",
    involvedMemberIds: ["m1", "m2"],
    splitMode: "byPercentage",
    splitShares: { m1: 60, m2: 40 },
    createdAt: "2026-06-01T00:00:00Z"
  };

  const values = createFormValuesFromExpense(expense);

  expect(values.amount).toBe("100");
  expect(values.customCategory).toBe("Tickets");
  expect(values.splitMode).toBe("byPercentage");
  expect(values.splitShares).toEqual({ m1: "60", m2: "40" });
});

test("createFormValuesFromExpense: defaults splitMode to 'equal' and splitShares to {} when absent", () => {
  const expense: Expense = {
    id: "e2",
    tripId: "t1",
    expenseDate: "2026-06-01",
    amount: 20,
    currencyCode: "USD",
    conversionRateToTripCurrency: 1,
    tripAmount: 20,
    category: "food",
    paidByMemberId: "m1",
    involvedMemberIds: ["m1"],
    splitMode: undefined as any,
    createdAt: "2026-06-01T00:00:00Z"
  };

  const values = createFormValuesFromExpense(expense);

  expect(values.splitMode).toBe("equal");
  expect(values.splitShares).toEqual({});
});

test("toggleMemberSelection: adds an unselected member and removes a selected one", () => {
  expect(toggleMemberSelection(["m1"], "m2")).toEqual(["m1", "m2"]);
  expect(toggleMemberSelection(["m1", "m2"], "m1")).toEqual(["m2"]);
});

test("isGroupFullySelected / toggleGroupSelection: selects and deselects every member in the group", () => {
  const group: MemberGroup = { id: "g1", name: "Family", memberIds: ["m1", "m2"] };

  expect(isGroupFullySelected([], group)).toBe(false);
  expect(isGroupFullySelected(["m1", "m2"], group)).toBe(true);

  const selectedAfterToggleOn = toggleGroupSelection(["m3"], group);
  expect(selectedAfterToggleOn.sort()).toEqual(["m1", "m2", "m3"].sort());

  const selectedAfterToggleOff = toggleGroupSelection(["m1", "m2", "m3"], group);
  expect(selectedAfterToggleOff).toEqual(["m3"]);
});

test("computeExpenseFormMembers: includes active members plus any inactive member already selected", () => {
  const members = [alice, bob, carol];

  expect(computeExpenseFormMembers(members, "m1", ["m1"])).toEqual([alice, bob]);
  // Carol is removed but is the payer on an older expense being edited — still shown.
  expect(computeExpenseFormMembers(members, "m3", ["m1"])).toEqual([alice, bob, carol]);
  // Carol is removed but is a selected participant — still shown.
  expect(computeExpenseFormMembers(members, "m1", ["m1", "m3"])).toEqual([alice, bob, carol]);
});

test("buildExpenseDraft: equal split omits splitShares and uppercases currency", () => {
  const draft = buildExpenseDraft(baseValues());

  expect(draft.amount).toBe(48);
  expect(draft.currencyCode).toBe("USD");
  expect(draft.splitShares).toBeNull();
  expect(draft.involvedMemberIds).toEqual(["m1", "m2"]);
});

test("buildExpenseDraft: non-equal split converts string shares to numbers, defaulting blanks to 0", () => {
  const draft = buildExpenseDraft(
    baseValues({ splitMode: "byAmount", splitShares: { m1: "30", m2: "" } })
  );

  expect(draft.splitShares).toEqual({ m1: 30, m2: 0 });
});

test("buildExpenseDraft: non-numeric amount becomes NaN (left for domain validation to reject)", () => {
  const draft = buildExpenseDraft(baseValues({ amount: "not-a-number" }));

  expect(Number.isNaN(draft.amount)).toBe(true);
});

test("splitShareTotal: sums numeric shares and ignores unparsable values", () => {
  expect(splitShareTotal({ m1: "30", m2: "20" })).toBe(50);
  expect(splitShareTotal({ m1: "abc", m2: "10" })).toBe(10);
  expect(splitShareTotal({})).toBe(0);
});
