import type { Expense, Trip, TripSettlementTransfer, UserProfile } from "@splitsy/domain";
import { settleTrip } from "@splitsy/domain";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { useSession } from "./session-provider";
import { AddExpenseInput, createTripsRepository, demoOwnerProfile } from "../services/trips-repository";

type TripsContextValue = {
  authMode: "supabase" | "demo";
  isLoading: boolean;
  currentUser: UserProfile;
  trips: Trip[];
  signOut: () => Promise<void>;
  createTrip: (input: {
    name: string;
    destination?: string;
    tripCurrencyCode: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  addTripMember: (tripId: string, input: { displayName: string; email?: string }) => Promise<void>;
  getTripById: (tripId: string) => Trip | undefined;
  getCurrentMemberForTrip: (tripId: string) => Trip["members"][number] | undefined;
  canEditTrip: (tripId: string) => boolean;
  canCompleteTrip: (tripId: string) => boolean;
  completeTrip: (tripId: string) => Promise<void>;
  getExpensesForTrip: (tripId: string) => Expense[];
  getSettlementTransfersForTrip: (tripId: string) => TripSettlementTransfer[];
  canEditExpense: (expenseId: string) => boolean;
  canMarkSettlementTransferPaid: (transferId: string) => boolean;
  markSettlementTransferPaid: (transferId: string) => Promise<void>;
  canConfirmSettlementTransferReceived: (transferId: string) => boolean;
  confirmSettlementTransferReceived: (transferId: string) => Promise<void>;
  addExpense: (tripId: string, draft: AddExpenseInput) => Promise<void>;
  updateExpense: (expenseId: string, tripId: string, draft: AddExpenseInput) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
};

const TRIPS_CONTEXT_KEY = "__splittrip_trips_context__";
const tripsContextStore = globalThis as typeof globalThis & {
  [TRIPS_CONTEXT_KEY]?: ReturnType<typeof createContext<TripsContextValue | null>>;
};

const TripsContext =
  tripsContextStore[TRIPS_CONTEXT_KEY] ?? createContext<TripsContextValue | null>(null);

tripsContextStore[TRIPS_CONTEXT_KEY] = TripsContext;

export function TripsProvider({ children }: PropsWithChildren) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlementTransfers, setSettlementTransfers] = useState<TripSettlementTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const session = useSession();
  const repository = useMemo(() => createTripsRepository(), []);

  useEffect(() => {
    if (session.isLoading || !session.isAuthenticated) {
      setTrips([]);
      setExpenses([]);
      setSettlementTransfers([]);
      setIsLoading(false);
      return;
    }

    if (!session.user) {
      setIsLoading(false);
      return;
    }

    const currentUser: UserProfile = {
      id: session.user.id,
      email: session.user.email,
      displayName:
        (session.user.user_metadata?.name as string | undefined) ??
        (session.user.user_metadata?.full_name as string | undefined) ??
        session.user.email ??
        "Traveler",
      avatarUrl: (session.user.user_metadata?.avatar_url as string | undefined) ?? null
    };

    const load = async () => {
      setIsLoading(true);
      await repository.ensureProfile(currentUser);
      await repository.claimMembershipsForCurrentUser();
      const loadedTrips = await repository.listTrips();
      const loadedExpenses = loadedTrips.length
        ? (await Promise.all(loadedTrips.map((trip) => repository.listExpenses(trip.id)))).flat()
        : [];
      const loadedSettlementTransfers = loadedTrips.length
        ? (await Promise.all(loadedTrips.map((trip) => repository.listSettlementTransfers(trip.id)))).flat()
        : [];
      setTrips(loadedTrips);
      setExpenses(loadedExpenses);
      setSettlementTransfers(loadedSettlementTransfers);
      setIsLoading(false);
    };

    load().catch((error) => {
      console.error("Failed to load trip data", error);
      setIsLoading(false);
    });
  }, [repository, session.isAuthenticated, session.isLoading, session.user]);

  const currentUser: UserProfile =
    session.authMode === "demo"
      ? demoOwnerProfile
      : session.user
        ? {
            id: session.user.id,
            email: session.user.email,
            displayName:
              (session.user.user_metadata?.name as string | undefined) ??
              (session.user.user_metadata?.full_name as string | undefined) ??
              session.user.email ??
              "Traveler",
            avatarUrl: (session.user.user_metadata?.avatar_url as string | undefined) ?? null
          }
        : {
            id: "",
            email: null,
            displayName: "",
            avatarUrl: null
          };

  const value = useMemo<TripsContextValue>(
    () => ({
      authMode: session.authMode,
      isLoading,
      currentUser,
      trips,
      signOut: session.signOut,
      createTrip: async (input) => {
        if (session.authMode === "supabase" && !session.user) {
          throw new Error("Your session is still loading. Refresh and try again.");
        }

        const trip = await repository.createTrip({
          ...input,
          owner: currentUser
        });

        setTrips((current) => [trip, ...current]);
      },
      addTripMember: async (tripId, input) => {
        if (session.authMode === "supabase" && !session.user) {
          throw new Error("Your session is still loading. Refresh and try again.");
        }

        const memberProfile: UserProfile = {
          id: input.email?.trim().toLowerCase() || `member_${Date.now()}`,
          email: input.email?.trim().toLowerCase() || null,
          displayName: input.displayName.trim(),
          avatarUrl: null
        };
        const updatedTrip = await repository.addTripMember(tripId, memberProfile);

        setTrips((current) => current.map((trip) => (trip.id === tripId ? updatedTrip : trip)));
      },
      getTripById: (tripId) => trips.find((trip) => trip.id === tripId),
      getCurrentMemberForTrip: (tripId) =>
        trips.find((trip) => trip.id === tripId)?.members.find((member) => member.userId === currentUser.id),
      canEditTrip: (tripId) => trips.find((trip) => trip.id === tripId)?.createdByUserId === currentUser.id,
      canCompleteTrip: (tripId) => {
        const trip = trips.find((item) => item.id === tripId);
        return trip?.createdByUserId === currentUser.id && trip?.status === "active";
      },
      completeTrip: async (tripId) => {
        const trip = trips.find((item) => item.id === tripId);

        if (!trip) {
          throw new Error("Trip not found.");
        }

        if (trip.createdByUserId !== currentUser.id || trip.status !== "active") {
          throw new Error("Only the trip creator can complete an active trip.");
        }

        const transferSnapshot = settleTrip(
          expenses.filter((expense) => expense.tripId === tripId),
          trip.members.map((member) => member.id),
          trip.tripCurrencyCode
        ).transfers;
        const result = await repository.completeTrip(tripId, transferSnapshot);

        setTrips((current) => current.map((item) => (item.id === tripId ? result.trip : item)));
        setSettlementTransfers((current) => [
          ...current.filter((transfer) => transfer.tripId !== tripId),
          ...result.transfers
        ]);
      },
      getExpensesForTrip: (tripId) => expenses.filter((expense) => expense.tripId === tripId),
      getSettlementTransfersForTrip: (tripId) =>
        settlementTransfers.filter((transfer) => transfer.tripId === tripId),
      canEditExpense: (expenseId) => {
        const expense = expenses.find((item) => item.id === expenseId);
        const trip = expense ? trips.find((item) => item.id === expense.tripId) : null;
        return expense?.createdByUserId === currentUser.id && trip?.status === "active";
      },
      canMarkSettlementTransferPaid: (transferId) => {
        const transfer = settlementTransfers.find((item) => item.id === transferId);
        const trip = transfer ? trips.find((item) => item.id === transfer.tripId) : null;
        const member = transfer ? trip?.members.find((item) => item.id === transfer.fromMemberId) : null;

        return transfer?.status === "pending" && trip?.status === "completed" && member?.userId === currentUser.id;
      },
      markSettlementTransferPaid: async (transferId) => {
        const updatedTransfer = await repository.markSettlementTransferPaid(transferId);

        setSettlementTransfers((current) =>
          current.map((item) => (item.id === transferId ? updatedTransfer : item))
        );
      },
      canConfirmSettlementTransferReceived: (transferId) => {
        const transfer = settlementTransfers.find((item) => item.id === transferId);
        const trip = transfer ? trips.find((item) => item.id === transfer.tripId) : null;
        const member = transfer ? trip?.members.find((item) => item.id === transfer.toMemberId) : null;

        return transfer?.status === "paid" && trip?.status === "completed" && member?.userId === currentUser.id;
      },
      confirmSettlementTransferReceived: async (transferId) => {
        const updatedTransfer = await repository.confirmSettlementTransferReceived(transferId);
        const nextTransfers = settlementTransfers.map((item) => (item.id === transferId ? updatedTransfer : item));

        setSettlementTransfers(nextTransfers);
        setTrips((current) =>
          current.map((trip) => {
            if (trip.id !== updatedTransfer.tripId) {
              return trip;
            }

            const remainingTransfers = nextTransfers.filter(
              (item) => item.tripId === updatedTransfer.tripId && item.status !== "confirmed"
            );

            return remainingTransfers.length === 0
              ? { ...trip, status: "settled", settledAt: updatedTransfer.confirmedAt ?? new Date().toISOString() }
              : trip;
          })
        );
      },
      addExpense: async (tripId, draft) => {
        const expense = await repository.createExpense(tripId, draft);
        setExpenses((current) => [expense, ...current]);
      },
      updateExpense: async (expenseId, tripId, draft) => {
        const expense = await repository.updateExpense(expenseId, tripId, draft);
        setExpenses((current) => current.map((item) => (item.id === expenseId ? expense : item)));
      },
      deleteExpense: async (expenseId) => {
        await repository.deleteExpense(expenseId);
        setExpenses((current) => current.filter((item) => item.id !== expenseId));
      }
    }),
    [currentUser, expenses, isLoading, repository, session.authMode, session.signOut, settlementTransfers, trips]
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const context = useContext(TripsContext);

  if (!context) {
    throw new Error("useTrips must be used within TripsProvider");
  }

  return context;
}
