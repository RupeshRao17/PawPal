import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Image, RefreshControl,
  ScrollView, StyleSheet, TouchableOpacity, View,
} from "react-native";
import { Chip, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Listing = {
  id: string;
  city: string;
  description: string | null;
  shelter_id: string;
  pets: {
    name: string;
    species: string;
    breed: string | null;
    gender: string | null;
    dob: string | null;
    photo_url: string | null;
    notes: string | null;
  } | null;
  profiles: { full_name: string } | null;
};

const CATEGORIES = ["All", "Dogs", "Cats", "Rabbits", "Birds", "Others"];
const FALLBACK = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800";

function ageFromDob(dob: string | null): string {
  if (!dob) return "Unknown age";
  const diff = Date.now() - new Date(dob).getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
  if (years === 0) return "< 1 year";
  return `${years} yr${years > 1 ? "s" : ""}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState("All");

  const fetchListings = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("adoption_listings")
      .select("id, city, description, shelter_id, pets(name,species,breed,gender,dob,photo_url,notes), profiles(full_name)")
      .eq("status", "available")
      .order("listed_at", { ascending: false });
    setListings((data as unknown as Listing[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const filtered = listings.filter((l) => {
    if (category === "All") return true;
    const s = l.pets?.species?.toLowerCase() ?? "";
    if (category === "Dogs")    return s === "dog";
    if (category === "Cats")    return s === "cat";
    if (category === "Rabbits") return s === "rabbit";
    if (category === "Birds")   return s === "bird";
    if (category === "Others")  return !["dog","cat","rabbit","bird"].includes(s);
    return true;
  });

  const featured = filtered[0] ?? null;
  const rest = filtered.slice(1);

  function goToDetail(item: Listing) {
    router.push({
      pathname: "/(tabs)/pet-detail",
      params: {
        name:        item.pets?.name ?? "Sweet Pet",
        breed:       item.pets?.breed ?? item.pets?.species ?? "Unknown",
        age:         ageFromDob(item.pets?.dob ?? null),
        gender:      item.pets?.gender ?? "",
        location:    item.city,
        image:       item.pets?.photo_url ?? FALLBACK,
        description: item.description ?? item.pets?.notes ?? "",
        listingId:   item.id,
        shelterId:   item.shelter_id,
        shelterName: item.profiles?.full_name ?? "Shelter",
      },
    });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="titleLarge" style={styles.headerTitle}>Discover</Text>
          <Text variant="bodySmall" style={styles.headerSub}>Find your forever companion</Text>
        </View>
        <TouchableOpacity
          style={styles.chatIconBtn}
          onPress={() => router.push("/(tabs)/chats")}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubbles-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchListings(); }} colors={[colors.primary]} />}
      >
        {/* Search bar */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.searchText}>Search breeds, species, city…</Text>
        </TouchableOpacity>

        {/* List-a-Pet banner */}
        <TouchableOpacity style={styles.listBanner} activeOpacity={0.85} onPress={() => router.push("/(tabs)/list-pet")}>
          <View style={styles.listBannerLeft}>
            <View style={styles.listBannerIcon}>
              <Ionicons name="heart" size={20} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.listBannerTitle}>Have a pet to rehome?</Text>
              <Text style={styles.listBannerSub}>List them for adoption — free & easy</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catBtn, category === c && styles.catBtnActive]}
              onPress={() => setCategory(c)}
              activeOpacity={0.8}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding pets near you…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="paw-outline" size={64} color={colors.outlineVariant} />
            <Text variant="titleMedium" style={styles.emptyTitle}>No pets available</Text>
            <Text style={styles.emptyText}>
              {category === "All"
                ? "No adoption listings yet. Be the first to list a pet!"
                : `No ${category.toLowerCase()} available right now.`}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/(tabs)/list-pet")}>
              <Text style={styles.emptyBtnText}>+ List a Pet for Adoption</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Featured card (first listing) */}
            {featured && (
              <View style={styles.featuredSection}>
                <Text style={styles.sectionLabel}>FEATURED</Text>
                <TouchableOpacity style={styles.featuredCard} activeOpacity={0.93} onPress={() => goToDetail(featured)}>
                  <Image source={{ uri: featured.pets?.photo_url ?? FALLBACK }} style={styles.featuredImage} />
                  <View style={styles.featuredOverlay} />
                  {/* Info overlay at bottom */}
                  <View style={styles.featuredInfo}>
                    <View style={styles.featuredBadgeRow}>
                      <View style={styles.availableBadge}>
                        <Text style={styles.availableText}>Available</Text>
                      </View>
                      {featured.pets?.gender && (
                        <View style={styles.genderBadge}>
                          <Text style={styles.genderText}>{featured.pets.gender}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.featuredName}>{featured.pets?.name ?? "Sweet Pet"}</Text>
                    <Text style={styles.featuredBreed}>
                      {featured.pets?.breed ?? featured.pets?.species} • {ageFromDob(featured.pets?.dob ?? null)} • {featured.city}
                    </Text>
                    <TouchableOpacity style={styles.meetBtn} onPress={() => goToDetail(featured)} activeOpacity={0.8}>
                      <Text style={styles.meetBtnText}>Meet {featured.pets?.name ?? "them"} →</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Heart */}
                  <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7}>
                    <Ionicons name="heart-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            )}

            {/* Rest of listings */}
            {rest.length > 0 && (
              <View style={styles.gridSection}>
                <Text style={styles.sectionLabel}>MORE NEAR YOU</Text>
                {rest.map((item) => (
                  <TouchableOpacity key={item.id} style={styles.listCard} activeOpacity={0.92} onPress={() => goToDetail(item)}>
                    <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={styles.listCardImage} />
                    <View style={styles.listCardInfo}>
                      <View style={styles.listCardTop}>
                        <Text variant="titleMedium" style={styles.listCardName} numberOfLines={1}>
                          {item.pets?.name ?? "Sweet Pet"}
                        </Text>
                        {item.pets?.gender && (
                          <Chip compact style={styles.genderChip} textStyle={styles.genderChipText}>
                            {item.pets.gender}
                          </Chip>
                        )}
                      </View>
                      <View style={styles.breedIconRow}>
                        <Ionicons name="paw-outline" size={12} color={colors.onSurfaceVariant} />
                        <Text style={styles.listCardBreed} numberOfLines={1}>
                          {item.pets?.breed ?? item.pets?.species} • {ageFromDob(item.pets?.dob ?? null)}
                        </Text>
                      </View>
                      <View style={styles.listCardLocation}>
                        <Ionicons name="location-outline" size={13} color={colors.onSurfaceVariant} />
                        <Text style={styles.listCardCity}>{item.city}</Text>
                      </View>
                      <TouchableOpacity style={styles.adoptPill} activeOpacity={0.8} onPress={() => goToDetail(item)}>
                        <Text style={styles.adoptPillText}>Meet {item.pets?.name ?? "them"} →</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.md },
  headerTitle:     { fontWeight: "800", color: colors.onSurface },
  headerSub:       { color: colors.onSurfaceVariant },
  chatIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  searchBar:       { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surfaceContainerHighest, borderRadius: 16, padding: spacing.md },
  searchText:      { color: colors.onSurfaceVariant + "99", flex: 1 },
  listBanner:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.primaryContainer, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + "30" },
  listBannerLeft:  { flexDirection: "row", alignItems: "center", gap: spacing.md },
  listBannerIcon:  { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  listBannerTitle: { fontWeight: "700", fontSize: 14, color: colors.onSurface },
  listBannerSub:   { fontSize: 12, color: colors.onSurfaceVariant },
  catScroll:       { marginBottom: spacing.md },
  catRow:          { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: "center" },
  catBtn:          { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh },
  catBtnActive:    { backgroundColor: colors.primary },
  catText:         { fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant },
  catTextActive:   { color: colors.onPrimary },
  centered:        { alignItems: "center", paddingVertical: 60, gap: spacing.md },
  loadingText:     { color: colors.onSurfaceVariant },
  empty:           { alignItems: "center", paddingVertical: 60, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyTitle:      { fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  emptyText:       { color: colors.onSurfaceVariant, textAlign: "center", lineHeight: 22 },
  emptyBtn:        { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary },
  emptyBtnText:    { color: colors.primary, fontWeight: "700" },
  content:         { gap: spacing.lg },
  sectionLabel:    { fontSize: 10, fontWeight: "800", color: colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: spacing.sm, paddingHorizontal: spacing.md },
  featuredSection: {},
  featuredCard:    { marginHorizontal: spacing.md, borderRadius: 20, overflow: "hidden", height: 380, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  featuredImage:   { width: "100%", height: "100%", position: "absolute" },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  featuredInfo:    { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, gap: 6 },
  featuredBadgeRow:{ flexDirection: "row", gap: spacing.sm },
  availableBadge:  { backgroundColor: colors.success + "DD", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  availableText:   { fontSize: 11, fontWeight: "700", color: "#fff" },
  genderBadge:     { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  genderText:      { fontSize: 11, fontWeight: "600", color: "#fff" },
  featuredName:    { fontSize: 32, fontWeight: "800", color: "#fff" },
  featuredBreed:   { fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: "500" },
  meetBtn:         { alignSelf: "flex-start", backgroundColor: "#fff", paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  meetBtnText:     { color: colors.primary, fontWeight: "700", fontSize: 13 },
  heartBtn:        { position: "absolute", top: spacing.md, right: spacing.md, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  gridSection:     { gap: spacing.sm, paddingHorizontal: spacing.md },
  listCard:        { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  listCardImage:   { width: 110, height: 120 },
  listCardInfo:    { flex: 1, padding: spacing.md, justifyContent: "space-between" },
  listCardTop:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  listCardName:    { fontWeight: "700", color: colors.onSurface, flex: 1 },
  genderChip:      { backgroundColor: colors.secondaryContainer, height: 22 },
  genderChipText:  { fontSize: 10, color: colors.onSecondaryContainer },
  listCardBreed:   { color: colors.onSurfaceVariant, fontSize: 12 },
  breedIconRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  listCardLocation:{ flexDirection: "row", alignItems: "center", gap: 3 },
  listCardCity:    { fontSize: 12, color: colors.onSurfaceVariant },
  adoptPill:       { alignSelf: "flex-start", backgroundColor: colors.primaryContainer, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 10 },
  adoptPillText:   { color: colors.primary, fontWeight: "700", fontSize: 12 },
});
