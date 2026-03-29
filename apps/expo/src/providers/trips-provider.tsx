import type { Expense, MemberGroup, PaymentMethodType, Trip, TripSettlementTransfer, UserProfile } from "@splitsy/domain";
import { settleTrip } from "@splitsy/domain";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { AppState, Platform } from "react-native";

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
  createTripInviteLink: (tripId: string) => Promise<string>;
  acceptTripInvite: (token: string) => Promise<string>;
  addTripMember: (tripId: string, input: { displayName: string; email?: string }) => Promise<void>;
  removeTripMember: (tripId: string, memberId: string) => Promise<void>;
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
  updatePaymentMethod: (type: PaymentMethodType | null, handle: string | null) => Promise<void>;
  getPaymentMethod: () => Promise<{ type: PaymentMethodType | null; handle: string | null }>;
  getPaymentMethodForUser: (userId: string) => Promise<{ type: PaymentMethodType | null; handle: string | null }>;
  createGroup: (tripId: string, name: string) => Promise<void>;
  updateGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMemberToGroup: (tripId: string, memberId: string, groupId: string) => Promise<void>;
  removeMemberFromGroup: (tripId: string, memberId: string) => Promise<void>;
  getGroupsForTrip: (tripId: string) => MemberGroup[];
  getMemberGroup: (tripId: string, memberId: string) => MemberGroup | undefined;
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

  const currentUser: UserProfile = useMemo(
    () =>
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
            },
    [session.authMode, session.user]
  );

  const reloadTripData = async (profile: UserProfile) => {
    if (!profile.id) {
      setTrips([]);
      setExpenses([]);
      setSettlementTransfers([]);
      return;
    }

    await repository.ensureProfile(profile);
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
  };

  useEffect(() => {
    if (session.isLoading || !session.isAuthenticated) {
      setTrips([]);
      setExpenses([]);
      setSettlementTransfers([]);
      setIsLoading(false);
      return;
    }

    if (!currentUser.id) {
      setIsLoading(false);
      return;
    }

    const load = async () => {
      setIsLoading(true);
      await reloadTripData(currentUser);
      setIsLoading(false);
    };

    load().catch((error) => {
      console.error("Failed to load trip data", error);
      setIsLoading(false);
    });
  }, [currentUser, repository, session.isAuthenticated, session.isLoading]);

  useEffect(() => {
    if (session.isLoading || !session.isAuthenticated || !currentUser.id) {
      return;
    }

    let cancelled = false;
    let refreshInFlight = false;

    const refresh = async () => {
      if (cancelled || refreshInFlight) {
        return;
      }

      refreshInFlight = true;

      try {
        await reloadTripData(currentUser);
      } catch (error) {
        console.error("Failed to refresh trip data", error);
      } finally {
        refreshInFlight = false;
      }
    };

    const intervalId = setInterval(() => {
      void refresh();
    }, 10_000);

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void refresh();
      }
    });

    const handleWebRefresh = () => {
      if (Platform.OS !== "web") {
        return;
      }

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      void refresh();
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.addEventListener("focus", handleWebRefresh);
      document.addEventListener("visibilitychange", handleWebRefresh);
    }

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      appStateSubscription.remove();

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.removeEventListener("focus", handleWebRefresh);
        document.removeEventListener("visibilitychange", handleWebRefresh);
      }
    };
  }, [currentUser, repository, session.isAuthenticated, session.isLoading]);

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
      createTripInviteLink: async (tripId) => repository.createTripInvite(tripId),
      acceptTripInvite: async (token) => {
        if (session.authMode === "supabase" && !session.user) {
          throw new Error("You must be signed in to accept an invite.");
        }

        await repository.ensureProfile(currentUser);
        const acceptedTripId = await repository.acceptTripInvite(token);
        setIsLoading(true);
        void reloadTripData(currentUser)
          .catch((error) => {
            console.error("Failed to reload trip data after accepting invite", error);
          })
          .finally(() => {
            setIsLoading(false);
          });
        return acceptedTripId;
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
      removeTripMember: async (tripId, memberId) => {
        const updatedTrip = await repository.removeTripMember(tripId, memberId);
        setTrips((current) => current.map((trip) => (trip.id === tripId ? updatedTrip : trip)));
      },
      getTripById: (tripId) => trips.find((trip) => trip.id === tripId),
      getCurrentMemberForTrip: (tripId) =>
        trips
          .find((trip) => trip.id === tripId)
          ?.members.find((member) => member.userId === currentUser.id && (member.status ?? "active") === "active"),
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
          trip.members,
          trip.groups || [],
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

        if (!transfer || !trip || transfer.status !== "pending" || trip.status !== "completed") {
          return false;
        }

        // For member transfers
        if (transfer.fromEntity.type === 'member') {
          const fromEntity = transfer.fromEntity;
          const member = trip.members.find((item) => item.id === fromEntity.memberId);
          return member?.userId === currentUser.id;
        }

        // For group transfers - any member of the group can mark paid
        if (transfer.fromEntity.type === 'group') {
          const fromEntity = transfer.fromEntity;
          return trip.members.some(
            (member) => member.groupId === fromEntity.groupId && member.userId === currentUser.id
          );
        }

        return false;
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

        if (!transfer || !trip || transfer.status !== "paid" || trip.status !== "completed") {
          return false;
        }

        // For member transfers
        if (transfer.toEntity.type === 'member') {
          const toEntity = transfer.toEntity;
          const member = trip.members.find((item) => item.id === toEntity.memberId);
          return member?.userId === currentUser.id;
        }

        // For group transfers - any member of the group can confirm
        if (transfer.toEntity.type === 'group') {
          const toEntity = transfer.toEntity;
          return trip.members.some(
            (member) => member.groupId === toEntity.groupId && member.userId === currentUser.id
          );
        }

        return false;
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
      },
      updatePaymentMethod: async (type, handle) => {
        await repository.updatePaymentMethod(type, handle);
      },
      getPaymentMethod: async () => {
        return repository.getPaymentMethod();
      },
      getPaymentMethodForUser: async (userId) => {
        return repository.getPaymentMethodForUser(userId);
      },
      createGroup: async (tripId, name) => {
        const newGroup = await repository.createGroup(tripId, name);

        setTrips((current) =>
          current.map((trip) =>
            trip.id === tripId
              ? {
                  ...trip,
                  groups: [...(trip.groups || []), newGroup]
                }
              : trip
          )
        );
      },
      updateGroup: async (groupId, name) => {
        const updatedGroup = await repository.updateGroup(groupId, name);

        setTrips((current) =>
          current.map((trip) => ({
            ...trip,
            groups: (trip.groups || []).map((g) => (g.id === groupId ? updatedGroup : g))
          }))
        );
      },
      deleteGroup: async (groupId) => {
        await repository.deleteGroup(groupId);

        setTrips((current) =>
          current.map((trip) => ({
            ...trip,
            groups: (trip.groups || []).filter((g) => g.id !== groupId),
            members: trip.members.map((member) =>
              member.groupId === groupId ? { ...member, groupId: null } : member
            )
          }))
        );
      },
      addMemberToGroup: async (tripId, memberId, groupId) => {
        await repository.addMemberToGroup(memberId, groupId);

        setTrips((current) =>
          current.map((trip) => {
            if (trip.id !== tripId) {
              return trip;
            }

            const updatedMembers = trip.members.map((member) =>
              member.id === memberId ? { ...member, groupId } : member
            );

            const updatedGroups = (trip.groups || []).map((group) => ({
              ...group,
              memberIds: updatedMembers
                .filter((m) => m.groupId === group.id)
                .map((m) => m.id)
            }));

            return {
              ...trip,
              members: updatedMembers,
              groups: updatedGroups
            };
          })
        );
      },
      removeMemberFromGroup: async (tripId, memberId) => {
        await repository.removeMemberFromGroup(memberId);

        setTrips((current) =>
          current.map((trip) => {
            if (trip.id !== tripId) {
              return trip;
            }

            const updatedMembers = trip.members.map((member) =>
              member.id === memberId ? { ...member, groupId: null } : member
            );

            const updatedGroups = (trip.groups || []).map((group) => ({
              ...group,
              memberIds: updatedMembers
                .filter((m) => m.groupId === group.id)
                .map((m) => m.id)
            }));

            return {
              ...trip,
              members: updatedMembers,
              groups: updatedGroups
            };
          })
        );
      },
      getGroupsForTrip: (tripId) => {
        const trip = trips.find((t) => t.id === tripId);
        return trip?.groups || [];
      },
      getMemberGroup: (tripId, memberId) => {
        const trip = trips.find((t) => t.id === tripId);
        const member = trip?.members.find((m) => m.id === memberId);

        if (!member?.groupId) {
          return undefined;
        }

        return trip?.groups?.find((g) => g.id === member.groupId);
      }
    }),
    [currentUser, expenses, isLoading, repository, session.authMode, session.signOut, session.user, settlementTransfers, trips]
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
