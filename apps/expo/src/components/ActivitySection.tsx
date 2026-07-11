import type { TripActivityEvent } from "@splitsy/domain";

import { ActivityFeed } from "../ui/primitives/ActivityFeed";
import { SectionCard } from "../ui/primitives/SectionCard";

// ZKU-60: Thin wrapper around the ActivityFeed primitive, extracted out of
// trip/[tripId].tsx purely so the route doesn't need to know the section's
// title/badge/collapse presentation details.

export type ActivitySectionProps = {
  events: TripActivityEvent[];
};

export function ActivitySection({ events }: ActivitySectionProps) {
  return (
    <SectionCard
      title="Activity"
      collapsible
      initiallyOpen={false}
      badge={events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : undefined}
    >
      <ActivityFeed events={events} />
    </SectionCard>
  );
}
