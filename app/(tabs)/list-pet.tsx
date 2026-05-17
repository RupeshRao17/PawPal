import React, { useState } from "react";
import {
  Alert, ScrollView, StyleSheet, View,
  TouchableOpacity, Image, Platform,
} from "react-native";
import { Text, Button, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

let ImagePicker: any = null;
try { ImagePicker = require("expo-image-picker"); } catch {}

const SPECIES_OPTIONS = [
  { key: "dog",    label: "Dog",    icon: "paw" },
  { key: "cat",    label: "Cat",    icon: "paw" },
  { key: "bird",   label: "Bird",   icon: "egg" },
  { key: "rabbit", label: "Rabbit", icon: "paw" },
  { key: "other",  label: "Other",  icon: "ellipsis-horizontal" },
];
// Upload using ArrayBuffer — most reliable approach in React Native
async function uploadAsset(asset: any, petId: string, index: number): Promise<string | null> {
  if (!supabase) return null;
  try {
    const mimeType  = asset.mimeType ?? asset.type ?? "image/jpeg";
    const ext       = mimeType.includes("png") ? "png" : "jpg";
    const path      = `${petId}/photo_${index}.${ext}`;

    const response    = await fetch(asset.uri);
    const arrayBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from("pet-photos")
      .upload(path, arrayBuffer, { upsert: true, contentType: mimeType });

    if (error) { console.warn("Upload error:", error.message); return null; }
    return supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn("Photo upload failed:", e);
    return null;
  }
}

export default function ListPetScreen() {
  const router  = useRouter();
  const session = useAuthStore((s) => s.session);

  const [petName,   setPetName]   = useState("");
  const [breed,     setBreed]     = useState("");
  const [city,      setCity]      = useState("");
  const [species,   setSpecies]   = useState("dog");
  const [desc,      setDesc]      = useState("");
  const [assets,    setAssets]    = useState<any[]>([]); // full picker asset objects
  const [loading,   setLoading]   = useState(false);
  const [gender,    setGender]    = useState<"male"|"female"|"">("male");
  const [dob,       setDob]       = useState("");

  // Vaccination + medical history
  type VaxEntry = { name: string; date: string; nextDue: string };
  const [vaccines,   setVaccines]   = useState<VaxEntry[]>([]);
  const [medHistory, setMedHistory] = useState("");

  function addVax()       { setVaccines((p) => [...p, { name: "", date: "", nextDue: "" }]); }
  function removeVax(i: number) { setVaccines((p) => p.filter((_, idx) => idx !== i)); }
  function updateVax(i: number, field: keyof VaxEntry, val: string) {
    setVaccines((p) => p.map((v, idx) => idx === i ? { ...v, [field]: val } : v));
  }

  async function pickImage() {
    if (!ImagePicker) {
      Alert.alert("Install needed", "Run: npx expo install expo-image-picker  then restart Expo.");
      return;
    }
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access to upload pet photos.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });
    if (!result.canceled) {
      setAssets((prev) => [...prev, ...result.assets].slice(0, 4));
    }
  }

  async function handleSubmit() {
    if (!petName.trim() || !breed.trim() || !city.trim()) {
      Alert.alert("Required", "Please fill in pet name, breed, and city.");
      return;
    }
    if (!session?.user) { Alert.alert("Sign in required"); return; }
    if (!supabase)       { Alert.alert("Offline", OFFLINE_HINT); return; }

    setLoading(true);
    try {
      // 1. Insert pet record
      const { data: pet, error: petErr } = await supabase
        .from("pets")
        .insert({ name: petName.trim(), species, breed: breed.trim(), owner_id: session.user.id, notes: desc.trim() || null, gender: gender || null, dob: dob.trim() || null })
        .select().single();
      if (petErr) throw petErr;

      // 2. Upload photos and get URLs
      let photoUrl: string | null = null;
      if (assets.length > 0) {
        const urls = await Promise.all(assets.map((a, i) => uploadAsset(a, pet.id, i)));
        photoUrl = urls.find(Boolean) ?? null;
        if (photoUrl) {
          await supabase.from("pets").update({ photo_url: photoUrl }).eq("id", pet.id);
        }
      }

      // 3. Insert vaccination history
      const validVax = vaccines.filter((v) => v.name.trim() && v.date.trim());
      if (validVax.length > 0) {
        await supabase.from("health_vaccinations").insert(
          validVax.map((v) => ({
            pet_id:          pet.id,
            vaccine_name:    v.name.trim(),
            administered_on: v.date.trim(),
            next_due_on:     v.nextDue.trim() || null,
          }))
        );
      }

      // 4. Save medical history into pets.notes
      if (medHistory.trim()) {
        await supabase.from("pets").update({ notes: medHistory.trim() }).eq("id", pet.id);
      }

      // 5. Create adoption listing
      const { error: listErr } = await supabase.from("adoption_listings").insert({
        pet_id: pet.id, shelter_id: session.user.id,
        status: "available", description: desc.trim() || null, city: city.trim(),
      });
      if (listErr) throw listErr;

      Alert.alert("Listed! 🎉", `${petName} is now available for adoption.`, [
        { text: "Go to Discover", onPress: () => router.replace("/(tabs)") },
      ]);
      setPetName(""); setBreed(""); setCity(""); setDesc(""); setAssets([]);
      setVaccines([]); setMedHistory(""); setGender("male"); setDob("");
    } catch (err: any) {
      Alert.alert("Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text variant="headlineMedium" style={styles.title}>List for Adoption</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Find them a new <Text style={styles.heroAccent}>beginning.</Text></Text>
          <Text style={styles.heroSub}>Help your pet find a loving forever home.</Text>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>PHOTOS <Text style={styles.labelSub}>(up to 4 — good photos get 3× more enquiries)</Text></Text>
          <View style={styles.photoGrid}>
            {assets.map((a, i) => (
              <View key={i} style={styles.thumb}>
                <Image source={{ uri: a.uri }} style={styles.thumbImg} />
                {i === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Main</Text></View>}
                <TouchableOpacity style={styles.removeBtn} onPress={() => setAssets((p) => p.filter((_, idx) => idx !== i))}>
                  <Ionicons name="close-circle" size={24} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {assets.length < 4 && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={34} color={colors.primary} />
                <Text style={styles.addPhotoText}>{assets.length === 0 ? "Add Photos" : "Add More"}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.label}>PET DETAILS</Text>
          <TextInput label="Pet's Name *" mode="outlined" value={petName} onChangeText={setPetName}
            style={styles.input} left={<TextInput.Icon icon="paw" />} placeholder="e.g. Luna" />
          <TextInput label="Breed *" mode="outlined" value={breed} onChangeText={setBreed}
            style={styles.input} left={<TextInput.Icon icon="dna" />} placeholder="e.g. Golden Retriever Mix" />
          <TextInput label="City / Location *" mode="outlined" value={city} onChangeText={setCity}
            style={styles.input} left={<TextInput.Icon icon="map-marker" />} placeholder="e.g. Mumbai" />
        </View>

        {/* Gender + DOB */}
        <View style={styles.section}>
          <Text style={styles.label}>GENDER &amp; DATE OF BIRTH</Text>

          {/* Gender toggle */}
          <View style={styles.genderRow}>
            {(["male", "female"] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                onPress={() => setGender(g)}
                activeOpacity={0.8}
              >
                <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                  {g === "male" ? "♂  Male" : "♀  Female"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date of Birth */}
          <TextInput
            label="Date of Birth (YYYY-MM-DD)"
            mode="outlined"
            value={dob}
            onChangeText={setDob}
            style={styles.input}
            keyboardType="numeric"
            placeholder="e.g. 2022-06-15"
            left={<TextInput.Icon icon="calendar" />}
          />
          <Text style={styles.dobHint}>
            Age will be calculated automatically from the date of birth.
          </Text>
        </View>

        {/* Species */}
        <View style={styles.section}>
          <Text style={styles.label}>SPECIES</Text>
          <View style={styles.optionRow}>
            {SPECIES_OPTIONS.map((s) => (
              <TouchableOpacity key={s.key} style={[styles.optionBtn, species === s.key && styles.optionActive]}
                onPress={() => setSpecies(s.key)} activeOpacity={0.8}>
                <Ionicons name={s.icon as any} size={20} color={species === s.key ? colors.onPrimary : colors.onSurfaceVariant} />
                <Text style={[styles.optionText, species === s.key && styles.optionTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>ABOUT THIS PET</Text>
          <TextInput label="Describe personality, health, ideal home…" mode="outlined"
            value={desc} onChangeText={setDesc} multiline numberOfLines={4}
            style={[styles.input, { minHeight: 100 }]} />
        </View>

        {/* ── Vaccination History ── */}
        <View style={styles.section}>
          <Text style={styles.label}>VACCINATION HISTORY <Text style={styles.labelSub}>(optional)</Text></Text>

          {vaccines.map((v, i) => (
            <View key={i} style={styles.vaxCard}>
              <View style={styles.vaxCardHeader}>
                <Text style={styles.vaxCardTitle}>Vaccination {i + 1}</Text>
                <TouchableOpacity onPress={() => removeVax(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <TextInput
                label="Vaccine Name *" mode="outlined"
                value={v.name} onChangeText={(t) => updateVax(i, "name", t)}
                style={styles.input} left={<TextInput.Icon icon="shield-check" />}
                placeholder="e.g. Rabies, DHPPiL"
              />
              <TextInput
                label="Date Given * (YYYY-MM-DD)" mode="outlined"
                value={v.date} onChangeText={(t) => updateVax(i, "date", t)}
                style={styles.input} keyboardType="numeric"
                left={<TextInput.Icon icon="calendar" />}
              />
              <TextInput
                label="Next Due Date (YYYY-MM-DD, optional)" mode="outlined"
                value={v.nextDue} onChangeText={(t) => updateVax(i, "nextDue", t)}
                style={styles.input} keyboardType="numeric"
                left={<TextInput.Icon icon="calendar-clock" />}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.addRowBtn} onPress={addVax} activeOpacity={0.8}>
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addRowBtnText}>Add Vaccination Record</Text>
          </TouchableOpacity>
        </View>

        {/* ── Medical History ── */}
        <View style={styles.section}>
          <Text style={styles.label}>MEDICAL HISTORY <Text style={styles.labelSub}>(optional)</Text></Text>
          <TextInput
            label="Any conditions, allergies, surgeries or ongoing medications…"
            mode="outlined" value={medHistory} onChangeText={setMedHistory}
            multiline numberOfLines={4}
            style={[styles.input, { minHeight: 100 }]}
          />
        </View>

        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
          <Text style={styles.safetyText}>
            Every listing is reviewed by our team to ensure a safe adoption for every companion.
          </Text>
        </View>

        <View style={{ height: 160 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading}
          icon="heart" contentStyle={{ paddingVertical: 8 }} style={styles.submitBtn}
          labelStyle={{ fontSize: 16, fontWeight: "700" }}>
          List {petName.trim() || "My Pet"} for Adoption
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingTop: spacing.xl * 1.5, paddingBottom: spacing.sm },
  backBtn:     { width: 40, alignItems: "flex-start" },
  title:       { fontWeight: "800", color: colors.onSurface, flex: 1, textAlign: "center" },
  scroll:      { paddingBottom: spacing.xl },
  heroSection: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  heroTitle:   { fontSize: 28, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm, letterSpacing: -0.5 },
  heroAccent:  { fontStyle: "italic", color: colors.primary },
  heroSub:     { fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 22 },
  section:     { paddingHorizontal: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  label:       { fontSize: 10, fontWeight: "800", color: colors.onSurfaceVariant, letterSpacing: 1.5 },
  labelSub:    { fontWeight: "400", textTransform: "none", letterSpacing: 0 },
  input:       { backgroundColor: colors.surface },
  photoGrid:   { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  thumb:       { width: 90, height: 90, borderRadius: 14, overflow: "visible", position: "relative" },
  thumbImg:    { width: 90, height: 90, borderRadius: 14 },
  primaryBadge: { position: "absolute", bottom: 4, left: 4, backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 9, fontWeight: "700", color: colors.onPrimary },
  removeBtn:   { position: "absolute", top: -8, right: -8, backgroundColor: colors.surface, borderRadius: 12 },
  addPhotoBtn: { width: 90, height: 90, borderRadius: 14, backgroundColor: colors.surfaceContainerHighest, borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary + "60", alignItems: "center", justifyContent: "center", gap: 4 },
  addPhotoText:{ fontSize: 10, fontWeight: "700", color: colors.primary },
  optionRow:   { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionBtn:   { flex: 1, minWidth: "28%", backgroundColor: colors.surfaceContainerLow, borderRadius: 12, paddingVertical: spacing.md, alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: "transparent" },
  ageBtn:      { flexBasis: "45%", backgroundColor: colors.surfaceContainerLow, borderRadius: 12, paddingVertical: spacing.md, alignItems: "center", borderWidth: 1.5, borderColor: "transparent" },
  optionActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primary + "50" },
  optionText:   { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 },
  optionTextActive: { color: colors.primary },
  safetyCard:  { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, backgroundColor: colors.primaryContainer + "50", marginHorizontal: spacing.md, padding: spacing.lg, borderRadius: 16 },
  safetyText:  { flex: 1, fontSize: 13, lineHeight: 20, color: colors.onSurfaceVariant },
  genderRow:    { flexDirection: "row", gap: spacing.sm },
  genderBtn:    { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surfaceContainerHigh, alignItems: "center", borderWidth: 2, borderColor: "transparent" },
  genderBtnActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primary + "50" },
  genderBtnText:   { fontWeight: "700", fontSize: 15, color: colors.onSurfaceVariant },
  genderBtnTextActive: { color: colors.primary },
  dobHint:      { fontSize: 11, color: colors.onSurfaceVariant, marginTop: -4 },
  vaxCard:     { backgroundColor: colors.surfaceContainerLow, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  vaxCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xs },
  vaxCardTitle:  { fontWeight: "700", color: colors.onSurface, fontSize: 13 },
  addRowBtn:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.primary + "60", justifyContent: "center" },
  addRowBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  bottomBar:   { position: "absolute", bottom: 90, left: 0, right: 0, backgroundColor: colors.surface + "F8", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "40" },
  submitBtn:   { borderRadius: 28 },
});
