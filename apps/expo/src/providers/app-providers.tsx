import { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider } from "./session-provider";
import { TripsProvider } from "./trips-provider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <TripsProvider>{children}</TripsProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

