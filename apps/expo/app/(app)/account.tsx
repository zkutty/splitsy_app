import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import type { PaymentMethodType } from "@splitsy/domain";

import { useSession } from "../../src/providers/session-provider";
import { useTrips } from "../../src/providers/trips-provider";
import { getPaymentMethodLabel } from "../../src/lib/payment-links";
import { AppScreen } from "../../src/ui/layout/AppScreen";
import { AppButton } from "../../src/ui/primitives/AppButton";
import { AppInput } from "../../src/ui/primitives/AppInput";
import { Chip } from "../../src/ui/primitives/Chip";
import { AppText } from "../../src/ui/primitives/AppText";
import { SurfaceCard } from "../../src/ui/primitives/SurfaceCard";
import { Theme, themeOptions, useAppTheme } from "../../src/ui/theme";

const PAYMENT_METHODS: { id: PaymentMethodType; placeholder: string }[] = [
  { id: "venmo", placeholder: "@username" },
  { id: "paypal", placeholder: "username or PayPal.me link" },
  { id: "cashapp", placeholder: "$cashtag" },
];

export default function AccountScreen() {
  const session = useSession();
  const { currentUser, signOut, getPaymentMethod, updatePaymentMethod } = useTrips();
  const { theme, themeName, setThemeName } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const compact = width < 520;

  const [paymentType, setPaymentType] = useState<PaymentMethodType | null>(null);
  const [paymentHandle, setPaymentHandle] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoaded, setPaymentLoaded] = useState(false);

  useEffect(() => {
    if (paymentLoaded) return;

    getPaymentMethod()
      .then(({ type, handle }) => {
        setPaymentType(type);
        setPaymentHandle(handle ?? "");
        setPaymentLoaded(true);
      })
      .catch(() => {
        setPaymentLoaded(true);
      });
  }, [getPaymentMethod, paymentLoaded]);

  const handleSavePayment = async () => {
    setPaymentError(null);
    setPaymentSaved(false);

    if (paymentType && !paymentHandle.trim()) {
      setPaymentError("Please enter your payment handle.");
      return;
    }

    setIsSavingPayment(true);

    try {
      const type = paymentHandle.trim() ? paymentType : null;
      const handle = paymentHandle.trim() || null;
      await updatePaymentMethod(type, handle);
      setPaymentSaved(true);
    } catch {
      setPaymentError("Failed to save payment method. Please try again.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleClearPayment = async () => {
    setPaymentError(null);
    setPaymentSaved(false);
    setIsSavingPayment(true);

    try {
      await updatePaymentMethod(null, null);
      setPaymentType(null);
      setPaymentHandle("");
      setPaymentSaved(true);
    } catch {
      setPaymentError("Failed to clear payment method.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === paymentType);

  return (
    <AppScreen maxWidth={880} showHeaderMenu>
      <SurfaceCard tone="hero" style={styles.heroCard}>
        <AppText variant="eyebrow" color="accent">
          Account
        </AppText>
        <AppText variant={compact ? "sectionTitle" : "title"} color="inverse">
          Your SplitTrip profile
        </AppText>
        <AppText variant="bodySm" color="accent">
          Keep identity and access details in one stable place instead of duplicating them across workspace screens.
        </AppText>
      </SurfaceCard>

      <SurfaceCard style={[styles.profileCard, compact ? styles.profileCardCompact : null]}>
        <View style={styles.avatar}>
          <AppText variant="sectionTitle" color="inverse">
            {(currentUser.displayName || "T").slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.profileCopy}>
          <AppText variant="meta" color="muted">
            Signed in as
          </AppText>
          <AppText variant="sectionTitle">{currentUser.displayName}</AppText>
          <AppText variant="bodySm" color="muted">
            {currentUser.email ?? "No email available"}
          </AppText>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.paymentCard}>
        <AppText variant="sectionTitle">Payment method</AppText>
        <AppText variant="bodySm" color="muted">
          Set your preferred payment app so trip members can pay you directly when settling up.
        </AppText>
        <View style={styles.paymentChips}>
          {PAYMENT_METHODS.map((method) => (
            <Chip
              key={method.id}
              label={getPaymentMethodLabel(method.id)}
              selected={paymentType === method.id}
              onPress={() => {
                setPaymentSaved(false);
                setPaymentError(null);
                setPaymentType(paymentType === method.id ? null : method.id);
              }}
            />
          ))}
        </View>
        {paymentType ? (
          <AppInput
            label={`${getPaymentMethodLabel(paymentType)} handle`}
            placeholder={selectedMethod?.placeholder}
            value={paymentHandle}
            onChangeText={(text) => {
              setPaymentHandle(text);
              setPaymentSaved(false);
              setPaymentError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
        ) : null}
        {paymentError ? (
          <AppText variant="bodySm" color="danger">
            {paymentError}
          </AppText>
        ) : null}
        {paymentSaved ? (
          <AppText variant="bodySm" color="success">
            Payment method saved.
          </AppText>
        ) : null}
        <View style={styles.paymentActions}>
          <AppButton onPress={handleSavePayment} disabled={isSavingPayment}>
            {isSavingPayment ? "Saving..." : "Save payment method"}
          </AppButton>
          {paymentType || paymentHandle ? (
            <AppButton onPress={handleClearPayment} variant="secondary" disabled={isSavingPayment}>
              Clear
            </AppButton>
          ) : null}
        </View>
      </SurfaceCard>

      <View style={styles.infoGrid}>
        <SurfaceCard style={styles.infoCard}>
          <AppText variant="meta" color="muted">
            Auth mode
          </AppText>
          <AppText variant="sectionTitle">{session.authMode === "supabase" ? "Supabase Cloud" : "Demo"}</AppText>
          <AppText variant="bodySm" color="muted">
            Google sign-in is the intended production flow for the app.
          </AppText>
        </SurfaceCard>

        <SurfaceCard style={styles.infoCard}>
          <AppText variant="meta" color="muted">
            Session
          </AppText>
          <AppText variant="sectionTitle">{session.isAuthenticated ? "Active" : "Signed out"}</AppText>
          <AppText variant="bodySm" color="muted">
            Use this page to confirm who is signed in before inviting people to trips.
          </AppText>
        </SurfaceCard>
      </View>

      <SurfaceCard style={styles.actionsCard}>
        <AppText variant="sectionTitle">Account actions</AppText>
        <AppText variant="bodySm" color="muted">
          End the current session here when you need to switch accounts.
        </AppText>
        <AppButton onPress={signOut} variant="secondary">
          Sign out
        </AppButton>
      </SurfaceCard>

      <SurfaceCard style={styles.settingsCard}>
        <AppText variant="sectionTitle">Appearance</AppText>
        <AppText variant="bodySm" color="muted">
          Theme changes apply immediately for this session.
        </AppText>
        <View style={styles.themeList}>
          {themeOptions.map((option) => (
            <View key={option.id} style={styles.themeOption}>
              <Chip label={option.label} selected={themeName === option.id} onPress={() => setThemeName(option.id)} />
              <AppText variant="bodySm" color="muted">
                {option.description}
              </AppText>
            </View>
          ))}
        </View>
      </SurfaceCard>
    </AppScreen>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
  heroCard: {
    gap: theme.spacing.md
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md
  },
  profileCardCompact: {
    flexDirection: "column",
    alignItems: "flex-start"
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.accent.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  profileCopy: {
    gap: theme.spacing.xxs
  },
  paymentCard: {
    gap: theme.spacing.md
  },
  paymentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  paymentActions: {
    gap: theme.spacing.sm
  },
  infoGrid: {
    gap: theme.spacing.md
  },
  infoCard: {
    gap: theme.spacing.sm
  },
  actionsCard: {
    gap: theme.spacing.md
  },
  settingsCard: {
    gap: theme.spacing.md
  },
  themeList: {
    gap: theme.spacing.md
  },
  themeOption: {
    gap: theme.spacing.xs
  }
  });
}
