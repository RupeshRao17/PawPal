import { useEffect, useState } from "react";
import {
  Alert, Image, Modal, Platform, ScrollView,
  StyleSheet, TouchableOpacity, View,
} from "react-native";
import { Text, TextInput, Button, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { usePetStore, type Pet } from "@/stores/pet-store";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

let ImagePicker: any = null;
try { ImagePicker = require("expo-image-picker"); } catch {}

// ── Species config ────────────────────────────────────────────────────────────
const SPECIES = [
  { key: "dog",    emoji: "🐕", label: "Dog",    grad: ["#FF8C42", "#FF5733"] as [string, string] },
  { key: "cat",    emoji: "🐈", label: "Cat",    grad: ["#A78BFA", "#7C3AED"] as [string, string] },
  { key: "bird",   emoji: "🦜", label: "Bird",   grad: ["#34D399", "#059669"] as [string, string] },
  { key: "rabbit", emoji: "🐇", label: "Rabbit", grad: ["#F472B6", "#DB2777"] as [string, string] },
  { key: "other",  emoji: "🐾", label: "Other",  grad: ["#60A5FA", "#2563EB"] as [string, string] },
];
const GENDER_OPTIONS = ["male", "female"];

function speciesCfg(s: string) {
  return SPECIES.find((x) => x.key === s) ?? SPECIES[4];
}

async function uploadAsset(asset: any, petId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const mimeType    = asset.mimeType ?? asset.type ?? "image/jpeg";
    const ext         = mimeType.includes("png") ? "png" : "jpg";
    const path        = `${petId}/avatar.${ext}`;
    const response    = await fetch(asset.uri);
    const arrayBuffer = await response.arrayBuffer();
    const { error }   = await supabase.storage
      .from("pet-photos")
      .upload(path, arrayBuffer, { upsert: true, contentType: mimeType });
    if (error) { console.warn("Upload failed:", error.message); return null; }
    return supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn("Upload error:", e);
    return null;
  }
}

export default function PetsScreen() {
  const router  = useRouter();
  const session = useAuthStore((s) => s.session);
  const { pets, loading, fetchPets, addPet, removePet } = usePetStore();

  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState<Pet | null>(null);
  const [name,      setName]      = useState("");
  const [species,   setSpecies]   = useState("dog");
  const [breed,     setBreed]     = useState("");
  const [dob,       setDob]       = useState("");
  const [gender,    setGender]    = useState("male");
  const [photoAsset,setPhotoAsset]= useState<any>(null);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (session?.user) fetchPets(session.user.id);
  }, [session]);

  async function pickPhoto() {
    if (!ImagePicker) { Alert.alert("Install expo-image-picker first."); return; }
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed", "Allow photo library access."); return; }
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setPhotoAsset(result.assets[0]);
  }

  function openAdd() {
    setEditing(null); setName(""); setSpecies("dog"); setBreed("");
    setDob(""); setGender("male"); setPhotoAsset(null);
    setModal(true);
  }

  function openEdit(pet: Pet) {
    setEditing(pet); setName(pet.name); setSpecies(pet.species);
    setBreed(pet.breed ?? ""); setDob(pet.dob ?? "");
    setGender(pet.gender ?? "male"); setPhotoAsset(null);
    setModal(true);
  }

  async function handleSave() {
    if (!name.trim())   { Alert.alert("Required", "Pet name is required."); return; }
    if (!session?.user) { Alert.alert("Please sign in."); return; }
    if (!supabase)      { Alert.alert("Offline", OFFLINE_HINT); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), species, breed: breed.trim() || null, dob: dob || null, gender };
      if (editing) {
        const { error } = await supabase.from("pets").update(payload).eq("id", editing.id);
        if (error) throw error;
        // Upload new photo if chosen
        if (photoAsset) {
          const url = await uploadAsset(photoAsset, editing.id);
          if (url) await supabase.from("pets").update({ photo_url: url }).eq("id", editing.id);
        }
        await fetchPets(session.user.id);
      } else {
        const { data, error } = await supabase.from("pets")
          .insert({ ...payload, owner_id: session.user.id }).select().single();
        if (error) throw error;
        // Upload photo for new pet
        if (photoAsset) {
          const url = await uploadAsset(photoAsset, data.id);
          if (url) await supabase.from("pets").update({ photo_url: url }).eq("id", data.id);
        }
        await fetchPets(session.user.id);
      }
      setModal(false);
    } catch (e: any) { Alert.alert("Error", e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(pet: Pet) {
    Alert.alert("Remove Pet", `Remove ${pet.name} from your list?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        if (!supabase) return;
        await supabase.from("pets").delete().eq("id", pet.id);
        removePet(pet.id);
      }},
    ]);
  }

  const cfg = speciesCfg(species);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Pets</Text>
          <Text style={styles.headerSub}>{pets.length} companion{pets.length !== 1 ? "s" : ""}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color={colors.onPrimary} />
          <Text style={styles.addBtnText}>Add Pet</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : pets.length === 0 ? (
        /* Empty state */
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptyText}>Add your pet to track health records, vaccinations, and more.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={20} color={colors.onPrimary} />
            <Text style={styles.emptyBtnText}>Add Your First Pet</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {pets.map((pet) => {
            const c = speciesCfg(pet.species);
            return (
              <TouchableOpacity key={pet.id} style={styles.card} activeOpacity={0.95} onPress={() => openEdit(pet)}>
                {/* Photo / gradient hero */}
                <View style={styles.cardHero}>
                  {pet.photo_url ? (
                    <Image source={{ uri: pet.photo_url }} style={styles.cardHeroImg} />
                  ) : (
                    // @ts-ignore
                    <LinearGradient colors={c.grad} style={styles.cardHeroGrad}>
                      <Text style={styles.cardEmoji}>{c.emoji}</Text>
                    </LinearGradient>
                  )}
                  {/* Species badge */}
                  <View style={[styles.speciesBadge, { backgroundColor: c.grad[0] }]}>
                    <Text style={styles.speciesBadgeText}>{c.emoji} {c.label}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardName}>{pet.name}</Text>
                    {pet.gender && (
                      <View style={[styles.genderPill, { backgroundColor: pet.gender === "male" ? "#DBEAFE" : "#FCE7F3" }]}>
                        <Text style={[styles.genderPillText, { color: pet.gender === "male" ? "#1D4ED8" : "#BE185D" }]}>
                          {pet.gender === "male" ? "♂ Male" : "♀ Female"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {pet.breed && (
                    <View style={styles.breedRow}>
                      <Ionicons name="paw-outline" size={13} color={colors.onSurfaceVariant} />
                      <Text style={styles.breedText}>{pet.breed}</Text>
                    </View>
                  )}

                  {pet.dob && (
                    <View style={styles.breedRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.onSurfaceVariant} />
                      <Text style={styles.breedText}>Born {pet.dob}</Text>
                    </View>
                  )}

                  {/* Action row */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.healthBtn}
                      activeOpacity={0.8}
                      onPress={() => router.push("/(tabs)/health")}
                    >
                      <Ionicons name="heart-circle-outline" size={18} color={colors.onPrimary} />
                      <Text style={styles.healthBtnText}>Health Records</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.editIconBtn} onPress={() => openEdit(pet)} activeOpacity={0.7}>
                      <Ionicons name="pencil" size={18} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteIconBtn} onPress={() => handleDelete(pet)} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{editing ? `Edit ${editing.name}` : "Add a New Pet"}</Text>

              {/* Photo picker */}
              <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto} activeOpacity={0.85}>
                {photoAsset ? (
                  <Image source={{ uri: photoAsset.uri }} style={styles.photoPickerImg} />
                ) : editing?.photo_url ? (
                  <Image source={{ uri: editing.photo_url }} style={styles.photoPickerImg} />
                ) : (
                  <View style={[styles.photoPickerEmpty, { backgroundColor: cfg.grad[0] + "30" }]}>
                    <Text style={{ fontSize: 40 }}>{cfg.emoji}</Text>
                    <Text style={styles.photoPickerLabel}>Tap to add photo</Text>
                  </View>
                )}
                <View style={styles.photoPickerOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Name */}
              <TextInput label="Pet Name *" mode="outlined" value={name} onChangeText={setName}
                style={styles.input} left={<TextInput.Icon icon="paw" />} />

              {/* Species selector */}
              <Text style={styles.fieldLabel}>Species</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.speciesScroll}>
                <View style={styles.speciesRow}>
                  {SPECIES.map((s) => (
                    <TouchableOpacity
                      key={s.key}
                      style={[styles.speciesChip, species === s.key && { backgroundColor: s.grad[0] }]}
                      onPress={() => setSpecies(s.key)} activeOpacity={0.8}
                    >
                      <Text style={styles.speciesChipEmoji}>{s.emoji}</Text>
                      <Text style={[styles.speciesChipLabel, species === s.key && { color: "#fff" }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Breed + DOB */}
              <TextInput label="Breed" mode="outlined" value={breed} onChangeText={setBreed}
                style={styles.input} left={<TextInput.Icon icon="dna" />} placeholder="e.g. Golden Retriever" />
              <TextInput label="Date of Birth (YYYY-MM-DD)" mode="outlined" value={dob} onChangeText={setDob}
                style={styles.input} keyboardType="numeric" left={<TextInput.Icon icon="calendar" />} placeholder="e.g. 2022-03-15" />

              {/* Gender */}
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {GENDER_OPTIONS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)} activeOpacity={0.8}
                  >
                    <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                      {g === "male" ? "♂  Male" : "♀  Female"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button mode="outlined" onPress={() => setModal(false)} style={{ flex: 1 }}>Cancel</Button>
                <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1 }}>
                  {editing ? "Save Changes" : "Add Pet"}
                </Button>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  headerTitle: { fontSize: 28, fontWeight: "800", color: colors.onSurface },
  headerSub:   { fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  addBtn:      { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 22, paddingHorizontal: spacing.md, paddingVertical: 10 },
  addBtnText:  { fontWeight: "700", color: colors.onPrimary, fontSize: 14 },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll:      { paddingHorizontal: spacing.md },

  // Empty
  empty:       { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyEmoji:  { fontSize: 72 },
  emptyTitle:  { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  emptyText:   { fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", lineHeight: 22 },
  emptyBtn:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  emptyBtnText:{ fontWeight: "700", color: colors.onPrimary, fontSize: 15 },

  // Pet card
  card:        { backgroundColor: colors.surface, borderRadius: 20, marginBottom: spacing.lg, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 10 },
  cardHero:    { height: 180, width: "100%", position: "relative" },
  cardHeroImg: { width: "100%", height: "100%" },
  cardHeroGrad:{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  cardEmoji:   { fontSize: 72 },
  speciesBadge:{ position: "absolute", bottom: spacing.sm, left: spacing.sm, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  speciesBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  cardBody:    { padding: spacing.md, gap: 6 },
  cardTopRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName:    { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  genderPill:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  genderPillText: { fontSize: 12, fontWeight: "700" },
  breedRow:    { flexDirection: "row", alignItems: "center", gap: 5 },
  breedText:   { fontSize: 13, color: colors.onSurfaceVariant },
  actionRow:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  healthBtn:   { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 10 },
  healthBtnText: { fontWeight: "700", color: colors.onPrimary, fontSize: 13 },
  editIconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  deleteIconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.error + "15", alignItems: "center", justifyContent: "center" },

  // Modal
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet:       { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, maxHeight: "92%", paddingBottom: Platform.OS === "ios" ? 36 : spacing.lg },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: "center", marginBottom: spacing.md },
  sheetTitle:  { fontSize: 22, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.lg },

  // Photo picker
  photoPicker: { alignSelf: "center", width: 130, height: 130, borderRadius: 24, marginBottom: spacing.lg, overflow: "hidden", position: "relative" },
  photoPickerImg:   { width: "100%", height: "100%" },
  photoPickerEmpty: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", gap: 4 },
  photoPickerLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant },
  photoPickerOverlay: { position: "absolute", bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

  input:       { backgroundColor: colors.surface, marginBottom: spacing.sm },
  fieldLabel:  { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm, marginTop: spacing.xs },
  speciesScroll: { marginBottom: spacing.md },
  speciesRow:  { flexDirection: "row", gap: spacing.sm, paddingBottom: 4 },
  speciesChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceContainerHigh, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: 8 },
  speciesChipEmoji: { fontSize: 18 },
  speciesChipLabel: { fontWeight: "600", fontSize: 13, color: colors.onSurfaceVariant },
  genderRow:   { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  genderBtn:   { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  genderBtnActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primary + "50" },
  genderBtnText:   { fontWeight: "700", fontSize: 15, color: colors.onSurfaceVariant },
  genderBtnTextActive: { color: colors.primary },
  modalActions:{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
});
