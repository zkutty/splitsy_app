import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { Member } from "@splitsy/domain";

import { AppText } from "./AppText";
import { AppButton } from "./AppButton";
import { Chip } from "./Chip";
import { SurfaceCard } from "./SurfaceCard";
import { Theme, useAppTheme } from "../theme";

type GroupMemberPickerProps = {
  visible: boolean;
  title: string;
  members: Member[];
  onClose: () => void;
  onSelect: (memberId: string) => Promise<void>;
};

export function GroupMemberPicker({ visible, title, members, onClose, onSelect }: GroupMemberPickerProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async (memberId: string) => {
    setError(null);
    setIsAdding(true);

    try {
      await onSelect(memberId);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add member to group");
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <SurfaceCard style={styles.card}>
            <AppText variant="sectionTitle" color="primary">
              {title}
            </AppText>

            {members.length > 0 ? (
              <View style={styles.memberGrid}>
                {members.map((member) => (
                  <Chip
                    key={member.id}
                    label={member.displayName}
                    onPress={() => handleSelect(member.id)}
                  />
                ))}
              </View>
            ) : (
              <AppText variant="bodySm" color="muted">
                All members are already in groups or no ungrouped members available.
              </AppText>
            )}

            {error && (
              <AppText variant="bodySm" color="danger">
                {error}
              </AppText>
            )}

            <AppButton onPress={handleClose} variant="secondary" disabled={isAdding} fullWidth>
              Cancel
            </AppButton>
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
    modalContent: {
      width: "100%",
      maxWidth: 480
    },
    card: {
      gap: theme.spacing.md
    },
    memberGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm
    }
  });
}
