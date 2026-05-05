import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Root redirect:
 *  - Logged in  → main tabs
 *  - Not logged in → sign-in screen
 */
export default function Index() {
  const session = useAuthStore((state) => state.session);
  return <Redirect href={session ? "/(tabs)" : "/(auth)/sign-in"} />;
}
