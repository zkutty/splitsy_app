import { PropsWithChildren, useMemo, useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View, useWindowDimensions } from "react-native";

import { AppText } from "./AppText";
import { SurfaceCard } from "./SurfaceCard";
import { Theme, useAppTheme } from "../theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
  /** If provided the section becomes collapsible. Defaults to always-open when omitted. */
  collapsible?: boolean;
  /** Whether the section starts expanded. Only relevant when `collapsible` is true. */
  initiallyOpen?: boolean;
  /** Optional summary shown inline with the title when the section is collapsed. */
  badge?: string;
}>;

export function SectionCard({
  title,
  description,
  collapsible = false,
  initiallyOpen = true,
  badge,
  children
}: SectionCardProps) {
  const { theme } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 768;
  const styles = useMemo(() => createStyles(theme, compact), [theme, compact]);
  const [open, setOpen] = useState(collapsible ? initiallyOpen : true);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  const headerContent = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <AppText variant="sectionTitle" style={styles.titleText}>{title}</AppText>
        {collapsible && !open && badge ? (
          <AppText variant="bodySm" color="muted">{badge}</AppText>
        ) : null}
        {collapsible ? (
          <AppText variant="body" color="muted">{open ? "−" : "+"}</AppText>
        ) : null}
      </View>
      {open && description ? (
        <AppText variant="bodySm" color="muted">
          {description}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <SurfaceCard>
      {collapsible ? (
        <Pressable onPress={toggle} hitSlop={4}>
          {headerContent}
        </Pressable>
      ) : (
        headerContent
      )}
      {open ? <View style={styles.content}>{children}</View> : null}
    </SurfaceCard>
  );
}

function createStyles(theme: Theme, compact: boolean) {
  return StyleSheet.create({
    header: {
      gap: theme.spacing.xs
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.sm
    },
    titleText: {
      flex: 1
    },
    content: {
      gap: compact ? theme.spacing.sm : theme.spacing.md,
      marginTop: compact ? theme.spacing.sm : theme.spacing.md
    }
  });
}
