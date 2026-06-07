import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated, Dimensions, FlatList, Image,
  RefreshControl, ScrollView, StyleSheet,
  TextInput as RNTextInput, TouchableOpacity,
  View, ActivityIndicator,
} from "react-native";
import { Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

const { width: SW } = Dimensions.get("window");
const CARD_W   = SW - 80;
const CARD_H   = 300;
const GAP      = 16;
const SNAP_W   = CARD_W + GAP;
const SIDE_PAD = (SW - CARD_W) / 2;
const AUTOPLAY = 5000;
const FALLBACK = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800";

type Listing = {
  id: string; city: string; description: string | null; shelter_id: string;
  pets: {
    id: string; name: string; species: string; breed: string | null;
    gender: string | null; dob: string | null;
    photo_url: string | null; notes: string | null;
  } | null;
  profiles: { full_name: string } | null;
};

const CATEGORIES = ["All", "Dogs", "Cats", "Rabbits", "Birds", "Others"];

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
    <View style={[s.genderPill, { backgroundColor: male ? "#DBEAFE" : "#FCE7F3" }]}>
      <Text style={[s.genderPillTxt, { color: male ? "#1D4ED8" : "#BE185D" }]}>
        {male ? "♂ Male" : "♀ Female"}
      </Text>
    </View>
  );
}

export default function DiscoverScreen() {
  const router      = useRouter();
  const scrollX     = useRef(new Animated.Value(0)).current;
  const flatRef     = useRef<FlatList>(null);
  const autoRef     = useRef<any>(null);
  const curIdx      = useRef(0);

  const [listings,     setListings]     = useState<Listing[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [category,     setCategory]     = useState("All");
  const [dotIdx,       setDotIdx]       = useState(0);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [savedIds,     setSavedIds]     = useState<Set<string>>(new Set());

  // ── Fetch listings ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }

    // Try with profiles join first; fall back to without if it errors
    let rows: Listing[] = [];
    const { data, error } = await supabase
      .from("adoption_listings")
      .select("id,city,description,shelter_id,pets(id,name,species,breed,gender,dob,photo_url,notes),profiles!shelter_id(full_name)")
      .eq("status", "available")
      .order("listed_at", { ascending: false });

    if (error || !data) {
      console.warn("Listings (with profiles) error:", error?.message, "— retrying without profiles join");
      const { data: fallback } = await supabase
        .from("adoption_listings")
        .select("id,city,description,shelter_id,pets(id,name,species,breed,gender,dob,photo_url,notes)")
        .eq("status", "available")
        .order("listed_at", { ascending: false });
      rows = (fallback as unknown as Listing[]) ?? [];
    } else {
      rows = data as unknown as Listing[];
    }

    setListings(rows);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // ── Fetch saved listing IDs (heart state) ─────────────────────────────────
  const loadSaved = useCallback(async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id);
    setSavedIds(new Set((data ?? []).map((r: any) => r.listing_id)));
  }, []);

  useEffect(() => { load(); loadSaved(); }, [load, loadSaved]);

  // ── Toggle favourite ──────────────────────────────────────────────────────
  async function toggleSave(listingId: string) {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (savedIds.has(listingId)) {
      await supabase.from("saved_listings")
        .delete().match({ user_id: user.id, listing_id: listingId });
      setSavedIds((p) => { const s = new Set(p); s.delete(listingId); return s; });
    } else {
      await supabase.from("saved_listings")
        .insert({ user_id: user.id, listing_id: listingId });
      setSavedIds((p) => new Set(p).add(listingId));
    }
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const catFiltered = listings.filter((l) => {
    const sp = l.pets?.species?.toLowerCase() ?? "";
    if (category === "All")     return true;
    if (category === "Dogs")    return sp === "dog";
    if (category === "Cats")    return sp === "cat";
    if (category === "Rabbits") return sp === "rabbit";
    if (category === "Birds")   return sp === "bird";
    return !["dog","cat","rabbit","bird"].includes(sp);
  });

  const visible = searchQuery.trim()
    ? catFiltered.filter((l) => {
        const q = searchQuery.toLowerCase();
        return (
          l.pets?.name?.toLowerCase().includes(q)   ||
          l.pets?.breed?.toLowerCase().includes(q)  ||
          l.pets?.species?.toLowerCase().includes(q)||
          l.city?.toLowerCase().includes(q)
        );
      })
    : catFiltered;

  const carousel = visible.slice(0, 10);

  // ── Autoplay ──────────────────────────────────────────────────────────────
  const startAuto = useCallback(() => {
    if (carousel.length <= 1) return;
    clearInterval(autoRef.current);
    autoRef.current = setInterval(() => {
      const next = (curIdx.current + 1) % carousel.length;
      flatRef.current?.scrollToOffset({ offset: next * SNAP_W, animated: true });
      curIdx.current = next;
      setDotIdx(next);
    }, AUTOPLAY);
  }, [carousel.length]);

  const stopAuto = useCallback(() => clearInterval(autoRef.current), []);

  useEffect(() => {
    if (carousel.length > 1) startAuto();
    return stopAuto;
  }, [carousel.length, startAuto, stopAuto]);

  // ── Navigate to detail ────────────────────────────────────────────────────
  function goTo(item: Listing) {
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

  // ── Carousel slide ────────────────────────────────────────────────────────
  function Slide({ item, index }: { item: Listing; index: number }) {
    const range = [(index-1)*SNAP_W, index*SNAP_W, (index+1)*SNAP_W];
    const scale    = scrollX.interpolate({ inputRange: range, outputRange: [0.88,1,0.88], extrapolate:"clamp" });
    const transY   = scrollX.interpolate({ inputRange: range, outputRange: [16,0,16],    extrapolate:"clamp" });
    const rotate   = scrollX.interpolate({ inputRange: range, outputRange: ["2.5deg","0deg","-2.5deg"], extrapolate:"clamp" });
    const dimOp    = scrollX.interpolate({ inputRange: range, outputRange: [0.52,0,0.52], extrapolate:"clamp" });
    const saved    = savedIds.has(item.id);
    const age      = ageFromDob(item.pets?.dob ?? null);
    const gender   = item.pets?.gender ?? "";
    return (
      <Animated.View style={[s.slideWrap, { width: CARD_W, transform: [{ scale }, { translateY: transY }, { rotate }] }]}>
        <TouchableOpacity style={s.slide} activeOpacity={0.94} onPress={() => goTo(item)}>
          <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={s.slideImg} />
          <View style={s.slideGrad} />
          <View style={s.slideTop}>
            <View style={s.availBadge}><Text style={s.availTxt}>Available</Text></View>
            <TouchableOpacity style={s.heartBtn} activeOpacity={0.7} onPress={() => toggleSave(item.id)}>
              <Ionicons name={saved ? "heart" : "heart-outline"} size={18} color={saved ? "#FF6B6B" : "#fff"} />
            </TouchableOpacity>
          </View>
          <View style={s.slideBottom}>
            {(gender || age) && (
              <View style={s.pillRow}>
                {gender ? (
                  <View style={[s.oPill, { backgroundColor: gender==="male" ? "rgba(219,234,254,0.92)" : "rgba(252,231,243,0.92)" }]}>
                    <Text style={[s.oPillTxt, { color: gender==="male" ? "#1D4ED8" : "#BE185D" }]}>
                      {gender==="male" ? "♂ Male" : "♀ Female"}
                    </Text>
                  </View>
                ) : null}
                {age ? (
                  <View style={s.oPill}>
                    <Ionicons name="calendar-outline" size={11} color={colors.primary} />
                    <Text style={[s.oPillTxt, { color: colors.primary }]}>{age}</Text>
                  </View>
                ) : null}
              </View>
            )}
            <Text style={s.slideName} numberOfLines={1}>{item.pets?.name ?? "Sweet Pet"}</Text>
            <View style={s.metaRow}>
              <Ionicons name="paw-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={s.metaTxt} numberOfLines={1}>{item.pets?.breed ?? item.pets?.species}</Text>
              <Text style={s.metaDot}>·</Text>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={s.metaTxt} numberOfLines={1}>{item.city}</Text>
            </View>
            <TouchableOpacity style={s.meetBtn} onPress={() => goTo(item)} activeOpacity={0.85}>
              <Text style={s.meetBtnTxt}>Meet {item.pets?.name ?? "them"} →</Text>
            </TouchableOpacity>
          </View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, s.dimOverlay, { opacity: dimOp }]} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ── List card ─────────────────────────────────────────────────────────────
  function ListCard({ item }: { item: Listing }) {
    const age    = ageFromDob(item.pets?.dob ?? null);
    const gender = item.pets?.gender ?? "";
    return (
      <TouchableOpacity style={s.listCard} activeOpacity={0.92} onPress={() => goTo(item)}>
        <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={s.listImg} />
        <View style={s.listInfo}>
          <View style={s.listTopRow}>
            <Text style={s.listName} numberOfLines={1}>{item.pets?.name ?? "Sweet Pet"}</Text>
            {gender ? <GenderPill gender={gender} /> : null}
          </View>
          <View style={s.listRow}>
            <Ionicons name="paw-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={s.listBreed} numberOfLines={1}>
              {item.pets?.breed ?? item.pets?.species}{age ? ` · ${age}` : ""}
            </Text>
          </View>
          <View style={s.listRow}>
            <Ionicons name="location-outline" size={12} color={colors.onSurfaceVariant} />
            <Text style={s.listCity}>{item.city}</Text>
          </View>
          <TouchableOpacity style={s.adoptPill} onPress={() => goTo(item)} activeOpacity={0.8}>
            <Text style={s.adoptPillTxt}>Meet {item.pets?.name ?? "them"} →</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Discover</Text>
          <Text style={s.headerSub}>Find your forever companion</Text>
        </View>
        <TouchableOpacity style={s.chatBtn} onPress={() => router.push("/(tabs)/chats")} activeOpacity={0.7}>
          <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[colors.primary]} />
        }
      >
        {/* Search */}
        <View style={s.searchBar}>
          <Ionicons name="search" size={20} color={colors.onSurfaceVariant} />
          <RNTextInput
            style={s.searchInput}
            placeholder="Search breeds, species, city…"
            placeholderTextColor={colors.onSurfaceVariant + "80"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          )}
        </View>

        {/* Rehome banner */}
        <TouchableOpacity style={s.banner} activeOpacity={0.85} onPress={() => router.push("/(tabs)/list-pet")}>
          <View style={s.bannerLeft}>
            <View style={s.bannerIcon}><Ionicons name="heart" size={17} color={colors.onPrimary} /></View>
            <View>
              <Text style={s.bannerTitle}>Have a pet to rehome?</Text>
              <Text style={s.bannerSub}>List them for adoption — free &amp; easy</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.primary} />
        </TouchableOpacity>

        {/* Category filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={s.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity key={c} style={[s.catBtn, category===c && s.catBtnOn]} onPress={() => setCategory(c)} activeOpacity={0.8}>
              <Text style={[s.catTxt, category===c && s.catTxtOn]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s.loadingTxt}>Finding pets near you…</Text>
          </View>
        ) : visible.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="paw-outline" size={64} color={colors.outlineVariant} />
            <Text style={s.emptyTitle}>
              {searchQuery ? `No results for "${searchQuery}"` : "No pets available"}
            </Text>
            <Text style={s.emptyBody}>
              {searchQuery ? "Try a different search term." :
               category !== "All" ? `No ${category.toLowerCase()} available right now.` :
               "No listings yet — be the first to list a pet!"}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/(tabs)/list-pet")}>
                <Text style={s.emptyBtnTxt}>+ List a Pet</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* 3-D Coverflow Carousel */}
            {carousel.length > 0 && (
              <View style={s.carouselSection}>
                <Text style={s.sectionLabel}>FEATURED PETS</Text>
                <View style={{ height: CARD_H + 36, overflow: "hidden" }}>
                  <Animated.FlatList
                    ref={flatRef as any}
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
                    onScrollBeginDrag={stopAuto}
                    onMomentumScrollEnd={(e) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP_W);
                      const clamped = Math.min(Math.max(idx, 0), carousel.length - 1);
                      curIdx.current = clamped;
                      setDotIdx(clamped);
                      startAuto();
                    }}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                      { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                    renderItem={({ item, index }) => <Slide item={item} index={index} />}
                  />
                </View>
                {carousel.length > 1 && (
                  <View style={s.dotsRow}>
                    {carousel.map((_, i) => (
                      <View key={i} style={[s.dot, i === dotIdx && s.dotActive]} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* All listings */}
            <View style={s.listSection}>
              <Text style={s.sectionLabel}>
                ALL PETS NEAR YOU ({visible.length})
              </Text>
              {visible.map((item) => <ListCard key={item.id} item={item} />)}
            </View>
          </>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:       { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingHorizontal:spacing.md, marginBottom:spacing.md },
  headerTitle:  { fontSize:26, fontWeight:"800", color:colors.onSurface },
  headerSub:    { fontSize:13, color:colors.onSurfaceVariant },
  chatBtn:      { width:42, height:42, borderRadius:21, backgroundColor:colors.primaryContainer, alignItems:"center", justifyContent:"center" },
  searchBar:    { flexDirection:"row", alignItems:"center", gap:spacing.sm, marginHorizontal:spacing.md, marginBottom:spacing.sm, backgroundColor:colors.surfaceContainerHighest, borderRadius:16, padding:spacing.md },
  searchInput:  { flex:1, fontSize:15, color:colors.onSurface, paddingVertical:0 },
  banner:       { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginHorizontal:spacing.md, marginBottom:spacing.sm, backgroundColor:colors.primaryContainer, borderRadius:16, padding:spacing.md, borderWidth:1, borderColor:colors.primary+"30" },
  bannerLeft:   { flexDirection:"row", alignItems:"center", gap:spacing.md },
  bannerIcon:   { width:34, height:34, borderRadius:17, backgroundColor:colors.primary, alignItems:"center", justifyContent:"center" },
  bannerTitle:  { fontWeight:"700", fontSize:13, color:colors.onSurface },
  bannerSub:    { fontSize:11, color:colors.onSurfaceVariant },
  catScroll:    { marginBottom:spacing.md },
  catRow:       { paddingHorizontal:spacing.md, gap:spacing.sm, alignItems:"center" },
  catBtn:       { paddingHorizontal:spacing.md, paddingVertical:7, borderRadius:20, backgroundColor:colors.surfaceContainerHigh },
  catBtnOn:     { backgroundColor:colors.primary },
  catTxt:       { fontSize:13, fontWeight:"600", color:colors.onSurfaceVariant },
  catTxtOn:     { color:colors.onPrimary },
  centered:     { alignItems:"center", paddingVertical:60, gap:spacing.md },
  loadingTxt:   { color:colors.onSurfaceVariant },
  empty:        { alignItems:"center", paddingVertical:60, paddingHorizontal:spacing.xl, gap:spacing.md },
  emptyTitle:   { fontSize:17, fontWeight:"700", color:colors.onSurface, textAlign:"center" },
  emptyBody:    { fontSize:14, color:colors.onSurfaceVariant, textAlign:"center", lineHeight:22 },
  emptyBtn:     { paddingHorizontal:spacing.lg, paddingVertical:spacing.sm, borderRadius:20, borderWidth:1.5, borderColor:colors.primary },
  emptyBtnTxt:  { color:colors.primary, fontWeight:"700" },

  // Carousel
  carouselSection: { marginBottom:spacing.md },
  sectionLabel:    { fontSize:10, fontWeight:"800", color:colors.onSurfaceVariant, letterSpacing:1.5, marginBottom:spacing.sm, paddingHorizontal:spacing.md },
  slideWrap:       {},
  slide:           { width:CARD_W, height:CARD_H, borderRadius:22, overflow:"hidden", elevation:10, shadowColor:"#000", shadowOffset:{width:0,height:8}, shadowOpacity:0.22, shadowRadius:14 },
  slideImg:        { ...StyleSheet.absoluteFillObject },
  slideGrad:       { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.42)" },
  dimOverlay:      { backgroundColor:colors.surface, borderRadius:22 },
  slideTop:        { position:"absolute", top:spacing.md, left:spacing.md, right:spacing.md, flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  availBadge:      { backgroundColor:colors.success+"E0", paddingHorizontal:11, paddingVertical:5, borderRadius:11 },
  availTxt:        { fontSize:11, fontWeight:"700", color:"#fff" },
  heartBtn:        { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.22)", alignItems:"center", justifyContent:"center" },
  slideBottom:     { position:"absolute", bottom:0, left:0, right:0, padding:spacing.md, gap:6 },
  pillRow:         { flexDirection:"row", gap:6, flexWrap:"wrap" },
  oPill:           { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(255,255,255,0.92)", paddingHorizontal:9, paddingVertical:4, borderRadius:11 },
  oPillTxt:        { fontSize:11, fontWeight:"700" },
  slideName:       { fontSize:24, fontWeight:"800", color:"#fff", letterSpacing:-0.3 },
  metaRow:         { flexDirection:"row", alignItems:"center", gap:4, flexWrap:"wrap" },
  metaTxt:         { fontSize:12, color:"rgba(255,255,255,0.85)", fontWeight:"500", flexShrink:1 },
  metaDot:         { color:"rgba(255,255,255,0.5)" },
  meetBtn:         { alignSelf:"flex-start", backgroundColor:"#fff", paddingHorizontal:spacing.md, paddingVertical:8, borderRadius:20, marginTop:2 },
  meetBtnTxt:      { color:colors.primary, fontWeight:"700", fontSize:12 },
  dotsRow:         { flexDirection:"row", justifyContent:"center", alignItems:"center", gap:6, marginTop:10 },
  dot:             { width:6, height:6, borderRadius:3, backgroundColor:colors.outlineVariant },
  dotActive:       { width:22, height:6, borderRadius:3, backgroundColor:colors.primary },

  // Gender pill
  genderPill:    { paddingHorizontal:7, paddingVertical:3, borderRadius:9 },
  genderPillTxt: { fontSize:11, fontWeight:"700" },

  // List cards
  listSection:   { gap:spacing.sm, paddingHorizontal:spacing.md },
  listCard:      { flexDirection:"row", backgroundColor:colors.surface, borderRadius:16, overflow:"hidden", elevation:1, shadowColor:"#000", shadowOffset:{width:0,height:1}, shadowOpacity:0.06, shadowRadius:4 },
  listImg:       { width:110, height:124 },
  listInfo:      { flex:1, padding:spacing.md, justifyContent:"space-between", gap:3 },
  listTopRow:    { flexDirection:"row", alignItems:"center", justifyContent:"space-between", gap:4 },
  listName:      { fontWeight:"700", fontSize:14, color:colors.onSurface, flex:1 },
  listRow:       { flexDirection:"row", alignItems:"center", gap:4 },
  listBreed:     { fontSize:12, color:colors.onSurfaceVariant, flex:1 },
  listCity:      { fontSize:12, color:colors.onSurfaceVariant },
  adoptPill:     { alignSelf:"flex-start", backgroundColor:colors.primaryContainer, paddingHorizontal:spacing.sm, paddingVertical:4, borderRadius:9 },
  adoptPillTxt:  { color:colors.primary, fontWeight:"700", fontSize:11 },
});
