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

// expo-image-picker is a common Expo library — install it with:
//   npx expo install expo-image-picker
// If not yet installed, photo upload falls back gracefully.
let ImagePicker: any = null;
try { ImagePicker = require("expo-image-picker"); } catch {}

const SPECIES_OPTIONS = [
  { key: "dog",    label: "Dog",    icon: "paw" },
  { key: "cat",    label: "Cat",    icon: "paw" },
  { key: "bird",   label: "Bird",   icon: "egg" },
  { key: "rabbit", label: "Rabbit", icon: "paw" },
  { key: "other",  label: "Other",  icon: "ellipsis-horizontal" },
];

const AGE_OPTIONS = ["Puppy / Kitten", "Young (1–3 yrs)", "Adult (3–7 yrs)", "Senior (7+ yrs)"];

export default function ListPetScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);

  const [petName,         setPetName]         = useState("");
  const [breed,           setBreed]           = useState("");
  const [city,            setCity]            = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("dog");
  const [selectedAge,     setSelectedAge]     = useState("Young (1–3 yrs)");
  const [description,     setDescription]     = useState("");
  const [photos,          setPhotos]          = useState<string[]>([]); // local URIs
  const [loading,         setLoading]         = useState(false);

  // ── Pick image from library ──────────────────────────────────────────────
  async function pickImage() {
    if (!ImagePicker) {
      Alert.alert(
        "expo-image-picker not installed",
        'Run: npx expo install expo-image-picker\nthen restart Expo.',
      );
      return;
    }
    // Request permission on iOS
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Please allow photo library access to upload pet photos.");
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? "images",
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 4,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a: any) => a.uri);
      setPhotos((prev) => [...prev, ...newUris].slice(0, 4)); // max 4 photos
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  // ── Upload a single photo to Supabase Storage ────────────────────────────
  async function uploadPhoto(localUri: string, petId: string, index: number): Promise<string | null> {
    if (!supabase) return null;
    try {
      const ext = localUri.split(".").pop() ?? "jpg";
      const path = `${petId}/photo_${index}.${ext}`;
      const response = await fetch(localUri);
      const blob = await response.blob();
      const { error } = await supabase.storage
        .from("pet-photos")
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (error) { console.warn("Upload error:", error.message); return null; }
      const { data } = supabase.storage.from("pet-photos").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.warn("Photo upload failed:", e);
      return null;
    }
  }

  // ── Submit form ──────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!petName.trim() || !breed.trim() || !city.trim()) {
      Alert.alert("Required", "Please fill in pet name, breed, and city.");
      return;
    }
    if (!session?.user) { Alert.alert("Sign in required", "Please sign in to list a pet."); return; }
    if (!supabase)       { Alert.alert("Offline", OFFLINE_HINT); return; }

    setLoading(true);
    try {
      // 1. Create the pet record (no photo_url yet)
      const { data: petData, error: petError } = await supabase
        .from("pets")
        .insert({
          name:     petName.trim(),
          species:  selectedSpecies,
          breed:    breed.trim(),
          owner_id: session.user.id,
          notes:    description.trim() || null,
        })
        .select()
        .single();
      if (petError) throw petError;

      // 2. Upload photos → get public URLs
      let firstPhotoUrl: string | null = null;
      if (photos.length > 0) {
        const urls = await Promise.all(
          photos.map((uri, i) => uploadPhoto(uri, petData.id, i))
        );
        firstPhotoUrl = urls[0] ?? null;

        // Save the primary photo_url on the pet row
        if (firstPhotoUrl) {
          await supabase
            .from("pets")
            .update({ photo_url: firstPhotoUrl })
            .eq("id", petData.id);
        }
      }

      // 3. Create the adoption listing
      const { error: listingError } = await supabase
        .from("adoption_listings")
        .insert({
          pet_id:     petData.id,
          shelter_id: session.user.id,
          status:     "available",
          description: description.trim() || null,
          city:        city.trim(),
        });
      if (listingError) throw listingError;

      Alert.alert(
        "Listed! 🎉",
        `${petName} has been listed for adoption. Prospective owners can now apply.`,
        [{ text: "Back to Home", onPress: () => router.replace("/(tabs)") }]
      );

      // Reset
      setPetName(""); setBreed(""); setCity(""); setDescription("");
      setSelectedSpecies("dog"); setSelectedAge("Young (1–3 yrs)");
      setPhotos([]);
    } catch (err: any) {
      Alert.alert("Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text variant="headlineMedium" style={styles.title}>List a Pet ❤️</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero text */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Find them a new{" "}<Text style={styles.heroItalic}>beginning.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            List your pet for adoption and help them find a loving forever home.
          </Text>
        </View>

        {/* ── Photos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Photos (up to 4)</Text>

          <View style={styles.photoGrid}>
            {/* Existing photos */}
            {photos.map((uri) => (
              <View key={uri} style={styles.photoThumb}>
                <Image source={{ uri }} style={styles.thumbImage} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => removePhoto(uri)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add button (only show if under 4 photos) */}
            {photos.length < 4 && (
              <TouchableOpacity style={styles.addPhoto} activeOpacity={0.7} onPress={pickImage}>
                <Ionicons name="camera" size={32} color={colors.primary} />
                <Text style={styles.addPhotoLabel}>
                  {photos.length === 0 ? "Add Photos" : "Add More"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {photos.length === 0 && (
            <Text style={styles.photoHint}>
              Good photos get 3× more adoption enquiries!
            </Text>
          )}
        </View>

        {/* ── Core details ── */}
        <View style={styles.section}>
          <TextInput
            label="Pet's Name *" mode="outlined" value={petName} onChangeText={setPetName}
            style={styles.input} left={<TextInput.Icon icon="paw" />} placeholder="e.g. Luna"
          />
          <TextInput
            label="Breed *" mode="outlined" value={breed} onChangeText={setBreed}
            style={styles.input} left={<TextInput.Icon icon="information" />} placeholder="e.g. Golden Retriever Mix"
          />
          <TextInput
            label="City / Location *" mode="outlined" value={city} onChangeText={setCity}
            style={styles.input} left={<TextInput.Icon icon="map-marker" />} placeholder="e.g. Mumbai"
          />
        </View>

        {/* ── Species ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Species</Text>
          <View style={styles.optionRow}>
            {SPECIES_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.optionBtn, selectedSpecies === s.key && styles.optionBtnActive]}
                onPress={() => setSelectedSpecies(s.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={s.icon as any} size={20}
                  color={selectedSpecies === s.key ? colors.onTertiaryContainer : colors.onSurfaceVariant}
                />
                <Text style={[styles.optionText, selectedSpecies === s.key && styles.optionTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Age ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Age Range</Text>
          <View style={styles.optionRow}>
            {AGE_OPTIONS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.ageBtn, selectedAge === a && styles.optionBtnActive]}
                onPress={() => setSelectedAge(a)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, selectedAge === a && styles.optionTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Description ── */}
        <View style={styles.section}>
          <TextInput
            label="About this pet" mode="outlined" value={description}
            onChangeText={setDescription} multiline numberOfLines={4}
            style={[styles.input, { height: 110 }]}
            placeholder="Describe the pet's personality, health, and what kind of home they need..."
          />
        </View>

        {/* ── Safety card ── */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={22} color={colors.onSecondaryContainer} />
            <Text style={styles.safetyTitle}>Our Safety Promise</Text>
          </View>
          <Text style={styles.safetyText}>
            Every listing is reviewed by our team to ensure a safe transition for every companion.
          </Text>
        </View>

        <View style={{ height: 130 }} />
      </ScrollView>

      {/* Sticky submit bar */}
      <View style={styles.bottomBar}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          icon="check-circle"
          contentStyle={{ paddingVertical: 8 }}
          style={styles.submitBtn}
          labelStyle={{ fontSize: 16, fontWeight: "700" }}
        >
          List My Pet
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingTop: spacing.xl * 1.5, paddingBottom: spacing.sm,
  },
  backBtn:     { width: 40, alignItems: "flex-start" },
  title:       { fontWeight: "800", color: colors.onSurface, flex: 1, textAlign: "center" },
  scrollContent: { paddingBottom: spacing.xl },
  heroSection: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  heroTitle:   { fontSize: 30, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm, letterSpacing: -0.5 },
  heroItalic:  { fontStyle: "italic", color: colors.primary },
  heroSubtitle:{ fontSize: 15, color: colors.onSurfaceVariant, lineHeight: 22 },
  section:     { paddingHorizontal: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  sectionLabel:{ fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: spacing.xs },
  input:       { backgroundColor: colors.surface },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoThumb: {
    width: 90, height: 90, borderRadius: 12, overflow: "visible", position: "relative",
  },
  thumbImage: { width: 90, height: 90, borderRadius: 12 },
  removePhoto: {
    position: "absolute", top: -8, right: -8,
    backgroundColor: colors.surface, borderRadius: 11,
  },
  addPhoto: {
    width: 90, height: 90, borderRadius: 12,
    backgroundColor: colors.surfaceContainerHighest,
    borderWidth: 2, borderStyle: "dashed", borderColor: colors.primary + "60",
    alignItems: "center", justifyContent: "center", gap: 4,
  },
  addPhotoLabel: { fontSize: 11, fontWeight: "700", color: colors.primary },
  photoHint:    { fontSize: 12, color: colors.onSurfaceVariant, textAlign: "center", marginTop: spacing.xs },

  optionRow:        { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionBtn:        { flex: 1, minWidth: "28%", backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingVertical: spacing.md, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.outlineVariant + "30" },
  ageBtn:           { flexBasis: "45%", backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingVertical: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.outlineVariant + "30" },
  optionBtnActive:  { backgroundColor: colors.tertiaryContainer, borderColor: colors.primary + "40" },
  optionText:       { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 },
  optionTextActive: { color: colors.onTertiaryContainer },
  safetyCard:   { backgroundColor: colors.secondaryContainer + "40", marginHorizontal: spacing.md, padding: spacing.lg, borderRadius: 16, gap: spacing.sm },
  safetyHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  safetyTitle:  { fontSize: 16, fontWeight: "700", color: colors.onSecondaryContainer },
  safetyText:   { fontSize: 13, lineHeight: 20, color: colors.onSecondaryContainer + "CC" },
  bottomBar:  { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.surface + "F5", padding: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "40" },
  submitBtn:  { borderRadius: 28 },
});
