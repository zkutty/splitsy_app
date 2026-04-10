import type {
  EarlySettlement,
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

/**
 * Compute individual member balances from expenses.
 */
const computeIndividualBalances = (
  expenses: Expense[],
  members: Member[]
): Map<string, IndividualBalance> => {
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

  return individualBalances;
};

export const settleTrip = (
  expenses: Expense[],
  members: Member[],
  groups: MemberGroup[],
  currencyCode: string,
  earlySettlements?: EarlySettlement[]
): TripSettlement => {
  // Step 1: Calculate individual member balances
  const individualBalances = computeIndividualBalances(expenses, members);

  // Step 1b: Apply early settlement adjustments.
  // Each early settlement represents money already transferred between two members.
  // Adjust their balances so the departed member's net approaches zero.
  if (earlySettlements?.length) {
    for (const es of earlySettlements) {
      const fromBalance = individualBalances.get(es.fromMemberId);
      const toBalance = individualBalances.get(es.toMemberId);

      if (fromBalance) {
        // The payer already sent this amount out — credit their balance
        fromBalance.paid = roundCurrency(fromBalance.paid + es.amount);
        fromBalance.net = roundCurrency(fromBalance.paid - fromBalance.owed);
      }

      if (toBalance) {
        // The recipient already received this amount — debit their balance
        toBalance.owed = roundCurrency(toBalance.owed + es.amount);
        toBalance.net = roundCurrency(toBalance.paid - toBalance.owed);
      }
    }
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

  // Collect departed member IDs so we can exclude them from transfer generation
  const departedMemberIds = new Set(
    members.filter(m => m.status === 'departed').map(m => m.id)
  );

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

  // Step 4: Apply greedy algorithm on entity balances,
  // excluding departed members (their balances should be ~$0 after adjustments)
  type EntityDebtCredit = {
    entity: SettlementEntity;
    displayName: string;
    amount: number;
  };

  const isDepartedEntity = (entity: SettlementEntity): boolean => {
    return entity.type === 'member' && departedMemberIds.has(entity.memberId);
  };

  const debtors: EntityDebtCredit[] = normalizedBalances
    .filter((balance) => balance.net < 0 && !isDepartedEntity(balance.entity))
    .map((balance) => ({
      entity: balance.entity,
      displayName: balance.displayName,
      amount: Math.abs(balance.net)
    }))
    .sort((a, b) => b.amount - a.amount);

  const creditors: EntityDebtCredit[] = normalizedBalances
    .filter((balance) => balance.net > 0 && !isDepartedEntity(balance.entity))
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

/**
 * Compute settlement transfers for a single departing member.
 * Returns only the transfers that involve the departing member.
 */
export const settleEarlyDeparture = (
  expenses: Expense[],
  members: Member[],
  departingMemberId: string,
  currencyCode: string
): SettlementTransfer[] => {
  // Compute balances across all members (no groups — early departure settles at individual level)
  const individualBalances = computeIndividualBalances(expenses, members);

  const departingBalance = individualBalances.get(departingMemberId);
  if (!departingBalance || Math.abs(departingBalance.net) < MIN_TRANSFER) {
    return []; // Nothing to settle
  }

  const getMemberDisplayName = (memberId: string): string => {
    return members.find(m => m.id === memberId)?.displayName ?? 'Unknown';
  };

  // Build debtor/creditor lists from ALL members so the greedy algorithm
  // can pair the departing member optimally with whoever they owe or who owes them.
  type DebtCredit = { memberId: string; displayName: string; amount: number };

  const debtors: DebtCredit[] = [];
  const creditors: DebtCredit[] = [];

  for (const balance of individualBalances.values()) {
    if (balance.net < -MIN_TRANSFER) {
      debtors.push({ memberId: balance.memberId, displayName: getMemberDisplayName(balance.memberId), amount: Math.abs(balance.net) });
    } else if (balance.net > MIN_TRANSFER) {
      creditors.push({ memberId: balance.memberId, displayName: getMemberDisplayName(balance.memberId), amount: balance.net });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  // Run the greedy algorithm but only keep transfers involving the departing member
  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = roundCurrency(Math.min(debtor.amount, creditor.amount));

    if (amount >= MIN_TRANSFER) {
      const involvesDeparting = debtor.memberId === departingMemberId || creditor.memberId === departingMemberId;

      if (involvesDeparting) {
        transfers.push({
          fromEntity: { type: 'member', memberId: debtor.memberId },
          toEntity: { type: 'member', memberId: creditor.memberId },
          amount,
          currencyCode,
          fromDisplayName: debtor.displayName,
          toDisplayName: creditor.displayName
        });
      }
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

  return transfers;
};

