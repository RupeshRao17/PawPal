import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, FlatList, Image,
  RefreshControl, ScrollView, StyleSheet,
  TouchableOpacity, View, ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const { width: SW } = Dimensions.get("window");

// Carousel geometry — adjacent cards peek 24 px on each side
const CARD_W   = SW - 80;          // e.g. 310 on 390-wide phone
const CARD_H   = 300;
const GAP      = 16;
const SNAP_W   = CARD_W + GAP;
const SIDE_PAD = (SW - CARD_W) / 2; // 40 — centres first card

const AUTOPLAY_MS = 5000;
const FALLBACK    = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800";

type Listing = {
  id: string; city: string; description: string | null; shelter_id: string;
  pets: { id: string; name: string; species: string; breed: string | null;
          gender: string | null; dob: string | null; photo_url: string | null; notes: string | null } | null;
  profiles: { full_name: string } | null;
};

const CATEGORIES = ["All","Dogs","Cats","Rabbits","Birds","Others"];

function ageFromDob(dob: string | null): string {
  if (!dob) return "";
  const months =
    (new Date().getFullYear() - new Date(dob).getFullYear()) * 12 +
    (new Date().getMonth()    - new Date(dob).getMonth());
  if (months <  1) return "Newborn";
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} old`;
  const yrs = Math.floor(months / 12);
  const rem  = months % 12;
  if (rem === 0) return `${yrs} year${yrs > 1 ? "s" : ""} old`;
  return `${yrs}y ${rem}m old`;
}

function GenderPill({ gender }: { gender: string }) {
  const male = gender.toLowerCase() === "male";
  return (
    <View style={[styles.genderPill, { backgroundColor: male ? "#DBEAFE" : "#FCE7F3" }]}>
      <Text style={[styles.genderPillTxt, { color: male ? "#1D4ED8" : "#BE185D" }]}>
        {male ? "♂ Male" : "♀ Female"}
      </Text>
    </View>
  );
}

export default function DiscoverScreen() {
  const router      = useRouter();
  const scrollX     = useRef(new Animated.Value(0)).current;
  const flatRef     = useRef<FlatList>(null);
  const autoplayRef = useRef<any>(null);
  const currentIdx  = useRef(0);

  const [listings,   setListings]   = useState<Listing[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category,   setCategory]   = useState("All");
  const [dotIdx,     setDotIdx]     = useState(0);

  // ── Data ──────────────────────────────────────────────────────────────────
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

  const carousel = filtered.slice(0, 10);

  // ── Autoplay ──────────────────────────────────────────────────────────────
  const startAutoplay = useCallback(() => {
    if (carousel.length <= 1) return;
    clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      const next = (currentIdx.current + 1) % carousel.length;
      flatRef.current?.scrollToOffset({ offset: next * SNAP_W, animated: true });
      currentIdx.current = next;
      setDotIdx(next);
    }, AUTOPLAY_MS);
  }, [carousel.length]);

  const stopAutoplay = useCallback(() => clearInterval(autoplayRef.current), []);

  useEffect(() => {
    if (carousel.length > 1) startAutoplay();
    return stopAutoplay;
  }, [carousel.length, startAutoplay]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function goToDetail(item: Listing) {
    router.push({
      pathname: "/(tabs)/pet-detail",
      params: {
        name:        item.pets?.name       ?? "Sweet Pet",
        breed:       item.pets?.breed      ?? item.pets?.species ?? "Unknown",
        age:         ageFromDob(item.pets?.dob ?? null),
        gender:      item.pets?.gender     ?? "",
        location:    item.city,
        image:       item.pets?.photo_url  ?? FALLBACK,
        description: item.description      ?? item.pets?.notes ?? "",
        petId:       item.pets?.id         ?? "",
        listingId:   item.id,
        shelterId:   item.shelter_id,
        shelterName: item.profiles?.full_name ?? "Shelter",
      },
    });
  }

  // ── Carousel slide ────────────────────────────────────────────────────────
  function Slide({ item, index }: { item: Listing; index: number }) {
    const inputRange = [(index - 1) * SNAP_W, index * SNAP_W, (index + 1) * SNAP_W];

    // Scale: centre = 1.0 | sides = 0.88
    const scale = scrollX.interpolate({
      inputRange, outputRange: [0.88, 1, 0.88], extrapolate: "clamp",
    });
    // Sink sides downward for depth
    const translateY = scrollX.interpolate({
      inputRange, outputRange: [16, 0, 16], extrapolate: "clamp",
    });
    // Slight card tilt
    const rotate = scrollX.interpolate({
      inputRange, outputRange: ["2.5deg", "0deg", "-2.5deg"], extrapolate: "clamp",
    });
    // Dim adjacent cards (simulates blur)
    const dimOpacity = scrollX.interpolate({
      inputRange, outputRange: [0.52, 0, 0.52], extrapolate: "clamp",
    });

    const age    = ageFromDob(item.pets?.dob ?? null);
    const gender = item.pets?.gender ?? "";

    return (
      <Animated.View
        style={[
          styles.slideWrap,
          { width: CARD_W, transform: [{ scale }, { translateY }, { rotate }] },
        ]}
      >
        <TouchableOpacity style={styles.slide} activeOpacity={0.94} onPress={() => goToDetail(item)}>
          {/* Photo */}
          <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={styles.slideImg} />

          {/* Bottom gradient */}
          <View style={styles.slideGrad} />

          {/* Top row */}
          <View style={styles.slideTop}>
            <View style={styles.availBadge}>
              <Text style={styles.availText}>Available</Text>
            </View>
            <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7}>
              <Ionicons name="heart-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Info overlay */}
          <View style={styles.slideBottom}>
            {(gender || age) ? (
              <View style={styles.pillRow}>
                {gender ? (
                  <View style={[styles.overlayPill,
                    { backgroundColor: gender === "male" ? "rgba(219,234,254,0.92)" : "rgba(252,231,243,0.92)" }]}>
                    <Text style={[styles.overlayPillTxt,
                      { color: gender === "male" ? "#1D4ED8" : "#BE185D" }]}>
                      {gender === "male" ? "♂ Male" : "♀ Female"}
                    </Text>
                  </View>
                ) : null}
                {age ? (
                  <View style={styles.overlayPill}>
                    <Ionicons name="calendar-outline" size={11} color={colors.primary} />
                    <Text style={[styles.overlayPillTxt, { color: colors.primary }]}>{age}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Text style={styles.slideName} numberOfLines={1}>{item.pets?.name ?? "Sweet Pet"}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="paw-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaTxt} numberOfLines={1}>{item.pets?.breed ?? item.pets?.species}</Text>
              <Text style={styles.metaDot}>·</Text>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaTxt}>{item.city}</Text>
            </View>
            <TouchableOpacity style={styles.meetBtn} onPress={() => goToDetail(item)} activeOpacity={0.85}>
              <Text style={styles.meetBtnTxt}>Meet {item.pets?.name ?? "them"} →</Text>
            </TouchableOpacity>
          </View>

          {/* Dim overlay on adjacent cards (simulated blur) */}
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, styles.dimOverlay, { opacity: dimOpacity }]}
          />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── List card ─────────────────────────────────────────────────────────────
  function ListCard({ item }: { item: Listing }) {
    const age    = ageFromDob(item.pets?.dob ?? null);
    const gender = item.pets?.gender ?? "";
    return (
      <TouchableOpacity style={styles.listCard} activeOpacity={0.92} onPress={() => goToDetail(item)}>
        <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={styles.listImg} />
        <View style={styles.listInfo}>
          <View style={styles.listTopRow}>
            <Text style={styles.listName} numberOfLines={1}>{item.pets?.name ?? "Sweet Pet"}</Text>
            {gender ? <GenderPill gender={gender} /> : null}
          </View>
          <View style={styles.listRow}>
            <Ionicons name="paw-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.listBreed} numberOfLines={1}>
              {item.pets?.breed ?? item.pets?.species}{age ? ` · ${age}` : ""}
            </Text>
          </View>
          <View style={styles.listRow}>
            <Ionicons name="location-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={styles.listCity}>{item.city}</Text>
          </View>
          <TouchableOpacity style={styles.adoptPill} onPress={() => goToDetail(item)} activeOpacity={0.8}>
            <Text style={styles.adoptPillTxt}>Meet {item.pets?.name ?? "them"} →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Animated dot indicator ────────────────────────────────────────────────
  function Dot({ i }: { i: number }) {
    const active = i === dotIdx;
    return (
      <Animated.View style={[styles.dot, active && styles.dotActive]} />
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
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
          <Text style={styles.searchTxt}>Search breeds, species, city…</Text>
        </TouchableOpacity>

        {/* Rehome banner */}
        <TouchableOpacity style={styles.listBanner} activeOpacity={0.85} onPress={() => router.push("/(tabs)/list-pet")}>
          <View style={styles.listBannerLeft}>
            <View style={styles.listBannerIcon}>
              <Ionicons name="heart" size={17} color={colors.onPrimary} />
            </View>
            <View>
              <Text style={styles.listBannerTitle}>Have a pet to rehome?</Text>
              <Text style={styles.listBannerSub}>List them for adoption — free &amp; easy</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </TouchableOpacity>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.catScroll} contentContainerStyle={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[styles.catBtn, category === c && styles.catBtnActive]}
              onPress={() => setCategory(c)} activeOpacity={0.8}>
              <Text style={[styles.catTxt, category === c && styles.catTxtActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>Finding pets near you…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="paw-outline" size={64} color={colors.outlineVariant} />
            <Text style={styles.emptyTitle}>No pets available</Text>
            <Text style={styles.emptyText}>
              {category === "All" ? "No listings yet — be the first!" : `No ${category.toLowerCase()} available right now.`}
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push("/(tabs)/list-pet")}>
              <Text style={styles.emptyBtnTxt}>+ List a Pet</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── 3-D Coverflow Carousel ── */}
            {carousel.length > 0 && (
              <View style={styles.carouselSection}>
                <Text style={styles.sectionLabel}>FEATURED PETS</Text>

                {/* Carousel FlatList — adjacent cards peek on both sides */}
                <View style={{ height: CARD_H + 36, overflow: "hidden" }}>
                  <Animated.FlatList
                    ref={flatRef}
                    data={carousel}
                    keyExtractor={(i) => i.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={SNAP_W}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    bounces={false}
                    contentContainerStyle={{ paddingHorizontal: SIDE_PAD, paddingVertical: 4 }}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    onScrollBeginDrag={stopAutoplay}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_W);
                      const clamped = Math.min(Math.max(idx, 0), carousel.length - 1);
                      currentIdx.current = clamped;
                      setDotIdx(clamped);
                      startAutoplay();
                    }}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                      { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    renderItem={({ item, index }) => <Slide item={item} index={index} />}
                  />
                </View>

                {/* Dots + timer hint */}
                {carousel.length > 1 && (
                  <View style={styles.dotsRow}>
                    {carousel.map((_, i) => <Dot key={i} i={i} />)}
                  </View>
                )}
              </View>
            )}

            {/* ── Full listing below carousel ── */}
            <View style={styles.listSection}>
              <Text style={styles.sectionLabel}>ALL PETS NEAR YOU</Text>
              {filtered.map((item) => <ListCard key={item.id} item={item} />)}
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.md },
  headerTitle:    { fontSize: 26, fontWeight: "800", color: colors.onSurface },
  headerSub:      { fontSize: 13, color: colors.onSurfaceVariant },
  chatBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  searchBar:      { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surfaceContainerHighest, borderRadius: 16, padding: spacing.md },
  searchTxt:      { color: colors.onSurfaceVariant + "99", flex: 1 },
  listBanner:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.primaryContainer, borderRadius: 16, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + "30" },
  listBannerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  listBannerIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  listBannerTitle:{ fontWeight: "700", fontSize: 13, color: colors.onSurface },
  listBannerSub:  { fontSize: 11, color: colors.onSurfaceVariant },
  catScroll:      { marginBottom: spacing.md },
  catRow:         { paddingHorizontal: spacing.md, gap: spacing.sm, alignItems: "center" },
  catBtn:         { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.surfaceContainerHigh },
  catBtnActive:   { backgroundColor: colors.primary },
  catTxt:         { fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant },
  catTxtActive:   { color: colors.onPrimary },
  centered:       { alignItems: "center", paddingVertical: 60 },
  empty:          { alignItems: "center", paddingVertical: 60, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyTitle:     { fontSize: 18, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  emptyText:      { fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", lineHeight: 22 },
  emptyBtn:       { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary },
  emptyBtnTxt:    { color: colors.primary, fontWeight: "700" },

  // ── Carousel ──
  carouselSection: { marginBottom: spacing.md },
  sectionLabel:    { fontSize: 10, fontWeight: "800", color: colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: spacing.sm, paddingHorizontal: spacing.md },

  slideWrap:       { marginRight: 0 },    // gap comes from ItemSeparatorComponent
  slide:           { width: CARD_W, height: CARD_H, borderRadius: 22, overflow: "hidden",
                     elevation: 10, shadowColor: "#000",
                     shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14 },
  slideImg:        { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  slideGrad:       { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
  dimOverlay:      { backgroundColor: colors.surface, borderRadius: 22 },

  slideTop:        { position: "absolute", top: spacing.md, left: spacing.md, right: spacing.md,
                     flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  availBadge:      { backgroundColor: colors.success + "E0", paddingHorizontal: 11, paddingVertical: 5, borderRadius: 11 },
  availText:       { fontSize: 11, fontWeight: "700", color: "#fff" },
  heartBtn:        { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.22)",
                     alignItems: "center", justifyContent: "center" },

  slideBottom:     { position: "absolute", bottom: 0, left: 0, right: 0, padding: spacing.md, gap: 6 },
  pillRow:         { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  overlayPill:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.92)",
                     paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11 },
  overlayPillTxt:  { fontSize: 11, fontWeight: "700" },
  slideName:       { fontSize: 24, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  metaRow:         { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  metaTxt:         { fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: "500", flexShrink: 1 },
  metaDot:         { color: "rgba(255,255,255,0.5)" },
  meetBtn:         { alignSelf: "flex-start", backgroundColor: "#fff",
                     paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20, marginTop: 2 },
  meetBtnTxt:      { color: colors.primary, fontWeight: "700", fontSize: 12 },

  // Dots
  dotsRow:         { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 10 },
  dot:             { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.outlineVariant },
  dotActive:       { width: 22, height: 6, borderRadius: 3, backgroundColor: colors.primary },

  // Gender pill
  genderPill:      { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9 },
  genderPillTxt:   { fontSize: 11, fontWeight: "700" },

  // ── List below carousel ──
  listSection:     { gap: spacing.sm, paddingHorizontal: spacing.md },
  listCard:        { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden",
                     elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  listImg:         { width: 110, height: 124 },
  listInfo:        { flex: 1, padding: spacing.md, justifyContent: "space-between", gap: 3 },
  listTopRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  listName:        { fontWeight: "700", fontSize: 14, color: colors.onSurface, flex: 1 },
  listRow:         { flexDirection: "row", alignItems: "center", gap: 4 },
  listBreed:       { fontSize: 12, color: colors.onSurfaceVariant, flex: 1 },
  listCity:        { fontSize: 12, color: colors.onSurfaceVariant },
  adoptPill:       { alignSelf: "flex-start", backgroundColor: colors.primaryContainer,
                     paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 9 },
  adoptPillTxt:    { color: colors.primary, fontWeight: "700", fontSize: 11 },
});
