import type { Expense, ExpenseDraft, PaymentMethodType, SettlementTransfer, Trip, TripSettlementTransfer, UserProfile } from "@splitsy/domain";
import { SAMPLE_EXPENSES, SAMPLE_TRIP, SAMPLE_USER } from "@splitsy/domain";

import { createSupabaseClient, hasSupabaseConfig } from "./supabase";

export type AddExpenseInput = ExpenseDraft & {
  conversionRateToTripCurrency: number;
  tripAmount: number;
};

export type TripsRepository = {
  ensureProfile: (profile: UserProfile) => Promise<void>;
  claimMembershipsForCurrentUser: () => Promise<void>;
  createTripInvite: (tripId: string) => Promise<string>;
  acceptTripInvite: (token: string) => Promise<string>;
  listTrips: () => Promise<Trip[]>;
  listExpenses: (tripId: string) => Promise<Expense[]>;
  listSettlementTransfers: (tripId: string) => Promise<TripSettlementTransfer[]>;
  createExpense: (tripId: string, draft: AddExpenseInput) => Promise<Expense>;
  updateExpense: (expenseId: string, tripId: string, draft: AddExpenseInput) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  completeTrip: (
    tripId: string,
    transfers: SettlementTransfer[]
  ) => Promise<{ trip: Trip; transfers: TripSettlementTransfer[] }>;
  markSettlementTransferPaid: (transferId: string) => Promise<TripSettlementTransfer>;
  confirmSettlementTransferReceived: (transferId: string) => Promise<TripSettlementTransfer>;
  createTrip: (input: {
    name: string;
    destination?: string;
    tripCurrencyCode: string;
    startDate?: string;
    endDate?: string;
    owner: UserProfile;
  }) => Promise<Trip>;
  addTripMember: (tripId: string, member: UserProfile) => Promise<Trip>;
  removeTripMember: (tripId: string, memberId: string) => Promise<Trip>;
  updatePaymentMethod: (type: PaymentMethodType | null, handle: string | null) => Promise<void>;
  getPaymentMethod: () => Promise<{ type: PaymentMethodType | null; handle: string | null }>;
  getPaymentMethodForUser: (userId: string) => Promise<{ type: PaymentMethodType | null; handle: string | null }>;
};

const demoRepository = (): TripsRepository => {
  let trips = [SAMPLE_TRIP];
  let expenses = [...SAMPLE_EXPENSES];
  let settlementTransfers: TripSettlementTransfer[] = [];
  const invites = new Map<string, string>();
  let demoPaymentMethod: { type: PaymentMethodType | null; handle: string | null } = { type: null, handle: null };

  return {
    ensureProfile: async () => undefined,
    claimMembershipsForCurrentUser: async () => undefined,
    createTripInvite: async (tripId) => {
      const token = `demo_invite_${tripId}_${Date.now()}`;
      invites.set(token, tripId);
      return token;
    },
    acceptTripInvite: async (token) => {
      const tripId = invites.get(token);

      if (!tripId) {
        throw new Error("Invite link is invalid or has expired.");
      }

      trips = trips.map((trip) =>
        trip.id === tripId && !trip.members.some((member) => member.userId === SAMPLE_USER.id)
          ? {
              ...trip,
              members: [
                ...trip.members,
                {
                  id: SAMPLE_USER.id,
                  userId: SAMPLE_USER.id,
                  email: SAMPLE_USER.email ?? null,
                  displayName: SAMPLE_USER.displayName,
                  avatarUrl: SAMPLE_USER.avatarUrl ?? null,
                  isLinked: true
                }
              ]
            }
          : trip
      );

      return tripId;
    },
    listTrips: async () => trips,
    listExpenses: async (tripId) => expenses.filter((expense) => expense.tripId === tripId),
    listSettlementTransfers: async (tripId) =>
      settlementTransfers.filter((transfer) => transfer.tripId === tripId),
    createExpense: async (tripId, draft) => {
      const expense: Expense = {
        id: `exp_${expenses.length + 1}`,
        tripId,
        createdByUserId: SAMPLE_USER.id,
        expenseDate: draft.expenseDate,
        amount: draft.amount,
        currencyCode: draft.currencyCode,
        conversionRateToTripCurrency: draft.conversionRateToTripCurrency,
        tripAmount: draft.tripAmount,
        category: draft.category,
        customCategory: draft.customCategory,
        note: draft.note,
        paidByMemberId: draft.paidByMemberId,
        involvedMemberIds: draft.involvedMemberIds,
        createdAt: new Date().toISOString()
      };

      expenses = [expense, ...expenses];
      return expense;
    },
    updateExpense: async (expenseId, tripId, draft) => {
      const existingExpense = expenses.find((expense) => expense.id === expenseId);

      if (!existingExpense) {
        throw new Error("Expense not found");
      }

      const updatedExpense: Expense = {
        ...existingExpense,
        tripId,
        amount: draft.amount,
        currencyCode: draft.currencyCode,
        conversionRateToTripCurrency: draft.conversionRateToTripCurrency,
        tripAmount: draft.tripAmount,
        category: draft.category,
        customCategory: draft.customCategory,
        note: draft.note,
        paidByMemberId: draft.paidByMemberId,
        involvedMemberIds: draft.involvedMemberIds
      };

      expenses = expenses.map((expense) => (expense.id === expenseId ? updatedExpense : expense));
      return updatedExpense;
    },
    deleteExpense: async (expenseId) => {
      expenses = expenses.filter((expense) => expense.id !== expenseId);
    },
    completeTrip: async (tripId, transfers) => {
      const trip = trips.find((item) => item.id === tripId);

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (trip.status !== "active") {
        throw new Error("This trip has already been completed.");
      }

      const now = new Date().toISOString();
      const nextStatus = transfers.length ? "completed" : "settled";
      const persistedTransfers = transfers.map((transfer, index) => ({
        id: `transfer_${tripId}_${index + 1}`,
        tripId,
        ...transfer,
        status: "pending" as const,
        paidMarkedAt: null,
        paidMarkedByUserId: null,
        confirmedAt: null,
        confirmedByUserId: null,
        createdAt: now
      }));

      settlementTransfers = [
        ...settlementTransfers.filter((transfer) => transfer.tripId !== tripId),
        ...persistedTransfers
      ];

      const updatedTrip: Trip = {
        ...trip,
        status: nextStatus,
        completedAt: now,
        completedByUserId: SAMPLE_USER.id,
        settledAt: nextStatus === "settled" ? now : null
      };

      trips = trips.map((item) => (item.id === tripId ? updatedTrip : item));

      return {
        trip: updatedTrip,
        transfers: persistedTransfers
      };
    },
    markSettlementTransferPaid: async (transferId) => {
      const existingTransfer = settlementTransfers.find((transfer) => transfer.id === transferId);

      if (!existingTransfer) {
        throw new Error("Settlement transfer not found");
      }

      if (existingTransfer.status !== "pending") {
        throw new Error("This payment is no longer pending.");
      }

      const updatedTransfer: TripSettlementTransfer = {
        ...existingTransfer,
        status: "paid",
        paidMarkedAt: new Date().toISOString(),
        paidMarkedByUserId: SAMPLE_USER.id
      };

      settlementTransfers = settlementTransfers.map((transfer) =>
        transfer.id === transferId ? updatedTransfer : transfer
      );

      return updatedTransfer;
    },
    confirmSettlementTransferReceived: async (transferId) => {
      const existingTransfer = settlementTransfers.find((transfer) => transfer.id === transferId);

      if (!existingTransfer) {
        throw new Error("Settlement transfer not found");
      }

      if (existingTransfer.status !== "paid") {
        throw new Error("Only paid transfers can be confirmed.");
      }

      const updatedTransfer: TripSettlementTransfer = {
        ...existingTransfer,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
        confirmedByUserId: SAMPLE_USER.id
      };

      settlementTransfers = settlementTransfers.map((transfer) =>
        transfer.id === transferId ? updatedTransfer : transfer
      );

      const remainingTransfers = settlementTransfers.filter(
        (transfer) => transfer.tripId === updatedTransfer.tripId && transfer.status !== "confirmed"
      );

      if (remainingTransfers.length === 0) {
        trips = trips.map((trip) =>
          trip.id === updatedTransfer.tripId
            ? {
                ...trip,
                status: "settled",
                settledAt: new Date().toISOString()
              }
            : trip
        );
      }

      return updatedTransfer;
    },
    createTrip: async (input) => {
      const trip: Trip = {
        id: `trip_${trips.length + 1}`,
        createdByUserId: input.owner.id,
        status: "active",
        name: input.name,
        destination: input.destination ?? null,
        tripCurrencyCode: input.tripCurrencyCode,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        members: [
          {
            id: input.owner.id,
            userId: input.owner.id,
            email: input.owner.email ?? null,
            displayName: input.owner.displayName,
            avatarUrl: input.owner.avatarUrl,
            isLinked: true
          }
        ]
      };

      trips = [trip, ...trips];
      return trip;
    },
    addTripMember: async (tripId, member) => {
      trips = trips.map((trip) =>
        trip.id === tripId && !trip.members.find((item) => item.id === member.id)
          ? {
              ...trip,
              members: [
                ...trip.members,
                {
                  id: member.id,
                  userId: null,
                  email: member.email ?? null,
                  displayName: member.displayName,
                  avatarUrl: member.avatarUrl ?? null,
                  isLinked: false,
                  status: "active",
                  removedAt: null
                }
              ]
            }
          : trip
      );

      const updatedTrip = trips.find((trip) => trip.id === tripId);

      if (!updatedTrip) {
        throw new Error("Trip not found");
      }

      return updatedTrip;
    },
    removeTripMember: async (tripId, memberId) => {
      trips = trips.map((trip) =>
        trip.id === tripId
          ? {
              ...trip,
              members: trip.members.map((member) =>
                member.id === memberId
                  ? {
                      ...member,
                      status: "removed",
                      removedAt: new Date().toISOString()
                    }
                  : member
              )
            }
          : trip
      );

      const updatedTrip = trips.find((trip) => trip.id === tripId);

      if (!updatedTrip) {
        throw new Error("Trip not found");
      }

      return updatedTrip;
    },
    updatePaymentMethod: async (type, handle) => {
      demoPaymentMethod = { type, handle };
    },
    getPaymentMethod: async () => demoPaymentMethod,
    getPaymentMethodForUser: async () => demoPaymentMethod
  };
};

const supabaseRepository = (): TripsRepository => {
  const supabase: any = createSupabaseClient();
  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? null;

  const getCurrentAuthUser = async () => {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user) {
      throw new Error("You must be signed in to modify trip data.");
    }

    return user;
  };

  const getCurrentUserId = async () => {
    const user = await getCurrentAuthUser();
    return user.id;
  };

  const mapTrip = (row: any): Trip => ({
    id: row.id,
    createdByUserId: row.created_by_user_id,
    status: row.status ?? "active",
    name: row.name,
    destination: row.destination,
    tripCurrencyCode: row.trip_currency_code,
    startDate: row.start_date,
    endDate: row.end_date,
    completedAt: row.completed_at ?? null,
    completedByUserId: row.completed_by_user_id ?? null,
    settledAt: row.settled_at ?? null,
    members: (row.trip_members ?? []).map((memberRow: any) => ({
      id: memberRow.id,
      userId: memberRow.user_id ?? null,
      email: memberRow.email ?? null,
      displayName: memberRow.display_name ?? "Member",
      avatarUrl: memberRow.avatar_url ?? null,
      claimedAt: memberRow.claimed_at ?? null,
      isLinked: Boolean(memberRow.user_id),
      status: memberRow.status ?? "active",
      removedAt: memberRow.removed_at ?? null
    }))
  });

  const fetchTrip = async (tripId: string) => {
    const { data, error } = await supabase
      .from("trips")
      .select(
        "id, created_by_user_id, status, name, destination, trip_currency_code, start_date, end_date, completed_at, completed_by_user_id, settled_at, trip_members(id, user_id, display_name, avatar_url, email, claimed_at, status, removed_at)"
      )
      .eq("id", tripId)
      .single();

    if (error) {
      throw error;
    }

    return mapTrip(data);
  };

  const mapSettlementTransfer = (row: any): TripSettlementTransfer => ({
    id: row.id,
    tripId: row.trip_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    amount: Number(row.amount),
    currencyCode: row.currency_code,
    status: row.status,
    paidMarkedAt: row.paid_marked_at ?? null,
    paidMarkedByUserId: row.paid_marked_by_user_id ?? null,
    confirmedAt: row.confirmed_at ?? null,
    confirmedByUserId: row.confirmed_by_user_id ?? null,
    createdAt: row.created_at
  });

  return {
    ensureProfile: async (profile) => {
      const { error } = await supabase.from("users").upsert(
        {
          id: profile.id,
          email: profile.email ?? null,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl ?? null
        },
        {
          onConflict: "id"
        }
      );

      if (error) {
        throw error;
      }
    },
    claimMembershipsForCurrentUser: async () => {
      const { error } = await supabase.rpc("claim_trip_memberships_for_current_user");

      if (error) {
        throw error;
      }
    },
    createTripInvite: async (tripId) => {
      const { data, error } = await supabase.rpc("create_trip_invite", {
        target_trip_id: tripId
      });

      if (error) {
        throw error;
      }

      return data as string;
    },
    acceptTripInvite: async (token) => {
      const { data, error } = await supabase.rpc("accept_trip_invite", {
        invite_token: token
      });

      if (error) {
        throw error;
      }

      return data as string;
    },
    listTrips: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select(
          "id, created_by_user_id, status, name, destination, trip_currency_code, start_date, end_date, completed_at, completed_by_user_id, settled_at, trip_members(id, user_id, display_name, avatar_url, email, claimed_at, status, removed_at)"
        )
        .order("start_date", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapTrip);
    },
    listExpenses: async (tripId) => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, trip_id, created_by_user_id, expense_date, amount, currency_code, trip_conversion_rate, trip_amount, category, custom_category, note, paid_by_member_id, created_at, expense_participants(member_id)")
        .eq("trip_id", tripId)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tripId: row.trip_id,
        createdByUserId: row.created_by_user_id,
        expenseDate: row.expense_date,
        amount: Number(row.amount),
        currencyCode: row.currency_code,
        conversionRateToTripCurrency: Number(row.trip_conversion_rate),
        tripAmount: Number(row.trip_amount),
        category: row.category,
        customCategory: row.custom_category,
        note: row.note,
        paidByMemberId: row.paid_by_member_id,
        involvedMemberIds: (row.expense_participants ?? []).map((item: any) => item.member_id),
        createdAt: row.created_at
      }));
    },
    listSettlementTransfers: async (tripId) => {
      const { data, error } = await supabase
        .from("trip_settlement_transfers")
        .select(
          "id, trip_id, from_member_id, to_member_id, amount, currency_code, status, paid_marked_at, paid_marked_by_user_id, confirmed_at, confirmed_by_user_id, created_at"
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapSettlementTransfer);
    },
    createExpense: async (tripId, draft) => {
      const createdByUserId = await getCurrentUserId();
      const { data: insertedExpense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          trip_id: tripId,
          created_by_user_id: createdByUserId,
          expense_date: draft.expenseDate,
          amount: draft.amount,
          currency_code: draft.currencyCode,
          trip_conversion_rate: draft.conversionRateToTripCurrency,
          trip_amount: draft.tripAmount,
          category: draft.category,
          custom_category: draft.customCategory ?? null,
          note: draft.note ?? null,
          paid_by_member_id: draft.paidByMemberId
        })
        .select("id, trip_id, created_by_user_id, expense_date, amount, currency_code, trip_conversion_rate, trip_amount, category, custom_category, note, paid_by_member_id, created_at")
        .single();

      if (expenseError) {
        throw expenseError;
      }

      const participantRows = draft.involvedMemberIds.map((memberId) => ({
        expense_id: insertedExpense.id,
        member_id: memberId
      }));

      const { error: participantError } = await supabase.from("expense_participants").insert(participantRows);

      if (participantError) {
        throw participantError;
      }

      return {
        id: insertedExpense.id,
        tripId: insertedExpense.trip_id,
        createdByUserId: insertedExpense.created_by_user_id,
        expenseDate: insertedExpense.expense_date,
        amount: Number(insertedExpense.amount),
        currencyCode: insertedExpense.currency_code,
        conversionRateToTripCurrency: Number(insertedExpense.trip_conversion_rate),
        tripAmount: Number(insertedExpense.trip_amount),
        category: insertedExpense.category,
        customCategory: insertedExpense.custom_category,
        note: insertedExpense.note,
        paidByMemberId: insertedExpense.paid_by_member_id,
        involvedMemberIds: draft.involvedMemberIds,
        createdAt: insertedExpense.created_at
      };
    },
    updateExpense: async (expenseId, tripId, draft) => {
      const { data: updatedExpense, error: expenseError } = await supabase
        .from("expenses")
        .update({
          expense_date: draft.expenseDate,
          amount: draft.amount,
          currency_code: draft.currencyCode,
          trip_conversion_rate: draft.conversionRateToTripCurrency,
          trip_amount: draft.tripAmount,
          category: draft.category,
          custom_category: draft.customCategory ?? null,
          note: draft.note ?? null,
          paid_by_member_id: draft.paidByMemberId
        })
        .eq("id", expenseId)
        .eq("trip_id", tripId)
        .select("id, trip_id, created_by_user_id, expense_date, amount, currency_code, trip_conversion_rate, trip_amount, category, custom_category, note, paid_by_member_id, created_at")
        .single();

      if (expenseError) {
        throw expenseError;
      }

      const { error: deleteParticipantsError } = await supabase
        .from("expense_participants")
        .delete()
        .eq("expense_id", expenseId);

      if (deleteParticipantsError) {
        throw deleteParticipantsError;
      }

      const participantRows = draft.involvedMemberIds.map((memberId) => ({
        expense_id: expenseId,
        member_id: memberId
      }));

      const { error: participantError } = await supabase.from("expense_participants").insert(participantRows);

      if (participantError) {
        throw participantError;
      }

      return {
        id: updatedExpense.id,
        tripId: updatedExpense.trip_id,
        createdByUserId: updatedExpense.created_by_user_id,
        expenseDate: updatedExpense.expense_date,
        amount: Number(updatedExpense.amount),
        currencyCode: updatedExpense.currency_code,
        conversionRateToTripCurrency: Number(updatedExpense.trip_conversion_rate),
        tripAmount: Number(updatedExpense.trip_amount),
        category: updatedExpense.category,
        customCategory: updatedExpense.custom_category,
        note: updatedExpense.note,
        paidByMemberId: updatedExpense.paid_by_member_id,
        involvedMemberIds: draft.involvedMemberIds,
        createdAt: updatedExpense.created_at
      };
    },
    deleteExpense: async (expenseId) => {
      const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

      if (error) {
        throw error;
      }
    },
    completeTrip: async (tripId, transfers) => {
      const { data: completedTrip, error: completeError } = await supabase.rpc("complete_trip", {
        target_trip_id: tripId,
        settlement_transfers: transfers.map((transfer) => ({
          fromMemberId: transfer.fromMemberId,
          toMemberId: transfer.toMemberId,
          amount: transfer.amount,
          currencyCode: transfer.currencyCode
        }))
      });

      if (completeError) {
        throw completeError;
      }

      const { data: tripMembers, error: membersError } = await supabase
        .from("trip_members")
        .select("id, user_id, display_name, avatar_url, email, claimed_at, status, removed_at")
        .eq("trip_id", tripId);

      if (membersError) {
        throw membersError;
      }

      const persistedTransfers = await supabase
        .from("trip_settlement_transfers")
        .select(
          "id, trip_id, from_member_id, to_member_id, amount, currency_code, status, paid_marked_at, paid_marked_by_user_id, confirmed_at, confirmed_by_user_id, created_at"
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });

      if (persistedTransfers.error) {
        throw persistedTransfers.error;
      }

      return {
        trip: mapTrip({
          ...completedTrip,
          trip_members: tripMembers ?? []
        }),
        transfers: (persistedTransfers.data ?? []).map(mapSettlementTransfer)
      };
    },
    markSettlementTransferPaid: async (transferId) => {
      const { data, error } = await supabase.rpc("mark_settlement_transfer_paid", {
        target_transfer_id: transferId
      });

      if (error) {
        throw error;
      }

      return mapSettlementTransfer(data);
    },
    confirmSettlementTransferReceived: async (transferId) => {
      const { data, error } = await supabase.rpc("confirm_settlement_transfer_received", {
        target_transfer_id: transferId
      });

      if (error) {
        throw error;
      }

      return mapSettlementTransfer(data);
    },
    createTrip: async (input) => {
      const authUser = await getCurrentAuthUser();
      const ownerProfile = {
        email: authUser.email ?? input.owner.email ?? null,
        displayName:
          (authUser.user_metadata?.name as string | undefined) ??
          (authUser.user_metadata?.full_name as string | undefined) ??
          input.owner.displayName,
        avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? input.owner.avatarUrl ?? null
      };

      const { data: createdTripId, error: createTripError } = await supabase.rpc("create_trip", {
        trip_name: input.name,
        trip_destination: input.destination ?? null,
        trip_currency_code: input.tripCurrencyCode,
        trip_start_date: input.startDate ?? null,
        trip_end_date: input.endDate ?? null,
        creator_display_name: ownerProfile.displayName,
        creator_email: ownerProfile.email,
        creator_avatar_url: ownerProfile.avatarUrl
      });

      if (createTripError) {
        throw createTripError;
      }

      return fetchTrip(createdTripId);
    },
    addTripMember: async (tripId, member) => {
      const normalizedEmail = normalizeEmail(member.email);

      if (normalizedEmail) {
        const { data: restoredByEmail, error: restoreByEmailError } = await supabase
          .from("trip_members")
          .update({
            status: "active",
            removed_at: null,
            removed_by_user_id: null,
            display_name: member.displayName,
            email: member.email ?? null,
            normalized_email: normalizedEmail,
            avatar_url: member.avatarUrl ?? null
          })
          .eq("trip_id", tripId)
          .eq("normalized_email", normalizedEmail)
          .eq("status", "removed")
          .select("id")
          .maybeSingle();

        if (restoreByEmailError) {
          throw restoreByEmailError;
        }

        if (restoredByEmail?.id) {
          return fetchTrip(tripId);
        }
      }

      if (isUuid(member.id)) {
        const { data: restoredByUser, error: restoreByUserError } = await supabase
          .from("trip_members")
          .update({
            status: "active",
            removed_at: null,
            removed_by_user_id: null,
            user_id: member.id,
            display_name: member.displayName,
            email: member.email ?? null,
            normalized_email: normalizedEmail,
            avatar_url: member.avatarUrl ?? null
          })
          .eq("trip_id", tripId)
          .eq("user_id", member.id)
          .eq("status", "removed")
          .select("id")
          .maybeSingle();

        if (restoreByUserError) {
          throw restoreByUserError;
        }

        if (restoredByUser?.id) {
          return fetchTrip(tripId);
        }

        const { error: profileError } = await supabase.from("users").upsert(
          {
            id: member.id,
            email: member.email ?? null,
            display_name: member.displayName,
            avatar_url: member.avatarUrl ?? null
          },
          {
            onConflict: "id"
          }
        );

        if (profileError) {
          throw profileError;
        }
      }

      const { error: membershipError } = await supabase.from("trip_members").insert({
        trip_id: tripId,
        user_id: isUuid(member.id) ? member.id : null,
        display_name: member.displayName,
        email: member.email ?? null,
        normalized_email: normalizedEmail,
        avatar_url: member.avatarUrl ?? null
      });

      if (membershipError) {
        throw membershipError;
      }

      return fetchTrip(tripId);
    },
    removeTripMember: async (tripId, memberId) => {
      const { error } = await supabase.rpc("remove_trip_member", {
        target_trip_member_id: memberId
      });

      if (error) {
        throw error;
      }

      return fetchTrip(tripId);
    },
    updatePaymentMethod: async (type, handle) => {
      const userId = await getCurrentUserId();
      const { error } = await supabase
        .from("users")
        .update({
          payment_method_type: type,
          payment_method_handle: handle
        })
        .eq("id", userId);

      if (error) {
        throw error;
      }
    },
    getPaymentMethod: async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase
        .from("users")
        .select("payment_method_type, payment_method_handle")
        .eq("id", userId)
        .single();

      if (error) {
        throw error;
      }

      return {
        type: (data?.payment_method_type as PaymentMethodType | null) ?? null,
        handle: (data?.payment_method_handle as string | null) ?? null
      };
    },
    getPaymentMethodForUser: async (userId) => {
      const { data, error } = await supabase
        .from("users")
        .select("payment_method_type, payment_method_handle")
        .eq("id", userId)
        .single();

      if (error) {
        throw error;
      }

      return {
        type: (data?.payment_method_type as PaymentMethodType | null) ?? null,
        handle: (data?.payment_method_handle as string | null) ?? null
      };
    }
  };
};

export const createTripsRepository = (): TripsRepository =>
  hasSupabaseConfig ? supabaseRepository() : demoRepository();

export const demoOwnerProfile = SAMPLE_USER;
