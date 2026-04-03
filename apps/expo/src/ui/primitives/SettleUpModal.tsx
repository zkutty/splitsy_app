import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";

import type {
  Member,
  MemberGroup,
  SettlementEntity,
  SettlementTransfer,
  TripSettlement
} from "@splitsy/domain";
import { validateExpenseDraft } from "@splitsy/domain";

import type { AddExpenseInput } from "../../services/trips-repository";
import { AppButton } from "./AppButton";
import { AppInput } from "./AppInput";
import { AppText } from "./AppText";
import { Chip } from "./Chip";
import { SurfaceCard } from "./SurfaceCard";
import { Theme, useAppTheme } from "../theme";

type SettleUpModalProps = {
  visible: boolean;
  transfer: SettlementTransfer;
  tripId: string;
  tripCurrencyCode: string;
  members: Member[];
  groups: MemberGroup[];
  settlement: TripSettlement;
  onClose: () => void;
  onSubmit: (tripId: string, input: AddExpenseInput) => Promise<void>;
};

const NOTE_PRESETS = ["Cash", "Venmo", "Zelle", "PayPal"];

function pickBestMember(
  entity: SettlementEntity,
  role: "debtor" | "creditor",
  settlement: TripSettlement,
  members: Member[],
  groups: MemberGroup[]
): string {
  if (entity.type === "member") return entity.memberId;

  const groupBalance = settlement.balances.find(
    (b) => b.entity.type === "group" && (b.entity as { type: "group"; groupId: string }).groupId === entity.groupId
  );
  const mb = groupBalance?.memberBalances ?? [];

  if (!mb.length) {
    const g = groups.find((g) => g.id === entity.groupId);
    return g?.memberIds[0] ?? "";
  }

  return role === "debtor"
    ? mb.reduce((a, b) => (a.net < b.net ? a : b)).memberId // most negative — owes most
    : mb.reduce((a, b) => (a.net > b.net ? a : b)).memberId; // most positive — owed most
}

export function SettleUpModal({
  visible,
  transfer,
  tripId,
  tripCurrencyCode,
  members,
  groups,
  settlement,
  onClose,
  onSubmit
}: SettleUpModalProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [payerMemberId, setPayerMemberId] = useState("");
  const [recipientMemberId, setRecipientMemberId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Re-initialize when modal opens
  useEffect(() => {
    if (!visible) return;
    setAmount(String(transfer.amount));
    setNote("");
    setErrors([]);
    setPayerMemberId(pickBestMember(transfer.fromEntity, "debtor", settlement, members, groups));
    setRecipientMemberId(pickBestMember(transfer.toEntity, "creditor", settlement, members, groups));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const payerCandidates = useMemo(() => {
    if (transfer.fromEntity.type === "member") {
      return members.filter((m) => m.id === (transfer.fromEntity as { type: "member"; memberId: string }).memberId);
    }
    const g = groups.find((g) => g.id === (transfer.fromEntity as { type: "group"; groupId: string }).groupId);
    return g ? members.filter((m) => g.memberIds.includes(m.id)) : [];
  }, [transfer.fromEntity, members, groups]);

  const recipientCandidates = useMemo(() => {
    if (transfer.toEntity.type === "member") {
      return members.filter((m) => m.id === (transfer.toEntity as { type: "member"; memberId: string }).memberId);
    }
    const g = groups.find((g) => g.id === (transfer.toEntity as { type: "group"; groupId: string }).groupId);
    return g ? members.filter((m) => g.memberIds.includes(m.id)) : [];
  }, [transfer.toEntity, members, groups]);

  const numericAmount = Number(amount);
  const remaining = transfer.amount - numericAmount;
  const isPartial = numericAmount > 0 && numericAmount < transfer.amount;

  const recipientName =
    recipientCandidates.find((m) => m.id === recipientMemberId)?.displayName ??
    transfer.toDisplayName;

  const handleNotePreset = (preset: string) => {
    setNote((prev) => (prev === preset ? "" : preset));
  };

  const handleSubmit = async () => {
    if (payerMemberId === recipientMemberId) {
      setErrors(["Payer and recipient cannot be the same person."]);
      return;
    }

    const num = Number(amount);
    const draft = {
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: num,
      currencyCode: tripCurrencyCode,
      category: "settle_up" as const,
      note: note.trim() || null,
      paidByMemberId: payerMemberId,
      involvedMemberIds: [recipientMemberId],
      splitMode: "byAmount" as const,
      splitShares: { [recipientMemberId]: num }
    };

    const validation = validateExpenseDraft(draft);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setIsSaving(true);
    try {
      // conversionRate is always 1 — settle-up amounts are already in trip currency
      await onSubmit(tripId, {
        ...draft,
        conversionRateToTripCurrency: 1,
        tripAmount: num
      });

      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      onClose();
    } catch (err: any) {
      setErrors([err?.message ?? "Failed to log payment."]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <SurfaceCard style={styles.card}>
            <View style={styles.header}>
              <AppText variant="sectionTitle">Log payment</AppText>
              <Pressable onPress={onClose} hitSlop={8}>
                <AppText variant="body" color="muted">✕</AppText>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              <AppText variant="bodySm" color="muted">
                {transfer.fromDisplayName} → {transfer.toDisplayName} · {tripCurrencyCode} {transfer.amount.toFixed(2)} outstanding
              </AppText>

              <AppInput
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder={String(transfer.amount)}
                helperText={
                  isPartial
                    ? `Partial payment — ${recipientName} still needs ${remaining.toFixed(2)} more`
                    : undefined
                }
              />

              {payerCandidates.length > 1 && (
                <View style={styles.group}>
                  <AppText variant="meta" color="muted">Who's paying?</AppText>
                  <View style={styles.chipWrap}>
                    {payerCandidates.map((m) => (
                      <Chip
                        key={m.id}
                        label={m.displayName}
                        selected={payerMemberId === m.id}
                        onPress={() => setPayerMemberId(m.id)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {recipientCandidates.length > 1 && (
                <View style={styles.group}>
                  <AppText variant="meta" color="muted">Paying to</AppText>
                  <View style={styles.chipWrap}>
                    {recipientCandidates.map((m) => (
                      <Chip
                        key={m.id}
                        label={m.displayName}
                        selected={recipientMemberId === m.id}
                        onPress={() => setRecipientMemberId(m.id)}
                      />
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.group}>
                <AppText variant="meta" color="muted">Payment method (optional)</AppText>
                <View style={styles.chipWrap}>
                  {NOTE_PRESETS.map((preset) => (
                    <Chip
                      key={preset}
                      label={preset}
                      selected={note === preset}
                      onPress={() => handleNotePreset(preset)}
                    />
                  ))}
                </View>
                <AppInput
                  label="Note"
                  value={note}
                  onChangeText={setNote}
                  placeholder='e.g. "Cash", "Bank transfer"'
                />
              </View>

              {errors.length > 0 && (
                <SurfaceCard>
                  {errors.map((e) => (
                    <AppText key={e} variant="bodySm" color="danger">{e}</AppText>
                  ))}
                </SurfaceCard>
              )}

              <View style={styles.actions}>
                <AppButton onPress={handleSubmit} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Log payment"}
                </AppButton>
                <AppButton onPress={onClose} variant="secondary" disabled={isSaving}>
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

function createStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg
    },
    container: {
      width: "100%",
      maxWidth: 480,
      maxHeight: "90%"
    },
    card: {
      maxHeight: "100%",
      gap: theme.spacing.md
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    scroll: {
      flexShrink: 1
    },
    scrollContent: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.sm
    },
    group: {
      gap: theme.spacing.sm
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    actions: {
      gap: theme.spacing.sm
    }
  });
}
