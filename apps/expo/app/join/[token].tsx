import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import { useSession } from "../../src/providers/session-provider";
import { useTrips } from "../../src/providers/trips-provider";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppText } from "../../src/ui/primitives/AppText";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";

export default function JoinTripScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const session = useSession();
  const { acceptTripInvite, isLoading } = useTrips();
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedJoin, setHasAttemptedJoin] = useState(false);
  const [joinedTripId, setJoinedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || session.isLoading || hasAttemptedJoin) {
      return;
    }

    if (!session.isAuthenticated) {
      session.setPendingPostAuthPath(`/join/${token}`);
      router.replace("/sign-in");
      return;
    }

    if (isLoading) {
      return;
    }

    setHasAttemptedJoin(true);
    session.setPendingPostAuthPath(null);
    let cancelled = false;

    acceptTripInvite(token)
      .then((tripId) => {
        if (!cancelled) {
          setJoinedTripId(tripId);
          router.replace({ pathname: "/trip/[tripId]", params: { tripId } });
        }
      })
      .catch((inviteError) => {
        if (!cancelled) {
          setError(inviteError instanceof Error ? inviteError.message : "Unable to join this trip.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    acceptTripInvite,
    hasAttemptedJoin,
    router,
    session.isAuthenticated,
    session.isLoading,
    session.setPendingPostAuthPath,
    token
  ]);

  return (
    <AppScreen maxWidth={560}>
      <SurfaceCard>
        <AppText variant="sectionTitle">Join trip</AppText>
        {error ? (
          <>
            <AppText variant="bodySm" color="danger">
              {error}
            </AppText>
            <AppButton onPress={() => router.replace("/trips")} variant="secondary">
              Back to trips
            </AppButton>
          </>
        ) : joinedTripId ? (
          <>
            <AppText variant="bodySm" color="muted">
              Trip added to your account.
            </AppText>
            <AppButton onPress={() => router.replace({ pathname: "/trip/[tripId]", params: { tripId: joinedTripId } })}>
              Open trip
            </AppButton>
          </>
        ) : (
          <AppText variant="bodySm" color="muted">
            {session.isAuthenticated ? "Adding this trip to your account..." : "Redirecting you to sign in..."}
          </AppText>
        )}
      </SurfaceCard>
    </AppScreen>
  );
}
