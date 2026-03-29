import { PropsWithChildren, ReactElement, useMemo } from "react";
import { Platform, RefreshControl, ScrollView, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeaderMenu } from "../navigation/AppHeaderMenu";
import { BrandMark } from "../navigation/BrandMark";
import { Theme, useAppTheme } from "../theme";

type AppScreenProps = PropsWithChildren<{
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
  showHeaderMenu?: boolean;
  refreshControl?: ReactElement<typeof RefreshControl>;
}>;

export function AppScreen({ children, maxWidth, contentStyle, showHeaderMenu = false, refreshControl }: AppScreenProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const showMobileHeader = showHeaderMenu && width < 960;
  const contentMaxWidth = width < 768 ? theme.layout.contentWidth : (maxWidth ?? theme.layout.maxWidth);

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(theme.spacing.lg, insets.top + theme.spacing.xs),
            paddingBottom: Math.max(theme.spacing.lg, insets.bottom + theme.spacing.md)
          }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        refreshControl={refreshControl}
      >
        <View style={[styles.shell, { maxWidth: contentMaxWidth }, contentStyle]}>
          {showMobileHeader ? (
            <View style={styles.mobileHeader}>
              <BrandMark compact />
              <AppHeaderMenu />
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.canvas
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.md
    },
    shell: {
      width: "100%",
      alignSelf: "center",
      gap: theme.spacing.lg,
      ...(Platform.OS === "web" ? { minHeight: "100%" as const } : null)
    },
    mobileHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.md
    }
  });
}
