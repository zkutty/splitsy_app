import { usePathname, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTrips } from "../../providers/trips-provider";
import { Theme, useAppTheme } from "../theme";
import { AppText } from "../primitives/AppText";

const MENU_ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/trips", label: "Trips" },
  { href: "/account", label: "Account" }
] as const;

export function AppHeaderMenu() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useTrips();
  const [open, setOpen] = useState(false);

  const navigateTo = (href: (typeof MENU_ITEMS)[number]["href"]) => {
    setOpen(false);
    router.push(href as any);
  };

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8} style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}>
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={styles.bar} />
      </Pressable>

      <Modal animationType="fade" visible={open} transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { marginTop: insets.top + theme.spacing.lg }]}>
            {MENU_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Pressable
                  key={item.href}
                  onPress={() => navigateTo(item.href)}
                  style={({ pressed }) => [styles.item, active ? styles.itemActive : null, pressed ? styles.itemPressed : null]}
                >
                  <AppText variant="body" color={active ? "inverse" : "primary"} style={styles.itemLabel}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}

            <View style={styles.divider} />

            <Pressable
              onPress={async () => {
                setOpen(false);
                await signOut();
              }}
              style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
            >
              <AppText variant="body" color="danger" style={styles.itemLabel}>
                Sign out
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    trigger: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      backgroundColor: theme.colors.surface.base,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle
    },
    triggerPressed: {
      opacity: 0.88
    },
    bar: {
      width: 18,
      height: 2,
      borderRadius: 999,
      backgroundColor: theme.colors.text.primary
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.18)",
      paddingHorizontal: theme.spacing.md,
      alignItems: "flex-end"
    },
    sheet: {
      width: 220,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.surface.base,
      borderWidth: 1,
      borderColor: theme.colors.border.subtle,
      ...theme.shadow.card
    },
    item: {
      minHeight: 48,
      borderRadius: theme.radius.lg,
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md
    },
    itemActive: {
      backgroundColor: theme.colors.accent.primary
    },
    itemPressed: {
      opacity: 0.9
    },
    itemLabel: {
      fontWeight: theme.type.weight.semibold
    },
    divider: {
      height: 1,
      marginVertical: theme.spacing.xs,
      backgroundColor: theme.colors.border.subtle
    }
  });
}
