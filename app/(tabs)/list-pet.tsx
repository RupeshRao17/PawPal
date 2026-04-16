import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity } from "react-native";
import { Text, Button, TextInput } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const SPECIES_OPTIONS = [
  { key: "dog", label: "Dog", icon: "paw" },
  { key: "cat", label: "Cat", icon: "paw" },
  { key: "bird", label: "Bird", icon: "egg" },
  { key: "rabbit", label: "Rabbit", icon: "paw" },
  { key: "other", label: "Other", icon: "ellipsis-horizontal" },
];

const AGE_OPTIONS = ["Puppy / Kitten", "Young (1–3 yrs)", "Adult (3–7 yrs)", "Senior (7+ yrs)"];

export default function ListPetScreen() {
  const session = useAuthStore((s) => s.session);
  const [petName, setPetName] = useState("");
  const [breed, setBreed] = useState("");
  const [city, setCity] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState("dog");
  const [selectedAge, setSelectedAge] = useState("Young (1–3 yrs)");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!petName.trim() || !breed.trim() || !city.trim()) {
      Alert.alert("Required", "Please fill in pet name, breed, and city.");
      return;
    }
    if (!session?.user) { Alert.alert("Sign in required", "Please sign in to list a pet."); return; }
    if (!supabase) { Alert.alert("Offline", OFFLINE_HINT); return; }

    setLoading(true);
    try {
      // 1. Create the pet record
      const { data: petData, error: petError } = await supabase.from("pets").insert({
        name: petName.trim(),
        species: selectedSpecies,
        breed: breed.trim(),
        owner_id: session.user.id,
      }).select().single();
      if (petError) throw petError;

      // 2. Create the adoption listing
      const { error: listingError } = await supabase.from("adoption_listings").insert({
        pet_id: petData.id,
        shelter_id: session.user.id,
        status: "available",
        description: description.trim() || null,
        city: city.trim(),
      });
      if (listingError) throw listingError;

      Alert.alert("Listed! 🎉", `${petName} has been listed for adoption. Prospective owners can now apply.`);
      setPetName(""); setBreed(""); setCity(""); setDescription(""); setSelectedSpecies("dog");
    } catch (err: any) {
      Alert.alert("Failed", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>List a Pet ❤️</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Find them a new{" "}<Text style={styles.heroItalic}>beginning.</Text></Text>
          <Text style={styles.heroSubtitle}>List your pet for adoption and help them find a loving forever home.</Text>
        </View>

        {/* Photo placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Photos</Text>
          <TouchableOpacity style={styles.mainPhoto} activeOpacity={0.7} onPress={() => Alert.alert("Photo Upload", "Photo upload requires Expo Image Picker — add EXPO_PUBLIC_SUPABASE_URL to enable storage.")}>
            <Ionicons name="camera" size={36} color={colors.primary} />
            <Text style={styles.photoTitle}>Add Pet Photos</Text>
            <Text style={styles.photoSubtitle}>Tap to upload (requires Supabase Storage)</Text>
          </TouchableOpacity>
        </View>

        {/* Core details */}
        <View style={styles.section}>
          <TextInput label="Pet's Name *" mode="outlined" value={petName} onChangeText={setPetName} style={styles.input} left={<TextInput.Icon icon="paw" />} placeholder="e.g. Luna" />
          <TextInput label="Breed *" mode="outlined" value={breed} onChangeText={setBreed} style={styles.input} left={<TextInput.Icon icon="information" />} placeholder="e.g. Golden Retriever Mix" />
          <TextInput label="City / Location *" mode="outlined" value={city} onChangeText={setCity} style={styles.input} left={<TextInput.Icon icon="map-marker" />} placeholder="e.g. Mumbai" />
        </View>

        {/* Species */}
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
                <Ionicons name={s.icon as any} size={20} color={selectedSpecies === s.key ? colors.onTertiaryContainer : colors.onSurfaceVariant} />
                <Text style={[styles.optionText, selectedSpecies === s.key && styles.optionTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
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

        {/* Description */}
        <View style={styles.section}>
          <TextInput
            label="About this pet"
            mode="outlined"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={[styles.input, { height: 100 }]}
            placeholder="Describe the pet's personality, health, and what kind of home they need..."
          />
        </View>

        {/* Safety card */}
        <View style={styles.safetyCard}>
          <View style={styles.safetyHeader}>
            <Ionicons name="shield-checkmark" size={22} color={colors.onSecondaryContainer} />
            <Text style={styles.safetyTitle}>Our Safety Promise</Text>
          </View>
          <Text style={styles.safetyText}>Every listing is reviewed by our team to ensure a safe transition for every companion.</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button mode="contained" onPress={handleSubmit} loading={loading} disabled={loading} icon="check-circle" contentStyle={{ paddingVertical: 8 }} style={styles.submitBtn} labelStyle={{ fontSize: 16, fontWeight: "700" }}>
          List My Pet
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.sm },
  title: { fontWeight: "800", color: colors.onSurface },
  scrollContent: { paddingBottom: spacing.xl },
  heroSection: { paddingHorizontal: spacing.md, paddingVertical: spacing.lg },
  heroTitle: { fontSize: 30, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm, letterSpacing: -0.5 },
  heroItalic: { fontStyle: "italic", color: colors.primary },
  heroSubtitle: { fontSize: 15, color: colors.onSurfaceVariant, lineHeight: 22 },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surface },
  mainPhoto: { backgroundColor: colors.surfaceContainerHighest, borderRadius: 16, borderWidth: 2, borderStyle: "dashed", borderColor: colors.outlineVariant, paddingVertical: spacing.xl, alignItems: "center", gap: spacing.sm },
  photoTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  photoSubtitle: { fontSize: 12, color: colors.onSurfaceVariant },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  optionBtn: { flex: 1, minWidth: "28%", backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingVertical: spacing.md, alignItems: "center", gap: 4, borderWidth: 1, borderColor: colors.outlineVariant + "30" },
  ageBtn: { flexBasis: "45%", backgroundColor: colors.surfaceContainerLowest, borderRadius: 12, paddingVertical: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.outlineVariant + "30" },
  optionBtnActive: { backgroundColor: colors.tertiaryContainer, borderColor: colors.primary + "40" },
  optionText: { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 0.5 },
  optionTextActive: { color: colors.onTertiaryContainer },
  safetyCard: { backgroundColor: colors.secondaryContainer + "40", marginHorizontal: spacing.md, padding: spacing.lg, borderRadius: 16, gap: spacing.sm },
  safetyHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  safetyTitle: { fontSize: 16, fontWeight: "700", color: colors.onSecondaryContainer },
  safetyText: { fontSize: 13, lineHeight: 20, color: colors.onSecondaryContainer + "CC" },
  bottomBar: { position: "absolute", bottom: 80, left: 0, right: 0, backgroundColor: colors.surface + "F5", padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "40" },
  submitBtn: { borderRadius: 28 },
});
