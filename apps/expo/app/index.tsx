import { Redirect } from "expo-router";
import { View } from "react-native";

import { useSession } from "../src/providers/session-provider";
import { theme } from "../src/ui/theme";

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background.canvas }} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/trips" />;
  }

  return <Redirect href="/sign-in" />;
}
