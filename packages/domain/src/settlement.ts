import type { Expense, SettlementBalance, SettlementTransfer, TripSettlement } from "./domain";
import { roundCurrency } from "./money";

const MIN_TRANSFER = 0.01;

export const settleTrip = (
  expenses: Expense[],
  memberIds: string[],
  currencyCode: string
): TripSettlement => {
  const balances = new Map<string, SettlementBalance>();

  for (const memberId of memberIds) {
    balances.set(memberId, {
      memberId,
      paid: 0,
      owed: 0,
      net: 0
    });
  }

  for (const expense of expenses) {
    const payer = balances.get(expense.paidByMemberId);

    if (!payer) {
      continue;
    }

    payer.paid = roundCurrency(payer.paid + expense.tripAmount);

    const share = roundCurrency(expense.tripAmount / expense.involvedMemberIds.length);

    for (const memberId of expense.involvedMemberIds) {
      const memberBalance = balances.get(memberId);

      if (!memberBalance) {
        continue;
      }

      memberBalance.owed = roundCurrency(memberBalance.owed + share);
    }
  }

  const normalizedBalances = [...balances.values()].map((balance) => ({
    ...balance,
    net: roundCurrency(balance.paid - balance.owed)
  }));

  const debtors = normalizedBalances
    .filter((balance) => balance.net < 0)
    .map((balance) => ({ memberId: balance.memberId, amount: Math.abs(balance.net) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = normalizedBalances
    .filter((balance) => balance.net > 0)
    .map((balance) => ({ memberId: balance.memberId, amount: balance.net }))
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
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount,
        currencyCode
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

