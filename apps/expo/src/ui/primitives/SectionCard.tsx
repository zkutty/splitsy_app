import { PropsWithChildren, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { SurfaceCard } from "./SurfaceCard";
import { Theme, useAppTheme } from "../theme";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function SectionCard({ title, description, children }: SectionCardProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SurfaceCard>
      <View style={styles.header}>
        <AppText variant="sectionTitle">{title}</AppText>
        {description ? (
          <AppText variant="bodySm" color="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <View style={styles.content}>{children}</View>
    </SurfaceCard>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    header: {
      gap: theme.spacing.xs
    },
    content: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.md
    }
  });
}
