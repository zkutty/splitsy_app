import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { PRESET_CATEGORIES, settleTrip, validateExpenseDraft } from "@splitsy/domain";
import type { Expense } from "@splitsy/domain";

import { formatCurrency } from "../../src/lib/format";
import { getConversionRate, MAJOR_CURRENCIES } from "../../src/lib/rates";
import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppInput } from "../../src/ui/primitives/AppInput";
import { AppText } from "../../src/ui/primitives/AppText";
import { Chip } from "../../src/ui/primitives/Chip";
import { SectionCard } from "../../src/ui/primitives/SectionCard";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { theme } from "../../src/ui/theme";

export default function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const {
    getTripById,
    getCurrentMemberForTrip,
    canEditTrip,
    getExpensesForTrip,
    canEditExpense,
    addExpense,
    updateExpense,
    deleteExpense,
    addTripMember,
    isLoading
  } = useTrips();
  const trip = getTripById(tripId);
  const currentMember = getCurrentMemberForTrip(tripId);
  const mayManageTrip = canEditTrip(tripId);
  const expenses = getExpensesForTrip(tripId);
  const { width } = useWindowDimensions();
  const wide = width >= 1040;

  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [currencyCode, setCurrencyCode] = useState(trip?.tripCurrencyCode ?? "USD");
  const [category, setCategory] = useState(PRESET_CATEGORIES[0].id);
  const [customCategory, setCustomCategory] = useState("");
  const [note, setNote] = useState("");
  const [paidByMemberId, setPaidByMemberId] = useState(trip?.members[0]?.id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(trip?.members.map((member) => member.id) ?? []);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  useEffect(() => {
    if (!trip) {
      return;
    }

    if (!paidByMemberId && trip.members[0]) {
      setPaidByMemberId(trip.members[0].id);
    }

    if (selectedMembers.length === 0) {
      setSelectedMembers(trip.members.map((member) => member.id));
    }
  }, [paidByMemberId, selectedMembers.length, trip]);

  useEffect(() => {
    if (trip) {
      setCurrencyCode(trip.tripCurrencyCode);
    }
  }, [trip?.id, trip?.tripCurrencyCode]);

  useEffect(() => {
    if (!editingExpenseId) {
      setExpenseDate(new Date().toISOString().slice(0, 10));
    }
  }, [editingExpenseId]);

  const settlement = useMemo(() => {
    if (!trip) {
      return null;
    }

    return settleTrip(
      expenses,
      trip.members.map((member) => member.id),
      trip.tripCurrencyCode
    );
  }, [expenses, trip]);

  const tripCreator = trip?.members.find((member) => member.userId === trip.createdByUserId);

  if (isLoading) {
    return (
      <AppScreen>
        <SurfaceCard>
          <AppText variant="sectionTitle">Loading trip...</AppText>
        </SurfaceCard>
      </AppScreen>
    );
  }

  if (!trip) {
    return (
      <AppScreen>
        <SurfaceCard>
          <AppText variant="sectionTitle">Trip not found.</AppText>
        </SurfaceCard>
      </AppScreen>
    );
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const submitExpense = async () => {
    const numericAmount = Number(amount);
    const draft = {
      expenseDate,
      amount: numericAmount,
      currencyCode: currencyCode.toUpperCase(),
      category,
      customCategory,
      note,
      paidByMemberId,
      involvedMemberIds: selectedMembers
    };
    const result = validateExpenseDraft(draft);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const rate = getConversionRate(draft.currencyCode, trip.tripCurrencyCode);

    setIsSavingExpense(true);

    try {
      const expensePayload = {
        ...draft,
        conversionRateToTripCurrency: rate,
        tripAmount: Math.round(numericAmount * rate * 100) / 100
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, trip.id, expensePayload);
      } else {
        await addExpense(trip.id, expensePayload);
      }

      setAmount("");
      setNote("");
      setCustomCategory("");
      setEditingExpenseId(null);
      setErrors([]);
    } finally {
      setIsSavingExpense(false);
    }
  };

  const startEditingExpense = (expense: Expense) => {
    if (!canEditExpense(expense.id)) {
      return;
    }

    setEditingExpenseId(expense.id);
    setAmount(String(expense.amount));
    setExpenseDate(expense.expenseDate);
    setCurrencyCode(expense.currencyCode);
    setCategory(expense.category);
    setCustomCategory(expense.customCategory ?? "");
    setNote(expense.note ?? "");
    setPaidByMemberId(expense.paidByMemberId);
    setSelectedMembers(expense.involvedMemberIds);
    setErrors([]);
  };

  const cancelEditingExpense = () => {
    setEditingExpenseId(null);
    setAmount("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setCurrencyCode(trip.tripCurrencyCode);
    setCategory(PRESET_CATEGORIES[0].id);
    setCustomCategory("");
    setNote("");
    setPaidByMemberId(trip.members[0]?.id ?? "");
    setSelectedMembers(trip.members.map((member) => member.id));
    setErrors([]);
  };

  const removeExpense = async (expenseId: string) => {
    if (!canEditExpense(expenseId)) {
      return;
    }

    await deleteExpense(expenseId);

    if (editingExpenseId === expenseId) {
      cancelEditingExpense();
    }
  };

  const submitMember = async () => {
    if (!memberName.trim()) {
      return;
    }

    setIsAddingMember(true);

    try {
      await addTripMember(trip.id, {
        displayName: memberName,
        email: memberEmail
      });

      setMemberName("");
      setMemberEmail("");
    } finally {
      setIsAddingMember(false);
    }
  };

  return (
    <AppScreen maxWidth={1200}>
      <View style={[styles.layout, wide ? styles.layoutWide : null]}>
        <View style={styles.primaryColumn}>
          <SurfaceCard tone="hero" style={styles.summaryCard}>
            <AppText variant="eyebrow" color="accent">
              Trip Summary
            </AppText>
            <AppText variant="title" color="inverse">
              {trip.name}
            </AppText>
            <AppText variant="bodySm" color="accent">
              {trip.destination ?? "No destination"} · settle in {trip.tripCurrencyCode}
            </AppText>
            <AppText variant="bodySm" color="accent">
              {trip.startDate ? `${trip.startDate}${trip.endDate ? ` to ${trip.endDate}` : ""}` : "Dates not set"}
            </AppText>
            <AppText variant="bodySm" color="accent">
              {tripCreator ? `Created by ${tripCreator.displayName}` : "Creator metadata unavailable"} ·{" "}
              {currentMember ? `Signed in as ${currentMember.displayName}` : "You are viewing this trip as a guest member"}
            </AppText>
            <AppText variant="sectionTitle" color="inverse">
              {settlement ? formatCurrency(settlement.totalTripSpend, settlement.currencyCode) : ""}
            </AppText>
          </SurfaceCard>

          <SectionCard
            title={editingExpenseId ? "Edit expense" : "Add expense"}
            description={
              editingExpenseId
                ? "Only the person who added an expense can edit it."
                : "Any linked trip member can add expenses. Only the creator of an expense can edit or delete it."
            }
          >
            <AppInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="48.00"
              keyboardType="decimal-pad"
            />
            <AppInput
              label="Expense date"
              value={expenseDate}
              onChangeText={setExpenseDate}
              placeholder="2026-06-10"
              helperText="Use YYYY-MM-DD."
            />
            <View style={styles.group}>
              <AppText variant="meta" color="muted">
                Original currency
              </AppText>
              <View style={styles.chipWrap}>
                {MAJOR_CURRENCIES.map((currency) => (
                  <Chip
                    key={currency.code}
                    label={currency.code}
                    selected={currencyCode === currency.code}
                    onPress={() => setCurrencyCode(currency.code)}
                  />
                ))}
              </View>
              <AppText variant="bodySm" color="muted">
                Expense amounts are converted into {trip.tripCurrencyCode} for settlement.
              </AppText>
            </View>
            <AppInput label="Note" value={note} onChangeText={setNote} placeholder="Dinner by the river" />

            <View style={styles.group}>
              <AppText variant="meta" color="muted">
                Category
              </AppText>
              <View style={styles.chipWrap}>
                {PRESET_CATEGORIES.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    selected={category === item.id}
                    onPress={() => setCategory(item.id)}
                  />
                ))}
              </View>
            </View>

            {category === "custom" ? (
              <AppInput
                label="Custom category"
                value={customCategory}
                onChangeText={setCustomCategory}
                placeholder="Tickets"
              />
            ) : null}

            <View style={styles.group}>
              <AppText variant="meta" color="muted">
                Paid by
              </AppText>
              <View style={styles.chipWrap}>
                {trip.members.map((member) => (
                  <Chip
                    key={member.id}
                    label={member.displayName}
                    selected={paidByMemberId === member.id}
                    onPress={() => setPaidByMemberId(member.id)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <AppText variant="meta" color="muted">
                Involved members
              </AppText>
              <View style={styles.chipWrap}>
                {trip.members.map((member) => {
                  const selected = selectedMembers.includes(member.id);

                  return (
                    <Chip
                      key={member.id}
                      label={member.displayName}
                      selected={selected}
                      onPress={() => toggleMember(member.id)}
                    />
                  );
                })}
              </View>
            </View>

            {errors.length > 0 ? (
              <SurfaceCard tone="muted" style={styles.errorBox}>
                {errors.map((error) => (
                  <AppText key={error} variant="bodySm" color="danger">
                    {error}
                  </AppText>
                ))}
              </SurfaceCard>
            ) : null}

            <View style={styles.actionRow}>
              <AppButton onPress={submitExpense} disabled={isSavingExpense}>
                {isSavingExpense ? "Saving..." : editingExpenseId ? "Save changes" : "Save expense"}
              </AppButton>
              {editingExpenseId ? (
                <AppButton onPress={cancelEditingExpense} variant="secondary">
                  Cancel edit
                </AppButton>
              ) : null}
            </View>
          </SectionCard>

          <SectionCard
            title="Expenses"
            description="Every expense keeps the original amount and the converted trip value."
          >
            {expenses.length ? (
              expenses.map((expense) => (
                <View key={expense.id} style={styles.rowCard}>
                  <View style={styles.rowCopy}>
                    <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                      {expense.note || expense.category}
                    </AppText>
                    <AppText variant="bodySm" color="muted">
                      {formatCurrency(expense.amount, expense.currencyCode)} {"->"}{" "}
                      {formatCurrency(expense.tripAmount, trip.tripCurrencyCode)}
                    </AppText>
                    <AppText variant="bodySm" color="muted">
                      On {expense.expenseDate}
                    </AppText>
                    <AppText variant="bodySm" color="muted">
                      Added by{" "}
                      {trip.members.find((member) => member.userId === expense.createdByUserId)?.displayName ?? "Unknown"}
                    </AppText>
                  </View>
                  <View style={styles.expenseMeta}>
                    <AppText variant="bodySm" color="muted">
                      {expense.involvedMemberIds.length} people
                    </AppText>
                    {canEditExpense(expense.id) ? (
                      <View style={styles.expenseActions}>
                        <AppButton onPress={() => startEditingExpense(expense)} variant="secondary" fullWidth={false}>
                          Edit
                        </AppButton>
                        <AppButton onPress={() => removeExpense(expense.id)} variant="secondary" fullWidth={false}>
                          Delete
                        </AppButton>
                      </View>
                    ) : (
                      <AppText variant="bodySm" color="muted">
                        View only
                      </AppText>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <AppText variant="bodySm" color="muted">
                No expenses yet. Add the first one above to start balancing the trip.
              </AppText>
            )}
          </SectionCard>
        </View>

        <View style={styles.secondaryColumn}>
          <SectionCard title="Balances" description="Positive values are owed back. Negative values still owe the group.">
            {settlement?.balances.map((balance) => {
              const member = trip.members.find((item) => item.id === balance.memberId);

              return (
                <View key={balance.memberId} style={styles.rowCard}>
                  <View style={styles.rowCopy}>
                    <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                      {member?.displayName ?? balance.memberId}
                    </AppText>
                    <AppText variant="bodySm" color="muted">
                      Paid {formatCurrency(balance.paid, trip.tripCurrencyCode)} · Owes{" "}
                      {formatCurrency(balance.owed, trip.tripCurrencyCode)}
                    </AppText>
                  </View>
                  <AppText
                    variant="bodySm"
                    color={balance.net < 0 ? "danger" : balance.net > 0 ? "success" : "muted"}
                    style={styles.netAmount}
                  >
                    {formatCurrency(balance.net, trip.tripCurrencyCode)}
                  </AppText>
                </View>
              );
            })}
          </SectionCard>

          <SectionCard title="Repayments" description="SplitTrip minimizes the number of transfers needed to settle up.">
            {settlement?.transfers.length ? (
              settlement.transfers.map((transfer) => {
                const from = trip.members.find((member) => member.id === transfer.fromMemberId);
                const to = trip.members.find((member) => member.id === transfer.toMemberId);

                return (
                  <View key={`${transfer.fromMemberId}-${transfer.toMemberId}`} style={styles.rowCard}>
                    <View style={styles.rowCopy}>
                      <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                        {from?.displayName} pays {to?.displayName}
                      </AppText>
                    </View>
                    <AppText variant="bodySm" color="primary" style={styles.netAmount}>
                      {formatCurrency(transfer.amount, transfer.currencyCode)}
                    </AppText>
                  </View>
                );
              })
            ) : (
              <AppText variant="bodySm" color="muted">
                Trip is already settled.
              </AppText>
            )}
          </SectionCard>

          <SectionCard
            title="Members"
            description={
              mayManageTrip
                ? "Invite everyone who should be included in balances and settlements."
                : "You can see everyone on the trip. Only the trip creator can manage membership."
            }
          >
            <View style={styles.chipWrap}>
              {trip.members.map((member) => (
                <View key={member.id} style={styles.memberStatusCard}>
                  <Chip label={member.displayName} tone={member.isLinked ? "success" : "default"} />
                  <AppText variant="bodySm" color="muted">
                    {member.isLinked ? "Linked account" : member.email ? `Invite pending: ${member.email}` : "Manual member"}
                  </AppText>
                </View>
              ))}
            </View>
            {mayManageTrip ? (
              <>
                <AppInput
                  label="New member name"
                  value={memberName}
                  onChangeText={setMemberName}
                  placeholder="Emma"
                />
                <AppInput
                  label="Member email"
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  placeholder="emma@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  helperText="Add an email if you want this person to automatically claim the trip when they sign in."
                />
                <AppButton onPress={submitMember} variant="secondary" disabled={isAddingMember}>
                  {isAddingMember ? "Adding..." : "Add member"}
                </AppButton>
              </>
            ) : null}
          </SectionCard>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  layout: {
    gap: theme.spacing.lg
  },
  layoutWide: {
    flexDirection: "row",
    alignItems: "flex-start"
  },
  primaryColumn: {
    flex: 1.5,
    gap: theme.spacing.lg
  },
  secondaryColumn: {
    flex: 1,
    gap: theme.spacing.lg
  },
  summaryCard: {
    gap: theme.spacing.sm
  },
  group: {
    gap: theme.spacing.sm
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  memberStatusCard: {
    gap: theme.spacing.xxs
  },
  errorBox: {
    padding: theme.spacing.md
  },
  actionRow: {
    gap: theme.spacing.sm
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle
  },
  rowCopy: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  rowTitle: {
    fontWeight: theme.type.weight.semibold
  },
  netAmount: {
    fontWeight: theme.type.weight.bold
  },
  expenseMeta: {
    alignItems: "flex-end",
    gap: theme.spacing.sm
  },
  expenseActions: {
    flexDirection: "row",
    gap: theme.spacing.xs
  }
});
