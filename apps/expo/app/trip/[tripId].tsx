import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { Platform, Share, StyleSheet, View, useWindowDimensions } from "react-native";

import { PRESET_CATEGORIES, settleTrip, validateExpenseDraft } from "@splitsy/domain";
import type { Expense, TripSettlementTransfer } from "@splitsy/domain";

import { formatCurrency } from "../../src/lib/format";
import { getConversionRate, MAJOR_CURRENCIES } from "../../src/lib/rates";
import { useSession } from "../../src/providers/session-provider";
import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppInput } from "../../src/ui/primitives/AppInput";
import { AppText } from "../../src/ui/primitives/AppText";
import { Chip } from "../../src/ui/primitives/Chip";
import { SectionCard } from "../../src/ui/primitives/SectionCard";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../../src/ui/theme";

export default function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const session = useSession();
  const {
    getTripById,
    getCurrentMemberForTrip,
    canEditTrip,
    canCompleteTrip,
    completeTrip,
    createTripInviteLink,
    getExpensesForTrip,
    getSettlementTransfersForTrip,
    canEditExpense,
    canMarkSettlementTransferPaid,
    markSettlementTransferPaid,
    canConfirmSettlementTransferReceived,
    confirmSettlementTransferReceived,
    addExpense,
    updateExpense,
    deleteExpense,
    addTripMember,
    removeTripMember,
    isLoading
  } = useTrips();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const trip = getTripById(tripId);
  const currentMember = getCurrentMemberForTrip(tripId);
  const mayManageTrip = canEditTrip(tripId);
  const mayCompleteTrip = canCompleteTrip(tripId);
  const expenses = getExpensesForTrip(tripId);
  const persistedTransfers = getSettlementTransfersForTrip(tripId);
  const { width } = useWindowDimensions();
  const wide = width >= 1040;
  const compact = width < 768;

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
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

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
  const isTripActive = trip?.status === "active";
  const activeMembers = useMemo(
    () => trip?.members.filter((member) => (member.status ?? "active") === "active") ?? [],
    [trip?.members]
  );
  const expenseFormMembers = useMemo(
    () =>
      trip?.members.filter(
        (member) =>
          (member.status ?? "active") === "active" ||
          member.id === paidByMemberId ||
          selectedMembers.includes(member.id)
      ) ?? [],
    [paidByMemberId, selectedMembers, trip?.members]
  );

  useEffect(() => {
    if (!trip) {
      return;
    }

    if (!paidByMemberId && activeMembers[0]) {
      setPaidByMemberId(activeMembers[0].id);
    }

    if (selectedMembers.length === 0) {
      setSelectedMembers(activeMembers.map((member) => member.id));
    }
  }, [activeMembers, paidByMemberId, selectedMembers.length, trip]);

  useEffect(() => {
    if (!activeMembers.length) {
      return;
    }

    if (!activeMembers.some((member) => member.id === paidByMemberId)) {
      setPaidByMemberId(activeMembers[0].id);
    }

    setSelectedMembers((current) => {
      const filtered = current.filter((memberId) => activeMembers.some((member) => member.id === memberId));
      return filtered.length ? filtered : activeMembers.map((member) => member.id);
    });
  }, [activeMembers, paidByMemberId]);

  if (!session.isLoading && !session.isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

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
    if (!isTripActive) {
      setErrors(["Completed trips are read-only."]);
      return;
    }

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
    setPaidByMemberId(activeMembers[0]?.id ?? "");
    setSelectedMembers(activeMembers.map((member) => member.id));
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
    if (!isTripActive || !memberName.trim()) {
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

  const removeMemberFromTrip = async (memberId: string) => {
    setActiveMemberId(memberId);

    try {
      await removeTripMember(trip.id, memberId);
    } finally {
      setActiveMemberId(null);
    }
  };

  const runCompleteTrip = async () => {
    if (!mayCompleteTrip) {
      return;
    }

    setIsCompletingTrip(true);

    try {
      await completeTrip(trip.id);
    } finally {
      setIsCompletingTrip(false);
    }
  };

  const markTransferPaid = async (transferId: string) => {
    setActiveTransferId(transferId);

    try {
      await markSettlementTransferPaid(transferId);
    } finally {
      setActiveTransferId(null);
    }
  };

  const confirmTransferReceived = async (transferId: string) => {
    setActiveTransferId(transferId);

    try {
      await confirmSettlementTransferReceived(transferId);
    } finally {
      setActiveTransferId(null);
    }
  };

  const renderPersistedTransferActions = (transfer: TripSettlementTransfer) => {
    if (canMarkSettlementTransferPaid(transfer.id)) {
      return (
        <AppButton
          onPress={() => markTransferPaid(transfer.id)}
          variant="secondary"
          fullWidth={false}
          disabled={activeTransferId === transfer.id}
        >
          {activeTransferId === transfer.id ? "Saving..." : "Mark paid"}
        </AppButton>
      );
    }

    if (canConfirmSettlementTransferReceived(transfer.id)) {
      return (
        <AppButton
          onPress={() => confirmTransferReceived(transfer.id)}
          variant="secondary"
          fullWidth={false}
          disabled={activeTransferId === transfer.id}
        >
          {activeTransferId === transfer.id ? "Saving..." : "Confirm received"}
        </AppButton>
      );
    }

    return null;
  };

  const buildInviteUrl = (token: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `${window.location.origin}/join/${token}`;
    }

    return Linking.createURL(`/join/${token}`);
  };

  const createInviteLinkValue = async (): Promise<string | null> => {
    if (!mayManageTrip || !isTripActive) {
      return null;
    }

    setIsCreatingInvite(true);
    setInviteError(null);
    setInviteFeedback(null);

    try {
      const token = await createTripInviteLink(trip.id);
      const nextInviteLink = buildInviteUrl(token);
      setInviteLink(nextInviteLink);
      setInviteFeedback("Invite link ready.");

      return nextInviteLink;
    } catch (error) {
      if (error instanceof Error) {
        setInviteError(error.message);
      } else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        setInviteError(error.message);
      } else {
        setInviteError("Unable to create an invite link.");
      }
      return null;
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const inviteTrip = async (): Promise<void> => {
    const link = inviteLink || (await createInviteLinkValue());

    if (!link) {
      return;
    }

    if (
      Platform.OS === "web" &&
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(link);
        setInviteFeedback("Invite link copied to clipboard.");
        return;
      } catch {
        setInviteFeedback("Invite link created. Copy it from the field below.");
        return;
      }
    }

    await Share.share({
      message: `Join my SplitTrip workspace: ${link}`,
      url: link
    });
  };

  return (
    <AppScreen maxWidth={1200}>
      <View style={[styles.layout, wide ? styles.layoutWide : null]}>
        <View style={styles.primaryColumn}>
          <SurfaceCard tone="hero" style={styles.summaryCard}>
            <AppText variant="eyebrow" color="accent">
              Trip Summary
            </AppText>
            <AppText variant={compact ? "sectionTitle" : "title"} color="inverse">
              {trip.name}
            </AppText>
            <AppText variant="bodySm" color="accent">
              {trip.destination ?? "No destination"} · settle in {trip.tripCurrencyCode}
            </AppText>
            <AppText variant="bodySm" color="accent">
              {trip.startDate ? `${trip.startDate}${trip.endDate ? ` to ${trip.endDate}` : ""}` : "Dates not set"}
            </AppText>
            <AppText variant="bodySm" color="accent">
              Status: {trip.status ?? "active"}
            </AppText>
            <AppText variant="bodySm" color="accent">
              {tripCreator ? `Created by ${tripCreator.displayName}` : "Creator metadata unavailable"} ·{" "}
              {currentMember ? `Signed in as ${currentMember.displayName}` : "You are viewing this trip as a guest member"}
            </AppText>
            <AppText variant="sectionTitle" color="inverse">
              {settlement ? formatCurrency(settlement.totalTripSpend, settlement.currencyCode) : ""}
            </AppText>
            {mayCompleteTrip ? (
              <AppButton onPress={runCompleteTrip} disabled={isCompletingTrip} fullWidth={false}>
                {isCompletingTrip ? "Completing..." : "Complete trip"}
              </AppButton>
            ) : null}
          </SurfaceCard>

          <SectionCard
            title={editingExpenseId ? "Edit expense" : "Add expense"}
            description={
              isTripActive
                ? editingExpenseId
                  ? "Only the person who added an expense can edit it."
                  : "Any linked trip member can add expenses. Only the creator of an expense can edit or delete it."
                : "This trip is completed, so expenses are now locked."
            }
          >
            {!isTripActive ? (
              <AppText variant="bodySm" color="muted">
                Expense editing is unavailable after completion.
              </AppText>
            ) : null}
            <AppInput
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              placeholder="48.00"
              keyboardType="decimal-pad"
              editable={isTripActive}
            />
            <AppInput
              label="Expense date"
              value={expenseDate}
              onChangeText={setExpenseDate}
              placeholder="2026-06-10"
              helperText="Use YYYY-MM-DD."
              editable={isTripActive}
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
                    onPress={isTripActive ? () => setCurrencyCode(currency.code) : undefined}
                  />
                ))}
              </View>
              <AppText variant="bodySm" color="muted">
                Expense amounts are converted into {trip.tripCurrencyCode} for settlement.
              </AppText>
            </View>
            <AppInput
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="Dinner by the river"
              editable={isTripActive}
            />

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
                    onPress={isTripActive ? () => setCategory(item.id) : undefined}
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
                editable={isTripActive}
              />
            ) : null}

            <View style={styles.group}>
              <AppText variant="meta" color="muted">
                Paid by
              </AppText>
              <View style={styles.chipWrap}>
                {expenseFormMembers.map((member) => (
                  <Chip
                    key={member.id}
                    label={member.displayName}
                    selected={paidByMemberId === member.id}
                    onPress={isTripActive ? () => setPaidByMemberId(member.id) : undefined}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <AppText variant="meta" color="muted">
                Involved members
              </AppText>
              <View style={styles.chipWrap}>
                {expenseFormMembers.map((member) => {
                  const selected = selectedMembers.includes(member.id);

                  return (
                    <Chip
                      key={member.id}
                      label={member.displayName}
                      selected={selected}
                      onPress={isTripActive ? () => toggleMember(member.id) : undefined}
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

            <View style={[styles.actionRow, compact ? styles.actionRowCompact : null]}>
              <AppButton onPress={submitExpense} disabled={isSavingExpense || !isTripActive}>
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
                <View key={expense.id} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
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
                  <View style={[styles.expenseMeta, compact ? styles.expenseMetaCompact : null]}>
                    <AppText variant="bodySm" color="muted">
                      {expense.involvedMemberIds.length} people
                    </AppText>
                    {canEditExpense(expense.id) ? (
                      <View style={[styles.expenseActions, compact ? styles.expenseActionsCompact : null]}>
                        <AppButton onPress={() => startEditingExpense(expense)} variant="secondary" fullWidth={false}>
                          Edit
                        </AppButton>
                        <AppButton onPress={() => removeExpense(expense.id)} variant="secondary" fullWidth={false}>
                          Delete
                        </AppButton>
                      </View>
                    ) : (
                      <AppText variant="bodySm" color="muted">
                        {trip.status === "active" ? "View only" : "Locked after completion"}
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
                <View key={balance.memberId} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
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

          {trip.status === "active" ? (
            <SectionCard title="Repayments" description="SplitTrip minimizes the number of transfers needed to settle up.">
              {settlement?.transfers.length ? (
                settlement.transfers.map((transfer) => {
                  const from = trip.members.find((member) => member.id === transfer.fromMemberId);
                  const to = trip.members.find((member) => member.id === transfer.toMemberId);

                  return (
                    <View key={`${transfer.fromMemberId}-${transfer.toMemberId}`} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
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
          ) : (
            <SectionCard title="Final payments" description="These transfers were saved when the trip was completed.">
              {persistedTransfers.length ? (
                persistedTransfers.map((transfer) => {
                  const from = trip.members.find((member) => member.id === transfer.fromMemberId);
                  const to = trip.members.find((member) => member.id === transfer.toMemberId);

                  return (
                    <View key={transfer.id} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
                      <View style={styles.rowCopy}>
                        <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                          {from?.displayName} pays {to?.displayName}
                        </AppText>
                        <AppText variant="bodySm" color="muted">
                          Status: {transfer.status}
                        </AppText>
                      </View>
                      <View style={[styles.expenseMeta, compact ? styles.expenseMetaCompact : null]}>
                        <AppText variant="bodySm" color="primary" style={styles.netAmount}>
                          {formatCurrency(transfer.amount, transfer.currencyCode)}
                        </AppText>
                        {renderPersistedTransferActions(transfer)}
                      </View>
                    </View>
                  );
                })
              ) : (
                <AppText variant="bodySm" color="muted">
                  No final payments were required for this trip.
                </AppText>
              )}
            </SectionCard>
          )}

          <SectionCard
            title="Members"
            description={
              mayManageTrip
                ? isTripActive
                  ? "Invite everyone who should be included in balances and settlements."
                  : "Member management is locked after completion."
                : "You can see everyone on the trip. Only the trip creator can manage membership."
            }
          >
            {mayManageTrip && isTripActive ? (
              <View style={styles.group}>
                <View style={[styles.actionRow, compact ? styles.actionRowCompact : null]}>
                  <AppButton onPress={inviteTrip} disabled={isCreatingInvite} variant="secondary">
                    {isCreatingInvite ? "Creating link..." : "Invite"}
                  </AppButton>
                </View>
                {inviteLink ? (
                  <AppInput
                    label="Latest invite link"
                    value={inviteLink}
                    onChangeText={setInviteLink}
                    editable={false}
                    helperText="This invite link is one-time use in the current implementation."
                  />
                ) : null}
                {inviteFeedback ? (
                  <AppText variant="bodySm" color="muted">
                    {inviteFeedback}
                  </AppText>
                ) : null}
                {inviteError ? (
                  <AppText variant="bodySm" color="danger">
                    {inviteError}
                  </AppText>
                ) : null}
              </View>
            ) : null}
            <View style={styles.chipWrap}>
              {trip.members.map((member) => (
                <View key={member.id} style={styles.memberStatusCard}>
                  <View style={[styles.memberRow, compact ? styles.rowCardCompact : null]}>
                    <View style={styles.rowCopy}>
                      <Chip label={member.displayName} tone={member.isLinked ? "success" : "default"} />
                      <AppText variant="bodySm" color="muted">
                        {(member.status ?? "active") === "removed"
                          ? `Removed${member.removedAt ? ` on ${member.removedAt.slice(0, 10)}` : ""}`
                          : member.isLinked
                            ? "Linked account"
                            : member.email
                              ? `Invite pending: ${member.email}`
                              : "Manual member"}
                      </AppText>
                    </View>
                    {mayManageTrip &&
                    isTripActive &&
                    member.id !== tripCreator?.id &&
                    (member.status ?? "active") === "active" ? (
                      <AppButton
                        onPress={() => removeMemberFromTrip(member.id)}
                        variant="secondary"
                        fullWidth={false}
                        disabled={activeMemberId === member.id}
                      >
                        {activeMemberId === member.id ? "Removing..." : "Remove"}
                      </AppButton>
                    ) : null}
                  </View>
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
                  editable={isTripActive}
                />
                <AppInput
                  label="Member email"
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  placeholder="emma@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  helperText="Add an email if you want this person to automatically claim the trip when they sign in."
                  editable={isTripActive}
                />
                <AppButton onPress={submitMember} variant="secondary" disabled={isAddingMember || !isTripActive}>
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
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
  memberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing.md
  },
  errorBox: {
    padding: theme.spacing.md
  },
  actionRow: {
    gap: theme.spacing.sm
  },
  actionRowCompact: {
    alignItems: "stretch"
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
  rowCardCompact: {
    flexDirection: "column"
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
  expenseMetaCompact: {
    width: "100%",
    alignItems: "flex-start"
  },
  expenseActions: {
    flexDirection: "row",
    gap: theme.spacing.xs
  },
  expenseActionsCompact: {
    flexWrap: "wrap",
    justifyContent: "flex-start"
  }
  });
}
