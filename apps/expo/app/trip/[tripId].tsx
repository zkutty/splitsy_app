import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Modal, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View, useWindowDimensions } from "react-native";

import { PRESET_CATEGORIES, settleTrip, validateExpenseDraft } from "@splitsy/domain";
import type { Expense, ExpenseCategoryId, MemberGroup, PaymentMethodType, SettlementTransfer, SplitMode, TripSettlement, TripSettlementTransfer } from "@splitsy/domain";

import { formatCurrency } from "../../src/lib/format";
import { buildPaymentLink, getPaymentMethodLabel } from "../../src/lib/payment-links";
import { fetchConversionRate } from "../../src/lib/rates";
import { matchesSearch, calculateSummary } from "../../src/lib/expense-utils";
import { exportTripCsv } from "../../src/lib/export";
import { useSession } from "../../src/providers/session-provider";
import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppInput } from "../../src/ui/primitives/AppInput";
import { AppText } from "../../src/ui/primitives/AppText";
import { Chip } from "../../src/ui/primitives/Chip";
import { CurrencyPicker } from "../../src/ui/primitives/CurrencyPicker";
import { DatePicker } from "../../src/ui/primitives/DatePicker";
import { SectionCard } from "../../src/ui/primitives/SectionCard";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { GroupCard } from "../../src/ui/primitives/GroupCard";
import { GroupEditor } from "../../src/ui/primitives/GroupEditor";
import { GroupMemberPicker } from "../../src/ui/primitives/GroupMemberPicker";
import { ExpandableBalance } from "../../src/ui/primitives/ExpandableBalance";
import { ActivityFeed } from "../../src/ui/primitives/ActivityFeed";
import { SettleUpModal } from "../../src/ui/primitives/SettleUpModal";
import { ExpenseFilters } from "../../src/ui/primitives/ExpenseFilters";
import { ExpenseSummaryView } from "../../src/ui/primitives/ExpenseSummaryView";
import { Theme, useAppTheme } from "../../src/ui/theme";

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
    getActivityLogForTrip
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

  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [currencyCode, setCurrencyCode] = useState(trip?.tripCurrencyCode ?? "USD");
  const [category, setCategory] = useState(PRESET_CATEGORIES[0].id);
  const [customCategory, setCustomCategory] = useState("");
  const [note, setNote] = useState("");
  const [paidByMemberId, setPaidByMemberId] = useState(trip?.members[0]?.id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(trip?.members.map((member) => member.id) ?? []);
  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitShares, setSplitShares] = useState<Record<string, string>>({});
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [memberPendingRemovalId, setMemberPendingRemovalId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showGroupEditor, setShowGroupEditor] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [memberPickerGroupId, setMemberPickerGroupId] = useState<string | null>(null);
  const [showRemovedMembers, setShowRemovedMembers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settleUpTransfer, setSettleUpTransfer] = useState<SettlementTransfer | null>(null);

  // Filter and view state for expenses
  const [viewMode, setViewMode] = useState<'list' | 'summary'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategoryId>>(new Set());
  const [selectedPayerId, setSelectedPayerId] = useState<string | null>(null);

  // Payment method cache: maps userId -> { type, handle }
  const [paymentMethods, setPaymentMethods] = useState<
    Record<string, { type: PaymentMethodType | null; handle: string | null }>
  >({});

  // Display currency — lets the user view all totals/settlements in a different currency
  const [displayCurrency, setDisplayCurrency] = useState(trip?.tripCurrencyCode ?? "USD");
  const [displayRate, setDisplayRate] = useState(1);
  const [displayRateSource, setDisplayRateSource] = useState<"live" | "fallback" | "same">("same");

  const isDisplayConverted = displayCurrency !== trip?.tripCurrencyCode;

  // Format an amount that's stored in trip currency, converting to display currency
  const fmt = useCallback(
    (amount: number, overrideCurrency?: string) =>
      formatCurrency(
        isDisplayConverted ? Math.round(amount * displayRate * 100) / 100 : amount,
        overrideCurrency ?? displayCurrency
      ),
    [displayCurrency, displayRate, isDisplayConverted]
  );

  useEffect(() => {
    if (trip) {
      setCurrencyCode(trip.tripCurrencyCode);
    }
  }, [trip?.id, trip?.tripCurrencyCode]);

  // Keep display currency in sync when trip loads
  useEffect(() => {
    if (trip && !isDisplayConverted) {
      setDisplayCurrency(trip.tripCurrencyCode);
    }
  }, [trip?.tripCurrencyCode]);

  // Fetch display conversion rate whenever displayCurrency changes
  useEffect(() => {
    if (!trip) return;

    if (displayCurrency === trip.tripCurrencyCode) {
      setDisplayRate(1);
      setDisplayRateSource("same");
      return;
    }

    let cancelled = false;
    const today = new Date().toISOString().slice(0, 10);

    fetchConversionRate(trip.tripCurrencyCode, displayCurrency, today).then(
      ({ rate, source }) => {
        if (!cancelled) {
          setDisplayRate(rate);
          setDisplayRateSource(source);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [displayCurrency, trip?.tripCurrencyCode]);

  // Load payment methods for transfer recipients when trip is completed
  useEffect(() => {
    if (!trip || trip.status === "active" || !persistedTransfers.length) return;

    const recipientUserIds = new Set<string>();
    for (const transfer of persistedTransfers) {
      if (transfer.toEntity.type === 'member') {
        const toEntity = transfer.toEntity;
        const member = trip.members.find((m) => m.id === toEntity.memberId);
        if (member?.userId && !paymentMethods[member.userId]) {
          recipientUserIds.add(member.userId);
        }
      } else if (transfer.toEntity.type === 'group') {
        const toEntity = transfer.toEntity;
        // For groups, load payment methods for all group members
        const groupMembers = trip.members.filter((m) => m.groupId === toEntity.groupId);
        for (const member of groupMembers) {
          if (member.userId && !paymentMethods[member.userId]) {
            recipientUserIds.add(member.userId);
          }
        }
      }
    }

    if (recipientUserIds.size === 0) return;

    let cancelled = false;
    for (const userId of recipientUserIds) {
      getPaymentMethodForUser(userId)
        .then((pm) => {
          if (!cancelled) {
            setPaymentMethods((prev) => ({ ...prev, [userId]: pm }));
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [trip?.id, trip?.status, persistedTransfers.length]);

  useEffect(() => {
    if (!editingExpenseId) {
      setExpenseDate(new Date().toISOString().slice(0, 10));
    }
  }, [editingExpenseId]);

  // Filtered expenses based on search and filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      if (searchQuery && !matchesSearch(expense, searchQuery)) return false;
      if (dateFrom && expense.expenseDate < dateFrom) return false;
      if (dateTo && expense.expenseDate > dateTo) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(expense.category)) return false;
      if (selectedPayerId && expense.paidByMemberId !== selectedPayerId) return false;
      return true;
    });
  }, [expenses, searchQuery, dateFrom, dateTo, selectedCategories, selectedPayerId]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (selectedCategories.size > 0) count++;
    if (selectedPayerId) count++;
    return count;
  }, [searchQuery, dateFrom, dateTo, selectedCategories, selectedPayerId]);

  // Summary data
  const summaryData = useMemo(() =>
    calculateSummary(filteredExpenses, trip?.members ?? [], trip?.tripCurrencyCode ?? "USD"),
    [filteredExpenses, trip?.members, trip?.tripCurrencyCode]
  );

  const settlement = useMemo(() => {
    if (!trip) {
      return null;
    }

    return settleTrip(
      expenses,
      trip.members,
      groups,
      trip.tripCurrencyCode
    );
  }, [expenses, trip, groups]);

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
  const removedMembers = useMemo(
    () => trip?.members.filter((member) => (member.status ?? "active") === "removed") ?? [],
    [trip?.members]
  );

  const removedMembersWithBalances = useMemo(() => {
    if (!settlement) return [];

    return removedMembers.filter((member) => {
      const balance = settlement.balances.find((b) => {
        if (b.entity.type === 'member') {
          return b.entity.memberId === member.id;
        }
        return false;
      });

      return balance && Math.abs(balance.net) >= 0.01;
    });
  }, [removedMembers, settlement]);

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

  useEffect(() => {
    if (!session.isLoading && !session.isAuthenticated) {
      session.setPendingPostAuthPath(`/trip/${tripId}`);
      router.replace("/sign-in");
    }
  }, [session.isLoading, session.isAuthenticated, tripId, router, session.setPendingPostAuthPath]);

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

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const toggleGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const allSelected = group.memberIds.every((id) => selectedMembers.includes(id));

    setSelectedMembers((current) => {
      if (allSelected) {
        // Deselect all members in the group
        return current.filter((id) => !group.memberIds.includes(id));
      } else {
        // Select all members in the group
        const newMembers = group.memberIds.filter((id) => !current.includes(id));
        return [...current, ...newMembers];
      }
    });
  };

  const isGroupSelected = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return false;
    return group.memberIds.every((id) => selectedMembers.includes(id));
  };

  const getMemberStatusText = (member: (typeof trip.members)[number]) => {
    if ((member.status ?? "active") === "removed") {
      return member.removedAt ? `Removed on ${member.removedAt.slice(0, 10)}` : "Removed from this trip";
    }

    if (member.isLinked) {
      return member.email ? `Linked account · ${member.email}` : "Linked account";
    }

    if (member.email) {
      return `Invite pending · ${member.email}`;
    }

    return "Manual member";
  };

  const getMemberInitials = (displayName: string) =>
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");

  const submitExpense = async () => {
    if (!isTripActive) {
      setErrors(["Completed trips are read-only."]);
      return;
    }

    const numericAmount = Number(amount);
    const numericShares: Record<string, number> | null =
      splitMode !== "equal"
        ? Object.fromEntries(
            selectedMembers.map((id) => [id, Number(splitShares[id] || 0)])
          )
        : null;
    const draft = {
      expenseDate,
      amount: numericAmount,
      currencyCode: currencyCode.toUpperCase(),
      category,
      customCategory,
      note,
      paidByMemberId,
      involvedMemberIds: selectedMembers,
      splitMode,
      splitShares: numericShares
    };
    const result = validateExpenseDraft(draft);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setIsSavingExpense(true);

    try {
      const { rate } = await fetchConversionRate(
        draft.currencyCode,
        trip.tripCurrencyCode,
        draft.expenseDate
      );

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
      setSplitMode("equal");
      setSplitShares({});
      setEditingExpenseId(null);
      setShowExpenseModal(false);
      setErrors([]);

      // Haptic feedback on iOS
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setIsSavingExpense(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  }, []);

  const startEditingExpense = (expense: Expense) => {
    if (!canEditExpense(expense.id)) {
      return;
    }

    setEditingExpenseId(expense.id);
    setShowExpenseModal(true);
    setAmount(String(expense.amount));
    setExpenseDate(expense.expenseDate);
    setCurrencyCode(expense.currencyCode);
    setCategory(expense.category);
    setCustomCategory(expense.customCategory ?? "");
    setNote(expense.note ?? "");
    setPaidByMemberId(expense.paidByMemberId);
    setSelectedMembers(expense.involvedMemberIds);
    setSplitMode(expense.splitMode ?? "equal");
    setSplitShares(
      expense.splitShares
        ? Object.fromEntries(
            Object.entries(expense.splitShares).map(([k, v]) => [k, String(v)])
          )
        : {}
    );
    setErrors([]);
  };

  const cancelEditingExpense = () => {
    setEditingExpenseId(null);
    setShowExpenseModal(false);
    setAmount("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setCurrencyCode(trip.tripCurrencyCode);
    setCategory(PRESET_CATEGORIES[0].id);
    setCustomCategory("");
    setNote("");
    setPaidByMemberId(activeMembers[0]?.id ?? "");
    setSelectedMembers(activeMembers.map((member) => member.id));
    setSplitMode("equal");
    setSplitShares({});
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
      setMemberPendingRemovalId(null);
    } finally {
      setActiveMemberId(null);
    }
  };

  const handleCreateGroup = async (name: string) => {
    await createGroup(tripId, name);
  };

  const handleUpdateGroup = async (name: string) => {
    if (!editingGroupId) return;
    await updateGroup(editingGroupId, name);
  };

  const handleDeleteGroup = async (groupId: string) => {
    await deleteGroup(groupId);
  };

  const handleRemoveMemberFromGroup = async (memberId: string) => {
    await removeMemberFromGroup(tripId, memberId);
  };

  const openCreateGroupModal = () => {
    setEditingGroupId(null);
    setShowGroupEditor(true);
  };

  const openEditGroupModal = (groupId: string) => {
    setEditingGroupId(groupId);
    setShowGroupEditor(true);
  };

  const ungroupedMembers = useMemo(
    () => activeMembers.filter((member) => !member.groupId),
    [activeMembers]
  );

  const runCompleteTrip = async () => {
    if (!mayCompleteTrip) {
      return;
    }

    setIsCompletingTrip(true);

    try {
      await completeTrip(trip.id);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setIsCompletingTrip(false);
    }
  };

  const markTransferPaid = async (transferId: string) => {
    setActiveTransferId(transferId);

    try {
      await markSettlementTransferPaid(transferId);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setActiveTransferId(null);
    }
  };

  const confirmTransferReceived = async (transferId: string) => {
    setActiveTransferId(transferId);

    try {
      await confirmSettlementTransferReceived(transferId);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setActiveTransferId(null);
    }
  };

  const getPaymentLinkForTransfer = (transfer: TripSettlementTransfer) => {
    if (!trip) return null;

    // For group transfers, find any member of the group with a payment method
    if (transfer.toEntity.type === 'group') {
      const toEntity = transfer.toEntity;
      const groupMembers = trip.members.filter((m) => m.groupId === toEntity.groupId);
      for (const member of groupMembers) {
        if (!member.userId) continue;
        const pm = paymentMethods[member.userId];
        if (pm?.type && pm?.handle) {
          const note = `${trip.name} settlement`;
          return buildPaymentLink(pm.type, pm.handle, transfer.amount, note);
        }
      }
      return null;
    }

    // For member transfers
    const toEntity = transfer.toEntity;
    if (toEntity.type !== 'member') return null;
    const recipient = trip.members.find((m) => m.id === toEntity.memberId);
    if (!recipient?.userId) return null;
    const pm = paymentMethods[recipient.userId];
    if (!pm?.type || !pm?.handle) return null;
    const note = `${trip.name} settlement`;
    return buildPaymentLink(pm.type, pm.handle, transfer.amount, note);
  };

  const renderPersistedTransferActions = (transfer: TripSettlementTransfer) => {
    if (canMarkSettlementTransferPaid(transfer.id)) {
      const payLink = getPaymentLinkForTransfer(transfer);

      return (
        <View style={{ gap: theme.spacing.sm }}>
          {payLink ? (
            <AppButton
              onPress={async () => { await Linking.openURL(payLink.url); }}
              variant="primary"
              fullWidth={false}
            >
              {payLink.label}
            </AppButton>
          ) : null}
          <AppButton
            onPress={() => markTransferPaid(transfer.id)}
            variant="secondary"
            fullWidth={false}
            disabled={activeTransferId === transfer.id}
          >
            {activeTransferId === transfer.id ? "Saving..." : "Mark paid"}
          </AppButton>
        </View>
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

  const copyInviteLink = async (link: string): Promise<void> => {
    try {
      await Clipboard.setStringAsync(link);
      setInviteFeedback("Invite link copied to clipboard.");
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      setInviteFeedback("Link created. Tap the field to copy it.");
    }
  };

  const inviteTrip = async (): Promise<void> => {
    const link = inviteLink || (await createInviteLinkValue());
    if (!link) return;
    await copyInviteLink(link);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDateFrom(null);
    setDateTo(null);
    setSelectedCategories(new Set());
    setSelectedPayerId(null);
  };

  return (
    <AppScreen maxWidth={1200} refreshControl={
      Platform.OS !== "web" ? (
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      ) : undefined
    }>
      <View style={[styles.layout, wide ? styles.layoutWide : null]}>
        <View style={[styles.primaryColumn, wide ? styles.primaryColumnWide : null]}>
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
              {settlement ? fmt(settlement.totalTripSpend) : ""}
            </AppText>
            <CurrencyPicker
              label="View amounts in"
              value={displayCurrency}
              onChange={setDisplayCurrency}
            />
            {isDisplayConverted && displayRateSource === "fallback" ? (
              <AppText variant="bodySm" color="accent">
                Using approximate rate — live rate unavailable.
              </AppText>
            ) : null}
            <View style={styles.summaryActions}>
              {mayCompleteTrip ? (
                <AppButton onPress={runCompleteTrip} disabled={isCompletingTrip} fullWidth={false}>
                  {isCompletingTrip ? "Completing..." : "Complete trip"}
                </AppButton>
              ) : null}
              {expenses.length > 0 ? (
                <AppButton
                  onPress={async () => {
                    setIsExporting(true);
                    try {
                      await exportTripCsv(trip, expenses, settlement, persistedTransfers);
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  variant="secondary"
                  fullWidth={false}
                  disabled={isExporting}
                >
                  {isExporting ? "Exporting..." : "Export CSV"}
                </AppButton>
              ) : null}
            </View>
          </SurfaceCard>

          {isTripActive ? (
            <AppButton onPress={() => setShowExpenseModal(true)} fullWidth={false}>
              + Add expense
            </AppButton>
          ) : null}

          <SectionCard
            title="Expenses"
            collapsible
            badge={activeFilterCount > 0 ? `${filteredExpenses.length} of ${expenses.length}` : `${expenses.length} expense${expenses.length !== 1 ? "s" : ""}`}
            description="Every expense keeps the original amount and the converted trip value."
          >
            {/* View toggle */}
            <View style={styles.viewToggle}>
              <Chip
                label="List"
                selected={viewMode === 'list'}
                onPress={() => setViewMode('list')}
              />
              <Chip
                label="Summary"
                selected={viewMode === 'summary'}
                onPress={() => setViewMode('summary')}
              />
            </View>

            {/* Filters */}
            <ExpenseFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              selectedPayerId={selectedPayerId}
              onPayerChange={setSelectedPayerId}
              members={activeMembers}
              activeFilterCount={activeFilterCount}
              onClearAll={clearAllFilters}
              compact={compact}
              initiallyOpen={!compact}
            />

            {/* Content - List or Summary */}
            {viewMode === 'list' ? (
              filteredExpenses.length ? (
                filteredExpenses.map((expense) => (
                  <View key={expense.id} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
                    <View style={styles.rowCopy}>
                      <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                        {expense.note || PRESET_CATEGORIES.find(c => c.id === expense.category)?.label || expense.category}
                      </AppText>
                      <AppText variant="bodySm" color="muted">
                        {formatCurrency(expense.amount, expense.currencyCode)} {"->"}{" "}
                        {fmt(expense.tripAmount)}
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
                        Split{expense.splitMode && expense.splitMode !== "equal" ? ` (${expense.splitMode === "byAmount" ? "by amount" : "by %"})` : ""}: {" "}
                        {expense.involvedMemberIds
                          .map((id) => {
                            const name = trip.members.find((m) => m.id === id)?.displayName ?? "Unknown";
                            if (expense.splitShares?.[id] != null && expense.splitMode !== "equal") {
                              const share = expense.splitShares[id];
                              return `${name} (${expense.splitMode === "byPercentage" ? `${share}%` : formatCurrency(share, expense.currencyCode)})`;
                            }
                            return name;
                          })
                          .join(", ")}
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
                  {expenses.length === 0
                    ? "No expenses yet. Add the first one above to start balancing the trip."
                    : "No expenses match your filters."}
                </AppText>
              )
            ) : (
              <ExpenseSummaryView
                summary={summaryData}
                formatAmount={fmt}
                compact={compact}
              />
            )}
          </SectionCard>
        </View>

        <View style={[styles.secondaryColumn, wide ? styles.secondaryColumnWide : null]}>
          <SectionCard title="Balances" collapsible description="Positive values are owed back. Negative values still owe the group.">
            {settlement?.balances.map((balance) => {
              const key = balance.entity.type === 'group'
                ? `g:${balance.entity.groupId}`
                : `m:${balance.entity.memberId}`;

              return (
                <ExpandableBalance
                  key={key}
                  balance={balance}
                  formatAmount={fmt}
                  compact={compact}
                />
              );
            })}
          </SectionCard>

          {trip.status === "active" ? (
            <SectionCard title="Repayments" description="SplitTrip minimizes the number of transfers needed to settle up.">
              {settlement?.transfers.length ? (
                settlement.transfers.map((transfer, index) => {
                  return (
                    <View key={`transfer-${index}`} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
                      <View style={styles.rowCopy}>
                        <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                          {transfer.fromDisplayName} <AppText variant="bodySm" color="muted">{" >> "}</AppText>{fmt(transfer.amount)}<AppText variant="bodySm" color="muted">{" >> "}</AppText> {transfer.toDisplayName}
                        </AppText>
                      </View>
                      <View style={[styles.expenseMeta, compact ? styles.expenseMetaCompact : null]}>
                        <AppText variant="bodySm" color="primary" style={styles.netAmount}>
                          {fmt(transfer.amount)}
                        </AppText>
                        <AppButton onPress={() => setSettleUpTransfer(transfer)} variant="secondary" fullWidth={false}>
                          Log payment
                        </AppButton>
                      </View>
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
                  return (
                    <View key={transfer.id} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
                      <View style={styles.rowCopy}>
                        <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                          {transfer.fromDisplayName} <AppText variant="bodySm" color="muted">{" >> "}</AppText>{fmt(transfer.amount)}<AppText variant="bodySm" color="muted">{" >> "}</AppText> {transfer.toDisplayName}
                        </AppText>
                        <AppText variant="bodySm" color="muted">
                          Status: {transfer.status}
                        </AppText>
                      </View>
                      <View style={[styles.expenseMeta, compact ? styles.expenseMetaCompact : null]}>
                        <AppText variant="bodySm" color="primary" style={styles.netAmount}>
                          {fmt(transfer.amount)}
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
                    {isCreatingInvite ? "Creating link..." : "Create invite link"}
                  </AppButton>
                </View>
                {inviteLink ? (
                  <View style={styles.group}>
                    <AppInput
                      label="Latest invite link"
                      value={inviteLink}
                      onChangeText={setInviteLink}
                      editable={false}
                      helperText="This invite link is one-time use in the current implementation."
                    />
                    <AppButton onPress={() => copyInviteLink(inviteLink)} variant="secondary" fullWidth={false}>
                      Copy link
                    </AppButton>
                  </View>
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

            {mayManageTrip && isTripActive && groups.length === 0 && (
              <View style={styles.group}>
                <AppText variant="bodySm" color="muted">
                  Create groups to combine members for settlement (e.g., families or couples)
                </AppText>
                <AppButton onPress={openCreateGroupModal} variant="secondary">
                  Create first group
                </AppButton>
              </View>
            )}

            {groups.length > 0 && (
              <View style={styles.membersGroup}>
                <View style={styles.membersHeaderRow}>
                  <AppText variant="meta" color="muted">
                    Groups
                  </AppText>
                  <AppText variant="bodySm" color="muted">
                    {groups.length} {groups.length === 1 ? "group" : "groups"}
                  </AppText>
                </View>
                {mayManageTrip && isTripActive && (
                  <AppButton onPress={openCreateGroupModal} variant="secondary" fullWidth={false}>
                    Create group
                  </AppButton>
                )}
                <View style={styles.memberList}>
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      members={trip.members}
                      canEdit={mayManageTrip && isTripActive}
                      onEdit={() => openEditGroupModal(group.id)}
                      onDelete={() => handleDeleteGroup(group.id)}
                      onRemoveMember={handleRemoveMemberFromGroup}
                      onAddMember={ungroupedMembers.length > 0 ? () => setMemberPickerGroupId(group.id) : undefined}
                      compact={compact}
                    />
                  ))}
                </View>
              </View>
            )}

            {ungroupedMembers.length > 0 && (
              <View style={styles.membersGroup}>
                <View style={styles.membersHeaderRow}>
                  <AppText variant="meta" color="muted">
                    Ungrouped members
                  </AppText>
                  <AppText variant="bodySm" color="muted">
                    {ungroupedMembers.length} {ungroupedMembers.length === 1 ? "member" : "members"}
                  </AppText>
                </View>
                <View style={styles.memberList}>
                  {ungroupedMembers.map((member) => (
                    <SurfaceCard key={member.id}>
                      <View style={styles.ungroupedMemberRow}>
                        <AppText variant="bodySm" color="secondary">
                          {member.displayName}
                        </AppText>
                        <AppText variant="bodySm" color="muted">
                          Not in a group
                        </AppText>
                      </View>
                    </SurfaceCard>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.membersGroup}>
              <View style={styles.membersHeaderRow}>
                <AppText variant="meta" color="muted">
                  All members
                </AppText>
                <AppText variant="bodySm" color="muted">
                  {activeMembers.length} active
                </AppText>
              </View>
              <View style={styles.memberList}>
                {activeMembers.map((member) => {
                  const canRemoveMember = mayManageTrip && isTripActive && member.id !== tripCreator?.id;
                  const pendingRemoval = memberPendingRemovalId === member.id;

                  return (
                    <SurfaceCard key={member.id} style={styles.memberCard}>
                      <View style={styles.memberIdentity}>
                        <View
                          style={[
                            styles.memberAvatar,
                            member.isLinked ? styles.memberAvatarLinked : null,
                            member.email && !member.isLinked ? styles.memberAvatarPending : null
                          ]}
                        >
                          <AppText variant="bodySm" color="inverse" style={styles.memberAvatarText}>
                            {getMemberInitials(member.displayName)}
                          </AppText>
                        </View>
                        <View style={styles.memberCopy}>
                          <View style={styles.memberHeadline}>
                            <AppText variant="body" color="primary" style={styles.memberName}>
                              {member.displayName}
                            </AppText>
                            {member.id === tripCreator?.id ? (
                              <AppText variant="meta" color="muted">
                                Trip owner
                              </AppText>
                            ) : null}
                          </View>
                          <AppText variant="bodySm" color="muted">
                            {getMemberStatusText(member)}
                          </AppText>
                        </View>
                      </View>

                      {canRemoveMember ? (
                        pendingRemoval ? (
                          <View style={styles.memberConfirm}>
                            <AppText variant="bodySm" color="danger">
                              Remove {member.displayName} from this trip?
                            </AppText>
                            <View style={[styles.memberActionRow, compact ? styles.actionRowCompact : null]}>
                              <AppButton
                                onPress={() => setMemberPendingRemovalId(null)}
                                variant="secondary"
                                fullWidth={compact}
                              >
                                Cancel
                              </AppButton>
                              <AppButton
                                onPress={() => removeMemberFromTrip(member.id)}
                                variant="danger"
                                fullWidth={compact}
                                disabled={activeMemberId === member.id}
                              >
                                {activeMemberId === member.id ? "Removing..." : `Remove ${member.displayName}`}
                              </AppButton>
                            </View>
                          </View>
                        ) : (
                          <AppButton
                            onPress={() => setMemberPendingRemovalId(member.id)}
                            variant="secondary"
                            fullWidth={compact}
                          >
                            Remove member
                          </AppButton>
                        )
                      ) : null}
                    </SurfaceCard>
                  );
                })}
              </View>
            </View>
            {removedMembersWithBalances.length > 0 ? (
              <View style={styles.membersGroup}>
                <Pressable
                  style={styles.membersHeaderRow}
                  onPress={() => setShowRemovedMembers(!showRemovedMembers)}
                >
                  <View style={styles.collapsibleHeader}>
                    <AppText variant="bodySm" color="muted" style={styles.expandIcon}>
                      {showRemovedMembers ? "▼" : "▶"}
                    </AppText>
                    <AppText variant="meta" color="muted">
                      Removed members with balances
                    </AppText>
                  </View>
                  <AppText variant="bodySm" color="muted">
                    {removedMembersWithBalances.length} {removedMembersWithBalances.length === 1 ? "member" : "members"}
                  </AppText>
                </Pressable>
                {showRemovedMembers && (
                  <View style={styles.memberList}>
                    {removedMembersWithBalances.map((member) => {
                      const balance = settlement?.balances.find((b) =>
                        b.entity.type === 'member' && b.entity.memberId === member.id
                      );

                      return (
                        <SurfaceCard key={member.id} tone="muted" style={styles.memberCard}>
                          <View style={styles.memberIdentity}>
                            <View style={[styles.memberAvatar, styles.memberAvatarRemoved]}>
                              <AppText variant="bodySm" color="inverse" style={styles.memberAvatarText}>
                                {getMemberInitials(member.displayName)}
                              </AppText>
                            </View>
                            <View style={styles.memberCopy}>
                              <AppText variant="body" color="secondary" style={styles.memberName}>
                                {member.displayName}
                              </AppText>
                              <AppText variant="bodySm" color="muted">
                                {getMemberStatusText(member)}
                              </AppText>
                              {balance && (
                                <AppText
                                  variant="bodySm"
                                  color={balance.net < 0 ? "danger" : balance.net > 0 ? "success" : "muted"}
                                >
                                  Balance: {fmt(balance.net)}
                                </AppText>
                              )}
                            </View>
                          </View>
                        </SurfaceCard>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : null}
            {mayManageTrip ? (
              <View style={styles.memberFormSection}>
                <AppText variant="meta" color="muted">
                  Add member manually
                </AppText>
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
              </View>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Activity"
            collapsible
            initiallyOpen={false}
            badge={activityLog.length ? `${activityLog.length} event${activityLog.length === 1 ? "" : "s"}` : undefined}
          >
            <ActivityFeed events={activityLog} />
          </SectionCard>
        </View>
      </View>

      <Modal
        visible={showExpenseModal}
        transparent
        animationType="fade"
        onRequestClose={cancelEditingExpense}
      >
        <Pressable style={styles.modalOverlay} onPress={cancelEditingExpense}>
          <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
            <SurfaceCard style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <AppText variant="sectionTitle">
                  {editingExpenseId ? "Edit expense" : "Add expense"}
                </AppText>
                <Pressable onPress={cancelEditingExpense} hitSlop={8}>
                  <AppText variant="body" color="muted">✕</AppText>
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                <AppInput
                  label="Amount"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="48.00"
                  keyboardType="decimal-pad"
                  editable={isTripActive}
                />
                <DatePicker
                  label="Expense date"
                  value={expenseDate}
                  onChange={setExpenseDate}
                  disabled={!isTripActive}
                  maximumDate={new Date()}
                />
                <CurrencyPicker
                  label="Original currency"
                  value={currencyCode}
                  onChange={setCurrencyCode}
                  disabled={!isTripActive}
                />
                <AppText variant="bodySm" color="muted">
                  Expense amounts are converted into {trip.tripCurrencyCode} using the rate for the expense date.
                </AppText>
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
                    {PRESET_CATEGORIES.filter(c => c.id !== "settle_up").map((item) => (
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
                    {groups.map((group) => (
                      <Chip
                        key={`group-${group.id}`}
                        label={`${group.name} (${group.memberIds.length})`}
                        selected={isGroupSelected(group.id)}
                        onPress={isTripActive ? () => toggleGroup(group.id) : undefined}
                        tone="success"
                      />
                    ))}
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

                <View style={styles.group}>
                  <AppText variant="meta" color="muted">
                    Split mode
                  </AppText>
                  <View style={styles.chipWrap}>
                    <Chip
                      label="Equal"
                      selected={splitMode === "equal"}
                      onPress={isTripActive ? () => { setSplitMode("equal"); setSplitShares({}); } : undefined}
                    />
                    <Chip
                      label="By amount"
                      selected={splitMode === "byAmount"}
                      onPress={isTripActive ? () => setSplitMode("byAmount") : undefined}
                    />
                    <Chip
                      label="By %"
                      selected={splitMode === "byPercentage"}
                      onPress={isTripActive ? () => setSplitMode("byPercentage") : undefined}
                    />
                  </View>
                </View>

                {splitMode !== "equal" && selectedMembers.length > 0 ? (
                  <View style={styles.group}>
                    <AppText variant="meta" color="muted">
                      {splitMode === "byAmount" ? "Amount per person" : "Percentage per person"}
                    </AppText>
                    {selectedMembers.map((memberId) => {
                      const member = expenseFormMembers.find((m) => m.id === memberId);
                      if (!member) return null;

                      return (
                        <AppInput
                          key={memberId}
                          label={member.displayName}
                          value={splitShares[memberId] ?? ""}
                          onChangeText={(val) =>
                            setSplitShares((prev) => ({ ...prev, [memberId]: val }))
                          }
                          placeholder={splitMode === "byAmount" ? "0.00" : "0"}
                          keyboardType="decimal-pad"
                          editable={isTripActive}
                        />
                      );
                    })}
                    <AppText variant="bodySm" color="muted">
                      {splitMode === "byAmount"
                        ? `Total: ${Object.values(splitShares).reduce((s, v) => s + (Number(v) || 0), 0).toFixed(2)} of ${amount || "0"}`
                        : `Total: ${Object.values(splitShares).reduce((s, v) => s + (Number(v) || 0), 0).toFixed(1)}%`}
                    </AppText>
                  </View>
                ) : null}

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
                  <AppButton onPress={cancelEditingExpense} variant="secondary">
                    Cancel
                  </AppButton>
                </View>
              </ScrollView>
            </SurfaceCard>
          </Pressable>
        </Pressable>
      </Modal>

      <GroupMemberPicker
        visible={memberPickerGroupId !== null}
        title={`Add member to ${groups.find((g) => g.id === memberPickerGroupId)?.name ?? "group"}`}
        members={ungroupedMembers}
        onClose={() => setMemberPickerGroupId(null)}
        onSelect={async (memberId) => {
          if (!memberPickerGroupId) return;
          await addMemberToGroup(tripId, memberId, memberPickerGroupId);
          setMemberPickerGroupId(null);
        }}
      />

      <GroupEditor
        visible={showGroupEditor}
        title={editingGroupId ? "Edit group" : "Create group"}
        initialName={editingGroupId ? groups.find((g) => g.id === editingGroupId)?.name ?? "" : ""}
        onClose={() => {
          setShowGroupEditor(false);
          setEditingGroupId(null);
        }}
        onSave={editingGroupId ? handleUpdateGroup : handleCreateGroup}
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
  },
  summaryCard: {
    gap: theme.spacing.sm
  },
  summaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  group: {
    gap: theme.spacing.sm
  },
  expensesList: {
    gap: theme.spacing.sm
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  viewToggle: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  membersGroup: {
    gap: theme.spacing.sm
  },
  membersHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md
  },
  collapsibleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  expandIcon: {
    width: 16
  },
  memberList: {
    gap: theme.spacing.sm
  },
  ungroupedMemberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface.base
  },
  memberCard: {
    gap: theme.spacing.md
  },
  memberIdentity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: theme.spacing.md
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  memberAvatarLinked: {
    backgroundColor: theme.colors.accent.success
  },
  memberAvatarPending: {
    backgroundColor: theme.colors.accent.warning
  },
  memberAvatarRemoved: {
    backgroundColor: theme.colors.text.muted
  },
  memberAvatarText: {
    fontWeight: theme.type.weight.bold
  },
  memberCopy: {
    flex: 1,
    gap: theme.spacing.xxs
  },
  memberHeadline: {
    gap: theme.spacing.xxs
  },
  memberName: {
    fontWeight: theme.type.weight.semibold
  },
  memberConfirm: {
    gap: theme.spacing.sm
  },
  memberActionRow: {
    gap: theme.spacing.sm
  },
  memberFormSection: {
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg
  },
  modalContainer: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "90%"
  },
  modalCard: {
    maxHeight: "100%",
    gap: theme.spacing.md
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  modalScroll: {
    flexShrink: 1
  },
  modalScrollContent: {
    gap: compact ? theme.spacing.sm : theme.spacing.md,
    paddingBottom: theme.spacing.sm
  }
  });
}
