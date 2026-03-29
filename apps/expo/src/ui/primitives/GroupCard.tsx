import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { MemberGroup, Member } from "@splitsy/domain";

import { AppText } from "./AppText";
import { AppButton } from "./AppButton";
import { Chip } from "./Chip";
import { SurfaceCard } from "./SurfaceCard";
import { Theme, useAppTheme } from "../theme";

type GroupCardProps = {
  group: MemberGroup;
  members: Member[];
  canEdit: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onRemoveMember?: (memberId: string) => void;
  onAddMember?: () => void;
  compact?: boolean;
};

export function GroupCard({
  group,
  members,
  canEdit,
  onEdit,
  onDelete,
  onRemoveMember,
  onAddMember,
  compact = false
}: GroupCardProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pendingDelete, setPendingDelete] = useState(false);

  const groupMembers = members.filter((m) => group.memberIds.includes(m.id));

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText variant="body" color="secondary" style={styles.groupName}>
            {group.name}
          </AppText>
          <AppText variant="bodySm" color="muted">
            {groupMembers.length} {groupMembers.length === 1 ? "member" : "members"}
          </AppText>
        </View>
        {canEdit && (
          <View style={[styles.headerActions, compact ? styles.headerActionsCompact : null]}>
            {onAddMember && (
              <AppButton onPress={onAddMember} variant="secondary" fullWidth={false}>
                + Add member
              </AppButton>
            )}
            {onEdit && (
              <AppButton onPress={onEdit} variant="secondary" fullWidth={false}>
                Edit name
              </AppButton>
            )}
            {onDelete && !pendingDelete && (
              <AppButton onPress={() => setPendingDelete(true)} variant="secondary" fullWidth={false}>
                Delete
              </AppButton>
            )}
          </View>
        )}
      </View>

      {pendingDelete && (
        <View style={styles.deleteConfirm}>
          <AppText variant="bodySm" color="danger">
            Delete "{group.name}"? Members will be ungrouped.
          </AppText>
          <View style={[styles.confirmActions, compact ? styles.confirmActionsCompact : null]}>
            <AppButton onPress={() => setPendingDelete(false)} variant="secondary" fullWidth={compact}>
              Cancel
            </AppButton>
            <AppButton
              onPress={() => {
                setPendingDelete(false);
                onDelete?.();
              }}
              variant="danger"
              fullWidth={compact}
            >
              Delete group
            </AppButton>
          </View>
        </View>
      )}

      <View style={styles.members}>
        {groupMembers.map((member) => (
          <View key={member.id} style={styles.memberChip}>
            <Chip label={member.displayName} />
            {canEdit && onRemoveMember && (
              <Pressable
                onPress={() => onRemoveMember(member.id)}
                style={styles.removeButton}
                hitSlop={8}
              >
                <AppText variant="bodySm" color="danger">
                  Remove
                </AppText>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      gap: theme.spacing.md
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      flexWrap: "wrap"
    },
    headerLeft: {
      flex: 1,
      minWidth: 160,
      gap: theme.spacing.xs
    },
    groupName: {
      fontWeight: theme.type.weight.semibold
    },
    headerActions: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    headerActionsCompact: {
      flexDirection: "column",
      alignSelf: "stretch"
    },
    deleteConfirm: {
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface.base,
      borderWidth: 1,
      borderColor: theme.colors.accent.danger
    },
    confirmActions: {
      flexDirection: "row",
      gap: theme.spacing.sm
    },
    confirmActionsCompact: {
      flexDirection: "column"
    },
    members: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    },
    memberChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs
    },
    removeButton: {
      paddingHorizontal: theme.spacing.xs
    }
  });
}
