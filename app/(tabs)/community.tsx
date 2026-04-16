import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { Text, Card, TextInput, Button, Avatar, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { EmptyState } from "@/components/EmptyState";

type Message = { id: string; channel_id: string; content: string; sent_at: string };

export default function CommunityScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase
      .from("messages")
      .select("id,channel_id,content,sent_at")
      .order("sent_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setMessages((data as Message[]) ?? []);
        setLoading(false);
      });
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim() || !supabase) return;
    
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      channel_id: "general",
      content: newMessage.trim(),
    });
    setSending(false);
    
    if (error) {
      Alert.alert("Failed", error.message);
      return;
    }
    
    setNewMessage("");
    // Reload messages
    const { data } = await supabase
      .from("messages")
      .select("id,channel_id,content,sent_at")
      .order("sent_at", { ascending: false })
      .limit(30);
    setMessages((data as Message[]) ?? []);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Community
        </Text>
        <Chip icon="people" style={styles.countChip}>
          {messages.length} messages
        </Chip>
      </View>

      {!isSupabaseConfigured && (
        <Card style={styles.offlineCard}>
          <Card.Content style={styles.offlineContent}>
            <Ionicons name="cloud-offline" size={20} color={colors.warning} />
            <Text variant="bodySmall" style={styles.offlineText}>
              {OFFLINE_HINT}
            </Text>
          </Card.Content>
        </Card>
      )}

      {messages.length === 0 ? (
        <EmptyState
          icon="chatbubble-outline"
          title="No messages yet"
          message="Be the first to start the conversation!"
        />
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {[...messages].reverse().map((message, index) => {
            const isUser = index % 2 === 0; // Simulated user detection
            return (
              <View
                key={message.id}
                style={[styles.messageWrapper, isUser ? styles.userMessage : styles.otherMessage]}
              >
                {!isUser && (
                  <Avatar.Icon size={32} icon="account" style={styles.avatar} />
                )}
                <Card
                  style={[
                    styles.messageCard,
                    isUser ? styles.userCard : styles.otherCard,
                  ]}
                >
                  <Card.Content style={styles.messageContent}>
                    {!isUser && (
                      <Text variant="labelSmall" style={styles.senderName}>
                        Community Member
                      </Text>
                    )}
                    <Text
                      variant="bodyMedium"
                      style={[styles.messageText, isUser && styles.userMessageText]}
                    >
                      {message.content}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={[styles.timestamp, isUser && styles.userTimestamp]}
                    >
                      {formatTime(message.sent_at)}
                    </Text>
                  </Card.Content>
                </Card>
              </View>
            );
          })}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <TextInput
          mode="outlined"
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.input}
          multiline
          maxLength={500}
          disabled={sending}
        />
        <Button
          mode="contained"
          onPress={handleSend}
          loading={sending}
          disabled={sending || !newMessage.trim()}
          style={styles.sendButton}
          icon="send"
        >
          Send
        </Button>
      </KeyboardAvoidingView>
    </View>
  );
}

import { Alert } from "react-native";
import { Chip } from "react-native-paper";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: "800",
    color: colors.onSurface,
  },
  countChip: {
    backgroundColor: colors.accent + "20",
  },
  offlineCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.warning + "20",
  },
  offlineContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  offlineText: {
    flex: 1,
    color: colors.warning,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  messageWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: spacing.sm,
    maxWidth: "85%",
  },
  userMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  avatar: {
    marginRight: spacing.xs,
    backgroundColor: colors.accent,
  },
  messageCard: {
    flex: 1,
  },
  userCard: {
    backgroundColor: colors.primary,
  },
  otherCard: {
    backgroundColor: colors.surface,
  },
  messageContent: {
    paddingVertical: spacing.sm,
  },
  senderName: {
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  messageText: {
    color: colors.onSurface,
  },
  userMessageText: {
    color: colors.surface,
  },
  timestamp: {
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  userTimestamp: {
    color: colors.surface + "CC",
  },
  bottomPadding: {
    height: 80,
  },
  inputContainer: {
    flexDirection: "row",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
  },
  sendButton: {
    minWidth: 80,
  },
});
