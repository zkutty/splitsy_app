import { expect, test } from "bun:test";

import type { Expense, Member } from "./domain";
import { settleTrip } from "./settlement";
import { validateExpenseDraft } from "./validation";

test("settles equal split expenses into minimized transfers", () => {
  const expenses: Expense[] = [
    {
      id: "1",
      tripId: "trip",
      expenseDate: "2026-03-25",
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
      expenseDate: "2026-03-25",
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

  const members: Member[] = [
    { id: "a", displayName: "Alice" },
    { id: "b", displayName: "Bob" },
    { id: "c", displayName: "Charlie" }
  ];

  const settlement = settleTrip(expenses, members, [], "EUR");

  expect(settlement.totalTripSpend).toBe(144);
  expect(settlement.transfers).toEqual([
    {
      fromEntity: { type: "member", memberId: "c" },
      toEntity: { type: "member", memberId: "a" },
      amount: 30,
      currencyCode: "EUR",
      fromDisplayName: "Charlie",
      toDisplayName: "Alice"
    },
    {
      fromEntity: { type: "member", memberId: "b" },
      toEntity: { type: "member", memberId: "a" },
      amount: 3,
      currencyCode: "EUR",
      fromDisplayName: "Bob",
      toDisplayName: "Alice"
    }
  ]);
});

test("settles expenses with groups", () => {
  const expenses: Expense[] = [
    {
      id: "1",
      tripId: "trip",
      expenseDate: "2026-03-25",
      amount: 100,
      currencyCode: "USD",
      conversionRateToTripCurrency: 1,
      tripAmount: 100,
      category: "food",
      paidByMemberId: "alice",
      involvedMemberIds: ["alice", "bob", "charlie", "dave"],
      createdAt: "2026-03-25T10:00:00.000Z"
    },
    {
      id: "2",
      tripId: "trip",
      expenseDate: "2026-03-25",
      amount: 80,
      currencyCode: "USD",
      conversionRateToTripCurrency: 1,
      tripAmount: 80,
      category: "transport",
      paidByMemberId: "charlie",
      involvedMemberIds: ["alice", "charlie", "dave"],
      createdAt: "2026-03-25T10:05:00.000Z"
    },
    {
      id: "3",
      tripId: "trip",
      expenseDate: "2026-03-25",
      amount: 60,
      currencyCode: "USD",
      conversionRateToTripCurrency: 1,
      tripAmount: 60,
      category: "activities",
      paidByMemberId: "bob",
      involvedMemberIds: ["alice", "bob"],
      createdAt: "2026-03-25T10:10:00.000Z"
    }
  ];

  const members: Member[] = [
    { id: "alice", displayName: "Alice", groupId: "family1" },
    { id: "bob", displayName: "Bob", groupId: "family1" },
    { id: "charlie", displayName: "Charlie", groupId: "family2" },
    { id: "dave", displayName: "Dave", groupId: "family2" }
  ];

  const groups = [
    { id: "family1", name: "Smith Family", memberIds: ["alice", "bob"] },
    { id: "family2", name: "Jones Family", memberIds: ["charlie", "dave"] }
  ];

  const settlement = settleTrip(expenses, members, groups, "USD");

  expect(settlement.totalTripSpend).toBe(240);
  expect(settlement.balances.length).toBe(2); // Two groups, not four individuals

  // Find the group balances
  const smithFamily = settlement.balances.find(b => b.isGroup && b.displayName === "Smith Family");
  const jonesFamily = settlement.balances.find(b => b.isGroup && b.displayName === "Jones Family");

  expect(smithFamily).toBeDefined();
  expect(jonesFamily).toBeDefined();

  // Smith Family: Alice paid $100, owes $81.67; Bob paid $60, owes $55 → Total: paid $160, owes $136.67 → net +$23.33
  expect(smithFamily!.paid).toBe(160);
  expect(smithFamily!.owed).toBeCloseTo(136.67, 1);
  expect(smithFamily!.net).toBeCloseTo(23.33, 1);

  // Jones Family: Charlie paid $80, owes $53.33; Dave paid $0, owes $50 → Total: paid $80, owes $103.33 → net -$23.33
  expect(jonesFamily!.paid).toBe(80);
  expect(jonesFamily!.owed).toBeCloseTo(103.33, 1);
  expect(jonesFamily!.net).toBeCloseTo(-23.33, 1);

  // Should have one transfer from Jones to Smith
  expect(settlement.transfers.length).toBe(1);
  expect(settlement.transfers[0]).toEqual({
    fromEntity: { type: "group", groupId: "family2" },
    toEntity: { type: "group", groupId: "family1" },
    amount: expect.closeTo(23.33, 1),
    currencyCode: "USD",
    fromDisplayName: "Jones Family",
    toDisplayName: "Smith Family"
  });
});

test("validates required expense draft fields", () => {
  const result = validateExpenseDraft({
    expenseDate: "",
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

  expect(result.errors.length).toBe(6);
});
