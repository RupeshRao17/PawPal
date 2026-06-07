import { useEffect, useState } from "react";
import {
  Image, ScrollView, StyleSheet, TouchableOpacity, View,
} from "react-native";
import { Text, ActivityIndicator, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Profile = { full_name: string; city: string | null; phone: string | null; avatar_url: string | null; role: string };
type Listing = {
  id: string; city: string; status: string; description: string | null;
  listed_at: string;
  pets: { name: string; species: string; breed: string | null; photo_url: string | null; gender: string | null; dob: string | null } | null;
};

const FALLBACK = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600";

function ageFromDob(dob: string | null): string {
  if (!dob) return "";
  const months = (new Date().getFullYear() - new Date(dob).getFullYear()) * 12 + (new Date().getMonth() - new Date(dob).getMonth());
  if (months < 12) return `${months}m old`;
  const y = Math.floor(months / 12), m = months % 12;
  return m === 0 ? `${y}y old` : `${y}y ${m}m old`;
}

export default function ShelterProfileScreen() {
  const router = useRouter();
  const { shelterId, shelterName } = useLocalSearchParams<{ shelterId: string; shelterName: string }>();

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState<"available" | "all">("available");

  useEffect(() => {
    if (!shelterId || !supabase) { setLoading(false); return; }
    Promise.all([
      supabase.from("profiles").select("full_name,city,phone,avatar_url,role").eq("id", shelterId).single(),
      supabase.from("adoption_listings")
        .select("id,city,status,description,listed_at,pets(name,species,breed,photo_url,gender,dob)")
        .eq("shelter_id", shelterId)
        .order("listed_at", { ascending: false }),
    ]).then(([pr, lr]) => {
      setProfile(pr.data as Profile);
      setListings((lr.data as unknown as Listing[]) ?? []);
      setLoading(false);
    });
  }, [shelterId]);

  const shown = tab === "available" ? listings.filter((l) => l.status === "available") : listings;

  function goToDetail(item: Listing) {
    router.push({
      pathname: "/(tabs)/pet-detail",
      params: {
        name:        item.pets?.name ?? "Pet",
        breed:       item.pets?.breed ?? item.pets?.species ?? "Unknown",
        age:         ageFromDob(item.pets?.dob ?? null),
        gender:      item.pets?.gender ?? "",
        location:    item.city,
        image:       item.pets?.photo_url ?? FALLBACK,
        description: item.description ?? "",
        listingId:   item.id,
        shelterId,
        shelterName: profile?.full_name ?? shelterName ?? "Shelter",
      },
    });
  }

  const initials = (profile?.full_name ?? shelterName ?? "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Shelter Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Profile hero */}
          <View style={styles.heroSection}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <Text style={styles.shelterName}>{profile?.full_name ?? shelterName}</Text>
            {profile?.city && (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{profile.city}</Text>
              </View>
            )}
            {profile?.phone && (
              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.metaText}>{profile.phone}</Text>
              </View>
            )}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{listings.length}</Text>
                <Text style={styles.statLabel}>Total Listed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{listings.filter((l) => l.status === "available").length}</Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{listings.filter((l) => l.status === "adopted").length}</Text>
                <Text style={styles.statLabel}>Adopted</Text>
              </View>
            </View>
          </View>

          {/* Tab filter */}
          <View style={styles.tabRow}>
            {(["available", "all"] as const).map((t) => (
              <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)} activeOpacity={0.8}>
                <Text style={[styles.tabTxt, tab === t && styles.tabTxtActive]}>
                  {t === "available" ? "Available" : "All Listings"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Listings */}
          <View style={styles.listSection}>
            {shown.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="paw-outline" size={48} color={colors.outlineVariant} />
                <Text style={styles.emptyText}>No {tab === "available" ? "available " : ""}listings yet</Text>
              </View>
            ) : shown.map((item) => (
              <TouchableOpacity key={item.id} style={styles.listCard} activeOpacity={0.92} onPress={() => goToDetail(item)}>
                <Image source={{ uri: item.pets?.photo_url ?? FALLBACK }} style={styles.listImg} />
                <View style={styles.listInfo}>
                  <View style={styles.listTopRow}>
                    <Text style={styles.listName} numberOfLines={1}>{item.pets?.name ?? "Pet"}</Text>
                    <View style={[styles.statusPill, { backgroundColor: item.status === "available" ? colors.success + "20" : colors.onSurfaceVariant + "15" }]}>
                      <Text style={[styles.statusTxt, { color: item.status === "available" ? colors.success : colors.onSurfaceVariant }]}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.listBreedRow}>
                    <Ionicons name="paw-outline" size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.listBreed}>
                      {item.pets?.breed ?? item.pets?.species}
                      {item.pets?.dob ? ` · ${ageFromDob(item.pets.dob)}` : ""}
                    </Text>
                  </View>
                  <View style={styles.listLocRow}>
                    <Ionicons name="location-outline" size={12} color={colors.onSurfaceVariant} />
                    <Text style={styles.listCity}>{item.city}</Text>
                  </View>
                  {item.status === "available" && (
                    <TouchableOpacity style={styles.adoptPill} onPress={() => goToDetail(item)} activeOpacity={0.8}>
                      <Text style={styles.adoptPillTxt}>Meet {item.pets?.name ?? "them"} →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  topBar:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.xl * 1.5, paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + "30" },
  backBtn:       { width: 40 },
  topBarTitle:   { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  centered:      { flex: 1, alignItems: "center", justifyContent: "center" },
  heroSection:   { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.md, backgroundColor: colors.surface, gap: spacing.sm },
  avatar:        { width: 88, height: 88, borderRadius: 44, marginBottom: spacing.sm },
  avatarFallback:{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
  avatarInitials:{ fontSize: 30, fontWeight: "800", color: colors.onPrimary },
  shelterName:   { fontSize: 22, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  metaRow:       { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText:      { fontSize: 14, color: colors.onSurfaceVariant },
  statsRow:      { flexDirection: "row", marginTop: spacing.md, backgroundColor: colors.surfaceContainerLow, borderRadius: 16, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, gap: spacing.xl },
  statItem:      { alignItems: "center", gap: 3 },
  statNum:       { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  statLabel:     { fontSize: 11, color: colors.onSurfaceVariant, fontWeight: "600" },
  statDivider:   { width: 1, backgroundColor: colors.outlineVariant + "50", alignSelf: "stretch" },
  tabRow:        { flexDirection: "row", marginHorizontal: spacing.md, marginTop: spacing.md, backgroundColor: colors.surfaceContainerHigh, borderRadius: 20, padding: 4 },
  tabBtn:        { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 16 },
  tabBtnActive:  { backgroundColor: colors.surface, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  tabTxt:        { fontSize: 13, fontWeight: "600", color: colors.onSurfaceVariant },
  tabTxtActive:  { color: colors.primary, fontWeight: "700" },
  listSection:   { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  empty:         { alignItems: "center", paddingVertical: 60, gap: spacing.md },
  emptyText:     { color: colors.onSurfaceVariant, fontSize: 15 },
  listCard:      { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  listImg:       { width: 110, height: 124 },
  listInfo:      { flex: 1, padding: spacing.md, justifyContent: "space-between", gap: 3 },
  listTopRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  listName:      { fontWeight: "700", fontSize: 14, color: colors.onSurface, flex: 1 },
  statusPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9 },
  statusTxt:     { fontSize: 10, fontWeight: "700" },
  listBreedRow:  { flexDirection: "row", alignItems: "center", gap: 4 },
  listBreed:     { fontSize: 12, color: colors.onSurfaceVariant, flex: 1 },
  listLocRow:    { flexDirection: "row", alignItems: "center", gap: 3 },
  listCity:      { fontSize: 12, color: colors.onSurfaceVariant },
  adoptPill:     { alignSelf: "flex-start", backgroundColor: colors.primaryContainer, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 9 },
  adoptPillTxt:  { color: colors.primary, fontWeight: "700", fontSize: 11 },
});
