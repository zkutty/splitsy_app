import { View } from "react-native";
import { useAppTheme } from "../theme";

type ProgressBarProps = {
  percentage: number;
  color?: string;
  height?: number;
};

export function ProgressBar({
  percentage,
  color,
  height = 8
}: ProgressBarProps) {
  const { theme } = useAppTheme();
  const fillColor = color ?? theme.colors.accent.primary;

  return (
    <View
      style={{
        width: "100%",
        height,
        backgroundColor: theme.colors.surface.muted,
        borderRadius: theme.radius.sm,
        overflow: "hidden"
      }}
    >
      <View
        style={{
          width: `${Math.min(Math.max(percentage, 0), 100)}%`,
          height: "100%",
          backgroundColor: fillColor
        }}
      />
    </View>
  );
}
