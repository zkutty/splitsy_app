import { useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import type { Member, MemberGroup, TripSettlement } from "@splitsy/domain";

import type { TripInvite } from "../services/trips-repository";
import { InviteLinkManager } from "./InviteLinkManager";
import { AppButton } from "../ui/primitives/AppButton";
import { AppInput } from "../ui/primitives/AppInput";
import { AppText } from "../ui/primitives/AppText";
import { GroupCard } from "../ui/primitives/GroupCard";
import { GroupEditor } from "../ui/primitives/GroupEditor";
import { GroupMemberPicker } from "../ui/primitives/GroupMemberPicker";
import { SectionCard } from "../ui/primitives/SectionCard";
import { SurfaceCard } from "../ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../ui/theme";

// ZKU-60: Member/group management + invite links, extracted out of
// trip/[tripId].tsx. The invite-link UI itself is InviteLinkManager (ZKU-57) —
// this component only owns the data/state that feeds it (list/create/revoke),
// matching the create-with-cap/list/copy/revoke contract it already exposes.

export type MemberManagementProps = {
  tripId: string;
  members: Member[];
  activeMembers: Member[];
  groups: MemberGroup[];
  tripCreator: Member | undefined;
  settlement: TripSettlement | null;
  mayManageTrip: boolean;
  isTripActive: boolean;
  compact: boolean;
  fmt: (amount: number, overrideCurrency?: string) => string;
  addTripMember: (tripId: string, input: { displayName: string; email?: string }) => Promise<void>;
  removeTripMember: (tripId: string, memberId: string) => Promise<void>;
  createGroup: (tripId: string, name: string) => Promise<void>;
  updateGroup: (groupId: string, name: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMemberToGroup: (tripId: string, memberId: string, groupId: string) => Promise<void>;
  removeMemberFromGroup: (tripId: string, memberId: string) => Promise<void>;
  listTripInvites: (tripId: string) => Promise<TripInvite[]>;
  revokeTripInvite: (inviteId: string) => Promise<void>;
  createTripInviteLink: (tripId: string, maxUses?: number | null) => Promise<string>;
};

function getMemberStatusText(member: Member): string {
  if ((member.status ?? "active") === "removed") {
    return member.removedAt ? `Removed on ${member.removedAt.slice(0, 10)}` : "Removed from this trip";
  }

  if ((member.status ?? "active") === "departed") {
    return member.departedAt ? `Departed and settled on ${member.departedAt.slice(0, 10)}` : "Departed early — settled up";
  }

  if (member.isLinked) {
    return member.email ? `Linked account · ${member.email}` : "Linked account";
  }

  if (member.email) {
    return `Invite pending · ${member.email}`;
  }

  return "Manual member";
}

function getMemberInitials(displayName: string): string {
  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildInviteUrl(token: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/join/${token}`;
  }

  return Linking.createURL(`/join/${token}`);
}

export function MemberManagement({
  tripId,
  members,
  activeMembers,
  groups,
  tripCreator,
  settlement,
  mayManageTrip,
  isTripActive,
  compact,
  fmt,
  addTripMember,
  removeTripMember,
  createGroup,
  updateGroup,
  deleteGroup,
  addMemberToGroup,
  removeMemberFromGroup,
  listTripInvites,
  revokeTripInvite,
  createTripInviteLink
}: MemberManagementProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [memberPendingRemovalId, setMemberPendingRemovalId] = useState<string | null>(null);
  const [showRemovedMembers, setShowRemovedMembers] = useState(false);
  const [showGroupEditor, setShowGroupEditor] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [memberPickerGroupId, setMemberPickerGroupId] = useState<string | null>(null);

  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!mayManageTrip || !isTripActive) {
      return;
    }

    let cancelled = false;
    setIsLoadingInvites(true);

    listTripInvites(tripId)
      .then((result) => {
        if (!cancelled) {
          setInvites(result);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setInviteError(error instanceof Error ? error.message : "Unable to load invite links.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingInvites(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, mayManageTrip, isTripActive]);

  const handleCreateInvite = async (maxUses: number | null) => {
    setIsCreatingInvite(true);
    setInviteError(null);
    setInviteFeedback(null);

    try {
      await createTripInviteLink(tripId, maxUses);
      const refreshed = await listTripInvites(tripId);
      setInvites(refreshed);
      setInviteFeedback("Invite link ready.");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to create an invite link.");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    setInviteError(null);

    try {
      await revokeTripInvite(inviteId);
      setInvites((current) =>
        current.map((invite) => (invite.id === inviteId ? { ...invite, status: "revoked" } : invite))
      );
      setInviteFeedback("Invite link revoked.");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to revoke invite link.");
    } finally {
      setRevokingInviteId(null);
    }
  };

  const submitMember = async () => {
    if (!isTripActive || !memberName.trim()) {
      return;
    }

    setIsAddingMember(true);

    try {
      await addTripMember(tripId, {
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
      await removeTripMember(tripId, memberId);
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

  const ungroupedMembers = useMemo(() => activeMembers.filter((member) => !member.groupId), [activeMembers]);

  const removedMembers = useMemo(
    () => members.filter((member) => (member.status ?? "active") === "removed"),
    [members]
  );

  const removedMembersWithBalances = useMemo(() => {
    if (!settlement) return [];

    return removedMembers.filter((member) => {
      const balance = settlement.balances.find((b) => (b.entity.type === "member" ? b.entity.memberId === member.id : false));
      return balance && Math.abs(balance.net) >= 0.01;
    });
  }, [removedMembers, settlement]);

  return (
    <>
      <SectionCard
        title="Members"
        description={
          mayManageTrip
            ? isTripActive
              ? "Invite everyone who should be included in balances and settlements. If someone leaves early, you can mark them as departed so they settle up and stop being included in future expenses."
              : "Member management is locked after completion."
            : "You can see everyone on the trip. Only the trip creator can manage membership."
        }
      >
        {mayManageTrip && isTripActive ? (
          <InviteLinkManager
            invites={invites}
            isLoading={isLoadingInvites}
            isCreating={isCreatingInvite}
            revokingInviteId={revokingInviteId}
            error={inviteError}
            feedback={inviteFeedback}
            buildInviteUrl={buildInviteUrl}
            onCreateInvite={handleCreateInvite}
            onRevokeInvite={handleRevokeInvite}
          />
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
                  members={members}
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
                          <AppButton onPress={() => setMemberPendingRemovalId(null)} variant="secondary" fullWidth={compact}>
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
                      <AppButton onPress={() => setMemberPendingRemovalId(member.id)} variant="secondary" fullWidth={compact}>
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
            <Pressable style={styles.membersHeaderRow} onPress={() => setShowRemovedMembers(!showRemovedMembers)}>
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
                  const balance = settlement?.balances.find(
                    (b) => b.entity.type === "member" && b.entity.memberId === member.id
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
                            <AppText variant="bodySm" color={balance.net < 0 ? "danger" : balance.net > 0 ? "success" : "muted"}>
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
    </>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    group: {
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
    actionRowCompact: {
      alignItems: "stretch"
    }
  });
}
