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
      splitMode: "equal",
      splitShares: null,
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
      splitMode: "equal",
      splitShares: null,
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
      splitMode: "equal",
      splitShares: null,
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
      splitMode: "equal",
      splitShares: null,
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
      splitMode: "equal",
      splitShares: null,
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
    involvedMemberIds: [],
    splitMode: "equal",
    splitShares: null
  });

  expect(result.ok).toBe(false);

  if (result.ok) {
    throw new Error("Expected validation errors");
  }

  expect(result.errors.length).toBe(6);
});

test("settles expenses with byAmount split", () => {
  // Alice pays $100 for dinner, but Bob had the expensive steak ($60), Alice had $40
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
      paidByMemberId: "a",
      involvedMemberIds: ["a", "b"],
      splitMode: "byAmount",
      splitShares: { a: 40, b: 60 },
      createdAt: "2026-03-25T10:00:00.000Z"
    }
  ];

  const members: Member[] = [
    { id: "a", displayName: "Alice" },
    { id: "b", displayName: "Bob" }
  ];

  const settlement = settleTrip(expenses, members, [], "USD");

  expect(settlement.totalTripSpend).toBe(100);

  // Alice paid 100, owes 40 → net +60
  const alice = settlement.balances.find(
    (b) => b.entity.type === "member" && b.entity.memberId === "a"
  );
  expect(alice!.paid).toBe(100);
  expect(alice!.owed).toBe(40);
  expect(alice!.net).toBe(60);

  // Bob paid 0, owes 60 → net -60
  const bob = settlement.balances.find(
    (b) => b.entity.type === "member" && b.entity.memberId === "b"
  );
  expect(bob!.paid).toBe(0);
  expect(bob!.owed).toBe(60);
  expect(bob!.net).toBe(-60);

  // One transfer: Bob pays Alice $60
  expect(settlement.transfers).toEqual([
    {
      fromEntity: { type: "member", memberId: "b" },
      toEntity: { type: "member", memberId: "a" },
      amount: 60,
      currencyCode: "USD",
      fromDisplayName: "Bob",
      toDisplayName: "Alice"
    }
  ]);
});

test("settles expenses with byPercentage split", () => {
  // Charlie pays $200 for a hotel room, split 60/25/15
  const expenses: Expense[] = [
    {
      id: "1",
      tripId: "trip",
      expenseDate: "2026-03-25",
      amount: 200,
      currencyCode: "USD",
      conversionRateToTripCurrency: 1,
      tripAmount: 200,
      category: "lodging",
      paidByMemberId: "c",
      involvedMemberIds: ["a", "b", "c"],
      splitMode: "byPercentage",
      splitShares: { a: 25, b: 15, c: 60 },
      createdAt: "2026-03-25T10:00:00.000Z"
    }
  ];

  const members: Member[] = [
    { id: "a", displayName: "Alice" },
    { id: "b", displayName: "Bob" },
    { id: "c", displayName: "Charlie" }
  ];

  const settlement = settleTrip(expenses, members, [], "USD");

  expect(settlement.totalTripSpend).toBe(200);

  // Charlie paid 200, owes 60% = 120 → net +80
  const charlie = settlement.balances.find(
    (b) => b.entity.type === "member" && b.entity.memberId === "c"
  );
  expect(charlie!.paid).toBe(200);
  expect(charlie!.owed).toBe(120);
  expect(charlie!.net).toBe(80);

  // Alice paid 0, owes 25% = 50 → net -50
  const alice = settlement.balances.find(
    (b) => b.entity.type === "member" && b.entity.memberId === "a"
  );
  expect(alice!.owed).toBe(50);
  expect(alice!.net).toBe(-50);

  // Bob paid 0, owes 15% = 30 → net -30
  const bob = settlement.balances.find(
    (b) => b.entity.type === "member" && b.entity.memberId === "b"
  );
  expect(bob!.owed).toBe(30);
  expect(bob!.net).toBe(-30);

  // Two transfers: Alice→Charlie $50, Bob→Charlie $30
  expect(settlement.transfers.length).toBe(2);
  expect(settlement.transfers[0].amount).toBe(50);
  expect(settlement.transfers[1].amount).toBe(30);
});

test("validates byAmount shares must sum to expense total", () => {
  const result = validateExpenseDraft({
    expenseDate: "2026-03-25",
    amount: 100,
    currencyCode: "USD",
    category: "food",
    paidByMemberId: "a",
    involvedMemberIds: ["a", "b"],
    splitMode: "byAmount",
    splitShares: { a: 40, b: 50 }
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.some((e) => e.includes("add up to the expense total"))).toBe(true);
  }
});

test("validates byPercentage shares must sum to 100", () => {
  const result = validateExpenseDraft({
    expenseDate: "2026-03-25",
    amount: 100,
    currencyCode: "USD",
    category: "food",
    paidByMemberId: "a",
    involvedMemberIds: ["a", "b"],
    splitMode: "byPercentage",
    splitShares: { a: 40, b: 50 }
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.some((e) => e.includes("100%"))).toBe(true);
  }
});

test("validates custom split requires shares for all members", () => {
  const result = validateExpenseDraft({
    expenseDate: "2026-03-25",
    amount: 100,
    currencyCode: "USD",
    category: "food",
    paidByMemberId: "a",
    involvedMemberIds: ["a", "b", "c"],
    splitMode: "byAmount",
    splitShares: { a: 50, b: 50 }
  });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.some((e) => e.includes("Every involved member"))).toBe(true);
  }
});
