import { useEffect, useState } from "react";
import type { RefObject } from "react";
import * as Linking from "expo-linking";
import { StyleSheet, View } from "react-native";

import type {
  PaymentMethodType,
  SettlementTransfer,
  Trip,
  TripSettlement,
  TripSettlementTransfer
} from "@splitsy/domain";

import { buildPaymentLink } from "../lib/payment-links";
import { AppButton } from "../ui/primitives/AppButton";
import { AppText } from "../ui/primitives/AppText";
import { ExpandableBalance } from "../ui/primitives/ExpandableBalance";
import { FinancialDisclaimer } from "../ui/primitives/FinancialDisclaimer";
import { SectionCard } from "../ui/primitives/SectionCard";
import { Theme, useAppTheme } from "../ui/theme";

// ZKU-60: The settlement view — balances plus repayments/final-payments —
// extracted out of trip/[tripId].tsx. Owns loading recipients' payment
// methods (so it can offer a direct pay link) and the mark-paid/confirm-received
// button state, since nothing else on the screen needs those.

export type SettlementSectionProps = {
  trip: Trip;
  compact: boolean;
  settlement: TripSettlement | null;
  persistedTransfers: TripSettlementTransfer[];
  fmt: (amount: number, overrideCurrency?: string) => string;
  canMarkSettlementTransferPaid: (transferId: string) => boolean;
  markSettlementTransferPaid: (transferId: string) => Promise<void>;
  canConfirmSettlementTransferReceived: (transferId: string) => boolean;
  confirmSettlementTransferReceived: (transferId: string) => Promise<void>;
  getPaymentMethodForUser: (userId: string) => Promise<{ type: PaymentMethodType | null; handle: string | null }>;
  onLogPayment: (transfer: SettlementTransfer) => void;
  /** Anchors for the jump-nav bar's "Balances"/"Repayments" chips — kept as two separate scroll targets. */
  balancesSectionRef: RefObject<View | null>;
  paymentsSectionRef: RefObject<View | null>;
};

export function SettlementSection({
  trip,
  compact,
  settlement,
  persistedTransfers,
  fmt,
  canMarkSettlementTransferPaid,
  markSettlementTransferPaid,
  canConfirmSettlementTransferReceived,
  confirmSettlementTransferReceived,
  getPaymentMethodForUser,
  balancesSectionRef,
  paymentsSectionRef,
  onLogPayment
}: SettlementSectionProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [activeTransferId, setActiveTransferId] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<
    Record<string, { type: PaymentMethodType | null; handle: string | null }>
  >({});

  // Load payment methods for transfer recipients when trip is completed
  useEffect(() => {
    if (trip.status === "active" || !persistedTransfers.length) return;

    const recipientUserIds = new Set<string>();
    for (const transfer of persistedTransfers) {
      if (transfer.toEntity.type === "member") {
        const toEntity = transfer.toEntity;
        const member = trip.members.find((m) => m.id === toEntity.memberId);
        if (member?.userId && !paymentMethods[member.userId]) {
          recipientUserIds.add(member.userId);
        }
      } else if (transfer.toEntity.type === "group") {
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
  }, [trip.id, trip.status, persistedTransfers.length]);

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

  const getPaymentLinkForTransfer = (transfer: TripSettlementTransfer) => {
    // For group transfers, find any member of the group with a payment method
    if (transfer.toEntity.type === "group") {
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
    if (toEntity.type !== "member") return null;
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
              onPress={async () => {
                await Linking.openURL(payLink.url);
              }}
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

  return (
    <>
      <View ref={balancesSectionRef} collapsable={false}>
      <SectionCard title="Balances" collapsible description="Positive values are owed back. Negative values still owe the group.">
        {settlement?.balances.map((balance) => {
          const key = balance.entity.type === "group" ? `g:${balance.entity.groupId}` : `m:${balance.entity.memberId}`;

          return <ExpandableBalance key={key} balance={balance} formatAmount={fmt} compact={compact} />;
        })}
        <FinancialDisclaimer />
      </SectionCard>
      </View>

      <View ref={paymentsSectionRef} collapsable={false}>
      {trip.status === "active" ? (
        <SectionCard
          title="Repayments"
          description="SplitTrip minimizes the number of transfers needed to settle up. Early departure settlements are handled separately and factored into the final settlement."
        >
          {settlement?.transfers.length ? (
            settlement.transfers.map((transfer, index) => (
              <View key={`transfer-${index}`} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
                <View style={styles.rowCopy}>
                  <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                    {transfer.fromDisplayName} <AppText variant="bodySm" color="muted">{" >> "}</AppText>
                    {fmt(transfer.amount)}
                    <AppText variant="bodySm" color="muted">{" >> "}</AppText> {transfer.toDisplayName}
                  </AppText>
                </View>
                <View style={[styles.expenseMeta, compact ? styles.expenseMetaCompact : null]}>
                  <AppText variant="bodySm" color="primary" style={styles.netAmount}>
                    {fmt(transfer.amount)}
                  </AppText>
                  <AppButton onPress={() => onLogPayment(transfer)} variant="secondary" fullWidth={false}>
                    Log payment
                  </AppButton>
                </View>
              </View>
            ))
          ) : (
            <AppText variant="bodySm" color="muted">
              Trip is already settled.
            </AppText>
          )}
        </SectionCard>
      ) : (
        <SectionCard title="Final payments" description="These transfers were saved when the trip was completed.">
          {persistedTransfers.length ? (
            persistedTransfers.map((transfer) => (
              <View key={transfer.id} style={[styles.rowCard, compact ? styles.rowCardCompact : null]}>
                <View style={styles.rowCopy}>
                  <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
                    {transfer.fromDisplayName} <AppText variant="bodySm" color="muted">{" >> "}</AppText>
                    {fmt(transfer.amount)}
                    <AppText variant="bodySm" color="muted">{" >> "}</AppText> {transfer.toDisplayName}
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
            ))
          ) : (
            <AppText variant="bodySm" color="muted">
              No final payments were required for this trip.
            </AppText>
          )}
        </SectionCard>
      )}
      </View>
    </>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
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
    }
  });
}
