import { Platform, Share } from "react-native";
import type { Expense, Trip, TripSettlement, TripSettlementTransfer } from "@splitsy/domain";
import { getCategoryLabel } from "./expense-utils";
import { formatCurrency } from "./format";

function csvEscape(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(...fields: (string | number | null | undefined)[]): string {
  return fields.map(csvEscape).join(",");
}

export function buildTripCsv(
  trip: Trip,
  expenses: Expense[],
  settlement: TripSettlement | null,
  persistedTransfers: TripSettlementTransfer[]
): string {
  const currency = trip.tripCurrencyCode;
  const lines: string[] = [];

  // Trip header
  lines.push(csvRow("Trip", trip.name));
  if (trip.destination) lines.push(csvRow("Destination", trip.destination));
  lines.push(csvRow("Currency", currency));
  if (trip.startDate || trip.endDate) {
    lines.push(csvRow("Dates", `${trip.startDate ?? ""}${trip.endDate ? ` to ${trip.endDate}` : ""}`));
  }
  lines.push(csvRow("Status", trip.status ?? "active"));
  if (settlement) {
    lines.push(csvRow("Total Spend", formatCurrency(settlement.totalTripSpend, currency)));
  }
  lines.push("");

  // Expenses
  lines.push(`EXPENSES (${expenses.length})`);
  lines.push(
    csvRow("Date", "Description", "Category", "Original Amount", "Original Currency", `${currency} Amount`, "Paid By", "Split Among", "Split Mode")
  );

  const sortedExpenses = [...expenses].sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));

  for (const expense of sortedExpenses) {
    const paidBy = trip.members.find((m) => m.id === expense.paidByMemberId)?.displayName ?? "Unknown";
    const splitAmong = expense.involvedMemberIds
      .map((id) => trip.members.find((m) => m.id === id)?.displayName ?? "Unknown")
      .join(", ");
    const categoryLabel =
      expense.category === "custom" && expense.customCategory
        ? expense.customCategory
        : getCategoryLabel(expense.category);
    const splitModeLabel =
      expense.splitMode === "equal" ? "Equal" : expense.splitMode === "byAmount" ? "By amount" : "By %";

    lines.push(
      csvRow(
        expense.expenseDate,
        expense.note || categoryLabel,
        categoryLabel,
        expense.amount,
        expense.currencyCode,
        formatCurrency(expense.tripAmount, currency),
        paidBy,
        splitAmong,
        splitModeLabel
      )
    );
  }
  lines.push("");

  // Balances
  if (settlement?.balances.length) {
    lines.push("BALANCES");
    lines.push(csvRow(`Member / Group`, `Paid (${currency})`, `Owed (${currency})`, `Net (${currency})`));
    for (const balance of settlement.balances) {
      lines.push(
        csvRow(
          balance.displayName,
          formatCurrency(balance.paid, currency),
          formatCurrency(balance.owed, currency),
          formatCurrency(balance.net, currency)
        )
      );
    }
    lines.push("");
  }

  // Settlement transfers (persisted for completed trips, calculated for active)
  const transfers: Array<{ fromDisplayName: string; toDisplayName: string; amount: number; status?: string }> =
    persistedTransfers.length > 0 ? persistedTransfers : (settlement?.transfers ?? []);

  if (transfers.length) {
    const sectionTitle = persistedTransfers.length > 0 ? "FINAL PAYMENTS" : "SETTLEMENT TRANSFERS";
    const hasStatus = persistedTransfers.length > 0;
    lines.push(sectionTitle);
    lines.push(csvRow("From", "To", `Amount (${currency})`, ...(hasStatus ? ["Status"] : [])));
    for (const t of transfers) {
      lines.push(
        csvRow(t.fromDisplayName, t.toDisplayName, formatCurrency(t.amount, currency), ...(t.status ? [t.status] : []))
      );
    }
  }

  return lines.join("\n");
}

export async function exportTripCsv(
  trip: Trip,
  expenses: Expense[],
  settlement: TripSettlement | null,
  persistedTransfers: TripSettlementTransfer[]
): Promise<void> {
  const csv = buildTripCsv(trip, expenses, settlement, persistedTransfers);
  const filename = `${trip.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-expenses.csv`;

  if (Platform.OS === "web") {
    if (typeof document === "undefined") return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({ title: filename, message: csv });
}
