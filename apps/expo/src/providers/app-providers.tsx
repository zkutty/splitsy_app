import { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SessionProvider } from "./session-provider";
import { TripsProvider } from "./trips-provider";
import { ThemeProvider } from "../ui/theme";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SessionProvider>
          <TripsProvider>{children}</TripsProvider>
        </SessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
