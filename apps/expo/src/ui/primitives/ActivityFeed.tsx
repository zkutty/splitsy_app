import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import type { TripActivityEvent } from "@splitsy/domain";

import { formatCurrency } from "../../lib/format";
import { AppText } from "./AppText";
import { Theme, useAppTheme } from "../theme";

type ActivityFeedProps = {
  events: TripActivityEvent[];
};

const EVENT_ICONS: Record<string, string> = {
  expense_added: "+",
  expense_edited: "~",
  expense_deleted: "-",
  member_added: "→",
  member_removed: "←",
  member_claimed: "✓",
  settlement_paid: "$",
  settlement_confirmed: "✓",
  trip_completed: "■",
  trip_settled: "★"
};

function formatEventDescription(event: TripActivityEvent): string {
  const p = event.payload ?? {};
  const actor: string = p.actor_display_name ?? "Someone";

  switch (event.eventType) {
    case "expense_added": {
      const amt = p.trip_amount != null ? formatCurrency(Number(p.trip_amount), p.currency_code ?? "USD") : "";
      const cat = p.custom_category || p.category || "";
      const note = p.note ? ` "${p.note}"` : "";
      const paidBy = p.paid_by_name ? ` paid by ${p.paid_by_name}` : "";
      return `${actor} added ${amt}${note} (${cat})${paidBy}`;
    }
    case "expense_edited": {
      const amt = p.trip_amount != null ? formatCurrency(Number(p.trip_amount), p.currency_code ?? "USD") : "";
      const note = p.note ? ` "${p.note}"` : "";
      return `${actor} edited expense${amt ? ` — ${amt}` : ""}${note}`;
    }
    case "expense_deleted": {
      const amt = p.amount != null ? formatCurrency(Number(p.amount), p.currency_code ?? "USD") : "";
      return `${actor} deleted ${amt ? `${amt} ` : ""}expense`;
    }
    case "member_added":
      return actor === p.member_display_name
        ? `${actor} joined the trip`
        : `${actor} added ${p.member_display_name ?? "a member"}`;
    case "member_removed":
      return `${actor} removed ${p.member_display_name ?? "a member"}`;
    case "member_claimed":
      return `${p.member_display_name ?? actor} claimed their spot`;
    case "settlement_paid": {
      const amt = p.amount != null ? formatCurrency(Number(p.amount), p.currency_code ?? "USD") : "";
      return `${p.from_display_name ?? actor} sent ${amt} to ${p.to_display_name ?? "someone"}`;
    }
    case "settlement_confirmed": {
      const amt = p.amount != null ? formatCurrency(Number(p.amount), p.currency_code ?? "USD") : "";
      return `${p.to_display_name ?? actor} confirmed ${amt} received from ${p.from_display_name ?? "someone"}`;
    }
    case "trip_completed":
      return `${actor} completed the trip`;
    case "trip_settled":
      return "Trip fully settled";
    default:
      return "Unknown event";
  }
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: diffDay > 365 ? "numeric" : undefined
  });
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!events.length) {
    return (
      <AppText variant="bodySm" color="muted">
        No activity yet.
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {events.map((event) => (
        <View key={event.id} style={styles.row}>
          <View style={styles.iconWrap}>
            <AppText variant="bodySm" color="muted" style={styles.icon}>
              {EVENT_ICONS[event.eventType] ?? "•"}
            </AppText>
          </View>
          <View style={styles.body}>
            <AppText variant="bodySm">{formatEventDescription(event)}</AppText>
            <AppText variant="meta" color="muted">
              {formatRelativeTime(event.createdAt)}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    list: {
      gap: 0
    },
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.subtle
    },
    iconWrap: {
      width: 20,
      alignItems: "center",
      paddingTop: 1
    },
    icon: {
      fontWeight: "600"
    },
    body: {
      flex: 1,
      gap: theme.spacing.xxs
    }
  });
}
