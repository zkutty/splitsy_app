import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppProviders } from "../src/providers/app-providers";
import { useSession } from "../src/providers/session-provider";
import { useTrips } from "../src/providers/trips-provider";
import { AppText } from "../src/ui/primitives/AppText";
import { theme } from "../src/ui/theme";

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const session = useSession();
  const trips = useTrips();
  const signedInUser = session.isAuthenticated ? trips.currentUser : null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background.canvas },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: theme.colors.background.canvas },
        headerTitle: () => <BrandHeaderTitle />,
        headerRight: () =>
          signedInUser?.displayName ? (
            <View style={styles.headerIdentity}>
              <AppText variant="meta" color="muted">
                Signed In
              </AppText>
              <AppText variant="bodySm" color="secondary" style={styles.headerIdentityName}>
                {signedInUser.displayName}
              </AppText>
            </View>
          ) : null
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="trips" options={{ title: "SplitTrip" }} />
      <Stack.Screen name="trip/[tripId]" options={{ title: "Trip Details" }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

function BrandHeaderTitle() {
  return (
    <View style={styles.brandTitle}>
      <View style={styles.logoMark}>
        <View style={[styles.logoStroke, styles.logoStrokeUp]} />
        <View style={[styles.logoStroke, styles.logoStrokeDown]} />
      </View>
      <View style={styles.brandCopy}>
        <AppText variant="meta" color="secondary">
          SplitTrip
        </AppText>
        <AppText variant="bodySm" color="muted">
          Travel expenses
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoStroke: {
    position: "absolute",
    width: 12,
    height: 12,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: theme.colors.text.inverse
  },
  logoStrokeUp: {
    transform: [{ rotate: "-45deg" }, { translateY: -4 }]
  },
  logoStrokeDown: {
    transform: [{ rotate: "135deg" }, { translateY: -4 }]
  },
  brandCopy: {
    gap: 2
  },
  headerIdentity: {
    alignItems: "flex-end"
  },
  headerIdentityName: {
    fontWeight: theme.type.weight.semibold
  }
});
