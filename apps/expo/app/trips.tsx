import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useTrips } from "../src/providers/trips-provider";

export default function TripsScreen() {
  const { trips, signOut, authMode, isLoading, createTrip } = useTrips();
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [tripCurrencyCode, setTripCurrencyCode] = useState("EUR");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Workspace</Text>
          <Text style={styles.title}>Trips</Text>
          <Text style={styles.subtitle}>
            {authMode === "supabase" ? "Persisted via Supabase" : "Running on demo fixtures until env is configured"}
          </Text>
        </View>
        <Pressable onPress={signOut} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.createCard}>
        <Text style={styles.createTitle}>New trip</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Trip name" style={styles.input} />
        <TextInput
          value={destination}
          onChangeText={setDestination}
          placeholder="Destination"
          style={styles.input}
        />
        <TextInput
          value={tripCurrencyCode}
          onChangeText={setTripCurrencyCode}
          placeholder="Trip currency"
          autoCapitalize="characters"
          style={styles.input}
        />
        <Pressable
          onPress={() =>
            createTrip({
              name: name.trim() || "Untitled trip",
              destination: destination.trim() || undefined,
              tripCurrencyCode: tripCurrencyCode.trim().toUpperCase() || "EUR"
            }).then(() => {
              setName("");
              setDestination("");
              setTripCurrencyCode("EUR");
            })
          }
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Create trip</Text>
        </Pressable>
      </View>

      {isLoading ? <Text style={styles.tripMeta}>Loading trips…</Text> : null}

      {trips.map((trip) => (
        <Link href={{ pathname: "/trip/[tripId]", params: { tripId: trip.id } }} key={trip.id} asChild>
          <Pressable style={styles.tripCard}>
            <Text style={styles.tripTitle}>{trip.name}</Text>
            <Text style={styles.tripMeta}>
              {trip.destination ?? "No destination"} · {trip.tripCurrencyCode}
            </Text>
            <Text style={styles.tripMeta}>{trip.members.length} members</Text>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 20
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start"
  },
  kicker: {
    color: "#96613d",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.4
  },
  title: {
    color: "#14201f",
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    color: "#4f5e5c",
    fontSize: 14,
    marginTop: 4
  },
  ghostButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#d6e4df"
  },
  ghostButtonText: {
    color: "#173331",
    fontWeight: "700"
  },
  tripCard: {
    gap: 6,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#fff9ef"
  },
  createCard: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#fff9ef"
  },
  createTitle: {
    color: "#14201f",
    fontSize: 20,
    fontWeight: "700"
  },
  tripTitle: {
    color: "#14201f",
    fontSize: 20,
    fontWeight: "700"
  },
  tripMeta: {
    color: "#5d6765",
    fontSize: 14
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#f3ecdf",
    color: "#1f2d2b"
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
  }
});
