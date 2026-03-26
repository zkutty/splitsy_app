export type CurrencyCode = string;
export type TripStatus = "active" | "completed" | "settled";
export type SettlementTransferStatus = "pending" | "paid" | "confirmed";

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
  status?: TripStatus;
  name: string;
  destination?: string | null;
  tripCurrencyCode: CurrencyCode;
  startDate?: string | null;
  endDate?: string | null;
  completedAt?: string | null;
  completedByUserId?: string | null;
  settledAt?: string | null;
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
  expenseDate: string;
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
  expenseDate: string;
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

export type TripSettlementTransfer = SettlementTransfer & {
  id: string;
  tripId: string;
  status: SettlementTransferStatus;
  paidMarkedAt?: string | null;
  paidMarkedByUserId?: string | null;
  confirmedAt?: string | null;
  confirmedByUserId?: string | null;
  createdAt: string;
};

export type TripSettlement = {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
  totalTripSpend: number;
  currencyCode: CurrencyCode;
};
