import type { Expense, Trip, UserProfile } from "@splitsy/domain";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { useSession } from "./session-provider";
import { AddExpenseInput, createTripsRepository, demoOwnerProfile } from "../services/trips-repository";

type TripsContextValue = {
  authMode: "supabase" | "demo";
  isLoading: boolean;
  currentUser: UserProfile;
  trips: Trip[];
  signOut: () => Promise<void>;
  createTrip: (input: { name: string; destination?: string; tripCurrencyCode: string }) => Promise<void>;
  addTripMember: (tripId: string, input: { displayName: string; email?: string }) => Promise<void>;
  getTripById: (tripId: string) => Trip | undefined;
  getExpensesForTrip: (tripId: string) => Expense[];
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
  const [isLoading, setIsLoading] = useState(true);
  const session = useSession();
  const repository = useMemo(() => createTripsRepository(), []);

  useEffect(() => {
    if (session.isLoading || !session.isAuthenticated) {
      setTrips([]);
      setExpenses([]);
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
      const loadedTrips = await repository.listTrips();
      setTrips(loadedTrips);
      const loadedExpenses = loadedTrips.length
        ? (await Promise.all(loadedTrips.map((trip) => repository.listExpenses(trip.id)))).flat()
        : [];
      setExpenses(loadedExpenses);
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
      getExpensesForTrip: (tripId) => expenses.filter((expense) => expense.tripId === tripId),
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
    [currentUser, expenses, isLoading, repository, session.authMode, session.signOut, trips]
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
