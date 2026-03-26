import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";

import { useSession } from "../../src/providers/session-provider";
import { AppTabBar } from "../../src/ui/navigation/AppTabBar";
import { theme } from "../../src/ui/theme";

export default function AppLayout() {
  const session = useSession();

  if (session.isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background.canvas }} />;
  }

  if (!session.isAuthenticated) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...(props as any)} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background.canvas }
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
