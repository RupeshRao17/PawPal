import { useState, useRef, useEffect } from "react";
import { ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from "react-native";
import { Text, Card, TextInput, Button, Avatar, Chip, ActivityIndicator } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { isSupabaseConfigured, OFFLINE_HINT, supabase } from "@/lib/supabase";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

const SYSTEM_PROMPT = `You are PawBot, a friendly AI pet health assistant for PawPal — an Indian pet care app.
Help owners with pet health, nutrition, behaviour, breed-specific care, vaccination schedules, and symptom guidance.
Always recommend seeing a vet for serious symptoms. Keep answers concise (2–3 paragraphs max). Be warm and empathetic.`;

const QUICK_SUGGESTIONS = [
  "How to care for a new puppy?",
  "Best food for cats?",
  "Signs of pet illness?",
  "Puppy vaccine schedule?",
  "My dog is not eating 🐶",
  "Deworming frequency?",
];

async function callGemini(messages: ChatMessage[], userMessage: string): Promise<string> {
  if (!GEMINI_KEY) return "PawBot needs a GEMINI_API_KEY in .env, or connect Supabase to use the Edge Function.";
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      ...messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: userMessage }] },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };
  const res = await fetch(GEMINI_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return "PawBot is having trouble right now. Please try again.";
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response. Please try again.";
}

export default function PawBotScreen() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi! I'm PawBot 🐾 — your AI pet care assistant.\n\nAsk me anything about pet health, nutrition, training, or general care. How can I help you today?",
      }]);
    }
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) scrollViewRef.current.scrollToEnd({ animated: true });
  }, [messages]);

  const ask = async (message?: string) => {
    const text = (message ?? prompt).trim();
    if (!text || loading) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setPrompt("");
    setLoading(true);

    let reply = "";
    if (supabase && isSupabaseConfigured) {
      // Try Supabase Edge Function first
      const { data, error } = await supabase.functions.invoke("pawbot", { body: { messages: history } });
      if (!error && data?.reply) {
        reply = data.reply;
      } else {
        // Fallback to direct Gemini call
        reply = await callGemini(messages, text);
      }
    } else if (GEMINI_KEY) {
      reply = await callGemini(messages, text);
    } else {
      reply = "Backend not connected. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, or add EXPO_PUBLIC_GEMINI_API_KEY for direct AI access.";
    }

    setMessages([...history, { role: "assistant", content: reply }]);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.botAvatar}>
            <Ionicons name="paw" size={24} color={colors.surface} />
          </View>
          <View>
            <Text variant="titleLarge" style={styles.headerTitle}>PawBot</Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>AI Pet Care Assistant • Always Online</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView ref={scrollViewRef} style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {messages.map((msg, i) => (
          <View key={i} style={[styles.messageWrapper, msg.role === "user" ? styles.userMessage : styles.botMessage]}>
            {msg.role === "assistant" && (
              <Avatar.Icon size={32} icon="paw" style={styles.botIcon} />
            )}
            <Card style={[styles.messageCard, msg.role === "user" ? styles.userCard : styles.botCard]}>
              <Card.Content style={styles.messageContent}>
                <Text variant="bodyMedium" style={[styles.messageText, msg.role === "user" && styles.userMessageText]}>
                  {msg.content}
                </Text>
              </Card.Content>
            </Card>
          </View>
        ))}

        {loading && (
          <View style={[styles.messageWrapper, styles.botMessage]}>
            <Avatar.Icon size={32} icon="paw" style={styles.botIcon} />
            <Card style={styles.botCard}>
              <Card.Content style={styles.typingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text variant="bodySmall" style={styles.typingText}>PawBot is thinking...</Text>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Quick suggestions (shown only at start) */}
        {messages.length <= 1 && !loading && (
          <View style={styles.suggestionsContainer}>
            <Text variant="bodyMedium" style={styles.suggestionsTitle}>Quick Questions:</Text>
            <View style={styles.suggestions}>
              {QUICK_SUGGESTIONS.map((s, i) => (
                <Chip key={i} onPress={() => ask(s)} style={styles.suggestionChip} textStyle={styles.suggestionText}>{s}</Chip>
              ))}
            </View>
          </View>
        )}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          placeholder="Ask about pet care..."
          value={prompt}
          onChangeText={setPrompt}
          style={styles.input}
          multiline
          maxLength={500}
          disabled={loading}
          right={
            <TextInput.Icon
              icon="send"
              onPress={() => ask()}
              disabled={loading || !prompt.trim()}
              color={prompt.trim() && !loading ? colors.primary : colors.onSurfaceVariant}
            />
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.md, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerContent: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  botAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "700", color: colors.onSurface },
  headerSubtitle: { color: colors.onSurfaceVariant },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  messageWrapper: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, maxWidth: "85%" },
  userMessage: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  botMessage: { alignSelf: "flex-start" },
  botIcon: { backgroundColor: colors.primary },
  messageCard: { flex: 1 },
  userCard: { backgroundColor: colors.primary },
  botCard: { backgroundColor: colors.surface },
  messageContent: { paddingVertical: spacing.sm },
  messageText: { color: colors.onSurface, lineHeight: 22 },
  userMessageText: { color: colors.surface },
  typingIndicator: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  typingText: { color: colors.onSurfaceVariant },
  suggestionsContainer: { marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: 16, gap: spacing.md },
  suggestionsTitle: { fontWeight: "600", color: colors.onSurface },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  suggestionChip: { backgroundColor: colors.primary + "20" },
  suggestionText: { color: colors.primary, fontSize: 12 },
  inputContainer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  input: { backgroundColor: colors.surfaceVariant },
});
