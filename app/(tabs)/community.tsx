import { useEffect, useRef, useState, useCallback } from "react";
import {
  Alert, FlatList, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, TextInput as RNTextInput,
  TouchableOpacity, View,
} from "react-native";
import { Text, Avatar, ActivityIndicator, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

// ─── Types ────────────────────────────────────────────────────────────────────

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  member_count: number;
  isJoined?: boolean;
  lastMessage?: string;
};

type Message = {
  id: string;
  community_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  profiles?: { full_name: string; avatar_url: string | null } | null;
};

type View = "list" | "chat";

// ─── Helper — initials avatar color from name ─────────────────────────────────
const AVATAR_COLORS = ["#E65100","#6A1B9A","#2E7D32","#0277BD","#C62828","#00695C","#4527A0","#F57F17"];
function colorFromName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const session = useAuthStore((s) => s.session);
  const userId  = session?.user?.id ?? "";

  const [view,          setView]          = useState<View>("list");
  const [communities,   setCommunities]   = useState<Community[]>([]);
  const [activeCom,     setActiveCom]     = useState<Community | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [newMsg,        setNewMsg]        = useState("");
  const [loadingList,   setLoadingList]   = useState(true);
  const [loadingChat,   setLoadingChat]   = useState(false);
  const [sending,       setSending]       = useState(false);
  const [joiningId,     setJoiningId]     = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const realtimeRef = useRef<any>(null);

  // ── Load community list ──────────────────────────────────────────────────────
  const loadCommunities = useCallback(async () => {
    if (!supabase || !userId) return;
    setLoadingList(true);

    // Fetch all communities + my memberships in parallel
    const [comRes, memRes] = await Promise.all([
      supabase.from("communities").select("*").order("member_count", { ascending: false }),
      supabase.from("community_members").select("community_id").eq("user_id", userId),
    ]);

    const joined = new Set((memRes.data ?? []).map((m: any) => m.community_id));
    const list = (comRes.data ?? []).map((c: any) => ({ ...c, isJoined: joined.has(c.id) }));
    setCommunities(list as Community[]);
    setLoadingList(false);
  }, [userId]);

  useEffect(() => { loadCommunities(); }, [loadCommunities]);

  // ── Join / Leave ─────────────────────────────────────────────────────────────
  async function toggleJoin(com: Community) {
    if (!supabase || !userId) return;
    setJoiningId(com.id);
    if (com.isJoined) {
      await supabase.from("community_members")
        .delete().eq("community_id", com.id).eq("user_id", userId);
    } else {
      await supabase.from("community_members")
        .insert({ community_id: com.id, user_id: userId });
    }
    await loadCommunities();
    setJoiningId(null);
  }

  // ── Open chat ────────────────────────────────────────────────────────────────
  async function openChat(com: Community) {
    // Auto-join if not a member
    if (!com.isJoined && supabase && userId) {
      await supabase.from("community_members")
        .insert({ community_id: com.id, user_id: userId });
      await loadCommunities();
    }
    setActiveCom(com);
    setView("chat");
    loadMessages(com.id);
    subscribeToMessages(com.id);
  }

  function closeChat() {
    realtimeRef.current?.unsubscribe();
    realtimeRef.current = null;
    setView("list");
    setActiveCom(null);
    setMessages([]);
  }

  // ── Load messages ────────────────────────────────────────────────────────────
  async function loadMessages(communityId: string) {
    if (!supabase) return;
    setLoadingChat(true);
    const { data } = await supabase
      .from("messages")
      .select("*, profiles(full_name, avatar_url)")
      .eq("channel_id", communityId)
      .order("sent_at", { ascending: true })
      .limit(60);
    setMessages((data as Message[]) ?? []);
    setLoadingChat(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  // ── Realtime subscription ────────────────────────────────────────────────────
  function subscribeToMessages(communityId: string) {
    if (!supabase) return;
    realtimeRef.current?.unsubscribe();
    realtimeRef.current = supabase
      .channel(`community:${communityId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `channel_id=eq.${communityId}`,
      }, async (payload) => {
        // Fetch full row with profile
        const { data } = await supabase!
          .from("messages")
          .select("*, profiles(full_name, avatar_url)")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          setMessages((prev) => [...prev, data as Message]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
        }
      })
      .subscribe();
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  async function handleSend() {
    const text = newMsg.trim();
    if (!text || !supabase || !activeCom || !userId) return;
    setSending(true);
    setNewMsg("");
    const { error } = await supabase.from("messages").insert({
      channel_id: activeCom.id,
      sender_id:  userId,
      content:    text,
      type:       "text",
    });
    setSending(false);
    if (error) Alert.alert("Failed to send", error.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW: Community List
  // ─────────────────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineMedium" style={styles.title}>Communities</Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Join conversations that matter to you
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={styles.headerBadgeText}>
              {communities.filter((c) => c.isJoined).length} joined
            </Text>
          </View>
        </View>

        {loadingList ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {/* Joined section */}
            {communities.some((c) => c.isJoined) && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionLabel}>YOUR COMMUNITIES</Text>
                {communities.filter((c) => c.isJoined).map((com) => (
                  <CommunityCard
                    key={com.id}
                    community={com}
                    userId={userId}
                    joiningId={joiningId}
                    onChat={() => openChat(com)}
                    onToggle={() => toggleJoin(com)}
                  />
                ))}
              </View>
            )}

            {/* Explore section */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>EXPLORE</Text>
              {communities.filter((c) => !c.isJoined).map((com) => (
                <CommunityCard
                  key={com.id}
                  community={com}
                  userId={userId}
                  joiningId={joiningId}
                  onChat={() => openChat(com)}
                  onToggle={() => toggleJoin(com)}
                />
              ))}
              {communities.filter((c) => !c.isJoined).length === 0 && (
                <Text style={styles.allJoined}>You've joined all communities 🎉</Text>
              )}
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>
        )}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VIEW: Chat Room
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Chat Header */}
      <View style={[styles.chatHeader, { borderBottomColor: activeCom!.color + "40" }]}>
        <TouchableOpacity onPress={closeChat} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={[styles.chatHeaderIcon, { backgroundColor: activeCom!.color + "25" }]}>
          <Text style={styles.chatHeaderEmoji}>{activeCom!.emoji}</Text>
        </View>
        <View style={styles.chatHeaderInfo}>
          <Text variant="titleMedium" style={styles.chatHeaderTitle} numberOfLines={1}>
            {activeCom!.name}
          </Text>
          <Text variant="bodySmall" style={styles.chatHeaderSub}>
            {activeCom!.member_count} members
          </Text>
        </View>
      </View>

      {/* Messages */}
      {loadingChat ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatEmoji}>{activeCom!.emoji}</Text>
              <Text style={styles.emptyChatTitle}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Be the first to say something!</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe      = item.sender_id === userId;
            const name      = item.profiles?.full_name ?? "Member";
            const prevItem  = index > 0 ? messages[index - 1] : null;
            const showName  = !isMe && prevItem?.sender_id !== item.sender_id;
            const showDate  = !prevItem || new Date(item.sent_at).toDateString() !== new Date(prevItem.sent_at).toDateString();

            return (
              <>
                {showDate && (
                  <View style={styles.dateDivider}>
                    <Text style={styles.dateDividerText}>
                      {new Date(item.sent_at).toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" })}
                    </Text>
                  </View>
                )}
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  {!isMe && (
                    <View style={[styles.msgAvatar, { backgroundColor: colorFromName(name) }]}>
                      <Text style={styles.msgAvatarText}>{initials(name)}</Text>
                    </View>
                  )}
                  <View style={[styles.msgBubbleWrap, isMe && styles.msgBubbleWrapMe]}>
                    {showName && <Text style={styles.msgSender}>{name}</Text>}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                        {item.content}
                      </Text>
                    </View>
                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                      {formatTime(item.sent_at)}
                    </Text>
                  </View>
                </View>
              </>
            );
          }}
        />
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}>
        <View style={styles.inputBar}>
          <RNTextInput
            style={styles.msgInput}
            placeholder="Message…"
            placeholderTextColor={colors.onSurfaceVariant + "80"}
            value={newMsg}
            onChangeText={setNewMsg}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMsg.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!newMsg.trim() || sending}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Community Card Component ─────────────────────────────────────────────────

function CommunityCard({
  community, userId, joiningId, onChat, onToggle,
}: {
  community: Community;
  userId: string;
  joiningId: string | null;
  onChat: () => void;
  onToggle: () => void;
}) {
  const isLoading = joiningId === community.id;
  return (
    <TouchableOpacity style={styles.comCard} activeOpacity={0.88} onPress={onChat}>
      {/* Colored left strip */}
      <View style={[styles.comStrip, { backgroundColor: community.color }]} />

      {/* Emoji icon */}
      <View style={[styles.comEmoji, { backgroundColor: community.color + "20" }]}>
        <Text style={styles.comEmojiText}>{community.emoji}</Text>
      </View>

      {/* Info */}
      <View style={styles.comInfo}>
        <Text variant="titleMedium" style={styles.comName} numberOfLines={1}>
          {community.name}
        </Text>
        <Text variant="bodySmall" style={styles.comDesc} numberOfLines={2}>
          {community.description}
        </Text>
        <View style={styles.comMeta}>
          <Ionicons name="people-outline" size={13} color={colors.onSurfaceVariant} />
          <Text style={styles.comMetaText}>{community.member_count} members</Text>
          {community.isJoined && (
            <View style={styles.joinedDot} />
          )}
        </View>
      </View>

      {/* Join / Leave button */}
      <TouchableOpacity
        style={[styles.joinBtn, community.isJoined && styles.joinedBtn]}
        onPress={(e) => { e.stopPropagation(); onToggle(); }}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size={12} color={community.isJoined ? colors.onSurfaceVariant : colors.onPrimary} />
        ) : (
          <Text style={[styles.joinBtnText, community.isJoined && styles.joinedBtnText]}>
            {community.isJoined ? "Joined ✓" : "Join"}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  centered:   { flex: 1, justifyContent: "center", alignItems: "center" },

  // List header
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  title:          { fontWeight: "800", color: colors.onSurface },
  subtitle:       { color: colors.onSurfaceVariant, marginTop: 2 },
  headerBadge:    { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primary + "15", borderRadius: 16, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  headerBadgeText:{ fontSize: 12, fontWeight: "700", color: colors.primary },
  listContent:    { paddingHorizontal: spacing.md },
  sectionBlock:   { marginBottom: spacing.lg },
  sectionLabel:   { fontSize: 10, fontWeight: "800", color: colors.onSurfaceVariant, letterSpacing: 1.5, marginBottom: spacing.sm },
  allJoined:      { color: colors.onSurfaceVariant, textAlign: "center", padding: spacing.lg },

  // Community card
  comCard:    { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, marginBottom: spacing.sm, overflow: "hidden", elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  comStrip:   { width: 4, alignSelf: "stretch" },
  comEmoji:   { width: 52, height: 52, margin: spacing.md, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  comEmojiText: { fontSize: 26 },
  comInfo:    { flex: 1, paddingVertical: spacing.md, paddingRight: spacing.xs },
  comName:    { fontWeight: "700", color: colors.onSurface },
  comDesc:    { color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 18 },
  comMeta:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  comMetaText:{ fontSize: 11, color: colors.onSurfaceVariant },
  joinedDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginLeft: 4 },
  joinBtn:    { marginRight: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.primary },
  joinedBtn:  { backgroundColor: colors.surfaceContainerHigh, borderWidth: 1, borderColor: colors.outlineVariant },
  joinBtnText:{ fontSize: 12, fontWeight: "700", color: colors.onPrimary },
  joinedBtnText: { color: colors.onSurfaceVariant },

  // Chat header
  chatHeader:      { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, backgroundColor: colors.surface },
  backBtn:         { width: 36 },
  chatHeaderIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  chatHeaderEmoji: { fontSize: 22 },
  chatHeaderInfo:  { flex: 1 },
  chatHeaderTitle: { fontWeight: "700", color: colors.onSurface },
  chatHeaderSub:   { color: colors.onSurfaceVariant },

  // Messages
  messageList: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  emptyChat:   { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: spacing.sm },
  emptyChatEmoji: { fontSize: 48 },
  emptyChatTitle: { fontSize: 18, fontWeight: "700", color: colors.onSurface },
  emptyChatSub:   { color: colors.onSurfaceVariant },

  dateDivider:     { alignItems: "center", marginVertical: spacing.md },
  dateDividerText: { fontSize: 11, color: colors.onSurfaceVariant, backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 10 },

  msgRow:      { flexDirection: "row", alignItems: "flex-end", marginBottom: 6, gap: 8 },
  msgRowMe:    { justifyContent: "flex-end" },
  msgAvatar:   { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 2, flexShrink: 0 },
  msgAvatarText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  msgBubbleWrap:   { maxWidth: "75%", gap: 2 },
  msgBubbleWrapMe: { alignItems: "flex-end" },
  msgSender:   { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, marginLeft: 4, marginBottom: 2 },
  bubble:      { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  bubbleMe:    { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText:  { fontSize: 15, color: colors.onSurface, lineHeight: 21 },
  bubbleTextMe:{ color: colors.onPrimary },
  msgTime:     { fontSize: 10, color: colors.onSurfaceVariant, marginLeft: 4 },
  msgTimeMe:   { marginLeft: 0, marginRight: 4, textAlign: "right" },

  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 116 : 104,   // clear fixed tab bar (bottom:20 + ~84px height)
    backgroundColor: colors.surface, borderTopWidth: 1,
    borderTopColor: colors.outlineVariant + "40",
  },
  msgInput: {
    flex: 1, minHeight: 42, maxHeight: 110,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: colors.onSurface,
  },
  sendBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { backgroundColor: colors.primary + "50" },
});
