import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import {
  Text, Card, Button, Chip, Searchbar,
  ActivityIndicator, TextInput, SegmentedButtons,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { usePetStore } from "@/stores/pet-store";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { EmptyState } from "@/components/EmptyState";

type Vet = { id: string; clinic_name: string; city: string; specializations: string[]; address?: string; avg_rating?: number };
type Appointment = { id: string; scheduled_at: string; status: string; vet?: { clinic_name: string; city: string }; pet?: { name: string } };
type SubTab = "find" | "appointments";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

function StarRating({ rating }: { rating?: number }) {
  const r = Math.round(rating ?? 0);
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons key={i} name={i <= r ? "star" : "star-outline"} size={14} color={colors.warning} />
      ))}
      {rating && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginLeft: 4 }}>{rating.toFixed(1)}</Text>}
    </View>
  );
}

export default function VetsScreen() {
  const session = useAuthStore((s) => s.session);
  const { pets, fetchPets } = usePetStore();
  const [subTab, setSubTab] = useState<SubTab>("find");
  const [vets, setVets] = useState<Vet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookingVet, setBookingVet] = useState<Vet | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (session?.user) fetchPets(session.user.id);
    loadVets();
    loadAppointments();
  }, [session]);

  async function loadVets() {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase.from("vets").select("*").order("avg_rating", { ascending: false });
    setVets((data as Vet[]) ?? []);
    setLoading(false);
  }

  async function loadAppointments() {
    if (!supabase || !session?.user) return;
    const { data } = await supabase
      .from("appointments")
      .select("id, scheduled_at, status, vet:vets(clinic_name,city), pet:pets(name)")
      .eq("owner_id", session.user.id)
      .order("scheduled_at", { ascending: false });
    setAppointments((data as unknown as Appointment[]) ?? []);
  }

  async function handleBook() {
    if (!bookingVet || !selectedPetId || !selectedDate || !selectedTime || !session?.user) {
      Alert.alert("Missing Info", "Please select a pet, date, and time slot.");
      return;
    }
    if (!supabase) { Alert.alert("Offline", OFFLINE_HINT); return; }
    setBooking(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      const { error } = await supabase.from("appointments").insert({
        vet_id: bookingVet.id,
        owner_id: session.user.id,
        pet_id: selectedPetId,
        scheduled_at: scheduledAt,
        status: "confirmed",
      });
      if (error) throw error;
      Alert.alert("Booked! 🎉", "Your appointment has been confirmed.");
      setBookingVet(null);
      setSelectedDate(""); setSelectedTime(""); setSelectedPetId(null);
      await loadAppointments();
      setSubTab("appointments");
    } catch (err: any) {
      Alert.alert("Booking Failed", err.message);
    } finally {
      setBooking(false);
    }
  }

  const filteredVets = vets.filter(
    (v) =>
      v.clinic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function statusColor(s: string) {
    return s === "confirmed" ? colors.success : s === "cancelled" ? colors.error : colors.warning;
  }

  if (loading && subTab === "find") {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Vet Services 🩺</Text>
      </View>

      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={subTab}
          onValueChange={(v) => setSubTab(v as SubTab)}
          buttons={[
            { value: "find", label: "Find a Vet", icon: "magnify" },
            { value: "appointments", label: "My Bookings", icon: "calendar-check" },
          ]}
        />
      </View>

      {!isSupabaseConfigured && (
        <Card style={styles.offlineCard}>
          <Card.Content style={styles.offlineContent}>
            <Ionicons name="cloud-offline" size={20} color={colors.warning} />
            <Text variant="bodySmall" style={styles.offlineText}>{OFFLINE_HINT}</Text>
          </Card.Content>
        </Card>
      )}

      {subTab === "find" && (
        <>
          <View style={styles.searchContainer}>
            <Searchbar placeholder="Search vets or cities..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchbar} />
          </View>
          {filteredVets.length === 0 ? (
            <EmptyState icon="medical-outline" title="No vets found" message={searchQuery ? "Try a different search term" : "No veterinary clinics added yet"} />
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {filteredVets.map((vet) => (
                <Card key={vet.id} style={styles.vetCard}>
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.vetHeader}>
                      <View style={[styles.clinicIcon, { backgroundColor: colors.primary + "20" }]}>
                        <Ionicons name="medical" size={28} color={colors.primary} />
                      </View>
                      <View style={styles.clinicInfo}>
                        <Text variant="titleMedium" style={styles.clinicName}>{vet.clinic_name}</Text>
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={14} color={colors.onSurfaceVariant} />
                          <Text variant="bodySmall" style={styles.cityText}>{vet.city}</Text>
                        </View>
                        <StarRating rating={vet.avg_rating} />
                      </View>
                    </View>
                    {vet.specializations?.length > 0 && (
                      <View style={styles.specializations}>
                        {vet.specializations.slice(0, 3).map((s, i) => (
                          <Chip key={i} compact style={styles.specChip}>{s}</Chip>
                        ))}
                      </View>
                    )}
                    {vet.address && (
                      <View style={styles.locationRow}>
                        <Ionicons name="business" size={14} color={colors.onSurfaceVariant} />
                        <Text variant="bodySmall" style={styles.cityText}>{vet.address}</Text>
                      </View>
                    )}
                  </Card.Content>
                  <Card.Actions style={styles.cardActions}>
                    <Button icon="phone" textColor={colors.primary} onPress={() => Alert.alert("Call", "Calling feature requires a real phone number in the database.")}>Call</Button>
                    <Button mode="contained" icon="calendar" onPress={() => { setBookingVet(vet); setSelectedPetId(pets[0]?.id ?? null); }}>Book</Button>
                  </Card.Actions>
                </Card>
              ))}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </>
      )}

      {subTab === "appointments" && (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {appointments.length === 0 ? (
            <EmptyState icon="calendar-outline" title="No appointments" message="Book an appointment with a vet to see it here" />
          ) : (
            <View style={{ padding: spacing.md, gap: spacing.md }}>
              {appointments.map((a: any) => (
                <Card key={a.id} style={styles.apptCard}>
                  <Card.Content style={styles.apptContent}>
                    <View style={styles.apptHeader}>
                      <Text variant="titleMedium" style={styles.clinicName}>{a.vet?.clinic_name ?? "Vet"}</Text>
                      <Chip compact textStyle={{ color: statusColor(a.status) }} style={{ backgroundColor: statusColor(a.status) + "20" }}>
                        {a.status}
                      </Chip>
                    </View>
                    <View style={styles.locationRow}>
                      <Ionicons name="paw" size={14} color={colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={styles.cityText}>{a.pet?.name ?? "—"}</Text>
                    </View>
                    <View style={styles.locationRow}>
                      <Ionicons name="calendar" size={14} color={colors.onSurfaceVariant} />
                      <Text variant="bodySmall" style={styles.cityText}>
                        {new Date(a.scheduled_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
              <View style={{ height: 100 }} />
            </View>
          )}
        </ScrollView>
      )}

      {/* Booking Modal */}
      <Modal visible={!!bookingVet} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Card.Content style={styles.modalContent}>
              <Text variant="headlineSmall" style={styles.modalTitle}>Book Appointment</Text>
              <View style={[styles.clinicIcon, { backgroundColor: colors.primary + "20", alignSelf: "flex-start", marginBottom: spacing.sm }]}>
                <Ionicons name="medical" size={24} color={colors.primary} />
              </View>
              <Text variant="titleMedium" style={styles.clinicName}>{bookingVet?.clinic_name}</Text>
              <Text variant="bodySmall" style={[styles.cityText, { marginBottom: spacing.md }]}>{bookingVet?.city}</Text>

              <Text variant="labelLarge" style={styles.fieldLabel}>Select Pet</Text>
              <View style={styles.chipRow}>
                {pets.map((p) => (
                  <Chip key={p.id} selected={selectedPetId === p.id} onPress={() => setSelectedPetId(p.id)} style={styles.selectChip}>{p.name}</Chip>
                ))}
                {pets.length === 0 && <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Add a pet first</Text>}
              </View>

              <TextInput label="Date (YYYY-MM-DD)" mode="outlined" value={selectedDate} onChangeText={setSelectedDate} style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar" />} placeholder={new Date().toISOString().split("T")[0]} />

              <Text variant="labelLarge" style={styles.fieldLabel}>Time Slot</Text>
              <View style={styles.chipRow}>
                {TIME_SLOTS.map((t) => (
                  <Chip key={t} selected={selectedTime === t} onPress={() => setSelectedTime(t)} style={styles.selectChip}>{t}</Chip>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setBookingVet(null)} style={{ flex: 1 }}>Cancel</Button>
                <Button mode="contained" onPress={handleBook} loading={booking} disabled={booking || !selectedPetId || !selectedDate || !selectedTime} style={{ flex: 1 }}>Confirm</Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  title: { fontWeight: "800", color: colors.onSurface },
  segmentContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  offlineCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.warning + "20" },
  offlineContent: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  offlineText: { flex: 1, color: colors.warning },
  searchContainer: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  searchbar: { elevation: 2 },
  scrollView: { flex: 1 },
  vetCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  cardContent: { paddingVertical: spacing.md, gap: spacing.md },
  vetHeader: { flexDirection: "row", gap: spacing.md },
  clinicIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  clinicInfo: { flex: 1, gap: spacing.xs },
  clinicName: { fontWeight: "700", color: colors.onSurface },
  locationRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  cityText: { color: colors.onSurfaceVariant, flex: 1 },
  specializations: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  specChip: { backgroundColor: colors.accent + "20" },
  cardActions: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  apptCard: { marginBottom: spacing.md },
  apptContent: { gap: spacing.sm, paddingVertical: spacing.sm },
  apptHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalCard: { borderRadius: 20 },
  modalContent: { gap: spacing.sm, paddingVertical: spacing.md },
  modalTitle: { fontWeight: "700", marginBottom: spacing.sm },
  fieldLabel: { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginTop: spacing.sm },
  input: { backgroundColor: colors.surface },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  selectChip: {},
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
});
