import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, StyleSheet, View } from "react-native";
import { Text, Card, Button, TextInput, Chip, FAB, SegmentedButtons } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { usePetStore, type Pet } from "@/stores/pet-store";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { EmptyState } from "@/components/EmptyState";

const SPECIES_OPTIONS = ["dog", "cat", "bird", "rabbit", "other"];
const GENDER_OPTIONS = ["male", "female"];

const SPECIES_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  dog: "paw", cat: "paw", bird: "egg", rabbit: "paw", fish: "fish", other: "paw",
};

function SpeciesEmoji({ species }: { species: string }) {
  const map: Record<string, string> = { dog: "🐶", cat: "🐱", bird: "🐦", rabbit: "🐰", other: "🐾" };
  return <>{map[species] ?? "🐾"}</>;
}

export default function PetsScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { pets, loading, fetchPets, addPet, removePet } = usePetStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [breed, setBreed] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user) fetchPets(session.user.id);
  }, [session]);

  function openAdd() {
    setEditingPet(null);
    setName(""); setSpecies("dog"); setBreed(""); setDob(""); setGender("male");
    setModalVisible(true);
  }

  function openEdit(pet: Pet) {
    setEditingPet(pet);
    setName(pet.name); setSpecies(pet.species);
    setBreed(pet.breed ?? ""); setDob(pet.dob ?? "");
    setGender(pet.gender ?? "male");
    setModalVisible(true);
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert("Required", "Pet name is required."); return; }
    if (!session?.user) { Alert.alert("Not signed in"); return; }
    if (!supabase) { Alert.alert("Offline", OFFLINE_HINT); return; }

    setSaving(true);
    try {
      if (editingPet) {
        const { data, error } = await supabase
          .from("pets")
          .update({ name: name.trim(), species, breed: breed.trim() || null, dob: dob || null, gender })
          .eq("id", editingPet.id)
          .select()
          .single();
        if (error) throw error;
        // Refresh
        await fetchPets(session.user.id);
      } else {
        const { data, error } = await supabase
          .from("pets")
          .insert({ owner_id: session.user.id, name: name.trim(), species, breed: breed.trim() || null, dob: dob || null, gender })
          .select()
          .single();
        if (error) throw error;
        addPet(data as Pet);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pet: Pet) {
    Alert.alert("Remove Pet", `Remove ${pet.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!supabase) return;
          await supabase.from("pets").delete().eq("id", pet.id);
          removePet(pet.id);
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>My Pets 🐾</Text>
        <Chip icon="paw" style={styles.countChip}>{pets.length} {pets.length === 1 ? "Pet" : "Pets"}</Chip>
      </View>

      {!isSupabaseConfigured && (
        <Card style={styles.offlineCard}>
          <Card.Content style={styles.offlineRow}>
            <Ionicons name="cloud-offline" size={18} color={colors.warning} />
            <Text variant="bodySmall" style={styles.offlineText}>{OFFLINE_HINT}</Text>
          </Card.Content>
        </Card>
      )}

      {pets.length === 0 ? (
        <EmptyState
          icon="paw"
          title="No pets yet"
          message="Add your first pet to start tracking their health, vaccinations, and more"
          actionLabel="Add Pet"
          onAction={openAdd}
        />
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {pets.map((pet) => (
            <Card key={pet.id} style={styles.petCard}>
              <Card.Content style={styles.petCardContent}>
                <View style={[styles.petEmoji, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={styles.emojiText}><SpeciesEmoji species={pet.species} /></Text>
                </View>
                <View style={styles.petInfo}>
                  <Text variant="titleLarge" style={styles.petName}>{pet.name}</Text>
                  <Text variant="bodyMedium" style={styles.petBreed}>{pet.breed ?? pet.species}</Text>
                  <View style={styles.chipRow}>
                    <Chip compact style={styles.speciesChip}>{pet.species}</Chip>
                    {pet.gender && <Chip compact style={styles.genderChip}>{pet.gender}</Chip>}
                    {pet.dob && <Chip compact style={styles.dobChip}>Born {pet.dob}</Chip>}
                  </View>
                </View>
              </Card.Content>
              <Card.Actions style={styles.petActions}>
                <Button
                  icon="heart-pulse"
                  textColor={colors.secondary}
                  onPress={() => router.push("/(tabs)/health")}
                >
                  Health
                </Button>
                <Button
                  icon="pencil"
                  textColor={colors.primary}
                  onPress={() => openEdit(pet)}
                >
                  Edit
                </Button>
                <Button
                  icon="trash-can-outline"
                  textColor={colors.error}
                  onPress={() => handleDelete(pet)}
                >
                  Remove
                </Button>
              </Card.Actions>
            </Card>
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <FAB icon="plus" style={styles.fab} onPress={openAdd} color={colors.surface} />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Card.Content style={styles.modalContent}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {editingPet ? `Edit ${editingPet.name}` : "Add New Pet"}
              </Text>

              <TextInput
                label="Pet Name *"
                mode="outlined"
                value={name}
                onChangeText={setName}
                style={styles.input}
                left={<TextInput.Icon icon="paw" />}
              />

              <Text variant="labelLarge" style={styles.fieldLabel}>Species</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {SPECIES_OPTIONS.map((s) => (
                    <Chip key={s} selected={species === s} onPress={() => setSpecies(s)} style={styles.selectChip}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Chip>
                  ))}
                </View>
              </ScrollView>

              <TextInput
                label="Breed"
                mode="outlined"
                value={breed}
                onChangeText={setBreed}
                style={styles.input}
                left={<TextInput.Icon icon="information" />}
                placeholder="e.g. Golden Retriever"
              />
              <TextInput
                label="Date of Birth (YYYY-MM-DD)"
                mode="outlined"
                value={dob}
                onChangeText={setDob}
                style={styles.input}
                keyboardType="numeric"
                left={<TextInput.Icon icon="calendar" />}
                placeholder="e.g. 2022-03-15"
              />

              <Text variant="labelLarge" style={styles.fieldLabel}>Gender</Text>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
                {GENDER_OPTIONS.map((g) => (
                  <Chip key={g} selected={gender === g} onPress={() => setGender(g)} style={styles.selectChip}>
                    {g === "male" ? "♂ Male" : "♀ Female"}
                  </Chip>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ flex: 1 }}>Cancel</Button>
                <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1 }}>
                  {editingPet ? "Save" : "Add Pet"}
                </Button>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.md },
  title: { fontWeight: "800", color: colors.onSurface },
  countChip: { backgroundColor: colors.primary + "20" },
  offlineCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.warning + "20" },
  offlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  offlineText: { flex: 1, color: colors.warning },
  scrollView: { flex: 1 },
  petCard: { marginHorizontal: spacing.md, marginBottom: spacing.md },
  petCardContent: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  petEmoji: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 32 },
  petInfo: { flex: 1, gap: spacing.xs },
  petName: { fontWeight: "700", color: colors.onSurface },
  petBreed: { color: colors.onSurfaceVariant },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.xs },
  speciesChip: { backgroundColor: colors.primary + "15" },
  genderChip: { backgroundColor: colors.secondary + "15" },
  dobChip: { backgroundColor: colors.surfaceVariant },
  petActions: { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  fab: { position: "absolute", bottom: 90, right: spacing.md, backgroundColor: colors.primary },
  bottomPadding: { height: 100 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.lg },
  modalCard: { borderRadius: 20 },
  modalContent: { gap: spacing.sm, paddingVertical: spacing.md },
  modalTitle: { fontWeight: "700", marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface },
  fieldLabel: { color: colors.onSurfaceVariant, marginBottom: spacing.xs, marginTop: spacing.sm },
  selectChip: {},
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
});
