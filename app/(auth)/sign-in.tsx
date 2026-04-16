import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, TextInput, Button, Card } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export default function SignInScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Validation Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) {
      Alert.alert("Sign in failed", result.error.message);
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
            <Ionicons name="paw" size={80} color={colors.surface} />
            <Text variant="headlineLarge" style={styles.title}>
              Welcome to PawPal
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Your complete pet care companion
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
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
                icon="login"
              >
                Sign In
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text variant="bodyMedium" style={styles.footerText}>
              Don't have an account?{" "}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <Button textColor={colors.surface} compact>
                Create Account
              </Button>
            </Link>
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.surface,
  },
});
