import { Redirect } from "expo-router";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

export default function Index() {
  const session = useAuthStore((state) => state.session);
  if (!isSupabaseConfigured) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href={session ? "/(tabs)" : "/(auth)/sign-in"} />;
}
