import { PropsWithChildren, useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { AppScreen } from "./AppScreen";
import { Theme, useAppTheme } from "../theme";

export function AuthScreen({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const wide = width >= 960;
  const compact = width < 768;

  return (
    <AppScreen contentStyle={styles.shell}>
      <View style={[styles.canvas, compact ? styles.canvasCompact : null, wide ? styles.canvasWide : null]}>
        {children}
      </View>
    </AppScreen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    shell: {
      flexGrow: 1
    },
    canvas: {
      flexGrow: 1,
      justifyContent: "flex-start",
      borderRadius: 32,
      padding: theme.spacing.lg,
      backgroundColor: theme.colors.background.muted
    },
    canvasCompact: {
      minHeight: 0,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.xl
    },
    canvasWide: {
      minHeight: 640,
      justifyContent: "center",
      padding: theme.spacing.xxl
    }
  });
}
