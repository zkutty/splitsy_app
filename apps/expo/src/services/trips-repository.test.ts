import { beforeEach, describe, expect, test } from "bun:test";

import { SAMPLE_TRIP } from "@splitsy/domain";

import { createTripsRepository, demoOwnerProfile, type AddExpenseInput, type TripsRepository } from "./trips-repository";

// ---------------------------------------------------------------------------
// ZKU-58: unit tests for the demo (in-memory) trips repository.
//
// createTripsRepository() picks demoRepository() vs supabaseRepository()
// based on hasSupabaseConfig, which is derived from
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Neither is set in
// the test environment (no .env file is checked in), so this always
// exercises the pure, in-memory demo repository — no network/mocking needed.
//
// Each test creates a fresh repository via createTripsRepository() so the
// demo module's closure-local state (trips/expenses/invites/groups) never
// leaks between tests.
// ---------------------------------------------------------------------------

const TRIP_ID = SAMPLE_TRIP.id;

function makeExpenseDraft(overrides: Partial<AddExpenseInput> = {}): AddExpenseInput {
  return {
    expenseDate: "2026-05-10",
    amount: 100,
    currencyCode: "EUR",
    category: "food",
    customCategory: null,
    note: "Dinner",
    paidByMemberId: "mia",
    involvedMemberIds: ["mia", "leo"],
    splitMode: "equal",
    splitShares: null,
    conversionRateToTripCurrency: 1,
    tripAmount: 100,
    ...overrides
  };
}

let repo: TripsRepository;

beforeEach(() => {
  repo = createTripsRepository();
});

describe("createTripsRepository", () => {
  test("resolves to the demo repository when Supabase is not configured in this environment", async () => {
    const trips = await repo.listTrips();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe(TRIP_ID);
  });

  test("demoOwnerProfile matches the demo sample user", async () => {
    expect(demoOwnerProfile.id).toBe("mia");
  });
});

describe("trip invites", () => {
  test("createTripInvite creates a pending invite with no max uses by default", async () => {
    const token = await repo.createTripInvite(TRIP_ID);
    expect(typeof token).toBe("string");

    const invites = await repo.listTripInvites(TRIP_ID);
    expect(invites).toHaveLength(1);
    expect(invites[0].token).toBe(token);
    expect(invites[0].status).toBe("pending");
    expect(invites[0].maxUses).toBeNull();
    expect(invites[0].useCount).toBe(0);
  });

  test("createTripInvite respects an explicit max-uses cap", async () => {
    await repo.createTripInvite(TRIP_ID, 2);
    const invites = await repo.listTripInvites(TRIP_ID);
    expect(invites[0].maxUses).toBe(2);
  });

  test("listTripInvites only returns invites for the given trip", async () => {
    await repo.createTripInvite(TRIP_ID);
    const invitesForOtherTrip = await repo.listTripInvites("some_other_trip");
    expect(invitesForOtherTrip).toHaveLength(0);
  });

  test("revokeTripInvite marks the invite as revoked", async () => {
    const token = await repo.createTripInvite(TRIP_ID);
    const [invite] = await repo.listTripInvites(TRIP_ID);

    await repo.revokeTripInvite(invite.id);

    const [revoked] = await repo.listTripInvites(TRIP_ID);
    expect(revoked.status).toBe("revoked");
    expect(revoked.token).toBe(token);
  });

  test("acceptTripInvite rejects an unknown token", async () => {
    await expect(repo.acceptTripInvite("does-not-exist")).rejects.toThrow(
      "Invite link is invalid or has expired."
    );
  });

  test("acceptTripInvite rejects a revoked invite", async () => {
    const token = await repo.createTripInvite(TRIP_ID);
    const [invite] = await repo.listTripInvites(TRIP_ID);
    await repo.revokeTripInvite(invite.id);

    await expect(repo.acceptTripInvite(token)).rejects.toThrow(
      "Invite link is invalid or has expired."
    );
  });

  test("acceptTripInvite succeeds for a pending invite and increments useCount", async () => {
    const token = await repo.createTripInvite(TRIP_ID);

    const returnedTripId = await repo.acceptTripInvite(token);
    expect(returnedTripId).toBe(TRIP_ID);

    const [invite] = await repo.listTripInvites(TRIP_ID);
    expect(invite.useCount).toBe(1);
  });

  test("acceptTripInvite enforces the max-uses cap", async () => {
    const token = await repo.createTripInvite(TRIP_ID, 1);

    await repo.acceptTripInvite(token);

    await expect(repo.acceptTripInvite(token)).rejects.toThrow(
      "This invite link has reached its maximum number of uses."
    );
  });
});

describe("expense CRUD", () => {
  test("createExpense adds a new expense that is returned by listExpenses", async () => {
    const draft = makeExpenseDraft();
    const created = await repo.createExpense(TRIP_ID, draft);

    expect(created.tripId).toBe(TRIP_ID);
    expect(created.amount).toBe(100);
    expect(created.paidByMemberId).toBe("mia");

    const expenses = await repo.listExpenses(TRIP_ID);
    expect(expenses.some((expense) => expense.id === created.id)).toBe(true);
  });

  test("createExpense defaults splitMode to 'equal' and splitShares to null when omitted", async () => {
    const draft = makeExpenseDraft({ splitMode: undefined as unknown as AddExpenseInput["splitMode"] });
    const created = await repo.createExpense(TRIP_ID, draft);
    expect(created.splitMode).toBe("equal");
    expect(created.splitShares).toBeNull();
  });

  test("listExpenses only returns expenses for the given trip", async () => {
    await repo.createExpense(TRIP_ID, makeExpenseDraft());
    const expensesForOtherTrip = await repo.listExpenses("some_other_trip");
    expect(expensesForOtherTrip).toHaveLength(0);
  });

  test("updateExpense modifies an existing expense in place", async () => {
    const created = await repo.createExpense(TRIP_ID, makeExpenseDraft());

    const updated = await repo.updateExpense(
      created.id,
      TRIP_ID,
      makeExpenseDraft({ amount: 250, note: "Updated note" })
    );

    expect(updated.id).toBe(created.id);
    expect(updated.amount).toBe(250);
    expect(updated.note).toBe("Updated note");

    const expenses = await repo.listExpenses(TRIP_ID);
    const found = expenses.find((expense) => expense.id === created.id);
    expect(found?.amount).toBe(250);
  });

  test("updateExpense throws when the expense does not exist", async () => {
    await expect(
      repo.updateExpense("does-not-exist", TRIP_ID, makeExpenseDraft())
    ).rejects.toThrow("Expense not found");
  });

  test("deleteExpense removes the expense", async () => {
    const created = await repo.createExpense(TRIP_ID, makeExpenseDraft());
    await repo.deleteExpense(created.id);

    const expenses = await repo.listExpenses(TRIP_ID);
    expect(expenses.some((expense) => expense.id === created.id)).toBe(false);
  });
});

describe("completeTrip", () => {
  test("marks the trip 'settled' immediately when there are no outstanding transfers", async () => {
    const { trip, transfers } = await repo.completeTrip(TRIP_ID, []);
    expect(trip.status).toBe("settled");
    expect(trip.settledAt).not.toBeNull();
    expect(transfers).toHaveLength(0);
  });

  test("marks the trip 'completed' (not yet settled) when there are outstanding transfers", async () => {
    const { trip, transfers } = await repo.completeTrip(TRIP_ID, [
      {
        fromEntity: { type: "member", memberId: "leo" },
        toEntity: { type: "member", memberId: "mia" },
        amount: 50,
        currencyCode: "EUR",
        fromDisplayName: "Leo",
        toDisplayName: "Mia"
      }
    ]);

    expect(trip.status).toBe("completed");
    expect(trip.settledAt).toBeNull();
    expect(transfers).toHaveLength(1);
    // Regression coverage: persisted transfers must carry a settlementType so
    // they satisfy the TripSettlementTransfer type and downstream UI (e.g.
    // early-departure vs. trip-completion badges) can distinguish them.
    expect(transfers[0].settlementType).toBe("trip_completion");
    expect(transfers[0].status).toBe("pending");
  });

  test("throws when the trip does not exist", async () => {
    await expect(repo.completeTrip("does-not-exist", [])).rejects.toThrow("Trip not found");
  });

  test("throws when the trip has already been completed", async () => {
    await repo.completeTrip(TRIP_ID, []);
    await expect(repo.completeTrip(TRIP_ID, [])).rejects.toThrow(
      "This trip has already been completed."
    );
  });
});

describe("settlement transfer lifecycle", () => {
  async function completeWithOneTransfer() {
    const { transfers } = await repo.completeTrip(TRIP_ID, [
      {
        fromEntity: { type: "member", memberId: "leo" },
        toEntity: { type: "member", memberId: "mia" },
        amount: 50,
        currencyCode: "EUR",
        fromDisplayName: "Leo",
        toDisplayName: "Mia"
      }
    ]);
    return transfers[0];
  }

  test("markSettlementTransferPaid transitions a pending transfer to paid", async () => {
    const transfer = await completeWithOneTransfer();

    const updated = await repo.markSettlementTransferPaid(transfer.id);
    expect(updated.status).toBe("paid");
    expect(updated.paidMarkedAt).not.toBeNull();
    expect(updated.paidMarkedByUserId).toBe(demoOwnerProfile.id);
  });

  test("markSettlementTransferPaid rejects a transfer that is not pending", async () => {
    const transfer = await completeWithOneTransfer();
    await repo.markSettlementTransferPaid(transfer.id);

    await expect(repo.markSettlementTransferPaid(transfer.id)).rejects.toThrow(
      "This payment is no longer pending."
    );
  });

  test("confirmSettlementTransferReceived rejects a transfer that has not been marked paid", async () => {
    const transfer = await completeWithOneTransfer();

    await expect(repo.confirmSettlementTransferReceived(transfer.id)).rejects.toThrow(
      "Only paid transfers can be confirmed."
    );
  });

  test("confirming the last outstanding transfer settles the trip", async () => {
    const transfer = await completeWithOneTransfer();
    await repo.markSettlementTransferPaid(transfer.id);

    const confirmed = await repo.confirmSettlementTransferReceived(transfer.id);
    expect(confirmed.status).toBe("confirmed");

    const trips = await repo.listTrips();
    const trip = trips.find((item) => item.id === TRIP_ID);
    expect(trip?.status).toBe("settled");
    expect(trip?.settledAt).not.toBeNull();
  });
});

describe("departTripMember / rejoinTripMember", () => {
  test("departTripMember marks the member departed and creates early-departure transfers", async () => {
    const { trip, transfers } = await repo.departTripMember(TRIP_ID, "leo", [
      {
        fromEntity: { type: "member", memberId: "leo" },
        toEntity: { type: "member", memberId: "mia" },
        amount: 20,
        currencyCode: "EUR",
        fromDisplayName: "Leo",
        toDisplayName: "Mia"
      }
    ]);

    const leo = trip.members.find((member) => member.id === "leo");
    expect(leo?.status).toBe("departed");
    expect(transfers).toHaveLength(1);
    expect(transfers[0].settlementType).toBe("early_departure");
    expect(transfers[0].departedMemberId).toBe("leo");
  });

  test("getEarlySettlementsForTrip only returns early-departure transfers", async () => {
    await repo.departTripMember(TRIP_ID, "leo", [
      {
        fromEntity: { type: "member", memberId: "leo" },
        toEntity: { type: "member", memberId: "mia" },
        amount: 20,
        currencyCode: "EUR",
        fromDisplayName: "Leo",
        toDisplayName: "Mia"
      }
    ]);

    const earlySettlements = await repo.getEarlySettlementsForTrip(TRIP_ID);
    expect(earlySettlements).toHaveLength(1);
    expect(earlySettlements[0]).toEqual({ fromMemberId: "leo", toMemberId: "mia", amount: 20 });
  });

  test("rejoinTripMember clears departed status and removes early-departure transfers", async () => {
    await repo.departTripMember(TRIP_ID, "leo", [
      {
        fromEntity: { type: "member", memberId: "leo" },
        toEntity: { type: "member", memberId: "mia" },
        amount: 20,
        currencyCode: "EUR",
        fromDisplayName: "Leo",
        toDisplayName: "Mia"
      }
    ]);

    const rejoined = await repo.rejoinTripMember(TRIP_ID, "leo");
    const leo = rejoined.members.find((member) => member.id === "leo");
    expect(leo?.status).toBe("active");

    const earlySettlements = await repo.getEarlySettlementsForTrip(TRIP_ID);
    expect(earlySettlements).toHaveLength(0);
  });
});

describe("trip members", () => {
  test("addTripMember adds a new unlinked member", async () => {
    const trip = await repo.addTripMember(TRIP_ID, {
      id: "new_member",
      email: "new@example.com",
      displayName: "New Member",
      avatarUrl: null
    });

    const member = trip.members.find((item) => item.id === "new_member");
    expect(member).toBeDefined();
    expect(member?.isLinked).toBe(false);
  });

  test("addTripMember does not add a duplicate for an existing member id", async () => {
    const trip = await repo.addTripMember(TRIP_ID, {
      id: "mia",
      email: "mia@example.com",
      displayName: "Mia",
      avatarUrl: null
    });

    const miaCount = trip.members.filter((member) => member.id === "mia").length;
    expect(miaCount).toBe(1);
  });

  test("removeTripMember marks a member removed", async () => {
    const trip = await repo.removeTripMember(TRIP_ID, "leo");
    const leo = trip.members.find((member) => member.id === "leo");
    expect(leo?.status).toBe("removed");
    expect(leo?.removedAt).not.toBeNull();
  });
});

describe("groups", () => {
  test("createGroup adds a group to the trip", async () => {
    const group = await repo.createGroup(TRIP_ID, "Roommates");
    expect(group.name).toBe("Roommates");
    expect(group.memberIds).toEqual([]);

    const trips = await repo.listTrips();
    const trip = trips.find((item) => item.id === TRIP_ID);
    expect(trip?.groups.some((g) => g.id === group.id)).toBe(true);
  });

  test("createGroup rejects a case-insensitive duplicate name within the same trip", async () => {
    await repo.createGroup(TRIP_ID, "Roommates");
    await expect(repo.createGroup(TRIP_ID, "roommates")).rejects.toThrow(
      "A group with this name already exists in this trip."
    );
  });

  test("updateGroup renames the group", async () => {
    const group = await repo.createGroup(TRIP_ID, "Roommates");
    const updated = await repo.updateGroup(group.id, "Housemates");
    expect(updated.name).toBe("Housemates");
  });

  test("addMemberToGroup / removeMemberFromGroup keep memberIds in sync", async () => {
    const group = await repo.createGroup(TRIP_ID, "Roommates");

    await repo.addMemberToGroup("leo", group.id);
    let trips = await repo.listTrips();
    let trip = trips.find((item) => item.id === TRIP_ID)!;
    expect(trip.groups.find((g) => g.id === group.id)?.memberIds).toEqual(["leo"]);
    expect(trip.members.find((m) => m.id === "leo")?.groupId).toBe(group.id);

    await repo.removeMemberFromGroup("leo");
    trips = await repo.listTrips();
    trip = trips.find((item) => item.id === TRIP_ID)!;
    expect(trip.groups.find((g) => g.id === group.id)?.memberIds).toEqual([]);
    expect(trip.members.find((m) => m.id === "leo")?.groupId).toBeNull();
  });

  test("deleteGroup removes the group and clears members' groupId", async () => {
    const group = await repo.createGroup(TRIP_ID, "Roommates");
    await repo.addMemberToGroup("leo", group.id);

    await repo.deleteGroup(group.id);

    const trips = await repo.listTrips();
    const trip = trips.find((item) => item.id === TRIP_ID)!;
    expect(trip.groups.some((g) => g.id === group.id)).toBe(false);
    expect(trip.members.find((m) => m.id === "leo")?.groupId).toBeNull();
  });
});

describe("archive / unarchive", () => {
  test("archiveTrip and unarchiveTrip toggle isArchived", async () => {
    await repo.archiveTrip(TRIP_ID);
    let trips = await repo.listTrips();
    expect(trips.find((item) => item.id === TRIP_ID)?.isArchived).toBe(true);

    await repo.unarchiveTrip(TRIP_ID);
    trips = await repo.listTrips();
    expect(trips.find((item) => item.id === TRIP_ID)?.isArchived).toBe(false);
  });
});

describe("payment methods", () => {
  test("getPaymentMethod defaults to nulls", async () => {
    const method = await repo.getPaymentMethod();
    expect(method).toEqual({ type: null, handle: null });
  });

  test("updatePaymentMethod is reflected by getPaymentMethod and getPaymentMethodForUser", async () => {
    await repo.updatePaymentMethod("venmo", "@mia");

    expect(await repo.getPaymentMethod()).toEqual({ type: "venmo", handle: "@mia" });
    expect(await repo.getPaymentMethodForUser("anyone")).toEqual({ type: "venmo", handle: "@mia" });
  });
});

describe("misc demo stubs", () => {
  test("listActivityLog returns an empty list in the demo repository", async () => {
    expect(await repo.listActivityLog(TRIP_ID)).toEqual([]);
  });

  test("ensureProfile and claimMembershipsForCurrentUser resolve without throwing", async () => {
    await expect(
      repo.ensureProfile({ id: "mia", displayName: "Mia", email: "mia@example.com", avatarUrl: null })
    ).resolves.toBeUndefined();
    await expect(repo.claimMembershipsForCurrentUser()).resolves.toBeUndefined();
  });
});
