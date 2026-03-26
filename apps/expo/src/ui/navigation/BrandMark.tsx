import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { AppText } from "../primitives/AppText";
import { theme } from "../theme";

type BrandMarkProps = {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function BrandMark({ compact = false, style }: BrandMarkProps) {
  return (
    <View style={[styles.brandTitle, style]}>
      <View style={[styles.logoMark, compact ? styles.logoMarkCompact : null]}>
        <View style={[styles.logoStroke, compact ? styles.logoStrokeCompact : null, styles.logoStrokeUp]} />
        <View style={[styles.logoStroke, compact ? styles.logoStrokeCompact : null, styles.logoStrokeDown]} />
      </View>
      <View style={styles.brandCopy}>
        <AppText variant="meta" color="secondary">
          SplitTrip
        </AppText>
        <AppText variant="bodySm" color="muted">
          Travel expenses
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoMarkCompact: {
    width: 30,
    height: 30,
    borderRadius: 15
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
  logoStrokeUp: {
    transform: [{ rotate: "-45deg" }, { translateY: -4 }]
  },
  logoStrokeDown: {
    transform: [{ rotate: "135deg" }, { translateY: -4 }]
  },
  brandCopy: {
    gap: 2
  }
});
