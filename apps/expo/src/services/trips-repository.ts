import type { Expense, ExpenseDraft, Trip, UserProfile } from "@splitsy/domain";
import { SAMPLE_EXPENSES, SAMPLE_TRIP, SAMPLE_USER } from "@splitsy/domain";

import { createSupabaseClient, hasSupabaseConfig } from "./supabase";

export type AddExpenseInput = ExpenseDraft & {
  conversionRateToTripCurrency: number;
  tripAmount: number;
};

export type TripsRepository = {
  ensureProfile: (profile: UserProfile) => Promise<void>;
  listTrips: () => Promise<Trip[]>;
  listExpenses: (tripId: string) => Promise<Expense[]>;
  createExpense: (tripId: string, draft: AddExpenseInput) => Promise<Expense>;
  createTrip: (input: {
    name: string;
    destination?: string;
    tripCurrencyCode: string;
    owner: UserProfile;
  }) => Promise<Trip>;
  addTripMember: (tripId: string, member: UserProfile) => Promise<Trip>;
};

const demoRepository = (): TripsRepository => {
  let trips = [SAMPLE_TRIP];
  let expenses = [...SAMPLE_EXPENSES];

  return {
    ensureProfile: async () => undefined,
    listTrips: async () => trips,
    listExpenses: async (tripId) => expenses.filter((expense) => expense.tripId === tripId),
    createExpense: async (tripId, draft) => {
      const expense: Expense = {
        id: `exp_${expenses.length + 1}`,
        tripId,
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
    createTrip: async (input) => {
      const trip: Trip = {
        id: `trip_${trips.length + 1}`,
        name: input.name,
        destination: input.destination ?? null,
        tripCurrencyCode: input.tripCurrencyCode,
        startDate: null,
        endDate: null,
        members: [{ id: input.owner.id, displayName: input.owner.displayName, avatarUrl: input.owner.avatarUrl }]
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
                { id: member.id, displayName: member.displayName, avatarUrl: member.avatarUrl ?? null }
              ]
            }
          : trip
      );

      const updatedTrip = trips.find((trip) => trip.id === tripId);

      if (!updatedTrip) {
        throw new Error("Trip not found");
      }

      return updatedTrip;
    }
  };
};

const supabaseRepository = (): TripsRepository => {
  const supabase: any = createSupabaseClient();

  const mapTrip = (row: any): Trip => ({
    id: row.id,
    name: row.name,
    destination: row.destination,
    tripCurrencyCode: row.trip_currency_code,
    startDate: row.start_date,
    endDate: row.end_date,
    members: (row.trip_members ?? []).map((memberRow: any) => ({
      id: memberRow.member_id,
      displayName: memberRow.users?.display_name ?? "Member",
      avatarUrl: memberRow.users?.avatar_url ?? null
    }))
  });

  return {
    ensureProfile: async (profile) => {
      const { error } = await supabase.from("users").upsert({
        id: profile.id,
        email: profile.email ?? null,
        display_name: profile.displayName,
        avatar_url: profile.avatarUrl ?? null
      });

      if (error) {
        throw error;
      }
    },
    listTrips: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, destination, trip_currency_code, start_date, end_date, trip_members(member_id, users(display_name, avatar_url))")
        .order("start_date", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(mapTrip);
    },
    listExpenses: async (tripId) => {
      const { data, error } = await supabase
        .from("expenses")
        .select("id, trip_id, amount, currency_code, trip_conversion_rate, trip_amount, category, custom_category, note, paid_by_member_id, created_at, expense_participants(member_id)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        tripId: row.trip_id,
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
    createExpense: async (tripId, draft) => {
      const { data: insertedExpense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          trip_id: tripId,
          amount: draft.amount,
          currency_code: draft.currencyCode,
          trip_conversion_rate: draft.conversionRateToTripCurrency,
          trip_amount: draft.tripAmount,
          category: draft.category,
          custom_category: draft.customCategory ?? null,
          note: draft.note ?? null,
          paid_by_member_id: draft.paidByMemberId
        })
        .select("id, trip_id, amount, currency_code, trip_conversion_rate, trip_amount, category, custom_category, note, paid_by_member_id, created_at")
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
    createTrip: async (input) => {
      const { error: profileError } = await supabase.from("users").upsert({
        id: input.owner.id,
        email: input.owner.email ?? null,
        display_name: input.owner.displayName,
        avatar_url: input.owner.avatarUrl ?? null
      });

      if (profileError) {
        throw profileError;
      }

      const { data: tripRow, error: tripError } = await supabase
        .from("trips")
        .insert({
          owner_user_id: input.owner.id,
          name: input.name,
          destination: input.destination ?? null,
          trip_currency_code: input.tripCurrencyCode
        })
        .select("id, name, destination, trip_currency_code, start_date, end_date")
        .single();

      if (tripError) {
        throw tripError;
      }

      const { error: membershipError } = await supabase.from("trip_members").insert({
        trip_id: tripRow.id,
        member_id: input.owner.id
      });

      if (membershipError) {
        throw membershipError;
      }

      return {
        id: tripRow.id,
        name: tripRow.name,
        destination: tripRow.destination,
        tripCurrencyCode: tripRow.trip_currency_code,
        startDate: tripRow.start_date,
        endDate: tripRow.end_date,
        members: [
          {
            id: input.owner.id,
            displayName: input.owner.displayName,
            avatarUrl: input.owner.avatarUrl ?? null
          }
        ]
      };
    },
    addTripMember: async (tripId, member) => {
      const { error: profileError } = await supabase.from("users").upsert({
        id: member.id,
        email: member.email ?? null,
        display_name: member.displayName,
        avatar_url: member.avatarUrl ?? null
      });

      if (profileError) {
        throw profileError;
      }

      const { error: membershipError } = await supabase.from("trip_members").upsert({
        trip_id: tripId,
        member_id: member.id
      });

      if (membershipError) {
        throw membershipError;
      }

      const { data, error } = await supabase
        .from("trips")
        .select("id, name, destination, trip_currency_code, start_date, end_date, trip_members(member_id, users(display_name, avatar_url))")
        .eq("id", tripId)
        .single();

      if (error) {
        throw error;
      }

      return mapTrip(data);
    }
  };
};

export const createTripsRepository = (): TripsRepository =>
  hasSupabaseConfig ? supabaseRepository() : demoRepository();

export const demoOwnerProfile = SAMPLE_USER;
