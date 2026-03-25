import { PropsWithChildren } from "react";
import { Platform, ScrollView, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../theme";

type AppScreenProps = PropsWithChildren<{
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
}>;

export function AppScreen({ children, maxWidth = theme.layout.maxWidth, contentStyle }: AppScreenProps) {
  const { width } = useWindowDimensions();
  const contentMaxWidth = width < 768 ? theme.layout.contentWidth : maxWidth;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg
  },
  shell: {
    width: "100%",
    alignSelf: "center",
    gap: theme.spacing.lg,
    ...(Platform.OS === "web" ? { minHeight: "100%" as const } : null)
  }
});
