import { useState, useMemo, useCallback } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppText } from "../../src/ui/primitives/AppText";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { Theme, useAppTheme } from "../../src/ui/theme";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

type Step = { label: string; detail: string };
type FaqItem = { question: string; answer: string };

const GETTING_STARTED_STEPS: Step[] = [
  {
    label: "1. Sign in",
    detail:
      "Tap 'Sign in with Google' on the welcome screen or choose 'Try Demo Mode' to explore without an account. Demo mode stores everything locally so you can experiment risk-free."
  },
  {
    label: "2. Create a trip",
    detail:
      "Go to the Trips tab and tap 'Create trip'. Give it a name, pick a destination, choose a base currency, and optionally set start/end dates."
  },
  {
    label: "3. Invite members",
    detail:
      "Inside a trip, open the Members section and tap 'Invite'. Share the invite link with friends — they'll join automatically when they open it."
  },
  {
    label: "4. Log expenses",
    detail:
      "Tap 'Add expense' inside a trip. Enter the amount, pick a category, choose who paid, and select who the expense should be split between."
  },
  {
    label: "5. Settle up",
    detail:
      "When the trip is over, tap 'Settle up'. SplitTrip calculates the minimum number of payments needed so everyone is square."
  }
];

const HOW_TO_GUIDES: { title: string; steps: string[] }[] = [
  {
    title: "Create a trip",
    steps: [
      "Navigate to the Trips tab.",
      "Tap the 'Create trip' button.",
      "Enter a trip name (e.g. 'Lisbon 2026').",
      "Pick a destination and base currency.",
      "Optionally set start and end dates.",
      "Tap 'Create' — you'll land on the trip detail page."
    ]
  },
  {
    title: "Add an expense",
    steps: [
      "Open a trip from the Trips tab.",
      "Tap 'Add expense'.",
      "Enter the amount and pick a currency (defaults to the trip currency).",
      "Select a category — Lodging, Food, Transport, Activities, etc.",
      "Choose who paid for this expense.",
      "Choose who is involved in the split.",
      "Select a split mode: Equal, By Amount, or By Percentage.",
      "Add an optional note, then tap 'Save'."
    ]
  },
  {
    title: "Edit or delete an expense",
    steps: [
      "Open the trip and find the expense in the list.",
      "Tap the expense to open its detail view.",
      "Tap 'Edit' to change any field, then save.",
      "To delete, tap 'Delete' and confirm."
    ]
  },
  {
    title: "Invite people to a trip",
    steps: [
      "Open the trip detail page.",
      "Scroll to the Members section.",
      "Tap 'Invite' to generate an invite link.",
      "Share the link via text, email, or any messenger.",
      "When someone opens the link and signs in, they join automatically."
    ]
  },
  {
    title: "Create member groups",
    steps: [
      "Inside a trip, scroll to the Groups section.",
      "Tap 'New group' and give it a name (e.g. 'Couple A').",
      "Select which members belong to this group.",
      "Group balances aggregate individual balances for easier tracking."
    ]
  },
  {
    title: "Settle up & mark payments",
    steps: [
      "Open a trip and tap 'Settle up'.",
      "SplitTrip shows the optimised list of who owes whom.",
      "Each transfer has a 'Mark as paid' button — tap it when you send the money.",
      "The receiver can then 'Confirm' the payment.",
      "Once all transfers are confirmed, the trip is fully settled."
    ]
  },
  {
    title: "Set your payment method",
    steps: [
      "Go to the Account tab.",
      "Under 'Payment method', choose Venmo, PayPal, or Cash App.",
      "Enter your handle (e.g. @username).",
      "Tap 'Save' — trip members will see a direct pay link when settling up."
    ]
  },
  {
    title: "Change the app theme",
    steps: [
      "Go to the Account tab.",
      "Scroll to 'Appearance'.",
      "Choose from SplitTrip Light, SplitTrip Dark, Gruvbox Light, or Gruvbox Dark.",
      "The theme applies immediately."
    ]
  }
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Is SplitTrip free to use?",
    answer:
      "Yes. SplitTrip is completely free. There are no ads, no premium tiers, and no hidden fees."
  },
  {
    question: "What is Demo Mode?",
    answer:
      "Demo Mode lets you explore the full app without creating an account. All data is stored locally in your browser session. It's a great way to try things out before signing in with Google."
  },
  {
    question: "How does expense splitting work?",
    answer:
      "When you add an expense you choose a split mode. 'Equal' divides the amount evenly among selected members. 'By Amount' lets you assign a fixed amount to each person. 'By Percentage' lets you assign a custom percentage to each person. SplitTrip tracks both the original currency amount and the converted amount in the trip's base currency."
  },
  {
    question: "Can I use different currencies in the same trip?",
    answer:
      "Absolutely. Each expense can be logged in any currency. SplitTrip automatically converts it to the trip's base currency using exchange rates so the final settlement is calculated in one currency."
  },
  {
    question: "How does the settlement algorithm work?",
    answer:
      "SplitTrip uses a greedy algorithm that minimises the total number of transfers needed. Instead of everyone paying each other back individually, it calculates the simplest set of payments to make everyone even."
  },
  {
    question: "What happens if someone leaves a trip?",
    answer:
      "A trip creator can remove a member. Their existing expenses remain in the trip for accurate accounting, but they won't appear in future splits."
  },
  {
    question: "Can I edit an expense after adding it?",
    answer:
      "Yes. Tap any expense in the trip detail view, then tap 'Edit'. You can change the amount, category, payer, split members, or any other field."
  },
  {
    question: "What are groups for?",
    answer:
      "Groups let you combine members — for example, a couple sharing finances. When you create a group, their balances are aggregated so you can see what the group owes or is owed as a unit."
  },
  {
    question: "How do I know when everyone has paid?",
    answer:
      "In the Settle Up section, each transfer shows its status: pending, paid, or confirmed. When the payer marks it as paid and the receiver confirms, that transfer is done. Once all transfers are confirmed the trip is fully settled."
  },
  {
    question: "Is my data secure?",
    answer:
      "SplitTrip uses Supabase (built on PostgreSQL) with row-level security, so users can only access trips they belong to. Authentication is handled through Google OAuth. In Demo Mode, data never leaves your device."
  },
  {
    question: "Can I export my trip data?",
    answer:
      "Yes. Inside a trip you can export expense data, which is useful for record-keeping or sharing a summary with the group."
  },
  {
    question: "What categories are available for expenses?",
    answer:
      "SplitTrip includes nine built-in categories: Lodging, Food, Transport, Activities, Groceries, Nightlife, Fees, Miscellaneous, and Custom. Choose the one that best fits each expense."
  }
];

/* ------------------------------------------------------------------ */
/*  Accordion                                                          */
/* ------------------------------------------------------------------ */

function Accordion({
  title,
  children,
  theme,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  theme: Theme;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = useMemo(() => accordionStyles(theme), [theme]);

  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      style={({ pressed }) => [styles.wrapper, pressed ? styles.pressed : null]}
    >
      <View style={styles.header}>
        <AppText variant="bodySm" color="secondary" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="bodySm" color="muted">
          {open ? "−" : "+"}
        </AppText>
      </View>
      {open ? (
        <View style={styles.body}>{children}</View>
      ) : null}
    </Pressable>
  );
}

function accordionStyles(theme: Theme) {
  return StyleSheet.create({
    wrapper: {
      backgroundColor: theme.colors.surface.muted,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    pressed: { opacity: 0.9 },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: theme.spacing.md
    },
    title: {
      flex: 1,
      fontWeight: theme.type.weight.semibold
    },
    body: {
      paddingTop: theme.spacing.sm
    }
  });
}

/* ------------------------------------------------------------------ */
/*  NumberedStep                                                       */
/* ------------------------------------------------------------------ */

function NumberedStep({ index, text, theme }: { index: number; text: string; theme: Theme }) {
  const styles = useMemo(() => stepStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.badge}>
        <AppText variant="bodySm" color="inverse" style={styles.badgeText}>
          {index}
        </AppText>
      </View>
      <AppText variant="bodySm" color="secondary" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

function stepStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm
    },
    badge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 0
    },
    badgeText: {
      fontWeight: theme.type.weight.bold,
      fontSize: 12,
      lineHeight: 16
    },
    text: {
      flex: 1
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function HelpScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const wide = width >= 960;

  return (
    <AppScreen maxWidth={880} showHeaderMenu>
      {/* Hero */}
      <SurfaceCard tone="hero" style={styles.heroCard}>
        <AppText variant="eyebrow" color="accent">
          Help &amp; FAQ
        </AppText>
        <AppText variant={compact ? "sectionTitle" : "title"} color="inverse">
          How to use SplitTrip
        </AppText>
        <AppText variant="body" color="accent">
          Everything you need to know — from creating your first trip to settling up at the end.
        </AppText>
      </SurfaceCard>

      {/* Quick start */}
      <SurfaceCard style={styles.sectionCard}>
        <AppText variant="meta" color="muted">
          Quick start
        </AppText>
        <AppText variant="sectionTitle">Get going in five steps</AppText>
        <AppText variant="bodySm" color="muted">
          Follow this path from sign-in to settlement and you'll be up and running in minutes.
        </AppText>

        <View style={styles.stepsList}>
          {GETTING_STARTED_STEPS.map((step) => (
            <View key={step.label} style={styles.quickStep}>
              <AppText variant="bodySm" color="secondary" style={styles.quickStepLabel}>
                {step.label}
              </AppText>
              <AppText variant="bodySm" color="muted">
                {step.detail}
              </AppText>
            </View>
          ))}
        </View>
      </SurfaceCard>

      {/* How-to guides */}
      <SurfaceCard style={styles.sectionCard}>
        <AppText variant="meta" color="muted">
          How-to guides
        </AppText>
        <AppText variant="sectionTitle">Step-by-step walkthroughs</AppText>
        <AppText variant="bodySm" color="muted">
          Tap any guide below to expand the instructions.
        </AppText>

        <View style={styles.accordionList}>
          {HOW_TO_GUIDES.map((guide) => (
            <Accordion key={guide.title} title={guide.title} theme={theme}>
              <View style={styles.guideSteps}>
                {guide.steps.map((step, i) => (
                  <NumberedStep key={i} index={i + 1} text={step} theme={theme} />
                ))}
              </View>
            </Accordion>
          ))}
        </View>
      </SurfaceCard>

      {/* FAQ */}
      <SurfaceCard style={styles.sectionCard}>
        <AppText variant="meta" color="muted">
          FAQ
        </AppText>
        <AppText variant="sectionTitle">Frequently asked questions</AppText>
        <AppText variant="bodySm" color="muted">
          Quick answers to common questions about SplitTrip.
        </AppText>

        <View style={styles.accordionList}>
          {FAQ_ITEMS.map((item) => (
            <Accordion key={item.question} title={item.question} theme={theme}>
              <AppText variant="bodySm" color="muted">
                {item.answer}
              </AppText>
            </Accordion>
          ))}
        </View>
      </SurfaceCard>

      {/* Key concepts */}
      <View style={[styles.conceptsGrid, wide ? styles.conceptsGridWide : null]}>
        <SurfaceCard style={styles.conceptCard}>
          <AppText variant="meta" color="muted">
            Concept
          </AppText>
          <AppText variant="sectionTitle">Split modes</AppText>
          <View style={styles.conceptList}>
            <View style={styles.conceptItem}>
              <AppText variant="bodySm" color="secondary" style={styles.conceptLabel}>
                Equal
              </AppText>
              <AppText variant="bodySm" color="muted">
                Divides the expense evenly among all selected members.
              </AppText>
            </View>
            <View style={styles.conceptItem}>
              <AppText variant="bodySm" color="secondary" style={styles.conceptLabel}>
                By Amount
              </AppText>
              <AppText variant="bodySm" color="muted">
                Assign a specific dollar amount to each person.
              </AppText>
            </View>
            <View style={styles.conceptItem}>
              <AppText variant="bodySm" color="secondary" style={styles.conceptLabel}>
                By Percentage
              </AppText>
              <AppText variant="bodySm" color="muted">
                Assign a custom percentage of the total to each person.
              </AppText>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.conceptCard}>
          <AppText variant="meta" color="muted">
            Concept
          </AppText>
          <AppText variant="sectionTitle">Settlement status</AppText>
          <View style={styles.conceptList}>
            <View style={styles.conceptItem}>
              <AppText variant="bodySm" color="secondary" style={styles.conceptLabel}>
                Pending
              </AppText>
              <AppText variant="bodySm" color="muted">
                The transfer has been calculated but no payment has been sent yet.
              </AppText>
            </View>
            <View style={styles.conceptItem}>
              <AppText variant="bodySm" color="secondary" style={styles.conceptLabel}>
                Paid
              </AppText>
              <AppText variant="bodySm" color="muted">
                The payer has marked the transfer as sent. Waiting for the receiver to confirm.
              </AppText>
            </View>
            <View style={styles.conceptItem}>
              <AppText variant="bodySm" color="secondary" style={styles.conceptLabel}>
                Confirmed
              </AppText>
              <AppText variant="bodySm" color="muted">
                The receiver has confirmed receipt. This transfer is complete.
              </AppText>
            </View>
          </View>
        </SurfaceCard>
      </View>

      {/* Tips */}
      <SurfaceCard style={styles.sectionCard}>
        <AppText variant="meta" color="muted">
          Tips &amp; best practices
        </AppText>
        <AppText variant="sectionTitle">Get the most out of SplitTrip</AppText>

        <View style={styles.tipsList}>
          {[
            "Set your payment method in Account before starting a trip so others can pay you directly.",
            "Use groups for couples or families who share a single balance.",
            "Log expenses as they happen — it's easier than remembering everything later.",
            "Choose 'By Percentage' splits for expenses like shared Airbnbs where rooms cost differently.",
            "Export your trip data before settling for a permanent record.",
            "Use Demo Mode to set up a trip template, then recreate it with a real account."
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <AppText variant="bodySm" color="secondary" style={styles.tipText}>
                {tip}
              </AppText>
            </View>
          ))}
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

function createStyles(theme: Theme) {
  return StyleSheet.create({
    heroCard: {
      gap: theme.spacing.md
    },
    sectionCard: {
      gap: theme.spacing.md
    },
    stepsList: {
      gap: theme.spacing.sm
    },
    quickStep: {
      gap: theme.spacing.xxs,
      backgroundColor: theme.colors.surface.muted,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm
    },
    quickStepLabel: {
      fontWeight: theme.type.weight.bold
    },
    accordionList: {
      gap: theme.spacing.sm
    },
    guideSteps: {
      gap: theme.spacing.sm
    },
    conceptsGrid: {
      gap: theme.spacing.md
    },
    conceptsGridWide: {
      flexDirection: "row"
    },
    conceptCard: {
      flex: 1,
      gap: theme.spacing.md
    },
    conceptList: {
      gap: theme.spacing.sm
    },
    conceptItem: {
      gap: theme.spacing.xxs
    },
    conceptLabel: {
      fontWeight: theme.type.weight.semibold
    },
    tipsList: {
      gap: theme.spacing.sm
    },
    tipRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm
    },
    tipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.accent.primary,
      marginTop: 6
    },
    tipText: {
      flex: 1
    }
  });
}
