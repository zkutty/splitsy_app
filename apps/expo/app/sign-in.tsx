import { Pressable, StyleSheet, Text, View } from "react-native";

import { useSession } from "../src/providers/session-provider";

export default function SignInScreen() {
  const { signIn, authMode, isLoading } = useSession();

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Trip finance, without spreadsheet cleanup</Text>
        <Text style={styles.title}>Track multi-currency group expenses and settle the trip in one pass.</Text>
        <Text style={styles.body}>
          Add who paid, who joined, the original currency, notes, and category. Splitsy stores the trip-converted
          amount and generates minimized repayments at the end.
        </Text>
        <Pressable onPress={signIn} style={styles.button}>
          <Text style={styles.buttonText}>
            {isLoading ? "Loading..." : authMode === "supabase" ? "Continue with Google" : "Continue with demo data"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#efe5d5"
  },
  heroCard: {
    gap: 16,
    padding: 24,
    borderRadius: 24,
    backgroundColor: "#133c3a"
  },
  eyebrow: {
    color: "#ffcb77",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5
  },
  title: {
    color: "#fff9ef",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800"
  },
  body: {
    color: "#d6e4df",
    fontSize: 16,
    lineHeight: 24
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#ffcb77"
  },
  buttonText: {
    color: "#1e2928",
    fontSize: 15,
    fontWeight: "700"
  }
});
