import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Dimensions, FlatList, Image,
  RefreshControl, ScrollView, StyleSheet,
  TouchableOpacity, View,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const { width: SW } = Dimensions.get("window");
const SLIDE_W = SW - 40;          // card width inside carousel
const SLIDE_GAP = 12;
const FALLBACK = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800";

type Listing = {
  id: string; city: string; description: string | null; shelter_id: string;
  pets: {
    id: string; name: string; species: string;
    breed: string | null; gender: string | null;
    dob: string | null; photo_url: string | null; notes: string | null;
  } | null;
  profiles: { full_name: string } | null;
};

const CATEGORIES = ["All","Dogs","Cats","Rabbits","Birds","Others"];

// ── Precise age from DOB ──────────────────────────────────────────────────────
function ageFromDob(dob: string | null): string {
  if (!dob) return "";
  const now   = new Date();
  const birth = new Date(dob);
  const totalMonths =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth()    - birth.getMonth());
  if (totalMonths <  1) return "Newborn";
  if (totalMonths < 12) return `${totalMonths} month${totalMonths > 1 ? "s" : ""} old`;
  const yrs = Math.floor(totalMonths / 12);
  const rem  = totalMonths % 12;
  if (rem === 0) return `${yrs} year${yrs > 1 ? "s" : ""} old`;
  return `${yrs}y ${rem}m old`;
}

export default function DiscoverScreen() {
  const router  = useRouter();
  const [listings,   setListings]   = useState<Listing[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category,   setCategory]   = useState("All");
  const [slideIdx,   setSlideIdx]   = useState(0);

  const fetchListings = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("adoption_listings")
      .select("id,city,description,shelter_id,pets(id,name,species,breed,gender,dob,photo_url,notes),profiles(full_name)")
      .eq("status", "available")
      .order("listed_at", { ascending: false });
    setListings((data as unknown as Listing[]) ?? []);
    setLoading(false); setRefreshing(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const filtered = listings.filter((l) => {
    if (category === "All") return true;
    const s = l.pets?.species?.toLowerCase() ?? "";
    if (category === "Dogs")    return s === "dog";
    if (category === "Cats")    return s === "cat";
    if (category === "Rabbits") return s === "rabbit";
    if (category === "Birds")   return s === "bird";
    return !["dog","cat","rabbit","bird"].includes(s);
  });

  const carousel = filtered.slice(0, 8);
  const grid     = filtered.slice(8);

  function goToDetail(item: Listing) {
    router.push({
      pathname: "/(tabs)/pet-detail",
      params: {
        name:        item.pets?.name        ?? "Sweet Pet",
        breed:       item.pets?.breed       ?? item.pets?.species ?? "Unknown",
        age:         ageFromDob(item.pets?.dob ?? null),
        gender:      item.pets?.gender      ?? "",
        location:    item.city,
        image:       item.pets?.photo_url   ?? FALLBACK,
        description: item.description       ?? item.pets?.notes ?? "",
        petId:       item.pets?.id          ?? "",
        listingId:   item.id,
        shelterId:   item.shelter_id,
        shelterName: item.profiles?.full_name ?? "Shelter",
      },
    });
  }

  // ── Gender pill (replaces broken Chip) ────────────────────────────────────
  function GenderTag({ gender }: { gender: string }) {
    const male = gender.toLowerCase() === "male";
    return (
      <View style={[styles.genderTag, { backgroundColor: male ? "#DBEAFE" : "#FCE7F3" }]}>
        <Text style={[styles.genderTagText, { color: male ? "#1D4ED8" : "#BE185D" }]}>
          {male ? "♂ Male" : "♀ Female"}
        </Text>
      </View>
    );
  }

  // ── Carousel slide ────────────────────────────────────────────────────────
  function Slide({ item }: { item: Listing }) {
    const age    = ageFromDob(item.pets?.dob ?? null);
    const gender = item.pets?.gender ?? "";
    return (
      <TouchableOpacity
        style={[styles.slide, { width: SLIDE_W }]}
        activeOpacity={0.94}
        onPress={() => goToDetail(item)}
      >
        <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={styles.slideImg} />
        {/* dark gradient */}
        <View style={styles.slideGrad} />

        {/* Top row */}
        <View style={styles.slideTop}>
          <View style={styles.availBadge}>
            <Text style={styles.availText}>Available</Text>
          </View>
          <TouchableOpacity style={styles.heartCircle} activeOpacity={0.7}>
            <Ionicons name="heart-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Bottom info */}
        <View style={styles.slideBottom}>
          {/* pills row */}
          <View style={styles.slidePills}>
            {gender ? (
              <View style={[styles.slidePill,
                { backgroundColor: gender === "male" ? "rgba(219,234,254,0.9)" : "rgba(252,231,243,0.9)" }]}>
                <Text style={[styles.slidePillText,
                  { color: gender === "male" ? "#1D4ED8" : "#BE185D" }]}>
                  {gender === "male" ? "♂ Male" : "♀ Female"}
                </Text>
              </View>
            ) : null}
            {age ? (
              <View style={styles.slidePill}>
                <Ionicons name="calendar-outline" size={11} color={colors.primary} />
                <Text style={[styles.slidePillText, { color: colors.primary }]}>{age}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.slideName} numberOfLines={1}>{item.pets?.name ?? "Sweet Pet"}</Text>

          <View style={styles.slideMetaRow}>
            <Ionicons name="paw-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.slideMeta} numberOfLines={1}>
              {item.pets?.breed ?? item.pets?.species}
            </Text>
            <Text style={styles.slideDot}>·</Text>
            <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.slideMeta}>{item.city}</Text>
          </View>

          <TouchableOpacity style={styles.meetBtn} onPress={() => goToDetail(item)} activeOpacity={0.85}>
            <Text style={styles.meetBtnText}>Meet {item.pets?.name ?? "them"} →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Grid card (below carousel) ────────────────────────────────────────────
  function GridCard({ item }: { item: Listing }) {
    const age    = ageFromDob(item.pets?.dob ?? null);
    const gender = item.pets?.gender ?? "";
    return (
      <TouchableOpacity style={styles.gridCard} activeOpacity={0.92} onPress={() => goToDetail(item)}>
        <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={styles.gridImg} />
        <View style={styles.gridInfo}>
          <View style={styles.gridTopRow}>
            <Text style={styles.gridName} numberOfLines={1}>{item.pets?.name ?? "Sweet Pet"}</Text>
            {gender ? <GenderTag gender={gender} /> : null}
          </View>
          <View style={styles.gridBreedRow}>
            <Ionicons name="paw-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.gridBreed} numberOfLines={1}>
              {item.pets?.breed ?? item.pets?.species}{age ? ` · ${age}` : ""}
            </Text>
          </View>
          <View style={styles.gridLocRow}>
            <Ionicons name="location-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.gridCity}>{item.city}</Text>
          </View>
          <TouchableOpacity style={styles.adoptPill} onPress={() => goToDetail(item)} activeOpacity={0.8}>
            <Text style={styles.adoptPillText}>Meet {item.pets?.name ?? "them"} →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSub}>Find your forever companion</Text>
        </View>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push("/(tabs)/chats")} activeOpacity={0.7}>
          <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchListings(); }} colors={[colors.primary]} />}>

        {/* Search */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.7}>
          <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.searchText}>Search breeds, species, city…</Text>
        </TouchableOpacity>

        {/* List-a-Pet banner */}
        <TouchableOpacity style={styles.listBanner} activeOpacity={0.85} onPress={() => router.push("/(tabs)/list-pet")}>
          <View style={styles.listBannerLeft}>
            <View style={styles.listBannerIcon}>
              <Ionicons name="heart" size={18} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.listBannerTitle}>Have a pet to rehome?</Text>
              <Text style={styles.listBannerSub}>List them for adoption — free &amp; easy</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.catScroll} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c}
              style={[styles.catBtn, category === c && styles.catBtnActive]}
              onPress={() => setCategory(c)} activeOpacity={0.8}>
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Finding pets near you…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="paw-outline" size={64} color={colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No pets available</Text>
            <Text style={styles.emptyText}>
              {category === "All" ? "No listings yet — be the first to list a pet!"
                : `No ${category.toLowerCase()} available right now.`}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/(tabs)/list-pet")}>
              <Text style={styles.emptyBtnText}>+ List a Pet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>

            {/* ── Carousel ── */}
            {carousel.length > 0 && (
              <View>
                <Text style={styles.sectionLabel}>FEATURED PETS</Text>
                <FlatList
                  data={carousel}
                  keyExtractor={(i) => i.id}
                  horizontal
                  pagingEnabled={false}
                  snapToInterval={SLIDE_W + SLIDE_GAP}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselList}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / (SLIDE_W + SLIDE_GAP));
                    setSlideIdx(Math.min(idx, carousel.length - 1));
                  }}
                  renderItem={({ item }) => <Slide item={item} />}
                />
                {/* Dot indicators */}
                {carousel.length > 1 && (
                  <View style={styles.dotsRow}>
                    {carousel.map((_, i) => (
                      <View key={i} style={[styles.dot, i === slideIdx && styles.dotActive]} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Grid list below carousel ── */}
            {grid.length > 0 && (
              <View style={styles.gridSection}>
                <Text style={styles.sectionLabel}>MORE NEAR YOU</Text>
                {grid.map((item) => <GridCard key={item.id} item={item} />)}
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
  container:     { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.md },
  headerTitle:   { fontSize: 26, fontWeight: "800", color: colors.onSurface },
  headerSub:     { fontSize: 13, color: colors.onSurfaceVariant },
  chatBtn:       { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  searchBar:     { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surfaceContainerHighest, borderRadius: 16, padding: spacing.md },
  searchText:    { color: colors.onSurfaceVariant + "99", flex: 1 },
  listBanner:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.primaryContainer, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + "30" },
  listBannerLeft:{ flexDirection: "row", alignItems: "center", gap: spacing.md },
  listBannerIcon:{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  listBannerTitle: { fontWeight: "700", fontSize: 14, color: colors.onSurface },
  listBannerSub: { fontSize: 12, color: colors.onSurfaceVariant },
  catScroll:     { marginBottom: spacing.md },
  catRow:        { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: "center" },
  catBtn:        { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh },
  catBtnActive:  { backgroundColor: colors.primary },
  catText:       { fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant },
  catTextActive: { color: colors.onPrimary },
  centered:      { alignItems: "center", paddingVertical: 60, gap: spacing.md },
  loadingText:   { color: colors.onSurfaceVariant },
  empty:         { alignItems: "center", paddingVertical: 60, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyTitle:    { fontSize: 18, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  emptyText:     { fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", lineHeight: 22 },
  emptyBtn:      { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary },
  emptyBtnText:  { color: colors.primary, fontWeight: "700" },
  content:       { gap: spacing.xl },
  sectionLabel:  { fontSize: 10, fontWeight: "800", color: colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: spacing.sm, paddingHorizontal: spacing.md },

  // Carousel
  carouselList:  { paddingLeft: spacing.md, paddingRight: spacing.md, gap: SLIDE_GAP },
  slide:         { height: 380, borderRadius: 22, overflow: "hidden", elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 14 },
  slideImg:      { ...StyleSheet.absoluteFillObject },
  slideGrad:     { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.38)" },
  slideTop:      { position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  availBadge:    { backgroundColor: colors.success + "DD", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  availText:     { fontSize: 11, fontWeight: "700", color: "#fff" },
  heartCircle:   { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  slideBottom:   { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.lg, gap: 8 },
  slidePills:    { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  slidePill:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.92)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  slidePillText: { fontSize: 12, fontWeight: "700" },
  slideName:     { fontSize: 30, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  slideMetaRow:  { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  slideMeta:     { fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500", flexShrink: 1 },
  slideDot:      { color: "rgba(255,255,255,0.6)", fontSize: 14 },
  meetBtn:       { alignSelf: "flex-start", backgroundColor: "#fff", paddingHorizontal: spacing.lg, paddingVertical: 9, borderRadius: 22, marginTop: 4 },
  meetBtnText:   { color: colors.primary, fontWeight: "700", fontSize: 13 },

  // Dots
  dotsRow:       { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: spacing.md },
  dot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.outlineVariant },
  dotActive:     { width: 20, height: 6, borderRadius: 3, backgroundColor: colors.primary },

  // Gender tag (replaces broken Chip)
  genderTag:     { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start" },
  genderTagText: { fontSize: 11, fontWeight: "700" },

  // Grid cards
  gridSection:   { gap: spacing.sm, paddingHorizontal: spacing.md },
  gridCard:      { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  gridImg:       { width: 110, height: 128 },
  gridInfo:      { flex: 1, padding: spacing.md, justifyContent: "space-between", gap: 4 },
  gridTopRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  gridName:      { fontWeight: "700", fontSize: 15, color: colors.onSurface, flex: 1 },
  gridBreedRow:  { flexDirection: "row", alignItems: "center", gap: 4 },
  gridBreed:     { fontSize: 12, color: colors.onSurfaceVariant, flex: 1 },
  gridLocRow:    { flexDirection: "row", alignItems: "center", gap: 3 },
  gridCity:      { fontSize: 12, color: colors.onSurfaceVariant },
  adoptPill:     { alignSelf: "flex-start", backgroundColor: colors.primaryContainer, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: 10 },
  adoptPillText: { color: colors.primary, fontWeight: "700", fontSize: 12 },
  // Small gender pills for grid
  genderPillSmall:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  genderPillSmallText: { fontSize: 11, fontWeight: "700" },
});
