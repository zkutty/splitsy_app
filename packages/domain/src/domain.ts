export type CurrencyCode = string;
export type TripStatus = "active" | "completed" | "settled";
export type SettlementTransferStatus = "pending" | "paid" | "confirmed";
export type MemberStatus = "active" | "removed" | "departed";
export type SettlementType = "trip_completion" | "early_departure";
export type PaymentMethodType = "venmo" | "paypal" | "cashapp";
export type SplitMode = "equal" | "byAmount" | "byPercentage";

export type ExpenseCategoryId =
  | "lodging"
  | "food"
  | "transport"
  | "activities"
  | "groceries"
  | "nightlife"
  | "fees"
  | "misc"
  | "custom"
  | "settle_up";

export type Member = {
  id: string;
  userId?: string | null;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  claimedAt?: string | null;
  isLinked?: boolean;
  status?: MemberStatus;
  removedAt?: string | null;
  departedAt?: string | null;
  groupId?: string | null;
};

export type MemberGroup = {
  id: string;
  name: string;
  memberIds: string[];
};

export type UserProfile = {
  id: string;
  email?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  paymentMethodType?: PaymentMethodType | null;
  paymentMethodHandle?: string | null;
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
  isArchived?: boolean;
  members: Member[];
  groups: MemberGroup[];
};

export type ExpenseCategory = {
  id: ExpenseCategoryId;
  label: string;
};

export type ExpenseParticipant = {
  memberId: string;
  splitShare?: number | null;
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
  splitMode: SplitMode;
  splitShares?: Record<string, number> | null;
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
  splitMode: SplitMode;
  splitShares?: Record<string, number> | null;
};

export type SettlementEntity =
  | { type: 'member'; memberId: string }
  | { type: 'group'; groupId: string };

export type SettlementBalance = {
  entity: SettlementEntity;
  paid: number;
  owed: number;
  net: number;
  displayName: string;
  isGroup: boolean;
  memberBalances?: Array<{
    memberId: string;
    displayName: string;
    paid: number;
    owed: number;
    net: number;
  }>;
};

export type SettlementTransfer = {
  fromEntity: SettlementEntity;
  toEntity: SettlementEntity;
  amount: number;
  currencyCode: CurrencyCode;
  fromDisplayName: string;
  toDisplayName: string;
};

export type TripSettlementTransfer = {
  id: string;
  tripId: string;
  fromEntity: SettlementEntity;
  toEntity: SettlementEntity;
  amount: number;
  currencyCode: CurrencyCode;
  fromDisplayName: string;
  toDisplayName: string;
  status: SettlementTransferStatus;
  settlementType: SettlementType;
  departedMemberId?: string | null;
  paidMarkedAt?: string | null;
  paidMarkedByUserId?: string | null;
  confirmedAt?: string | null;
  confirmedByUserId?: string | null;
  createdAt: string;
};

export type EarlySettlement = {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
};

export type TripSettlement = {
  balances: SettlementBalance[];
  transfers: SettlementTransfer[];
  totalTripSpend: number;
  currencyCode: CurrencyCode;
};

export type ActivityEventType =
  | 'expense_added'
  | 'expense_edited'
  | 'expense_deleted'
  | 'member_added'
  | 'member_removed'
  | 'member_departed'
  | 'member_rejoined'
  | 'member_claimed'
  | 'settlement_paid'
  | 'settlement_confirmed'
  | 'trip_completed'
  | 'trip_settled';

export type TripActivityEvent = {
  id: string;
  tripId: string;
  eventType: ActivityEventType;
  actorUserId?: string | null;
  actorMemberId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, any> | null;
  createdAt: string;
};
