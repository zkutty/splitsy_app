import { Redirect } from "expo-router";
import { View } from "react-native";

import { useSession } from "../src/providers/session-provider";
import { useAppTheme } from "../src/ui/theme";

export default function IndexScreen() {
  const { isAuthenticated, isLoading } = useSession();
  const { theme } = useAppTheme();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background.canvas }} />;
  }

  if (isAuthenticated) {
    return <Redirect href={"/home" as any} />;
  }

  return <Redirect href="/sign-in" />;
}
