import { useEffect, useState } from "react";
import {
  ScrollView, StyleSheet, View, TouchableOpacity,
  Image, Dimensions, ActivityIndicator,
} from "react-native";
import { Text, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const { width } = Dimensions.get("window");

type AdoptionListing = {
  id: string;
  city: string;
  status: string;
  description: string | null;
  pets: {
    name: string;
    species: string;
    breed: string | null;
    gender: string | null;
    photo_url: string | null;
  } | null;
};

// ─── Static featured pets (existing UI unchanged) ─────────────────────────────
const FEATURED_PETS = [
  {
    id: "1",
    name: "Cooper",
    breed: "Golden Retriever",
    age: "2 Years",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?w=800",
    tag: "New Arrival",
    description: "Cooper is a gentle soul who loves sunny afternoon walks and gentle head scratches.",
    featured: true,
  },
  {
    id: "2",
    name: "Luna",
    breed: "Bombay Cat",
    age: "4 Years",
    image: "https://images.unsplash.com/photo-1513245543132-31f507417b26?w=800",
    tag: "Calm",
    description: null,
    featured: false,
  },
  {
    id: "3",
    name: "Max",
    breed: "Corgi",
    age: "1 Year",
    image: "https://images.unsplash.com/photo-1612531386530-97ee5c8e3587?w=800",
    tag: "Energetic",
    description: null,
    featured: false,
  },
];

const CATEGORIES = [
  { name: "Dogs",    icon: "paw" },
  { name: "Cats",    icon: "paw" },
  { name: "Rabbits", icon: "paw" },
  { name: "Others",  icon: "grid" },
];

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800";

export default function HomeScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [selectedCategory, setSelectedCategory] = useState("Dogs");
  const [listings, setListings] = useState<AdoptionListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  // Fetch adoption listings
  useEffect(() => {
    if (!supabase) { setLoadingListings(false); return; }
    supabase
      .from("adoption_listings")
      .select("id, city, status, description, pets(name, species, breed, gender, photo_url)")
      .eq("status", "available")
      .order("listed_at", { ascending: false })
      .then(({ data }) => {
        setListings((data as unknown as AdoptionListing[]) ?? []);
        setLoadingListings(false);
      });
  }, []);

  // Filter listings by selected category
  const filteredListings = listings.filter((l) => {
    const species = l.pets?.species?.toLowerCase() ?? "";
    if (selectedCategory === "Dogs")    return species === "dog";
    if (selectedCategory === "Cats")    return species === "cat";
    if (selectedCategory === "Rabbits") return species === "rabbit";
    if (selectedCategory === "Others")  return !["dog", "cat", "rabbit"].includes(species);
    return true;
  });

  return (
    <View style={styles.container}>
      {/* ── Top App Bar (unchanged) ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push("/(tabs)/pets")}>
            <Ionicons name="menu" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text variant="titleLarge" style={styles.headerTitle}>Nurtured Hearth</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
          <Image
            source={{ uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200" }}
            style={styles.avatar}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ── Hero Section (unchanged) ── */}
        <View style={styles.heroSection}>
          <Text variant="displaySmall" style={styles.heroTitle}>
            Find your kindred spirit
          </Text>
          <Text variant="bodyLarge" style={styles.heroSubtitle}>
            Every companion has a story waiting for you.
          </Text>
          <TouchableOpacity style={styles.searchContainer} activeOpacity={0.7}>
            <Ionicons name="search" size={24} color={colors.onSurfaceVariant} style={styles.searchIcon} />
            <Text variant="bodyLarge" style={styles.searchPlaceholder}>
              Search breeds, age, or traits...
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Category Filter (unchanged) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          <View style={styles.categoriesContainer}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.name}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.name && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category.name)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={selectedCategory === category.name ? colors.onPrimary : colors.onSurfaceVariant}
                />
                <Text
                  variant="labelLarge"
                  style={[
                    styles.categoryText,
                    selectedCategory === category.name && styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* ── Featured Pet Cards (unchanged) ── */}
        <View style={styles.petGrid}>
          {FEATURED_PETS.map((pet) =>
            pet.featured ? (
              <TouchableOpacity key={pet.id} style={styles.featuredCard} activeOpacity={0.95}>
                <View style={styles.featuredImageContainer}>
                  <Image source={{ uri: pet.image }} style={styles.featuredImage} />
                  <TouchableOpacity style={styles.heartButton} activeOpacity={0.7}>
                    <Ionicons name="heart" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
                <View style={styles.featuredContent}>
                  <View style={styles.tagContainer}>
                    <View style={[styles.tag, { backgroundColor: colors.tertiaryContainer }]}>
                      <Text variant="labelSmall" style={[styles.tagText, { color: colors.onTertiaryContainer }]}>
                        {pet.tag}
                      </Text>
                    </View>
                  </View>
                  <Text variant="headlineLarge" style={styles.featuredName}>{pet.name}</Text>
                  <Text variant="bodyLarge" style={styles.featuredBreed}>{pet.breed} • {pet.age}</Text>
                  <Text variant="bodyMedium" style={styles.featuredDescription} numberOfLines={2}>
                    {pet.description}
                  </Text>
                  <TouchableOpacity
                    style={styles.meetButton}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/pet-detail",
                        params: { name: pet.name, breed: pet.breed, age: pet.age, location: "Maplewood Sanctuary", image: pet.image },
                      })
                    }
                  >
                    <Text variant="labelLarge" style={styles.meetButtonText}>Meet {pet.name}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                key={pet.id}
                style={styles.petCard}
                activeOpacity={0.95}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/pet-detail",
                    params: { name: pet.name, breed: pet.breed, age: pet.age, location: "Maplewood Sanctuary", image: pet.image },
                  })
                }
              >
                <View style={styles.petImageContainer}>
                  <Image source={{ uri: pet.image }} style={styles.petImage} />
                  <TouchableOpacity style={styles.heartButtonSmall} activeOpacity={0.7}>
                    <Ionicons name="heart-outline" size={20} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>
                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <View>
                      <Text variant="titleMedium" style={styles.petName}>{pet.name}</Text>
                      <Text variant="bodySmall" style={styles.petBreed}>{pet.breed} • {pet.age}</Text>
                    </View>
                    <View style={[styles.petTag, { backgroundColor: colors.secondaryContainer }]}>
                      <Text variant="labelSmall" style={[styles.petTagText, { color: colors.onSecondaryContainer }]}>
                        {pet.tag}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )
          )}
        </View>

        {/* ── Adoption Section ────────────────────────────────────────────── */}
        <View style={styles.adoptionSection}>
          {/* Section header with "List a Pet" button */}
          <View style={styles.adoptionHeader}>
            <View>
              <Text variant="titleLarge" style={styles.adoptionTitle}>🐾 Pets Looking for a Home</Text>
              <Text variant="bodySmall" style={styles.adoptionSubtitle}>
                {filteredListings.length} available near you
              </Text>
            </View>
            <TouchableOpacity
              style={styles.listPetButton}
              activeOpacity={0.8}
              onPress={() => router.push("/(tabs)/list-pet")}
            >
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={styles.listPetText}>List a Pet</Text>
            </TouchableOpacity>
          </View>

          {/* Loading state */}
          {loadingListings ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.xl }} />
          ) : filteredListings.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyAdoption}>
              <Ionicons name="paw-outline" size={48} color={colors.outlineVariant} />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No {selectedCategory.toLowerCase()} available right now
              </Text>
              <TouchableOpacity
                style={styles.listPetOutlineButton}
                onPress={() => router.push("/(tabs)/list-pet")}
              >
                <Text style={styles.listPetOutlineText}>+ List a pet for adoption</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Listing cards — same visual style as pet cards */
            filteredListings.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.adoptionCard}
                activeOpacity={0.95}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/pet-detail",
                    params: {
                      name: item.pets?.name ?? "Sweet Pet",
                      breed: item.pets?.breed ?? item.pets?.species ?? "Unknown",
                      location: item.city,
                      image: item.pets?.photo_url ?? FALLBACK_IMAGE,
                    },
                  })
                }
              >
                {/* Photo */}
                <View style={styles.adoptionImageWrap}>
                  <Image
                    source={{ uri: item.pets?.photo_url ?? FALLBACK_IMAGE }}
                    style={styles.adoptionImage}
                  />
                  <View style={styles.adoptionBadge}>
                    <Ionicons name="heart" size={12} color={colors.error} />
                    <Text style={styles.adoptionBadgeText}>Adopt</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.adoptionInfo}>
                  <View style={styles.adoptionRow}>
                    <Text variant="titleMedium" style={styles.adoptionName}>
                      {item.pets?.name ?? "Sweet Pet"}
                    </Text>
                    <Chip
                      compact
                      style={styles.genderChip}
                      textStyle={styles.genderChipText}
                    >
                      {item.pets?.gender ?? "—"}
                    </Chip>
                  </View>
                  <Text variant="bodySmall" style={styles.adoptionBreed}>
                    {item.pets?.breed ?? item.pets?.species} • {item.city}
                  </Text>
                  {item.description ? (
                    <Text variant="bodySmall" style={styles.adoptionDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.adoptBtn}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/pet-detail",
                        params: {
                          name: item.pets?.name ?? "Sweet Pet",
                          breed: item.pets?.breed ?? item.pets?.species ?? "Unknown",
                          location: item.city,
                          image: item.pets?.photo_url ?? FALLBACK_IMAGE,
                        },
                      })
                    }
                  >
                    <Text style={styles.adoptBtnText}>Meet {item.pets?.name ?? "them"} →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── (All existing styles unchanged) ──────────────────────────────────────
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.md, paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.md, backgroundColor: colors.surface + "CC",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconButton: { padding: spacing.xs },
  headerTitle: { fontWeight: "800", color: colors.onSurface },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.primary + "33" },
  scrollView: { flex: 1 },
  heroSection: { paddingHorizontal: spacing.md, marginBottom: spacing.xl },
  heroTitle: { fontWeight: "800", color: colors.onSurface, marginBottom: spacing.xs, fontSize: 32 },
  heroSubtitle: { color: colors.onSurfaceVariant, fontWeight: "500", marginBottom: spacing.lg },
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 16, padding: spacing.md, gap: spacing.sm,
  },
  searchIcon: { marginRight: spacing.xs },
  searchPlaceholder: { color: colors.onSurfaceVariant + "99", flex: 1 },
  categoriesScroll: { marginBottom: spacing.xl },
  categoriesContainer: { flexDirection: "row", paddingHorizontal: spacing.md, gap: spacing.sm },
  categoryButton: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md * 1.5, paddingVertical: spacing.sm * 1.5, borderRadius: 24,
  },
  categoryButtonActive: { backgroundColor: colors.primary },
  categoryText: { fontWeight: "500", color: colors.onSurfaceVariant },
  categoryTextActive: { color: colors.onPrimary, fontWeight: "600" },
  petGrid: { paddingHorizontal: spacing.md, gap: spacing.lg },
  featuredCard: {
    backgroundColor: colors.surfaceContainerLowest, borderRadius: 16, overflow: "hidden",
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  featuredImageContainer: { width: "100%", aspectRatio: 4 / 3, position: "relative" },
  featuredImage: { width: "100%", height: "100%" },
  heartButton: {
    position: "absolute", top: spacing.md, right: spacing.md, width: 40, height: 40,
    borderRadius: 20, backgroundColor: colors.surface + "E6", alignItems: "center", justifyContent: "center",
  },
  featuredContent: { padding: spacing.lg },
  tagContainer: { marginBottom: spacing.sm },
  tag: { alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 12 },
  tagText: { fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  featuredName: { fontWeight: "700", color: colors.onSurface, marginBottom: spacing.xs, fontSize: 28 },
  featuredBreed: { color: colors.onSurfaceVariant, fontWeight: "500", marginBottom: spacing.md },
  featuredDescription: { color: colors.onSurfaceVariant, marginBottom: spacing.lg, lineHeight: 22 },
  meetButton: {
    backgroundColor: colors.secondary, paddingHorizontal: spacing.xl * 2,
    paddingVertical: spacing.md, borderRadius: 24, alignSelf: "flex-start",
  },
  meetButtonText: { color: colors.onSecondary, fontWeight: "700" },
  petCard: {
    backgroundColor: colors.surfaceContainerLow, borderRadius: 12, overflow: "hidden", padding: spacing.md,
  },
  petImageContainer: {
    width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden",
    marginBottom: spacing.md, position: "relative",
  },
  petImage: { width: "100%", height: "100%" },
  heartButtonSmall: {
    position: "absolute", top: spacing.sm, right: spacing.sm, width: 36, height: 36,
    borderRadius: 18, backgroundColor: colors.surface + "E6", alignItems: "center", justifyContent: "center",
  },
  petInfo: { flex: 1 },
  petHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  petName: { fontWeight: "700", color: colors.onSurface, marginBottom: spacing.xs },
  petBreed: { color: colors.onSurfaceVariant, fontWeight: "500" },
  petTag: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 12 },
  petTagText: { fontWeight: "700" },

  // ── Adoption section ─────────────────────────────────────────────────────
  adoptionSection: {
    marginTop: spacing.xl * 1.5,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  adoptionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: spacing.xs,
  },
  adoptionTitle: { fontWeight: "800", color: colors.onSurface },
  adoptionSubtitle: { color: colors.onSurfaceVariant, marginTop: 2 },
  listPetButton: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  listPetText: { color: colors.onPrimary, fontWeight: "700", fontSize: 13 },
  emptyAdoption: { alignItems: "center", paddingVertical: spacing.xl * 2, gap: spacing.md },
  emptyText: { color: colors.onSurfaceVariant, textAlign: "center" },
  listPetOutlineButton: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary,
  },
  listPetOutlineText: { color: colors.primary, fontWeight: "700", fontSize: 13 },

  // Adoption cards — horizontal layout
  adoptionCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 16, overflow: "hidden",
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,
  },
  adoptionImageWrap: { width: 120, height: 130, position: "relative" },
  adoptionImage: { width: "100%", height: "100%" },
  adoptionBadge: {
    position: "absolute", bottom: spacing.sm, left: spacing.sm,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.surface + "EE",
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 10,
  },
  adoptionBadgeText: { fontSize: 10, fontWeight: "700", color: colors.error },
  adoptionInfo: { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  adoptionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  adoptionName: { fontWeight: "700", color: colors.onSurface, flex: 1 },
  genderChip: { backgroundColor: colors.secondaryContainer, height: 24 },
  genderChipText: { fontSize: 10, color: colors.onSecondaryContainer },
  adoptionBreed: { color: colors.onSurfaceVariant, marginTop: 2 },
  adoptionDesc: { color: colors.onSurfaceVariant, lineHeight: 18, marginTop: 4 },
  adoptBtn: {
    alignSelf: "flex-start", marginTop: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 5,
    backgroundColor: colors.primaryContainer, borderRadius: 12,
  },
  adoptBtnText: { color: colors.primary, fontWeight: "700", fontSize: 12 },

  bottomPadding: { height: 120 },
});
