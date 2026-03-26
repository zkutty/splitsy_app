import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useMemo } from "react";

import { AppText } from "../primitives/AppText";
import { Theme, useAppTheme } from "../theme";

type BrandMarkProps = {
  compact?: boolean;
  size?: "compact" | "default" | "hero";
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({ compact = false, size = "default", style }: BrandMarkProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedSize = compact ? "compact" : size;

  return (
    <View style={[styles.brandTitle, resolvedSize === "hero" ? styles.brandTitleHero : null, style]}>
      <View
        style={[
          styles.logoMark,
          resolvedSize === "compact" ? styles.logoMarkCompact : null,
          resolvedSize === "hero" ? styles.logoMarkHero : null
        ]}
      >
        <View
          style={[
            styles.logoStroke,
            resolvedSize === "compact" ? styles.logoStrokeCompact : null,
            resolvedSize === "hero" ? styles.logoStrokeHero : null,
            styles.logoStrokeUp
          ]}
        />
        <View
          style={[
            styles.logoStroke,
            resolvedSize === "compact" ? styles.logoStrokeCompact : null,
            resolvedSize === "hero" ? styles.logoStrokeHero : null,
            styles.logoStrokeDown
          ]}
        />
      </View>
      <View style={styles.brandCopy}>
        <AppText
          variant={resolvedSize === "hero" ? "sectionTitle" : "meta"}
          color="secondary"
          style={resolvedSize === "hero" ? styles.brandNameHero : null}
        >
          SplitTrip
        </AppText>
        <AppText variant="bodySm" color="muted" style={resolvedSize === "hero" ? styles.brandTaglineHero : null}>
          {resolvedSize === "hero" ? "Split travel expenses without the math." : "Travel expenses"}
        </AppText>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    brandTitle: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    brandTitleHero: {
      alignItems: "flex-start",
      gap: theme.spacing.md
    },
    logoMark: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.accent.primary,
      alignItems: "center",
      justifyContent: "center",
      overflow: "visible"
    },
    logoMarkCompact: {
      width: 30,
      height: 30,
      borderRadius: 15
    },
    logoMarkHero: {
      width: 64,
      height: 64,
      borderRadius: 32
    },
    logoStroke: {
      position: "absolute",
      width: 12,
      height: 12,
      borderTopWidth: 2.5,
      borderRightWidth: 2.5,
      borderColor: theme.colors.text.inverse
    },
    logoStrokeCompact: {
      width: 10,
      height: 10,
      borderTopWidth: 2
    },
    logoStrokeHero: {
      width: 20,
      height: 20,
      borderTopWidth: 3,
      borderRightWidth: 3
    },
    logoStrokeUp: {
      transform: [{ rotate: "-45deg" }, { translateY: -4 }]
    },
    logoStrokeDown: {
      transform: [{ rotate: "135deg" }, { translateY: -4 }]
    },
    brandCopy: {
      gap: 2
    },
    brandNameHero: {
      fontSize: theme.type.size.titleSm,
      lineHeight: theme.type.lineHeight.titleSm,
      letterSpacing: 0
    },
    brandTaglineHero: {
      maxWidth: 220
    }
  });
}
