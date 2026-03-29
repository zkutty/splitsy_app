import type {
  Expense,
  Member,
  MemberGroup,
  SettlementBalance,
  SettlementEntity,
  SettlementTransfer,
  TripSettlement
} from "./domain";
import { roundCurrency } from "./money";

const MIN_TRANSFER = 0.01;

type IndividualBalance = {
  memberId: string;
  paid: number;
  owed: number;
  net: number;
};

export const settleTrip = (
  expenses: Expense[],
  members: Member[],
  groups: MemberGroup[],
  currencyCode: string
): TripSettlement => {
  // Step 1: Calculate individual member balances (same as before)
  const individualBalances = new Map<string, IndividualBalance>();

  for (const member of members) {
    individualBalances.set(member.id, {
      memberId: member.id,
      paid: 0,
      owed: 0,
      net: 0
    });
  }

  for (const expense of expenses) {
    const payer = individualBalances.get(expense.paidByMemberId);

    if (!payer) {
      continue;
    }

    payer.paid = roundCurrency(payer.paid + expense.tripAmount);

    for (const memberId of expense.involvedMemberIds) {
      const memberBalance = individualBalances.get(memberId);

      if (!memberBalance) {
        continue;
      }

      let share: number;

      if (expense.splitMode === "byAmount" && expense.splitShares?.[memberId] != null) {
        // Share is stored in original currency — convert to trip currency
        share = roundCurrency(expense.splitShares[memberId] * expense.conversionRateToTripCurrency);
      } else if (expense.splitMode === "byPercentage" && expense.splitShares?.[memberId] != null) {
        share = roundCurrency(expense.tripAmount * expense.splitShares[memberId] / 100);
      } else {
        // Default: equal split
        share = roundCurrency(expense.tripAmount / expense.involvedMemberIds.length);
      }

      memberBalance.owed = roundCurrency(memberBalance.owed + share);
    }
  }

  // Calculate net for each individual
  for (const balance of individualBalances.values()) {
    balance.net = roundCurrency(balance.paid - balance.owed);
  }

  // Step 2: Determine settlement entity for each member
  const getSettlementEntity = (memberId: string): SettlementEntity => {
    const member = members.find(m => m.id === memberId);
    if (member?.groupId) {
      return { type: 'group', groupId: member.groupId };
    }
    return { type: 'member', memberId };
  };

  const getMemberDisplayName = (memberId: string): string => {
    return members.find(m => m.id === memberId)?.displayName ?? 'Unknown';
  };

  const getGroupDisplayName = (groupId: string): string => {
    return groups.find(g => g.id === groupId)?.name ?? 'Unknown Group';
  };

  // Step 3: Aggregate balances by settlement entity
  const entityBalances = new Map<string, SettlementBalance>();

  for (const individualBalance of individualBalances.values()) {
    const entity = getSettlementEntity(individualBalance.memberId);
    const key = entity.type === 'group' ? `g:${entity.groupId}` : `m:${entity.memberId}`;

    if (!entityBalances.has(key)) {
      const displayName = entity.type === 'group'
        ? getGroupDisplayName(entity.groupId)
        : getMemberDisplayName(entity.memberId);

      entityBalances.set(key, {
        entity,
        paid: 0,
        owed: 0,
        net: 0,
        displayName,
        isGroup: entity.type === 'group',
        memberBalances: []
      });
    }

    const eb = entityBalances.get(key)!;
    eb.paid = roundCurrency(eb.paid + individualBalance.paid);
    eb.owed = roundCurrency(eb.owed + individualBalance.owed);

    // Store individual member balances for expandable view
    if (eb.isGroup) {
      eb.memberBalances!.push({
        memberId: individualBalance.memberId,
        displayName: getMemberDisplayName(individualBalance.memberId),
        paid: individualBalance.paid,
        owed: individualBalance.owed,
        net: individualBalance.net
      });
    }
  }

  // Calculate net for each entity
  for (const balance of entityBalances.values()) {
    balance.net = roundCurrency(balance.paid - balance.owed);
  }

  const normalizedBalances = [...entityBalances.values()];

  // Step 4: Apply greedy algorithm on entity balances
  type EntityDebtCredit = {
    entity: SettlementEntity;
    displayName: string;
    amount: number;
  };

  const debtors: EntityDebtCredit[] = normalizedBalances
    .filter((balance) => balance.net < 0)
    .map((balance) => ({
      entity: balance.entity,
      displayName: balance.displayName,
      amount: Math.abs(balance.net)
    }))
    .sort((a, b) => b.amount - a.amount);

  const creditors: EntityDebtCredit[] = normalizedBalances
    .filter((balance) => balance.net > 0)
    .map((balance) => ({
      entity: balance.entity,
      displayName: balance.displayName,
      amount: balance.net
    }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundCurrency(Math.min(debtor.amount, creditor.amount));

    if (amount >= MIN_TRANSFER) {
      transfers.push({
        fromEntity: debtor.entity,
        toEntity: creditor.entity,
        amount,
        currencyCode,
        fromDisplayName: debtor.displayName,
        toDisplayName: creditor.displayName
      });
    }

    debtor.amount = roundCurrency(debtor.amount - amount);
    creditor.amount = roundCurrency(creditor.amount - amount);

    if (debtor.amount < MIN_TRANSFER) {
      debtorIndex += 1;
    }

    if (creditor.amount < MIN_TRANSFER) {
      creditorIndex += 1;
    }
  }

  return {
    balances: normalizedBalances,
    transfers,
    totalTripSpend: roundCurrency(expenses.reduce((sum, expense) => sum + expense.tripAmount, 0)),
    currencyCode
  };
};

