import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import { PRESET_CATEGORIES, validateExpenseDraft } from "@splitsy/domain";
import type { Expense, Member, MemberGroup } from "@splitsy/domain";

import type { AddExpenseInput } from "../services/trips-repository";
import { saveExpenseDefaults } from "../lib/expense-defaults";
import { fetchConversionRate } from "../lib/rates";
import { buildExpenseDraft, splitShareTotal } from "../state/expense-form-state";
import { useExpenseFormState } from "../state/useExpenseFormState";
import { AppButton } from "../ui/primitives/AppButton";
import { AppInput } from "../ui/primitives/AppInput";
import { AppText } from "../ui/primitives/AppText";
import { Chip } from "../ui/primitives/Chip";
import { CurrencyPicker } from "../ui/primitives/CurrencyPicker";
import { DatePicker } from "../ui/primitives/DatePicker";
import { SurfaceCard } from "../ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../ui/theme";

// ZKU-60: The add/edit expense modal, extracted out of trip/[tripId].tsx.
// Field state and its reset/initialization rules live in useExpenseFormState
// (backed by the pure helpers in ../state/expense-form-state), so this
// component is mostly presentational glue plus the async save flow.

export type ExpenseFormProps = {
  visible: boolean;
  compact: boolean;
  tripId: string;
  tripCurrencyCode: string;
  isTripActive: boolean;
  editingExpense: Expense | null;
  /** All trip members, active or not — an inactive member already on the expense still needs to render. */
  members: Member[];
  activeMembers: Member[];
  groups: MemberGroup[];
  onClose: () => void;
  onAddExpense: (tripId: string, draft: AddExpenseInput) => Promise<void>;
  onUpdateExpense: (expenseId: string, tripId: string, draft: AddExpenseInput) => Promise<void>;
};

export function ExpenseForm({
  visible,
  compact,
  tripId,
  tripCurrencyCode,
  isTripActive,
  editingExpense,
  members,
  activeMembers,
  groups,
  onClose,
  onAddExpense,
  onUpdateExpense
}: ExpenseFormProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const [isSaving, setIsSaving] = useState(false);

  const {
    values,
    errors,
    setErrors,
    setField,
    toggleMember,
    toggleGroup,
    isGroupSelected,
    setSplitMode,
    setSplitShare,
    resetAfterAdd,
    expenseFormMembers
  } = useExpenseFormState({ tripId, tripCurrencyCode, visible, editingExpense, members, activeMembers });

  const submitExpense = async () => {
    if (!isTripActive) {
      setErrors(["Completed trips are read-only."]);
      return;
    }

    const draft = buildExpenseDraft(values);
    const result = validateExpenseDraft(draft);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setIsSaving(true);

    try {
      const { rate } = await fetchConversionRate(draft.currencyCode, tripCurrencyCode, draft.expenseDate);

      const expensePayload: AddExpenseInput = {
        ...draft,
        conversionRateToTripCurrency: rate,
        tripAmount: Math.round(draft.amount * rate * 100) / 100
      };

      if (editingExpense) {
        await onUpdateExpense(editingExpense.id, tripId, expensePayload);
      } else {
        await onAddExpense(tripId, expensePayload);
        saveExpenseDefaults(tripId, {
          paidByMemberId: values.paidByMemberId,
          involvedMemberIds: values.selectedMembers,
          splitMode: values.splitMode,
          category: values.category
        });
      }

      resetAfterAdd();
      onClose();

      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <SurfaceCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <AppText variant="sectionTitle">{editingExpense ? "Edit expense" : "Add expense"}</AppText>
              <Pressable onPress={onClose} hitSlop={8}>
                <AppText variant="body" color="muted">
                  ✕
                </AppText>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              <AppInput
                label="Amount"
                value={values.amount}
                onChangeText={(text) => setField("amount", text)}
                placeholder="48.00"
                keyboardType="decimal-pad"
                editable={isTripActive}
              />
              <DatePicker
                label="Expense date"
                value={values.expenseDate}
                onChange={(date) => setField("expenseDate", date)}
                disabled={!isTripActive}
                maximumDate={new Date()}
              />
              <CurrencyPicker
                label="Original currency"
                value={values.currencyCode}
                onChange={(code) => setField("currencyCode", code)}
                disabled={!isTripActive}
              />
              <AppText variant="bodySm" color="muted">
                Expense amounts are converted into {tripCurrencyCode} using the rate for the expense date.
              </AppText>
              <AppInput
                label="Note"
                value={values.note}
                onChangeText={(text) => setField("note", text)}
                placeholder="Dinner by the river"
                editable={isTripActive}
              />

              <View style={styles.group}>
                <AppText variant="meta" color="muted">
                  Category
                </AppText>
                <View style={styles.chipWrap}>
                  {PRESET_CATEGORIES.filter((c) => c.id !== "settle_up").map((item) => (
                    <Chip
                      key={item.id}
                      label={item.label}
                      selected={values.category === item.id}
                      onPress={isTripActive ? () => setField("category", item.id) : undefined}
                    />
                  ))}
                </View>
              </View>

              {values.category === "custom" ? (
                <AppInput
                  label="Custom category"
                  value={values.customCategory}
                  onChangeText={(text) => setField("customCategory", text)}
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
                      selected={values.paidByMemberId === member.id}
                      onPress={isTripActive ? () => setField("paidByMemberId", member.id) : undefined}
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
                      selected={isGroupSelected(group)}
                      onPress={isTripActive ? () => toggleGroup(group) : undefined}
                      tone="success"
                    />
                  ))}
                  {expenseFormMembers.map((member) => {
                    const selected = values.selectedMembers.includes(member.id);

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
                    selected={values.splitMode === "equal"}
                    onPress={isTripActive ? () => setSplitMode("equal") : undefined}
                  />
                  <Chip
                    label="By amount"
                    selected={values.splitMode === "byAmount"}
                    onPress={isTripActive ? () => setSplitMode("byAmount") : undefined}
                  />
                  <Chip
                    label="By %"
                    selected={values.splitMode === "byPercentage"}
                    onPress={isTripActive ? () => setSplitMode("byPercentage") : undefined}
                  />
                </View>
              </View>

              {values.splitMode !== "equal" && values.selectedMembers.length > 0 ? (
                <View style={styles.group}>
                  <AppText variant="meta" color="muted">
                    {values.splitMode === "byAmount" ? "Amount per person" : "Percentage per person"}
                  </AppText>
                  {values.selectedMembers.map((memberId) => {
                    const member = expenseFormMembers.find((m) => m.id === memberId);
                    if (!member) return null;

                    return (
                      <AppInput
                        key={memberId}
                        label={member.displayName}
                        value={values.splitShares[memberId] ?? ""}
                        onChangeText={(val) => setSplitShare(memberId, val)}
                        placeholder={values.splitMode === "byAmount" ? "0.00" : "0"}
                        keyboardType="decimal-pad"
                        editable={isTripActive}
                      />
                    );
                  })}
                  <AppText variant="bodySm" color="muted">
                    {values.splitMode === "byAmount"
                      ? `Total: ${splitShareTotal(values.splitShares).toFixed(2)} of ${values.amount || "0"}`
                      : `Total: ${splitShareTotal(values.splitShares).toFixed(1)}%`}
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
                <AppButton onPress={submitExpense} disabled={isSaving || !isTripActive}>
                  {isSaving ? "Saving..." : editingExpense ? "Save changes" : "Save expense"}
                </AppButton>
                <AppButton onPress={onClose} variant="secondary">
                  Cancel
                </AppButton>
              </View>
            </ScrollView>
          </SurfaceCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: Theme, compact: boolean) {
  return StyleSheet.create({
    group: {
      gap: theme.spacing.sm
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
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
