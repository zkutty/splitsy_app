export type CurrencyCode = string;

export type ExpenseCategoryId =
  | "lodging"
  | "food"
  | "transport"
  | "activities"
  | "groceries"
  | "nightlife"
  | "fees"
  | "misc"
  | "custom";

export type Member = {
  id: string;
  userId?: string | null;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  claimedAt?: string | null;
  isLinked?: boolean;
};

export type UserProfile = {
  id: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
};

export type Trip = {
  id: string;
  createdByUserId?: string | null;
  name: string;
  destination?: string | null;
  tripCurrencyCode: CurrencyCode;
  startDate?: string | null;
  endDate?: string | null;
  members: Member[];
};

export type ExpenseCategory = {
  id: ExpenseCategoryId;
  label: string;
};

export type ExpenseParticipant = {
  memberId: string;
};

export type Expense = {
  id: string;
  tripId: string;
  createdByUserId?: string | null;
  amount: number;
  currencyCode: CurrencyCode;
  conversionRateToTripCurrency: number;
  tripAmount: number;
  category: ExpenseCategoryId;
  customCategory?: string | null;
  note?: string | null;
  paidByMemberId: string;
  involvedMemberIds: string[];
  createdAt: string;
};

export type ExpenseDraft = {
  amount: number;
  currencyCode: CurrencyCode;
  category: ExpenseCategoryId;
  customCategory?: string | null;
  note?: string | null;
  paidByMemberId: string;
  involvedMemberIds: string[];
};

export type SettlementBalance = {
  memberId: string;
  paid: number;
  owed: number;
  net: number;
};

export type SettlementTransfer = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currencyCode: CurrencyCode;
};

export type TripSettlement = {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
  totalTripSpend: number;
  currencyCode: CurrencyCode;
};
