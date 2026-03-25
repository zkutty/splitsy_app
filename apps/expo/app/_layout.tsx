import { Stack } from "expo-router";

import { AppProviders } from "../src/providers/app-providers";
import { theme } from "../src/ui/theme";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background.canvas },
          headerTintColor: theme.colors.text.primary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background.canvas }
        }}
      />
    </AppProviders>
  );
}
