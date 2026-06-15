import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Image, RefreshControl, ScrollView,
  StyleSheet, TouchableOpacity, View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

// ─── Types ────────────────────────────────────────────────────────────────────

type Inquiry = {
  id: string;               // adoption_application id
  listingId: string;
  channelId: string;        // adopt_{listingId}_{applicantId}
  petName: string;
  petPhoto: string | null;
  otherName: string;        // shelter name (outgoing) or applicant name (incoming)
  status: string;
  lastMessage: string | null;
  lastTime: string | null;
  isIncoming: boolean;      // true = I'm the shelter, false = I'm the adopter
  applicantId: string;
};

type MyListing = {
  listingId: string;
  petId: string;
  petName: string;
  petPhoto: string | null;
  city: string;
  inquiryCount: number;
  inquiries: Inquiry[];
};

const FALLBACK = "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChatsScreen() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId  = session?.user?.id ?? "";

  const [outgoing,   setOutgoing]   = useState<Inquiry[]>([]);
  const [myListings, setMyListings] = useState<MyListing[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded,   setExpanded]   = useState<string | null>(null); // listingId

  const load = useCallback(async () => {
    if (!supabase || !userId) { setLoading(false); return; }

    // ── Helper: fetch last message for a channel ─────────────────────────
    async function getLastMsg(channelId: string) {
      if (!supabase) return { content: null as string | null, sent_at: null as string | null };
      const { data } = await supabase
        .from("messages")
        .select("content, sent_at")
        .eq("channel_id", channelId)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { content: data?.content ?? null, sent_at: data?.sent_at ?? null };
    }

    // ── 1. My outgoing inquiries (I applied to adopt) ──────────────────────
    const { data: appRows } = await supabase
      .from("adoption_applications")
      .select("id, listing_id, status, applied_at, applicant_id")
      .eq("applicant_id", userId)
      .order("applied_at", { ascending: false });

    // Collect unique listing IDs and fetch listing + pet + shelter data
    const appListingIds = [...new Set((appRows ?? []).map((a: any) => a.listing_id))];
    let appListingsMap: Record<string, any> = {};
    if (appListingIds.length > 0) {
      const { data: alRows } = await supabase
        .from("adoption_listings")
        .select("id, shelter_id, city, pet_id")
        .in("id", appListingIds);
      const petIds = [...new Set((alRows ?? []).map((r: any) => r.pet_id))];
      const shelterIds = [...new Set((alRows ?? []).map((r: any) => r.shelter_id))];

      // Fetch pets and profiles separately to avoid RLS join issues
      let petsMap: Record<string, any> = {};
      let profilesMap: Record<string, any> = {};
      if (petIds.length > 0) {
        const { data: petRows } = await supabase.from("pets").select("id, name, photo_url").in("id", petIds);
        (petRows ?? []).forEach((p: any) => { petsMap[p.id] = p; });
      }
      if (shelterIds.length > 0) {
        const { data: profRows } = await supabase.from("profiles").select("id, full_name").in("id", shelterIds);
        (profRows ?? []).forEach((p: any) => { profilesMap[p.id] = p; });
      }
      (alRows ?? []).forEach((al: any) => {
        appListingsMap[al.id] = {
          ...al,
          pets: petsMap[al.pet_id] ?? null,
          profiles: profilesMap[al.shelter_id] ?? null,
        };
      });
    }

    // Build outgoing list
    const outList: Inquiry[] = [];
    for (const app of (appRows ?? []) as any[]) {
      const al      = appListingsMap[app.listing_id];
      const pet     = al?.pets;
      const shelter = al?.profiles;
      const chanId  = `adopt_${app.listing_id}_${userId}`;
      const last    = await getLastMsg(chanId);
      outList.push({
        id:          app.id,
        listingId:   app.listing_id,
        channelId:   chanId,
        petName:     pet?.name ?? "Pet",
        petPhoto:    pet?.photo_url ?? null,
        otherName:   shelter?.full_name ?? "Shelter",
        status:      app.status,
        lastMessage: last.content,
        lastTime:    last.sent_at,
        isIncoming:  false,
        applicantId: userId,
      });
    }

    // ── 2. My listings + all their inquiries (I posted the pet) ───────────
    const { data: myListingRows } = await supabase
      .from("adoption_listings")
      .select("id, city, status, pet_id")
      .eq("shelter_id", userId)
      .order("listed_at", { ascending: false });

    // Fetch pets for my listings
    const myPetIds = [...new Set((myListingRows ?? []).map((r: any) => r.pet_id))];
    let myPetsMap: Record<string, any> = {};
    if (myPetIds.length > 0) {
      const { data: petRows } = await supabase.from("pets").select("id, name, photo_url").in("id", myPetIds);
      (petRows ?? []).forEach((p: any) => { myPetsMap[p.id] = p; });
    }

    // Fetch applications for each of my listings
    const myListIds = (myListingRows ?? []).map((r: any) => r.id);
    let myAppsMap: Record<string, any[]> = {};
    if (myListIds.length > 0) {
      const { data: myAppRows } = await supabase
        .from("adoption_applications")
        .select("id, listing_id, applicant_id, status, applied_at")
        .in("listing_id", myListIds)
        .order("applied_at", { ascending: false });
      (myAppRows ?? []).forEach((a: any) => {
        if (!myAppsMap[a.listing_id]) myAppsMap[a.listing_id] = [];
        myAppsMap[a.listing_id].push(a);
      });
    }

    // Fetch applicant profiles
    const applicantIds = [...new Set(
      Object.values(myAppsMap).flat().map((a: any) => a.applicant_id)
    )];
    let applicantProfilesMap: Record<string, any> = {};
    if (applicantIds.length > 0) {
      const { data: profRows } = await supabase.from("profiles").select("id, full_name").in("id", applicantIds);
      (profRows ?? []).forEach((p: any) => { applicantProfilesMap[p.id] = p; });
    }

    // Build my listings with incoming inquiries
    const listings: MyListing[] = [];
    for (const listing of (myListingRows ?? []) as any[]) {
      const pet   = myPetsMap[listing.pet_id] ?? null;
      const apps  = myAppsMap[listing.id] ?? [];
      const inquiries: Inquiry[] = [];
      for (const app of apps) {
        const chanId = `adopt_${listing.id}_${app.applicant_id}`;
        const last   = await getLastMsg(chanId);
        inquiries.push({
          id:          app.id,
          listingId:   listing.id,
          channelId:   chanId,
          petName:     pet?.name ?? "Pet",
          petPhoto:    pet?.photo_url ?? null,
          otherName:   applicantProfilesMap[app.applicant_id]?.full_name ?? "Applicant",
          status:      app.status,
          lastMessage: last.content,
          lastTime:    last.sent_at,
          isIncoming:  true,
          applicantId: app.applicant_id,
        });
      }
      listings.push({
        listingId:    listing.id,
        petId:        pet?.id ?? "",
        petName:      pet?.name ?? "Pet",
        petPhoto:     pet?.photo_url ?? null,
        city:         listing.city,
        inquiryCount: apps.length,
        inquiries,
      });
    }

    setOutgoing(outList);
    setMyListings(listings);
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Reload every time the Chats tab comes into focus (e.g. after sending a
  // message from a pet listing and navigating back here).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openChat(item: Inquiry) {
    router.push({
      pathname: "/(tabs)/adopt-chat",
      params: {
        channelId:   item.channelId,
        petName:     item.petName,
        shelterName: item.isIncoming ? item.otherName : item.otherName,
        petImage:    item.petPhoto ?? FALLBACK,
      },
    });
  }

  function goToProfile() {
    router.push("/(tabs)/profile");
  }

  const hasAnything = outgoing.length > 0 || myListings.some((l) => l.inquiryCount > 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium" style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Adoption conversations</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={goToProfile} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── My Inquiries (I applied) ─────────────────────── */}
          {outgoing.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MY INQUIRIES</Text>
              {outgoing.map((item) => (
                <ChatRow key={item.id} item={item} onPress={() => openChat(item)} />
              ))}
            </View>
          )}

          {/* ── My Listings + received enquiries ─────────────── */}
          {myListings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>MY LISTINGS</Text>
              {myListings.map((listing) => (
                <View key={listing.listingId}>
                  {/* Listing header — tap to expand */}
                  <TouchableOpacity
                    style={styles.listingCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      setExpanded(expanded === listing.listingId ? null : listing.listingId)
                    }
                  >
                    <Image
                      source={{ uri: listing.petPhoto ?? FALLBACK }}
                      style={styles.listingImg}
                    />
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingName}>{listing.petName}</Text>
                      <Text style={styles.listingCity}>{listing.city}</Text>
                      <View style={styles.inquiryCountRow}>
                        <Ionicons name="mail-outline" size={14} color={colors.primary} />
                        <Text style={styles.inquiryCount}>
                          {listing.inquiryCount} enquir{listing.inquiryCount === 1 ? "y" : "ies"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name={expanded === listing.listingId ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>

                  {/* Expanded enquiries */}
                  {expanded === listing.listingId && (
                    <View style={styles.enquiryList}>
                      {listing.inquiries.length === 0 ? (
                        <Text style={styles.noEnquiries}>No enquiries yet</Text>
                      ) : (
                        listing.inquiries.map((inq) => (
                          <ChatRow
                            key={inq.id}
                            item={inq}
                            onPress={() => openChat(inq)}
                            isNested
                          />
                        ))
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Empty state */}
          {!hasAnything && (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                When you apply to adopt a pet or someone enquires about yours, your conversations will appear here.
              </Text>
              <TouchableOpacity style={styles.browseBtn} onPress={() => router.push("/(tabs)")}>
                <Text style={styles.browseBtnText}>Browse pets →</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ─── Chat Row ─────────────────────────────────────────────────────────────────

function ChatRow({
  item,
  onPress,
  isNested = false,
}: {
  item: Inquiry;
  onPress: () => void;
  isNested?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.chatRow, isNested && styles.chatRowNested]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={styles.chatImgWrap}>
        <Image source={{ uri: item.petPhoto ?? "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400" }} style={styles.chatImg} />
        {item.isIncoming && (
          <View style={styles.incomingDot} />
        )}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatTopRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.isIncoming ? item.otherName : item.petName}
          </Text>
          <Text style={styles.chatTime}>{timeAgo(item.lastTime)}</Text>
        </View>
        <Text style={styles.chatSub} numberOfLines={1}>
          {item.isIncoming ? `About ${item.petName}` : `To ${item.otherName}`}
        </Text>
        <Text style={styles.chatPreview} numberOfLines={1}>
          {item.lastMessage ?? "Tap to open conversation"}
        </Text>
      </View>
      <View style={[
        styles.statusPill,
        { backgroundColor: item.status === "approved" ? colors.success + "20" : item.status === "rejected" ? colors.error + "20" : colors.primary + "15" },
      ]}>
        <Text style={[
          styles.statusText,
          { color: item.status === "approved" ? colors.success : item.status === "rejected" ? colors.error : colors.primary },
        ]}>
          {item.status}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  title:        { fontWeight: "800", color: colors.onSurface },
  subtitle:     { color: colors.onSurfaceVariant, fontSize: 13 },
  profileBtn:   { padding: 4 },
  centered:     { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent:{ paddingHorizontal: spacing.md },
  section:      { marginBottom: spacing.lg, gap: spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: colors.onSurfaceVariant, letterSpacing: 1.5 },

  // Chat row
  chatRow:       { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  chatRowNested: { marginLeft: spacing.md, backgroundColor: colors.surfaceContainerLow },
  chatImgWrap:   { position: "relative" },
  chatImg:       { width: 52, height: 52, borderRadius: 12 },
  incomingDot:   { position: "absolute", top: -3, right: -3, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.surface },
  chatInfo:      { flex: 1 },
  chatTopRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chatName:      { fontWeight: "700", fontSize: 15, color: colors.onSurface, flex: 1 },
  chatTime:      { fontSize: 11, color: colors.onSurfaceVariant },
  chatSub:       { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 },
  chatPreview:   { fontSize: 13, color: colors.onSurface + "AA", marginTop: 2 },
  statusPill:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText:    { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },

  // Listing card
  listingCard:   { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  listingImg:    { width: 60, height: 60, borderRadius: 14 },
  listingInfo:   { flex: 1, gap: 2 },
  listingName:   { fontWeight: "700", fontSize: 16, color: colors.onSurface },
  listingCity:   { fontSize: 12, color: colors.onSurfaceVariant },
  inquiryCountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  inquiryCount:  { fontSize: 12, color: colors.primary, fontWeight: "600" },
  enquiryList:   { gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.sm },
  noEnquiries:   { color: colors.onSurfaceVariant, textAlign: "center", paddingVertical: spacing.md, fontSize: 13 },

  // Empty
  empty:         { alignItems: "center", paddingVertical: 60, gap: spacing.md },
  emptyTitle:    { fontSize: 20, fontWeight: "700", color: colors.onSurface },
  emptyText:     { fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", lineHeight: 22, paddingHorizontal: spacing.lg },
  browseBtn:     { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.primaryContainer },
  browseBtnText: { color: colors.primary, fontWeight: "700" },
});