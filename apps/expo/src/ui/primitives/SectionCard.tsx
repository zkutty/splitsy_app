import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { SurfaceCard } from "./SurfaceCard";
import { theme } from "../theme";

type SectionCardProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function SectionCard({ title, description, children }: SectionCardProps) {
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

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xs
  },
  content: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md
  }
});
