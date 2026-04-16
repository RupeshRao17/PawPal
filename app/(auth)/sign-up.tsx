import { useState } from "react";
import { router } from "expo-router";
import { Alert, StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function SignUpScreen() {
  const signUp = useAuthStore((state) => state.signUp);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Validation Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const result = await signUp({ fullName, email: email.trim(), password });
    setLoading(false);
    if (result.error) {
      Alert.alert("Sign up failed", result.error.message);
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    // @ts-ignore - LinearGradient type compatibility with React 19
    <LinearGradient
      colors={[colors.primary, colors.primaryDark]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Ionicons name="person-add" size={80} color={colors.surface} />
            <Text variant="headlineLarge" style={styles.title}>
              Join PawPal
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Create your account to get started
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <TextInput
                label="Full Name"
                mode="outlined"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
                left={<TextInput.Icon icon="account" />}
                disabled={loading}
              />
              <TextInput
                label="Email"
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                left={<TextInput.Icon icon="email" />}
                disabled={loading}
              />
              <TextInput
                label="Password"
                mode="outlined"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                left={<TextInput.Icon icon="lock" />}
                disabled={loading}
              />
              <Button
                mode="contained"
                onPress={onSubmit}
                style={styles.button}
                loading={loading}
                disabled={loading}
                icon="account-plus"
              >
                Create Account
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Button
              textColor={colors.surface}
              onPress={() => router.back()}
              compact
            >
              Already have an account? Sign In
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  title: {
    color: colors.surface,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: colors.surface + "CC",
    textAlign: "center",
  },
  card: {
    borderRadius: 20,
    elevation: 8,
  },
  cardContent: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: spacing.sm,
    paddingVertical: 6,
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
});
