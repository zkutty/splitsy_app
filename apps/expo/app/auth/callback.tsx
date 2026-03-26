import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

import { useSession } from "../../src/providers/session-provider";
import { useAppTheme } from "../../src/ui/theme";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { isLoading, isAuthenticated, consumePendingPostAuthPath } = useSession();
  const { theme } = useAppTheme();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      const nextPath = consumePendingPostAuthPath() ?? "/trips";
      router.replace(nextPath as any);
      return;
    }

    router.replace("/sign-in");
  }, [consumePendingPostAuthPath, isAuthenticated, isLoading, router]);

  return <View style={{ flex: 1, backgroundColor: theme.colors.background.canvas }} />;
}
