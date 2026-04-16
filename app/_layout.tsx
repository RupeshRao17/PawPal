import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { useAuthStore } from "@/stores/auth-store";
import { colors } from "@/theme/colors";
import { StatusBar } from "expo-status-bar";

const pawpalTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.surface,
    primaryContainer: colors.primaryLight,
    onPrimaryContainer: colors.surface,
    secondary: colors.secondary,
    onSecondary: colors.surface,
    secondaryContainer: colors.secondary + "20",
    onSecondaryContainer: colors.onSurface,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    onSurface: colors.onSurface,
    onSurfaceVariant: colors.onSurfaceVariant,
    error: colors.error,
    onError: colors.surface,
    outline: colors.border,
    outlineVariant: colors.border,
  },
  roundness: 16,
};

export default function RootLayout() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <PaperProvider theme={pawpalTheme}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </PaperProvider>
  );
}
