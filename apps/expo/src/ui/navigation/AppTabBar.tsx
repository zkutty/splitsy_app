import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTrips } from "../../providers/trips-provider";
import { AppButton } from "../primitives/AppButton";
import { AppText } from "../primitives/AppText";
import { theme } from "../theme";
import { BrandMark } from "./BrandMark";

const LABELS: Record<string, string> = {
  home: "Home",
  trips: "Trips",
  account: "Account"
};

type AppTabBarProps = any;

export function AppTabBar({ state, navigation }: AppTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 960;
  const { currentUser, signOut } = useTrips();

  if (wide) {
    return (
      <View style={styles.webShell}>
        <View style={styles.webInner}>
          <BrandMark compact />

          <View style={styles.webNav}>
            {state.routes.map((route: { key: string; name: string; params?: object }, index: number) => {
              const focused = state.index === index;
              const label = LABELS[route.name] ?? route.name;

              return (
                <Pressable
                  key={route.key}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true
                    });

                    if (!focused && !event.defaultPrevented) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  style={[styles.webNavItem, focused ? styles.webNavItemActive : null]}
                >
                  <AppText variant="bodySm" color={focused ? "inverse" : "secondary"} style={styles.webNavItemLabel}>
                    {label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.webAccount}>
            <View style={styles.webAvatar}>
              <AppText variant="bodySm" color="inverse" style={styles.webAvatarLabel}>
                {(currentUser.displayName || "T").slice(0, 1).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.webAccountCopy}>
              <AppText variant="meta" color="muted">
                Signed In
              </AppText>
              <AppText variant="bodySm" color="secondary" style={styles.webAccountName}>
                {currentUser.displayName}
              </AppText>
            </View>
            <AppButton onPress={signOut} variant="secondary" fullWidth={false}>
              Sign out
            </AppButton>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mobileShell, { paddingBottom: Math.max(theme.spacing.sm, insets.bottom) }]}>
      <View style={styles.mobileNav}>
        {state.routes.map((route: { key: string; name: string; params?: object }, index: number) => {
          const focused = state.index === index;
          const label = LABELS[route.name] ?? route.name;

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true
                });

                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              style={[styles.mobileNavItem, focused ? styles.mobileNavItemActive : null]}
            >
              <AppText variant="bodySm" color={focused ? "inverse" : "muted"} style={styles.mobileNavLabel}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webShell: {
    backgroundColor: theme.colors.background.canvas,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle
  },
  webInner: {
    maxWidth: 1280,
    marginHorizontal: "auto",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg
  },
  webNav: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  webNavItem: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: "transparent"
  },
  webNavItemActive: {
    backgroundColor: theme.colors.accent.primary
  },
  webNavItemLabel: {
    fontWeight: theme.type.weight.semibold
  },
  webAccount: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  webAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  webAvatarLabel: {
    fontWeight: theme.type.weight.bold
  },
  webAccountCopy: {
    gap: 2,
    minWidth: 120
  },
  webAccountName: {
    fontWeight: theme.type.weight.semibold
  },
  mobileShell: {
    backgroundColor: theme.colors.background.canvas,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8
  },
  mobileNav: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  mobileNavItem: {
    flex: 1,
    minHeight: 52,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  mobileNavItemActive: {
    backgroundColor: theme.colors.accent.primary
  },
  mobileNavLabel: {
    fontWeight: theme.type.weight.semibold
  }
});
