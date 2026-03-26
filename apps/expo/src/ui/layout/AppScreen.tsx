import { PropsWithChildren } from "react";
import { Platform, ScrollView, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../theme";

type AppScreenProps = PropsWithChildren<{
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, maxWidth = theme.layout.maxWidth, contentStyle }: AppScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentMaxWidth = width < 768 ? theme.layout.contentWidth : maxWidth;

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
      >
        <View style={[styles.shell, { maxWidth: contentMaxWidth }, contentStyle]}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  }
});
