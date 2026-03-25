import { Stack } from "expo-router";

import { AppProviders } from "../src/providers/app-providers";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#f6f1e8" },
          headerTintColor: "#1a2a2a",
          contentStyle: { backgroundColor: "#f6f1e8" }
        }}
      />
    </AppProviders>
  );
}

