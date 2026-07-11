import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import { Platform, RefreshControl, StyleSheet, View, useWindowDimensions } from "react-native";

import { settleTrip } from "@splitsy/domain";
import type { Expense, SettlementTransfer } from "@splitsy/domain";

import { ActivitySection } from "../../src/components/ActivitySection";
import { ExpenseForm } from "../../src/components/ExpenseForm";
import { ExpenseListSection } from "../../src/components/ExpenseListSection";
import { MemberManagement } from "../../src/components/MemberManagement";
import { SettlementSection } from "../../src/components/SettlementSection";
import { TripJumpNav } from "../../src/components/TripJumpNav";
import { TripSummaryCard } from "../../src/components/TripSummaryCard";
import { useDisplayCurrency } from "../../src/state/useDisplayCurrency";
import { useSectionScroll } from "../../src/state/useSectionScroll";
import { useSession } from "../../src/providers/session-provider";
import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppText } from "../../src/ui/primitives/AppText";
import { SettleUpModal } from "../../src/ui/primitives/SettleUpModal";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../../src/ui/theme";

// ZKU-60: This screen is now composition/layout only — the expense form,
// settlement view, member management (incl. invite links), and expense list
// each live in their own component under src/components. This file wires
// trip data + useTrips() handlers into those components and owns only the
// state that's genuinely shared across sections (loaded trip data, jump-nav
// section refs, the display-currency conversion used by several sections,
// and which modal is currently open).

export default function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const session = useSession();
  const router = useRouter();
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
    isLoading,
    getPaymentMethodForUser,
    createGroup,
    updateGroup,
    deleteGroup,
    addMemberToGroup,
    removeMemberFromGroup,
    getGroupsForTrip,
    getActivityLogForTrip,
    archiveTrip,
    unarchiveTrip,
    listTripInvites,
    revokeTripInvite
  } = useTrips();
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= 1040;
  const compact = width < 768;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const trip = getTripById(tripId);
  const currentMember = getCurrentMemberForTrip(tripId);
  const mayManageTrip = canEditTrip(tripId);
  const mayCompleteTrip = canCompleteTrip(tripId);
  const expenses = getExpensesForTrip(tripId);
  const persistedTransfers = getSettlementTransfersForTrip(tripId);
  const groups = getGroupsForTrip(tripId);
  const activityLog = getActivityLogForTrip(tripId);

  const { scrollRef, sectionRefs, scrollToSection } = useSectionScroll();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [settleUpTransfer, setSettleUpTransfer] = useState<SettlementTransfer | null>(null);

  // Display currency — lets the user view all totals/settlements in a different currency
  const { displayCurrency, setDisplayCurrency, fmt, isDisplayConverted, displayRateSource } = useDisplayCurrency(trip);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    if (!session.isLoading && !session.isAuthenticated) {
      session.setPendingPostAuthPath(`/trip/${tripId}`);
      router.replace("/sign-in");
    }
  }, [session.isLoading, session.isAuthenticated, tripId, router, session.setPendingPostAuthPath]);

  const settlement = useMemo(() => {
    if (!trip) {
      return null;
    }

    return settleTrip(expenses, trip.members, groups, trip.tripCurrencyCode);
  }, [expenses, trip, groups]);

  const activeMembers = useMemo(
    () => trip?.members.filter((member) => (member.status ?? "active") === "active") ?? [],
    [trip?.members]
  );

  if (session.isLoading || isLoading) {
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

  const tripCreator = trip.members.find((member) => member.userId === trip.createdByUserId);
  const isTripActive = trip.status === "active";
  const editingExpense = editingExpenseId ? expenses.find((expense) => expense.id === editingExpenseId) ?? null : null;

  const closeExpenseForm = () => {
    setEditingExpenseId(null);
    setShowExpenseModal(false);
  };

  const onEditExpense = (expense: Expense) => {
    if (!canEditExpense(expense.id)) return;
    setEditingExpenseId(expense.id);
    setShowExpenseModal(true);
  };

  const removeExpense = async (expenseId: string) => {
    if (!canEditExpense(expenseId)) return;

    await deleteExpense(expenseId);

    if (editingExpenseId === expenseId) {
      closeExpenseForm();
    }
  };

  return (
    <AppScreen
      maxWidth={1200}
      scrollRef={scrollRef}
      stickyBanner={compact ? <TripJumpNav tripStatus={trip.status} onSelect={scrollToSection} /> : null}
      refreshControl={Platform.OS !== "web" ? <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} /> : undefined}
    >
      <View style={[styles.layout, wide ? styles.layoutWide : null]}>
        <View style={[styles.primaryColumn, wide ? styles.primaryColumnWide : null]}>
          <TripSummaryCard
            trip={trip}
            compact={compact}
            tripCreator={tripCreator}
            currentMember={currentMember}
            settlement={settlement}
            expenses={expenses}
            persistedTransfers={persistedTransfers}
            mayCompleteTrip={mayCompleteTrip}
            fmt={fmt}
            displayCurrency={displayCurrency}
            onDisplayCurrencyChange={setDisplayCurrency}
            isDisplayConverted={isDisplayConverted}
            displayRateSource={displayRateSource}
            onCompleteTrip={() => completeTrip(trip.id)}
            onArchiveTrip={() => archiveTrip(trip.id)}
            onUnarchiveTrip={() => unarchiveTrip(trip.id)}
          />

          {isTripActive ? (
            <AppButton onPress={() => setShowExpenseModal(true)} fullWidth={false}>
              + Add expense
            </AppButton>
          ) : null}

          <View ref={sectionRefs.expenses} collapsable={false}>
            <ExpenseListSection
              expenses={expenses}
              members={trip.members}
              activeMembers={activeMembers}
              compact={compact}
              tripStatus={trip.status ?? "active"}
              tripCurrencyCode={trip.tripCurrencyCode}
              fmt={fmt}
              canEditExpense={canEditExpense}
              onEditExpense={onEditExpense}
              onDeleteExpense={removeExpense}
            />
          </View>
        </View>

        <View style={[styles.secondaryColumn, wide ? styles.secondaryColumnWide : null]}>
          <SettlementSection
            trip={trip}
            compact={compact}
            settlement={settlement}
            persistedTransfers={persistedTransfers}
            fmt={fmt}
            canMarkSettlementTransferPaid={canMarkSettlementTransferPaid}
            markSettlementTransferPaid={markSettlementTransferPaid}
            canConfirmSettlementTransferReceived={canConfirmSettlementTransferReceived}
            confirmSettlementTransferReceived={confirmSettlementTransferReceived}
            getPaymentMethodForUser={getPaymentMethodForUser}
            onLogPayment={setSettleUpTransfer}
            balancesSectionRef={sectionRefs.balances}
            paymentsSectionRef={sectionRefs.payments}
          />

          <View ref={sectionRefs.members} collapsable={false}>
            <MemberManagement
              tripId={tripId}
              members={trip.members}
              activeMembers={activeMembers}
              groups={groups}
              tripCreator={tripCreator}
              settlement={settlement}
              mayManageTrip={mayManageTrip}
              isTripActive={isTripActive}
              compact={compact}
              fmt={fmt}
              addTripMember={addTripMember}
              removeTripMember={removeTripMember}
              createGroup={createGroup}
              updateGroup={updateGroup}
              deleteGroup={deleteGroup}
              addMemberToGroup={addMemberToGroup}
              removeMemberFromGroup={removeMemberFromGroup}
              listTripInvites={listTripInvites}
              revokeTripInvite={revokeTripInvite}
              createTripInviteLink={createTripInviteLink}
            />
          </View>

          <View ref={sectionRefs.activity} collapsable={false}>
            <ActivitySection events={activityLog} />
          </View>
        </View>
      </View>

      <ExpenseForm
        visible={showExpenseModal}
        compact={compact}
        tripId={trip.id}
        tripCurrencyCode={trip.tripCurrencyCode}
        isTripActive={isTripActive}
        editingExpense={editingExpense}
        members={trip.members}
        activeMembers={activeMembers}
        groups={groups}
        onClose={closeExpenseForm}
        onAddExpense={addExpense}
        onUpdateExpense={updateExpense}
      />

      {settleUpTransfer && settlement && (
        <SettleUpModal
          visible
          transfer={settleUpTransfer}
          tripId={trip.id}
          tripCurrencyCode={trip.tripCurrencyCode}
          members={activeMembers}
          groups={groups}
          settlement={settlement}
          onClose={() => setSettleUpTransfer(null)}
          onSubmit={addExpense}
        />
      )}
    </AppScreen>
  );
}

function createStyles(theme: Theme, compact: boolean) {
  return StyleSheet.create({
    layout: {
      gap: compact ? theme.spacing.xs : theme.spacing.lg
    },
    layoutWide: {
      flexDirection: "row",
      alignItems: "flex-start"
    },
    primaryColumn: {
      gap: compact ? theme.spacing.xs : theme.spacing.lg
    },
    primaryColumnWide: {
      flex: 1.5
    },
    secondaryColumn: {
      gap: compact ? theme.spacing.xs : theme.spacing.lg
    },
    secondaryColumnWide: {
      flex: 1
    }
  });
}
