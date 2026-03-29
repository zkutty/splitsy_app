import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { AppButton } from "./AppButton";
import { AppInput } from "./AppInput";
import { SurfaceCard } from "./SurfaceCard";
import { Theme, useAppTheme } from "../theme";

type GroupEditorProps = {
  visible: boolean;
  title: string;
  initialName?: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
};

export function GroupEditor({ visible, title, initialName = "", onClose, onSave }: GroupEditorProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(initialName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Group name is required");
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(trimmedName);
      setName("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName(initialName);
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

            <AppInput
              label="Group name"
              value={name}
              onChangeText={setName}
              placeholder="Smith Family"
              autoFocus
              editable={!isSaving}
            />

            {error && (
              <AppText variant="bodySm" color="danger">
                {error}
              </AppText>
            )}

            <View style={styles.actions}>
              <AppButton onPress={handleClose} variant="secondary" disabled={isSaving} fullWidth>
                Cancel
              </AppButton>
              <AppButton onPress={handleSave} disabled={isSaving || !name.trim()} fullWidth>
                {isSaving ? "Saving..." : "Save"}
              </AppButton>
            </View>
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
    actions: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm
    }
  });
}
