import { ScrollView, StyleSheet } from "react-native";

import { Chip } from "../ui/primitives/Chip";
import { useAppTheme } from "../ui/theme";
import type { TripSectionKey } from "../state/useSectionScroll";

// ZKU-60: The horizontal jump-to-section chip bar shown on compact screens,
// extracted out of trip/[tripId].tsx.

export type TripJumpNavProps = {
  tripStatus?: string;
  onSelect: (key: TripSectionKey) => void;
};

const SECTIONS: { key: TripSectionKey; label: string }[] = [
  { key: "expenses", label: "Expenses" },
  { key: "balances", label: "Balances" },
  { key: "payments", label: "Repayments" },
  { key: "members", label: "Members" },
  { key: "activity", label: "Activity" }
];

export function TripJumpNav({ tripStatus, onSelect }: TripJumpNavProps) {
  const { theme } = useAppTheme();
  const sections = SECTIONS.map((section) =>
    section.key === "payments" ? { ...section, label: tripStatus === "active" ? "Repayments" : "Payments" } : section
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, gap: theme.spacing.sm }}
      style={{
        backgroundColor: theme.colors.background.canvas,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border.subtle
      }}
    >
      {sections.map(({ key, label }) => (
        <Chip key={key} label={label} selected={false} onPress={() => onSelect(key)} />
      ))}
    </ScrollView>
  );
}
