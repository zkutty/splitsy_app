import { PropsWithChildren } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { AppScreen } from "./AppScreen";
import { theme } from "../theme";

export function AuthScreen({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const wide = width >= 960;

  return (
    <AppScreen>
      <View style={[styles.canvas, wide ? styles.canvasWide : null]}>{children}</View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  canvas: {
    minHeight: 640,
    justifyContent: "center",
    borderRadius: 32,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.muted,
    overflow: "hidden"
  },
  canvasWide: {
    padding: theme.spacing.xxl
  }
});
