import { useEffect, useRef, useState } from "react";
import {
  FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, TextInput as RNTextInput,
  TouchableOpacity, View, Image,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  profiles?: { full_name: string; avatar_url: string | null } | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

export default function AdoptChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const session = useAuthStore((s) => s.session);
  const userId  = session?.user?.id ?? "";

  const channelId   = String(params.channelId   ?? "");
  const petName     = String(params.petName     ?? "Pet");
  const shelterName = String(params.shelterName ?? "Shelter");
  const petImage    = String(params.petImage    ?? "");

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg,   setNewMsg]   = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const flatRef = useRef<FlatList>(null);
  const realtimeRef = useRef<any>(null);

  useEffect(() => {
    loadMessages();
    subscribeRealtime();
    return () => { realtimeRef.current?.unsubscribe(); };
  }, [channelId]);

  async function loadMessages() {
    if (!supabase) { setLoading(false); return; }
    const { data } = await supabase
      .from("messages")
      .select("*, profiles(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("sent_at", { ascending: true })
      .limit(100);
    setMessages((data as Message[]) ?? []);
    setLoading(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
  }

  function subscribeRealtime() {
    if (!supabase) return;
    realtimeRef.current = supabase
      .channel(`adopt-chat:${channelId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        const { data } = await supabase!
          .from("messages")
          .select("*, profiles(full_name, avatar_url)")
          .eq("id", payload.new.id)
          .single();
        if (data) {
          setMessages((prev) => [...prev, data as Message]);
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
        }
      })
      .subscribe();
  }

  async function handleSend() {
    const text = newMsg.trim();
    if (!text || !supabase || !userId) return;
    setSending(true);
    setNewMsg("");
    await supabase.from("messages").insert({
      channel_id: channelId,
      sender_id:  userId,
      content:    text,
      type:       "text",
    });
    setSending(false);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        {!!petImage && (
          <Image source={{ uri: petImage }} style={styles.headerImg} />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{petName} Inquiry</Text>
          <Text style={styles.headerSub}>{shelterName}</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Info banner */}
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
        <Text style={styles.bannerText}>
          This is a private conversation about adopting {petName}. Be honest and detailed — it helps the shelter find the right match.
        </Text>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatTitle}>Start the conversation</Text>
              <Text style={styles.emptyChatSub}>
                Your inquiry has been sent. Continue the conversation below.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isMe = item.sender_id === userId;
            const prevItem = index > 0 ? messages[index - 1] : null;
            const showDate = !prevItem || formatDate(item.sent_at) !== formatDate(prevItem.sent_at);
            const showName = !isMe && prevItem?.sender_id !== item.sender_id;

            return (
              <>
                {showDate && (
                  <View style={styles.dateLine}>
                    <Text style={styles.dateText}>{formatDate(item.sent_at)}</Text>
                  </View>
                )}
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
                    {showName && (
                      <Text style={styles.senderName}>
                        {item.profiles?.full_name ?? shelterName}
                      </Text>
                    )}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                        {item.content}
                      </Text>
                    </View>
                    <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                      {formatTime(item.sent_at)}
                    </Text>
                  </View>
                </View>
              </>
            );
          }}
        />
      )}

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inputBar}>
          <RNTextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={colors.onSurfaceVariant + "80"}
            value={newMsg}
            onChangeText={setNewMsg}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMsg.trim() || sending) && styles.sendBtnOff]}
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

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header:      { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + "30", backgroundColor: colors.surface },
  backBtn:     { width: 36 },
  headerImg:   { width: 40, height: 40, borderRadius: 10 },
  headerInfo:  { flex: 1 },
  headerTitle: { fontWeight: "700", fontSize: 16, color: colors.onSurface },
  headerSub:   { fontSize: 12, color: colors.onSurfaceVariant },
  onlineDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  banner:      { flexDirection: "row", gap: spacing.sm, backgroundColor: colors.primaryContainer + "60", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: "flex-start" },
  bannerText:  { flex: 1, fontSize: 12, color: colors.onSurfaceVariant, lineHeight: 18 },
  centered:    { flex: 1, alignItems: "center", justifyContent: "center" },
  messageList: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  emptyChat:   { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
  emptyChatTitle: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  emptyChatSub:   { fontSize: 13, color: colors.onSurfaceVariant, textAlign: "center" },
  dateLine:    { alignItems: "center", marginVertical: spacing.md },
  dateText:    { fontSize: 11, color: colors.onSurfaceVariant, backgroundColor: colors.surfaceContainerHigh, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 10 },
  msgRow:      { flexDirection: "row", marginBottom: 6 },
  msgRowMe:    { justifyContent: "flex-end" },
  bubbleWrap:  { maxWidth: "78%", gap: 2 },
  bubbleWrapMe:{ alignItems: "flex-end" },
  senderName:  { fontSize: 11, fontWeight: "700", color: colors.onSurfaceVariant, marginLeft: 4, marginBottom: 2 },
  bubble:      { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 4, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  bubbleMe:    { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleText:  { fontSize: 15, color: colors.onSurface, lineHeight: 21 },
  bubbleTextMe:{ color: colors.onPrimary },
  timeText:    { fontSize: 10, color: colors.onSurfaceVariant, marginLeft: 4 },
  timeTextMe:  { marginLeft: 0, marginRight: 4, textAlign: "right" },
  inputBar:    { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, paddingBottom: Platform.OS === "ios" ? 28 : spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant + "40" },
  input:       { flex: 1, minHeight: 42, maxHeight: 110, backgroundColor: colors.surfaceContainerHighest, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: colors.onSurface },
  sendBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  sendBtnOff:  { backgroundColor: colors.primary + "50" },
});
