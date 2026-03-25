import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useMemo, useState } from "react";

import { PRESET_CATEGORIES, settleTrip, validateExpenseDraft } from "@splitsy/domain";

import { formatCurrency } from "../../src/lib/format";
import { SAMPLE_RATES } from "../../src/lib/rates";
import { useTrips } from "../../src/providers/trips-provider";

export default function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { getTripById, getExpensesForTrip, addExpense, addTripMember, isLoading } = useTrips();
  const trip = getTripById(tripId);
  const expenses = getExpensesForTrip(tripId);

  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [category, setCategory] = useState(PRESET_CATEGORIES[0].id);
  const [customCategory, setCustomCategory] = useState("");
  const [note, setNote] = useState("");
  const [paidByMemberId, setPaidByMemberId] = useState(trip?.members[0]?.id ?? "");
  const [selectedMembers, setSelectedMembers] = useState<string[]>(trip?.members.map((member) => member.id) ?? []);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!trip) {
      return;
    }

    if (!paidByMemberId && trip.members[0]) {
      setPaidByMemberId(trip.members[0].id);
    }

    if (selectedMembers.length === 0) {
      setSelectedMembers(trip.members.map((member) => member.id));
    }
  }, [paidByMemberId, selectedMembers.length, trip]);

  const settlement = useMemo(() => {
    if (!trip) {
      return null;
    }

    return settleTrip(
      expenses,
      trip.members.map((member) => member.id),
      trip.tripCurrencyCode
    );
  }, [expenses, trip]);

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Loading trip…</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Trip not found.</Text>
      </View>
    );
  }

  const toggleMember = (memberId: string) => {
    setSelectedMembers((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    );
  };

  const submitExpense = async () => {
    const numericAmount = Number(amount);
    const draft = {
      amount: numericAmount,
      currencyCode: currencyCode.toUpperCase(),
      category,
      customCategory,
      note,
      paidByMemberId,
      involvedMemberIds: selectedMembers
    };
    const result = validateExpenseDraft(draft);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    const rate = SAMPLE_RATES[draft.currencyCode] ?? 1;

    await addExpense(trip.id, {
      ...draft,
      conversionRateToTripCurrency: rate,
      tripAmount: Math.round(numericAmount * rate * 100) / 100
    });

    setAmount("");
    setNote("");
    setCustomCategory("");
    setErrors([]);
  };

  const submitMember = async () => {
    if (!memberName.trim()) {
      return;
    }

    await addTripMember(trip.id, {
      displayName: memberName,
      email: memberEmail
    });

    setMemberName("");
    setMemberEmail("");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryEyebrow}>Trip Summary</Text>
        <Text style={styles.summaryTitle}>{trip.name}</Text>
        <Text style={styles.summaryBody}>
          {trip.destination ?? "No destination"} · settle in {trip.tripCurrencyCode}
        </Text>
        <Text style={styles.summaryTotal}>
          {settlement ? formatCurrency(settlement.totalTripSpend, settlement.currencyCode) : ""}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Members</Text>
        <View style={styles.pillWrap}>
          {trip.members.map((member) => (
            <View key={member.id} style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{member.displayName}</Text>
            </View>
          ))}
        </View>
        <TextInput
          value={memberName}
          onChangeText={setMemberName}
          placeholder="New member name"
          style={styles.input}
        />
        <TextInput
          value={memberEmail}
          onChangeText={setMemberEmail}
          placeholder="Member email for future invites"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <Pressable onPress={submitMember} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Add member</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add expense</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Amount"
          keyboardType="decimal-pad"
          style={styles.input}
        />
        <TextInput
          value={currencyCode}
          onChangeText={setCurrencyCode}
          placeholder="Currency code"
          autoCapitalize="characters"
          style={styles.input}
        />
        <TextInput value={note} onChangeText={setNote} placeholder="Note" style={styles.input} />

        <ScrollView horizontal contentContainerStyle={styles.pillRow} showsHorizontalScrollIndicator={false}>
          {PRESET_CATEGORIES.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => setCategory(item.id)}
              style={[styles.pill, category === item.id && styles.pillActive]}
            >
              <Text style={[styles.pillText, category === item.id && styles.pillTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {category === "custom" ? (
          <TextInput
            value={customCategory}
            onChangeText={setCustomCategory}
            placeholder="Custom category label"
            style={styles.input}
          />
        ) : null}

        <Text style={styles.label}>Paid by</Text>
        <View style={styles.pillWrap}>
          {trip.members.map((member) => (
            <Pressable
              key={member.id}
              onPress={() => setPaidByMemberId(member.id)}
              style={[styles.pill, paidByMemberId === member.id && styles.pillActive]}
            >
              <Text style={[styles.pillText, paidByMemberId === member.id && styles.pillTextActive]}>
                {member.displayName}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Involved members</Text>
        <View style={styles.pillWrap}>
          {trip.members.map((member) => {
            const selected = selectedMembers.includes(member.id);
            return (
              <Pressable
                key={member.id}
                onPress={() => toggleMember(member.id)}
                style={[styles.pill, selected && styles.pillActive]}
              >
                <Text style={[styles.pillText, selected && styles.pillTextActive]}>{member.displayName}</Text>
              </Pressable>
            );
          })}
        </View>

        {errors.length > 0 ? (
          <View style={styles.errorBox}>
            {errors.map((error) => (
              <Text key={error} style={styles.errorText}>
                {error}
              </Text>
            ))}
          </View>
        ) : null}

        <Pressable onPress={submitExpense} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Save expense</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Balances</Text>
        {settlement?.balances.map((balance) => {
          const member = trip.members.find((item) => item.id === balance.memberId);
          return (
            <View key={balance.memberId} style={styles.rowCard}>
              <View>
                <Text style={styles.rowTitle}>{member?.displayName ?? balance.memberId}</Text>
                <Text style={styles.rowMeta}>
                  Paid {formatCurrency(balance.paid, trip.tripCurrencyCode)} · Owes{" "}
                  {formatCurrency(balance.owed, trip.tripCurrencyCode)}
                </Text>
              </View>
              <Text style={[styles.netAmount, balance.net < 0 ? styles.netNegative : styles.netPositive]}>
                {formatCurrency(balance.net, trip.tripCurrencyCode)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Repayments</Text>
        {settlement?.transfers.length ? (
          settlement.transfers.map((transfer) => {
            const from = trip.members.find((member) => member.id === transfer.fromMemberId);
            const to = trip.members.find((member) => member.id === transfer.toMemberId);
            return (
              <View key={`${transfer.fromMemberId}-${transfer.toMemberId}`} style={styles.rowCard}>
                <Text style={styles.rowTitle}>
                  {from?.displayName} pays {to?.displayName}
                </Text>
                <Text style={styles.netAmount}>{formatCurrency(transfer.amount, transfer.currencyCode)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.rowMeta}>Trip is already settled.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expenses</Text>
        {expenses.map((expense) => (
          <View key={expense.id} style={styles.rowCard}>
            <View>
              <Text style={styles.rowTitle}>{expense.note || expense.category}</Text>
              <Text style={styles.rowMeta}>
                {formatCurrency(expense.amount, expense.currencyCode)} {"->"}{" "}
                {formatCurrency(expense.tripAmount, trip.tripCurrencyCode)}
              </Text>
            </View>
            <Text style={styles.rowMeta}>{expense.involvedMemberIds.length} people</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  summaryCard: {
    gap: 6,
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#173331"
  },
  summaryEyebrow: {
    color: "#ffcb77",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3
  },
  summaryTitle: {
    color: "#fff8ee",
    fontSize: 28,
    fontWeight: "800"
  },
  summaryBody: {
    color: "#d2dfda",
    fontSize: 15
  },
  summaryTotal: {
    color: "#fff8ee",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8
  },
  section: {
    gap: 12,
    padding: 18,
    borderRadius: 24,
    backgroundColor: "#fff8ee"
  },
  sectionTitle: {
    color: "#172220",
    fontSize: 20,
    fontWeight: "700"
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#f3ecdf",
    color: "#1f2d2b"
  },
  label: {
    color: "#5d6765",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  pillRow: {
    gap: 8
  },
  pillWrap: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#e9ded0"
  },
  pillActive: {
    backgroundColor: "#173331"
  },
  pillText: {
    color: "#284240",
    fontWeight: "600"
  },
  pillTextActive: {
    color: "#fff8ee"
  },
  memberBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#d6e4df"
  },
  memberBadgeText: {
    color: "#173331",
    fontWeight: "700"
  },
  errorBox: {
    gap: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fce2dc"
  },
  errorText: {
    color: "#7b2c1f"
  },
  primaryButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#ffcb77"
  },
  primaryButtonText: {
    color: "#172220",
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#d6e4df"
  },
  secondaryButtonText: {
    color: "#173331",
    fontWeight: "800"
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 8
  },
  rowTitle: {
    color: "#1a2423",
    fontSize: 16,
    fontWeight: "700"
  },
  rowMeta: {
    color: "#5f6c6a",
    fontSize: 13,
    marginTop: 4
  },
  netAmount: {
    color: "#173331",
    fontSize: 15,
    fontWeight: "800"
  },
  netPositive: {
    color: "#0d6b4d"
  },
  netNegative: {
    color: "#8f2f1d"
  }
});
