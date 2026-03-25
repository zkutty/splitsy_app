import { expect, test } from "bun:test";

import type { Expense } from "./domain";
import { settleTrip } from "./settlement";
import { validateExpenseDraft } from "./validation";

test("settles equal split expenses into minimized transfers", () => {
  const expenses: Expense[] = [
    {
      id: "1",
      tripId: "trip",
      amount: 90,
      currencyCode: "EUR",
      conversionRateToTripCurrency: 1,
      tripAmount: 90,
      category: "food",
      paidByMemberId: "a",
      involvedMemberIds: ["a", "b", "c"],
      createdAt: "2026-03-25T10:00:00.000Z"
    },
    {
      id: "2",
      tripId: "trip",
      amount: 60,
      currencyCode: "USD",
      conversionRateToTripCurrency: 0.9,
      tripAmount: 54,
      category: "transport",
      paidByMemberId: "b",
      involvedMemberIds: ["a", "b"],
      createdAt: "2026-03-25T10:05:00.000Z"
    }
  ];

  const settlement = settleTrip(expenses, ["a", "b", "c"], "EUR");

  expect(settlement.totalTripSpend).toBe(144);
  expect(settlement.transfers).toEqual([
    {
      fromMemberId: "c",
      toMemberId: "a",
      amount: 30,
      currencyCode: "EUR"
    },
    {
      fromMemberId: "b",
      toMemberId: "a",
      amount: 3,
      currencyCode: "EUR"
    }
  ]);
});

test("validates required expense draft fields", () => {
  const result = validateExpenseDraft({
    amount: 0,
    currencyCode: "EU",
    category: "custom",
    customCategory: "",
    note: "",
    paidByMemberId: "",
    involvedMemberIds: []
  });

  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error("Expected validation errors");
  }

  expect(result.errors.length).toBe(5);
});
