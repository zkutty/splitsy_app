import { useRef } from "react";
import type { RefObject } from "react";
import type { ScrollView, View } from "react-native";

// ZKU-60: The trip screen's jump-nav scrolling (five independently
// scroll-to-able sections), extracted out of trip/[tripId].tsx so the route
// file doesn't need to hand-roll ref bookkeeping.

export type TripSectionKey = "expenses" | "balances" | "payments" | "members" | "activity";

export function useSectionScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs: Record<TripSectionKey, RefObject<View | null>> = {
    expenses: useRef<View>(null),
    balances: useRef<View>(null),
    payments: useRef<View>(null),
    members: useRef<View>(null),
    activity: useRef<View>(null)
  };

  const scrollToSection = (key: TripSectionKey) => {
    const target = sectionRefs[key];
    if (!target.current || !scrollRef.current) return;
    target.current.measureLayout(
      scrollRef.current as any,
      (_x: number, y: number) => {
        scrollRef.current!.scrollTo({ y: Math.max(0, y - 8), animated: true });
      },
      () => {}
    );
  };

  return { scrollRef, sectionRefs, scrollToSection };
}
