import { Redirect, Stack } from "expo-router";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function AuthLayout() {
  if (!isSupabaseConfigured) {
    return <Redirect href="/(tabs)" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
