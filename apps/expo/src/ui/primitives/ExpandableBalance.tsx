import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { SettlementBalance } from "@splitsy/domain";

import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

type ExpandableBalanceProps = {
  balance: SettlementBalance;
  formatAmount: (amount: number) => string;
  compact?: boolean;
};

export function ExpandableBalance({ balance, formatAmount, compact = false }: ExpandableBalanceProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);

  const canExpand = balance.isGroup && balance.memberBalances && balance.memberBalances.length > 0;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => canExpand && setExpanded(!expanded)}
        style={[styles.rowCard, compact ? styles.rowCardCompact : null]}
        disabled={!canExpand}
      >
        <View style={styles.rowCopy}>
          <View style={styles.titleRow}>
            {canExpand && (
              <AppText variant="bodySm" color="muted" style={styles.expandIcon}>
                {expanded ? "▼" : "▶"}
              </AppText>
            )}
            <AppText variant="bodySm" color="secondary" style={styles.rowTitle}>
              {balance.displayName}
            </AppText>
            {balance.isGroup && (
              <AppText variant="meta" color="muted">
                Group
              </AppText>
            )}
          </View>
          <AppText variant="bodySm" color="muted">
            Paid {formatAmount(balance.paid)} · Owes {formatAmount(balance.owed)}
          </AppText>
        </View>
        <AppText
          variant="bodySm"
          color={balance.net < 0 ? "danger" : balance.net > 0 ? "success" : "muted"}
          style={styles.netAmount}
        >
          {formatAmount(balance.net)}
        </AppText>
      </Pressable>

      {expanded && canExpand && (
        <View style={styles.memberBalances}>
          {balance.memberBalances!.map((memberBalance) => (
            <View key={memberBalance.memberId} style={[styles.memberRow, compact ? styles.memberRowCompact : null]}>
              <View style={styles.memberCopy}>
                <AppText variant="bodySm" color="muted" style={styles.memberName}>
                  {memberBalance.displayName}
                </AppText>
                <AppText variant="bodySm" color="muted" style={styles.memberDetail}>
                  Paid {formatAmount(memberBalance.paid)} · Owes {formatAmount(memberBalance.owed)}
                </AppText>
              </View>
              <AppText
                variant="bodySm"
                color={memberBalance.net < 0 ? "danger" : memberBalance.net > 0 ? "success" : "muted"}
                style={styles.netAmount}
              >
                {formatAmount(memberBalance.net)}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs
    },
    rowCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface.base
    },
    rowCardCompact: {
      flexDirection: "column",
      alignItems: "flex-start"
    },
    rowCopy: {
      flex: 1,
      gap: theme.spacing.xs
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs
    },
    expandIcon: {
      width: 16
    },
    rowTitle: {
      fontWeight: theme.type.weight.semibold
    },
    netAmount: {
      fontWeight: theme.type.weight.semibold,
      minWidth: 80,
      textAlign: "right"
    },
    memberBalances: {
      paddingLeft: theme.spacing.xl,
      gap: theme.spacing.xs
    },
    memberRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.background.base
    },
    memberRowCompact: {
      flexDirection: "column",
      alignItems: "flex-start"
    },
    memberCopy: {
      flex: 1,
      gap: theme.spacing.xs
    },
    memberName: {
      fontStyle: "italic"
    },
    memberDetail: {
      fontSize: theme.type.size.xs
    }
  });
}
