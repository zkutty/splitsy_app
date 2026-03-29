import type { Expense, Trip, UserProfile } from "./domain";

export const SAMPLE_USER: UserProfile = {
  id: "mia",
  email: "mia@example.com",
  displayName: "Mia",
  avatarUrl: null
};

export const SAMPLE_TRIP: Trip = {
  id: "trip_lisbon",
  createdByUserId: SAMPLE_USER.id,
  status: "active",
  name: "Lisbon Sprint",
  destination: "Lisbon",
  tripCurrencyCode: "EUR",
  startDate: "2026-05-08",
  endDate: "2026-05-13",
  members: [
    { id: "mia", userId: SAMPLE_USER.id, email: SAMPLE_USER.email, displayName: "Mia", isLinked: true, status: "active" },
    { id: "leo", email: "leo@example.com", displayName: "Leo", isLinked: false, status: "active" },
    { id: "zoe", email: "zoe@example.com", displayName: "Zoe", isLinked: false, status: "active" }
  ],
  groups: []
};

export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: "exp_1",
    tripId: SAMPLE_TRIP.id,
    createdByUserId: SAMPLE_USER.id,
    expenseDate: "2026-05-08",
    amount: 240,
    currencyCode: "EUR",
    conversionRateToTripCurrency: 1,
    tripAmount: 240,
    category: "lodging",
    note: "Apartment deposit",
    paidByMemberId: "mia",
    involvedMemberIds: ["mia", "leo", "zoe"],
    splitMode: "equal",
    splitShares: null,
    createdAt: "2026-03-24T14:00:00.000Z"
  },
  {
    id: "exp_2",
    tripId: SAMPLE_TRIP.id,
    createdByUserId: SAMPLE_USER.id,
    expenseDate: "2026-05-09",
    amount: 72,
    currencyCode: "USD",
    conversionRateToTripCurrency: 0.92,
    tripAmount: 66.24,
    category: "activities",
    note: "Museum tickets",
    paidByMemberId: "leo",
    involvedMemberIds: ["leo", "zoe"],
    splitMode: "equal",
    splitShares: null,
    createdAt: "2026-03-24T15:00:00.000Z"
  }
];
