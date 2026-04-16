import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  Chip,
  FAB,
  ActivityIndicator,
  SegmentedButtons,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { usePetStore } from "@/stores/pet-store";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { EmptyState } from "@/components/EmptyState";

type Vaccination = {
  id: string;
  pet_id: string;
  vaccine_name: string;
  administered_on: string;
  next_due_on: string | null;
  notes: string | null;
};

type Medication = {
  id: string;
  pet_id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
};

type WeightLog = {
  id: string;
  pet_id: string;
  weight_kg: number;
  logged_on: string;
  notes: string | null;
};

type Tab = "vaccinations" | "medications" | "weight";

export default function HealthScreen() {
  const session = useAuthStore((s) => s.session);
  const { pets, activePet, fetchPets, setActivePet } = usePetStore();
  const [tab, setTab] = useState<Tab>("vaccinations");
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form fields
  const [vaccineName, setVaccineName] = useState("");
  const [adminDate, setAdminDate] = useState("");
  const [nextDue, setNextDue] = useState("");
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (session?.user) fetchPets(session.user.id);
  }, [session]);

  useEffect(() => {
    if (activePet) loadHealthData(activePet.id);
  }, [activePet, tab]);

  async function loadHealthData(petId: string) {
    if (!supabase) return;
    setLoading(true);
    try {
      if (tab === "vaccinations") {
        const { data } = await supabase
          .from("health_vaccinations")
          .select("*")
          .eq("pet_id", petId)
          .order("administered_on", { ascending: false });
        setVaccinations((data as Vaccination[]) ?? []);
      } else if (tab === "medications") {
        const { data } = await supabase
          .from("health_medications")
          .select("*")
          .eq("pet_id", petId)
          .order("start_date", { ascending: false });
        setMedications((data as Medication[]) ?? []);
      } else {
        const { data } = await supabase
          .from("health_weight_logs")
          .select("*")
          .eq("pet_id", petId)
          .order("logged_on", { ascending: false })
          .limit(20);
        setWeights((data as WeightLog[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  function isOverdue(dateStr: string | null) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  async function handleSave() {
    if (!activePet || !supabase) {
      Alert.alert("Error", "Please select a pet first or configure Supabase.");
      return;
    }
    setSaving(true);
    try {
      if (tab === "vaccinations") {
        if (!vaccineName.trim() || !adminDate.trim()) {
          Alert.alert("Required", "Vaccine name and date are required.");
          return;
        }
        const { error } = await supabase.from("health_vaccinations").insert({
          pet_id: activePet.id,
          vaccine_name: vaccineName.trim(),
          administered_on: adminDate,
          next_due_on: nextDue || null,
        });
        if (error) throw error;
        setVaccineName(""); setAdminDate(""); setNextDue("");
      } else if (tab === "medications") {
        if (!medName.trim() || !startDate.trim()) {
          Alert.alert("Required", "Medication name and start date are required.");
          return;
        }
        const { error } = await supabase.from("health_medications").insert({
          pet_id: activePet.id,
          medication_name: medName.trim(),
          dosage: dosage || null,
          frequency: frequency || null,
          start_date: startDate,
          end_date: endDate || null,
        });
        if (error) throw error;
        setMedName(""); setDosage(""); setFrequency(""); setStartDate(""); setEndDate("");
      } else {
        const kg = parseFloat(weightKg);
        if (isNaN(kg) || kg <= 0) {
          Alert.alert("Invalid", "Enter a valid weight in kg.");
          return;
        }
        const { error } = await supabase.from("health_weight_logs").insert({
          pet_id: activePet.id,
          weight_kg: kg,
          logged_on: logDate,
        });
        if (error) throw error;
        setWeightKg(""); setLogDate(today);
      }
      setModalVisible(false);
      await loadHealthData(activePet.id);
    } catch (err: any) {
      Alert.alert("Failed", err.message);
    } finally {
      setSaving(false);
    }
  }

  function renderVaccinations() {
    if (vaccinations.length === 0) {
      return (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No vaccinations recorded"
          message="Tap + to add the first vaccination record for this pet"
        />
      );
    }
    return vaccinations.map((v) => {
      const overdue = isOverdue(v.next_due_on);
      return (
        <Card key={v.id} style={styles.recordCard}>
          <Card.Content style={styles.recordContent}>
            <View style={[styles.recordIcon, { backgroundColor: overdue ? colors.error + "20" : colors.success + "20" }]}>
              <Ionicons name="shield-checkmark" size={24} color={overdue ? colors.error : colors.success} />
            </View>
            <View style={styles.recordInfo}>
              <Text variant="titleMedium" style={styles.recordTitle}>{v.vaccine_name}</Text>
              <Text variant="bodySmall" style={styles.recordSub}>Given: {v.administered_on}</Text>
              {v.next_due_on && (
                <Text variant="bodySmall" style={[styles.recordSub, overdue && { color: colors.error }]}>
                  Next due: {v.next_due_on} {overdue ? "⚠️ Overdue!" : ""}
                </Text>
              )}
            </View>
            {overdue && <Chip compact textStyle={{ color: colors.error }} style={{ backgroundColor: colors.error + "20" }}>Overdue</Chip>}
          </Card.Content>
        </Card>
      );
    });
  }

  function renderMedications() {
    if (medications.length === 0) {
      return (
        <EmptyState
          icon="medkit-outline"
          title="No medications recorded"
          message="Tap + to add medications for this pet"
        />
      );
    }
    return medications.map((m) => {
      const active = !m.end_date || new Date(m.end_date) >= new Date();
      return (
        <Card key={m.id} style={styles.recordCard}>
          <Card.Content style={styles.recordContent}>
            <View style={[styles.recordIcon, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="medical" size={24} color={colors.primary} />
            </View>
            <View style={styles.recordInfo}>
              <Text variant="titleMedium" style={styles.recordTitle}>{m.medication_name}</Text>
              {m.dosage && <Text variant="bodySmall" style={styles.recordSub}>Dosage: {m.dosage}</Text>}
              {m.frequency && <Text variant="bodySmall" style={styles.recordSub}>Frequency: {m.frequency}</Text>}
              <Text variant="bodySmall" style={styles.recordSub}>
                {m.start_date} → {m.end_date ?? "Ongoing"}
              </Text>
            </View>
            <Chip compact textStyle={{ color: active ? colors.success : colors.onSurfaceVariant }} style={{ backgroundColor: (active ? colors.success : colors.onSurfaceVariant) + "20" }}>
              {active ? "Active" : "Completed"}
            </Chip>
          </Card.Content>
        </Card>
      );
    });
  }

  function renderWeights() {
    if (weights.length === 0) {
      return (
        <EmptyState
          icon="analytics-outline"
          title="No weight logs"
          message="Tap + to start tracking your pet's weight"
        />
      );
    }
    return weights.map((w, i) => (
      <Card key={w.id} style={styles.recordCard}>
        <Card.Content style={styles.recordContent}>
          <View style={[styles.recordIcon, { backgroundColor: colors.accent + "20" }]}>
            <Ionicons name="analytics" size={24} color={colors.accent} />
          </View>
          <View style={styles.recordInfo}>
            <Text variant="titleMedium" style={styles.recordTitle}>{w.weight_kg} kg</Text>
            <Text variant="bodySmall" style={styles.recordSub}>{w.logged_on}</Text>
          </View>
          {i === 0 && <Chip compact>Latest</Chip>}
          {i > 0 && (
            <Text style={[styles.delta, { color: w.weight_kg > weights[i - 1].weight_kg ? colors.error : colors.success }]}>
              {w.weight_kg > weights[i - 1].weight_kg ? "▲" : "▼"}
              {Math.abs(w.weight_kg - weights[i - 1].weight_kg).toFixed(1)}
            </Text>
          )}
        </Card.Content>
      </Card>
    ));
  }

  function renderModal() {
    return (
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Card.Content style={styles.modalContent}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {tab === "vaccinations" ? "Add Vaccination" : tab === "medications" ? "Add Medication" : "Log Weight"}
              </Text>

              {tab === "vaccinations" && (
                <>
                  <TextInput label="Vaccine Name *" mode="outlined" value={vaccineName} onChangeText={setVaccineName} style={styles.input} left={<TextInput.Icon icon="shield-check" />} />
                  <TextInput label="Date Administered * (YYYY-MM-DD)" mode="outlined" value={adminDate} onChangeText={setAdminDate} style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar" />} placeholder={today} />
                  <TextInput label="Next Due Date (YYYY-MM-DD)" mode="outlined" value={nextDue} onChangeText={setNextDue} style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar-clock" />} />
                </>
              )}

              {tab === "medications" && (
                <>
                  <TextInput label="Medication Name *" mode="outlined" value={medName} onChangeText={setMedName} style={styles.input} left={<TextInput.Icon icon="pill" />} />
                  <TextInput label="Dosage (e.g. 10mg)" mode="outlined" value={dosage} onChangeText={setDosage} style={styles.input} left={<TextInput.Icon icon="eyedropper" />} />
                  <TextInput label="Frequency (e.g. Once daily)" mode="outlined" value={frequency} onChangeText={setFrequency} style={styles.input} left={<TextInput.Icon icon="clock-outline" />} />
                  <TextInput label="Start Date * (YYYY-MM-DD)" mode="outlined" value={startDate} onChangeText={setStartDate} style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar" />} placeholder={today} />
                  <TextInput label="End Date (YYYY-MM-DD, blank=ongoing)" mode="outlined" value={endDate} onChangeText={setEndDate} style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar-end" />} />
                </>
              )}

              {tab === "weight" && (
                <>
                  <TextInput label="Weight (kg) *" mode="outlined" value={weightKg} onChangeText={setWeightKg} style={styles.input} keyboardType="decimal-pad" left={<TextInput.Icon icon="scale" />} />
                  <TextInput label="Date (YYYY-MM-DD)" mode="outlined" value={logDate} onChangeText={setLogDate} style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar" />} />
                </>
              )}

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.modalBtn}>Cancel</Button>
                <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.modalBtn}>Save</Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Health Tracker 🩺</Text>
      </View>

      {!isSupabaseConfigured && (
        <Card style={styles.offlineCard}>
          <Card.Content style={styles.offlineRow}>
            <Ionicons name="cloud-offline" size={18} color={colors.warning} />
            <Text variant="bodySmall" style={styles.offlineText}>{OFFLINE_HINT}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Pet selector */}
      {pets.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.petScroll} contentContainerStyle={styles.petScrollContent}>
          {pets.map((pet) => (
            <Chip
              key={pet.id}
              selected={activePet?.id === pet.id}
              onPress={() => setActivePet(pet)}
              style={[styles.petChip, activePet?.id === pet.id && styles.petChipActive]}
              icon="paw"
            >
              {pet.name}
            </Chip>
          ))}
        </ScrollView>
      )}

      {pets.length === 0 ? (
        <EmptyState
          icon="paw-outline"
          title="No pets yet"
          message="Add a pet from the My Pets section first"
        />
      ) : (
        <>
          {/* Tab segmented control */}
          <View style={styles.segmentContainer}>
            <SegmentedButtons
              value={tab}
              onValueChange={(v) => setTab(v as Tab)}
              buttons={[
                { value: "vaccinations", label: "Vaccines", icon: "shield-check" },
                { value: "medications", label: "Meds", icon: "medical-bag" },
                { value: "weight", label: "Weight", icon: "scale" },
              ]}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {tab === "vaccinations" && renderVaccinations()}
              {tab === "medications" && renderMedications()}
              {tab === "weight" && renderWeights()}
              <View style={{ height: 100 }} />
            </ScrollView>
          )}
        </>
      )}

      {activePet && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          color={colors.surface}
        />
      )}

      {renderModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  title: { fontWeight: "800", color: colors.onSurface },
  offlineCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.warning + "20" },
  offlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  offlineText: { flex: 1, color: colors.warning },
  petScroll: { maxHeight: 56 },
  petScrollContent: { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: "center" },
  petChip: { backgroundColor: colors.surfaceVariant },
  petChipActive: { backgroundColor: colors.primary + "30" },
  segmentContainer: { paddingHorizontal: spacing.md, marginVertical: spacing.md },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  recordCard: { marginBottom: spacing.md },
  recordContent: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  recordIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  recordInfo: { flex: 1, gap: 2 },
  recordTitle: { fontWeight: "700", color: colors.onSurface },
  recordSub: { color: colors.onSurfaceVariant },
  delta: { fontSize: 13, fontWeight: "700" },
  fab: { position: "absolute", bottom: 90, right: spacing.md, backgroundColor: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalCard: { borderRadius: 20 },
  modalContent: { gap: spacing.sm, paddingVertical: spacing.md },
  modalTitle: { fontWeight: "700", marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  modalBtn: { flex: 1 },
});
