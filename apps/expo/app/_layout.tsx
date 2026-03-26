import { Stack } from "expo-router";

import { AppProviders } from "../src/providers/app-providers";
import { BrandMark } from "../src/ui/navigation/BrandMark";
import { useAppTheme } from "../src/ui/theme";

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background.canvas },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: theme.colors.background.canvas },
        headerTitle: () => <BrandMark />
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[tripId]" options={{ title: "Trip Details" }} />
      <Stack.Screen name="join/[token]" options={{ title: "Join Trip" }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}
