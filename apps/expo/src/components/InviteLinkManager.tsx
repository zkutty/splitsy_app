import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import type { TripInvite } from "../services/trips-repository";
import { AppButton } from "../ui/primitives/AppButton";
import { AppInput } from "../ui/primitives/AppInput";
import { AppText } from "../ui/primitives/AppText";
import { SurfaceCard } from "../ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../ui/theme";

// ZKU-57: Standalone invite-link management UI (create with an optional use
// cap, list existing links, copy, and revoke). Extracted as its own
// component rather than inlined so it can be dropped into any screen that
// manages a trip's invites. It is NOT wired into apps/expo/app/trip/[tripId].tsx
// yet — that screen currently has its own inline "create invite link" flow
// and is owned by a different in-flight change, so final integration
// (replacing/augmenting that inline flow with this component) is left for a
// follow-up pass on that screen.

export type InviteLinkManagerProps = {
  invites: TripInvite[];
  isLoading?: boolean;
  isCreating?: boolean;
  revokingInviteId?: string | null;
  error?: string | null;
  feedback?: string | null;
  buildInviteUrl: (token: string) => string;
  onCreateInvite: (maxUses: number | null) => Promise<void> | void;
  onRevokeInvite: (inviteId: string) => Promise<void> | void;
};

function statusLabel(invite: TripInvite): string {
  switch (invite.status) {
    case "pending":
      return invite.maxUses != null
        ? `Active · ${invite.useCount}/${invite.maxUses} used`
        : `Active · ${invite.useCount} used`;
    case "accepted":
      return "Accepted";
    case "revoked":
      return "Revoked";
    case "expired":
      return "Expired";
    default:
      return invite.status;
  }
}

export function InviteLinkManager({
  invites,
  isLoading = false,
  isCreating = false,
  revokingInviteId = null,
  error = null,
  feedback = null,
  buildInviteUrl,
  onCreateInvite,
  onRevokeInvite
}: InviteLinkManagerProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [maxUsesInput, setMaxUsesInput] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const activeInvites = invites.filter((invite) => invite.status === "pending");
  const inactiveInvites = invites.filter((invite) => invite.status !== "pending");

  const handleCreate = async () => {
    const trimmed = maxUsesInput.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (parsed != null && (!Number.isFinite(parsed) || parsed < 1)) {
      return;
    }

    await onCreateInvite(parsed != null ? Math.floor(parsed) : null);
    setMaxUsesInput("");
  };

  const handleCopy = async (invite: TripInvite) => {
    const link = buildInviteUrl(invite.token);

    try {
      await Clipboard.setStringAsync(link);
      setCopiedToken(invite.token);
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => setCopiedToken((current) => (current === invite.token ? null : current)), 2000);
    } catch {
      // Clipboard access can fail on some platforms/permissions — surfacing
      // a hard error here isn't worth it since the link is still visible.
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <AppText variant="sectionTitle">Invite links</AppText>
      <AppText variant="bodySm" color="muted">
        Create a shareable link. Optionally cap how many times it can be used, and revoke it any time to stop new
        joins immediately.
      </AppText>

      <View style={styles.createRow}>
        <View style={styles.maxUsesField}>
          <AppInput
            label="Max uses (optional)"
            value={maxUsesInput}
            onChangeText={setMaxUsesInput}
            keyboardType="number-pad"
            placeholder="Unlimited"
          />
        </View>
        <AppButton onPress={handleCreate} disabled={isCreating} fullWidth={false}>
          {isCreating ? "Creating..." : "Create invite link"}
        </AppButton>
      </View>

      {error ? (
        <AppText variant="bodySm" color="danger">
          {error}
        </AppText>
      ) : null}
      {feedback ? (
        <AppText variant="bodySm" color="muted">
          {feedback}
        </AppText>
      ) : null}

      {isLoading ? (
        <AppText variant="bodySm" color="muted">
          Loading invite links...
        </AppText>
      ) : activeInvites.length === 0 ? (
        <AppText variant="bodySm" color="muted">
          No active invite links yet.
        </AppText>
      ) : (
        <View style={styles.list}>
          {activeInvites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <View style={styles.inviteInfo}>
                <AppText variant="bodySm">{statusLabel(invite)}</AppText>
                <AppText variant="meta" color="muted">
                  Expires {new Date(invite.expiresAt).toLocaleDateString()}
                </AppText>
              </View>
              <View style={styles.inviteActions}>
                <Pressable onPress={() => handleCopy(invite)} hitSlop={8} style={styles.linkButton}>
                  <AppText variant="bodySm" color="primary">
                    {copiedToken === invite.token ? "Copied" : "Copy link"}
                  </AppText>
                </Pressable>
                <AppButton
                  onPress={() => onRevokeInvite(invite.id)}
                  variant="danger"
                  fullWidth={false}
                  disabled={revokingInviteId === invite.id}
                >
                  {revokingInviteId === invite.id ? "Revoking..." : "Revoke"}
                </AppButton>
              </View>
            </View>
          ))}
        </View>
      )}

      {inactiveInvites.length > 0 ? (
        <View style={styles.list}>
          <AppText variant="meta" color="muted">
            Past links
          </AppText>
          {inactiveInvites.map((invite) => (
            <View key={invite.id} style={styles.inviteRow}>
              <AppText variant="bodySm" color="muted">
                {statusLabel(invite)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </SurfaceCard>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      gap: theme.spacing.md
    },
    createRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: theme.spacing.sm
    },
    maxUsesField: {
      flex: 1
    },
    list: {
      gap: theme.spacing.sm
    },
    inviteRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs
    },
    inviteInfo: {
      gap: 2
    },
    inviteActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md
    },
    linkButton: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm
    }
  });
}
