import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";

import { useSession } from "../../src/providers/session-provider";
import { AppTabBar } from "../../src/ui/navigation/AppTabBar";
import { useAppTheme } from "../../src/ui/theme";

export default function AppLayout() {
  const session = useSession();
  const { theme } = useAppTheme();

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
      <Tabs.Screen name="home" options={{ title: "Home | SplitTrip" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips | SplitTrip" }} />
      <Tabs.Screen name="account" options={{ title: "Account | SplitTrip" }} />
      <Tabs.Screen name="help" options={{ title: "Help | SplitTrip" }} />
    </Tabs>
  );
}
