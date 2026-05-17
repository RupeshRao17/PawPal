import { useEffect, useState } from "react";
import {
  Alert, Image, Modal, ScrollView, StatusBar,
  StyleSheet, TextInput as RNTextInput,
  TouchableOpacity, View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function PetDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAuthStore((s) => s.session);
  const userId  = session?.user?.id ?? "";

  const [isFavorite,    setIsFavorite]    = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [message,       setMessage]       = useState("");
  const [sending,       setSending]       = useState(false);
  const [sent,          setSent]          = useState(false);
  const [vaccinations,  setVaccinations]  = useState<any[]>([]);
  const [medNotes,      setMedNotes]      = useState("");
  const [loadingHealth, setLoadingHealth] = useState(false);

  const pet = {
    name:        String(params.name        ?? "Buddy"),
    breed:       String(params.breed       ?? "Unknown"),
    age:         String(params.age         ?? ""),
    gender:      String(params.gender      ?? ""),
    location:    String(params.location    ?? "Unknown"),
    image:       String(params.image       ?? "https://images.unsplash.com/photo-1552053831-71594a27632d?w=1200"),
    description: String(params.description ?? ""),
    petId:       String(params.petId       ?? ""),
    listingId:   String(params.listingId   ?? ""),
    shelterId:   String(params.shelterId   ?? ""),
    shelterName: String(params.shelterName ?? "Shelter"),
  };

  // Fetch health records when petId is available
  useEffect(() => {
    if (!pet.petId || !supabase) return;
    setLoadingHealth(true);
    Promise.all([
      supabase.from("health_vaccinations")
        .select("vaccine_name, administered_on, next_due_on")
        .eq("pet_id", pet.petId)
        .order("administered_on", { ascending: false }),
      supabase.from("pets")
        .select("notes")
        .eq("id", pet.petId)
        .maybeSingle(),
    ]).then(([vaxRes, petRes]) => {
      setVaccinations((vaxRes.data as any[]) ?? []);
      setMedNotes((petRes.data as any)?.notes ?? "");
      setLoadingHealth(false);
    });
  }, [pet.petId]);

  const isAdoptable = !!pet.listingId;
  const isMyListing = !!pet.listingId && pet.shelterId === userId;

  // ── Unique private channel ID for this inquiry ───────────────────────────
  // Format: adopt_{listingId}_{applicantId}  (consistent, private to this pair)
  const inquiryChannelId = isAdoptable
    ? `adopt_${pet.listingId}_${userId}`
    : "";

  // ── Send adoption inquiry ────────────────────────────────────────────────
  async function handleSendInquiry() {
    if (!message.trim()) { Alert.alert("Write a message first."); return; }
    if (!supabase)       { Alert.alert("No backend connected."); return; }
    if (!userId)         { Alert.alert("Please sign in to send an inquiry."); return; }

    setSending(true);
    try {
      // 1. Upsert adoption application (ignore if already exists)
      await supabase.from("adoption_applications").upsert(
        { listing_id: pet.listingId, applicant_id: userId, status: "pending", statement: message.trim() },
        { onConflict: "listing_id,applicant_id" }
      );

      // 2. Send the first message to the private inquiry channel
      const { error } = await supabase.from("messages").insert({
        channel_id: inquiryChannelId,
        sender_id:  userId,
        content:    message.trim(),
        type:       "text",
      });
      if (error) throw error;

      setSent(true);
      setMessage("");
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setSending(false);
    }
  }

  // ── Open the private chat with the shelter ───────────────────────────────
  function openChat() {
    setModalVisible(false);
    setSent(false);
    router.push({
      pathname: "/(tabs)/adopt-chat",
      params: {
        channelId:   inquiryChannelId,
        petName:     pet.name,
        shelterName: pet.shelterName,
        petImage:    pet.image,
      },
    });
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroSection}>
          <Image source={{ uri: pet.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
        </View>

        {/* Top Buttons */}
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFavorite(!isFavorite)} activeOpacity={0.7}>
            <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={24} color={isFavorite ? "#E53E3E" : "#FFF"} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>AVAILABLE</Text>
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={colors.onSurfaceVariant} />
                <Text style={styles.locationText}>{pet.location}</Text>
              </View>
            </View>
            <Text style={styles.nameText}>{pet.name}</Text>
            <Text style={styles.breedText}>{pet.breed} • {pet.age}</Text>
          </View>

          {/* Shelter info */}
          {isAdoptable && (
            <View style={styles.shelterRow}>
              <View style={styles.shelterIcon}>
                <Ionicons name="home" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.shelterLabel}>Posted by</Text>
                <Text style={styles.shelterName}>{pet.shelterName}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Info Grid */}
        <View style={styles.grid}>
          {[
            { icon: "paw",              label: "Gender", value: pet.gender || "—" },
            { icon: "cake",             label: "Age",    value: pet.age },
            { icon: "location-outline", label: "City",   value: pet.location },
            { icon: "shield-checkmark", label: "Status", value: "Vaccinated" },
          ].map((item) => (
            <View key={item.label} style={styles.gridItem}>
              <Ionicons name={item.icon as any} size={22} color={colors.primary} />
              <Text style={styles.gridLabel}>{item.label}</Text>
              <Text style={styles.gridValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* About */}
        {pet.description ? (
          <View style={styles.section}>
            <View style={styles.aboutHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.sectionTitle}>About {pet.name}</Text>
            </View>
            <View style={styles.aboutBox}>
              <Text style={styles.aboutText}>{pet.description}</Text>
            </View>
          </View>
        ) : null}

        {/* Health Records section */}
        {(loadingHealth || vaccinations.length > 0 || medNotes) && (
          <View style={styles.section}>
            <View style={styles.aboutHeader}>
              <View style={styles.accentBar} />
              <Text style={styles.sectionTitle}>Health Records</Text>
            </View>
            {loadingHealth ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <View style={styles.healthBox}>
                {vaccinations.length > 0 && (
                  <View style={styles.healthBlock}>
                    <View style={styles.healthBlockHeader}>
                      <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                      <Text style={styles.healthBlockTitle}>Vaccinations</Text>
                    </View>
                    {vaccinations.map((v: any, i: number) => (
                      <View key={i} style={styles.vaxRow}>
                        <View style={styles.vaxDot} />
                        <View style={styles.vaxInfo}>
                          <Text style={styles.vaxName}>{v.vaccine_name}</Text>
                          <Text style={styles.vaxDate}>
                            Given: {v.administered_on}
                            {v.next_due_on ? `  ·  Next: ${v.next_due_on}` : ""}
                          </Text>
                        </View>
                        <View style={styles.vaxBadge}>
                          <Text style={styles.vaxBadgeText}>✓</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                {medNotes ? (
                  <View style={[styles.healthBlock, vaccinations.length > 0 && { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "40", paddingTop: spacing.md }]}>
                    <View style={styles.healthBlockHeader}>
                      <Ionicons name="document-text-outline" size={16} color={colors.primary} />
                      <Text style={styles.healthBlockTitle}>Medical History</Text>
                    </View>
                    <Text style={styles.medText}>{medNotes}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Contact / Adopt CTA (only if listing exists) */}
        {isAdoptable && (
          <View style={styles.section}>
            <View style={styles.contactCard}>
              <Ionicons name="chatbubble-ellipses" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>Interested in {pet.name}?</Text>
                <Text style={styles.contactSub}>
                  Send a message to {pet.shelterName} to start the adoption process.
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        {isMyListing ? (
          /* Poster view — see enquiries in Chats tab */
          <View style={styles.bottomBtnRow}>
            <View style={[styles.myListingBadge, { flex: 1 }]}>
              <Ionicons name="bookmark" size={18} color={colors.primary} />
              <Text style={styles.myListingText}>Your Listing</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 2 }]}
              activeOpacity={0.85}
              onPress={() => router.push("/(tabs)/chats")}
            >
              <Ionicons name="mail-open" size={20} color={colors.onSecondary} />
              <Text style={styles.primaryBtnText}>View Enquiries</Text>
            </TouchableOpacity>
          </View>
        ) : isAdoptable ? (
          /* Adopter view */
          <View style={styles.bottomBtnRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }]}
              activeOpacity={0.85}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="heart" size={20} color={colors.onSecondary} />
              <Text style={styles.primaryBtnText}>Adopt {pet.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatIconBtn}
              activeOpacity={0.85}
              onPress={openChat}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.85}>
            <Ionicons name="heart" size={20} color={colors.onSecondary} />
            <Text style={styles.primaryBtnText}>Express Interest</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Inquiry Modal ───────────────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {!sent ? (
              <>
                <View style={styles.modalHeader}>
                  <Image source={{ uri: pet.image }} style={styles.modalPetImg} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>Adopt {pet.name}</Text>
                    <Text style={styles.modalSub}>Message to {pet.shelterName}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.fieldLabel}>Tell them about yourself</Text>
                <RNTextInput
                  style={styles.msgInput}
                  placeholder={`Hi! I'm interested in adopting ${pet.name}. A little about me and my home…`}
                  placeholderTextColor={colors.onSurfaceVariant + "80"}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <View style={styles.modalTips}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.onSurfaceVariant} />
                  <Text style={styles.tipsText}>
                    Mention your living situation, experience with pets, and why you're a good fit.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
                  onPress={handleSendInquiry}
                  disabled={!message.trim() || sending}
                  activeOpacity={0.85}
                >
                  {sending
                    ? <ActivityIndicator size="small" color={colors.onPrimary} />
                    : <><Ionicons name="send" size={18} color={colors.onPrimary} /><Text style={styles.sendBtnText}>Send Inquiry</Text></>
                  }
                </TouchableOpacity>
              </>
            ) : (
              /* ── Success state ── */
              <View style={styles.successState}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={36} color={colors.onPrimary} />
                </View>
                <Text style={styles.successTitle}>Inquiry Sent!</Text>
                <Text style={styles.successSub}>
                  {pet.shelterName} has been notified. Continue the conversation in your private chat.
                </Text>
                <TouchableOpacity style={styles.openChatBtn} onPress={openChat} activeOpacity={0.85}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={colors.onPrimary} />
                  <Text style={styles.openChatBtnText}>Open Conversation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.laterBtn} onPress={() => { setModalVisible(false); setSent(false); }}>
                  <Text style={styles.laterBtnText}>I'll check later</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  heroSection: { height: 420, width: "100%", position: "relative" },
  heroImage:   { width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", opacity: 0.15 },
  topButtons:  { position: "absolute", top: 50, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  iconBtn:     { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  profileCard: { backgroundColor: "#FFF", marginHorizontal: 20, marginTop: -50, borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8, zIndex: 5 },
  badgeRow:    { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  statusBadge: { backgroundColor: colors.secondaryContainer, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  statusText:  { fontSize: 11, fontWeight: "700", color: colors.onSecondaryContainer, letterSpacing: 1 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText:{ fontSize: 13, color: colors.onSurfaceVariant, fontWeight: "500" },
  nameText:    { fontSize: 36, fontWeight: "800", color: colors.onSurface, marginBottom: 4 },
  breedText:   { fontSize: 16, color: colors.onSurfaceVariant, fontWeight: "500" },
  quickPills:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  quickPill:   { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryContainer + "60", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  quickPillText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  shelterRow:  { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "30" },
  shelterIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center" },
  shelterLabel:{ fontSize: 11, color: colors.onSurfaceVariant },
  shelterName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  grid:        { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  gridItem:    { width: "48%", backgroundColor: colors.surfaceContainerLow, padding: 12, borderRadius: 10, alignItems: "center", gap: 4 },
  gridLabel:   { fontSize: 9, fontWeight: "600", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1 },
  gridValue:   { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  section:     { paddingHorizontal: 20, paddingTop: 24 },
  aboutHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  accentBar:   { width: 4, height: 26, backgroundColor: colors.primary, borderRadius: 2 },
  sectionTitle:{ fontSize: 20, fontWeight: "700", color: colors.onSurface },
  aboutBox:    { backgroundColor: "#FFF", padding: 20, borderRadius: 16 },
  aboutText:   { fontSize: 15, lineHeight: 24, color: colors.onSurfaceVariant },
  contactCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.primaryContainer + "80", padding: spacing.lg, borderRadius: 16 },
  contactTitle:{ fontSize: 15, fontWeight: "700", color: colors.onSurface, marginBottom: 2 },
  contactSub:  { fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 18 },
  bottomBar:   { position: "absolute", bottom: 90, left: 0, right: 0, backgroundColor: colors.surface + "F5", padding: 18, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "40" },
  bottomBtnRow:{ flexDirection: "row", gap: spacing.sm },
  primaryBtn:  { backgroundColor: colors.secondary, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, borderRadius: 28, gap: 10 },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: colors.onSecondary },
  chatIconBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.primary + "30" },
  myListingBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primaryContainer, borderRadius: 28, paddingVertical: 16, borderWidth: 1.5, borderColor: colors.primary + "40" },
  myListingText: { fontWeight: "700", fontSize: 14, color: colors.primary },

  // Health records
  healthBox:         { backgroundColor: "#fff", borderRadius: 16, padding: spacing.md },
  healthBlock:       { gap: spacing.sm },
  healthBlockHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  healthBlockTitle:  { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  vaxRow:            { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: 6 },
  vaxDot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginTop: 5 },
  vaxInfo:           { flex: 1 },
  vaxName:           { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  vaxDate:           { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },
  vaxBadge:          { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.success + "20", alignItems: "center", justifyContent: "center" },
  vaxBadgeText:      { fontSize: 12, fontWeight: "700", color: colors.success },
  medText:           { fontSize: 14, lineHeight: 22, color: colors.onSurfaceVariant },
  // Modal
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalSheet:    { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingBottom: 48, gap: spacing.md },
  handle:        { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: "center", marginBottom: spacing.sm },
  modalHeader:   { flexDirection: "row", alignItems: "center", gap: spacing.md },
  modalPetImg:   { width: 56, height: 56, borderRadius: 14 },
  modalTitle:    { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  modalSub:      { fontSize: 13, color: colors.onSurfaceVariant },
  fieldLabel:    { fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant, textTransform: "uppercase", letterSpacing: 1 },
  msgInput:      { backgroundColor: colors.surfaceContainerHighest, borderRadius: 16, padding: spacing.md, fontSize: 15, color: colors.onSurface, minHeight: 120, maxHeight: 180 },
  modalTips:     { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  tipsText:      { flex: 1, fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18 },
  sendBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 16 },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText:   { fontSize: 16, fontWeight: "700", color: colors.onPrimary },

  // Success
  successState:  { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.md },
  successIcon:   { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.success, alignItems: "center", justifyContent: "center" },
  successTitle:  { fontSize: 24, fontWeight: "800", color: colors.onSurface },
  successSub:    { fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center", lineHeight: 22, paddingHorizontal: spacing.md },
  openChatBtn:   { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 14, paddingHorizontal: spacing.xl },
  openChatBtnText: { fontSize: 15, fontWeight: "700", color: colors.onPrimary },
  laterBtn:      { paddingVertical: spacing.sm },
  laterBtnText:  { color: colors.onSurfaceVariant, fontSize: 14 },
});
