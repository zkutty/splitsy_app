import { Redirect } from "expo-router";
import { View } from "react-native";

import { useSession } from "../../src/providers/session-provider";

export default function AuthCallbackScreen() {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: "#f6f1e8" }} />;
  }

  if (isAuthenticated) {
    return <Redirect href="/trips" />;
  }

  return <Redirect href="/sign-in" />;
}
