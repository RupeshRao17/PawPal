import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { CustomTabBar } from "@/components/CustomTabBar";
import { FloatingPawBot } from "@/components/FloatingPawBot";
import { useAuthStore } from "@/stores/auth-store";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function TabsLayout() {
  const session = useAuthStore((s) => s.session);

  if (isSupabaseConfigured && !session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* Visible in tab bar */}
        <Tabs.Screen name="index"     options={{ title: "Home" }} />
        <Tabs.Screen name="health"    options={{ title: "Health" }} />
        <Tabs.Screen name="community" options={{ title: "Community" }} />
        <Tabs.Screen name="vets"      options={{ title: "Vets" }} />
        <Tabs.Screen name="profile"   options={{ title: "Profile" }} />

        {/* Hidden — navigated programmatically */}
        <Tabs.Screen name="adoption"   options={{ href: null }} />
        <Tabs.Screen name="list-pet"   options={{ href: null }} />
        <Tabs.Screen name="pet-detail" options={{ href: null }} />
        <Tabs.Screen name="pets"       options={{ href: null }} />
        <Tabs.Screen name="pawbot"     options={{ href: null }} />
      </Tabs>
      <FloatingPawBot />
    </View>
  );
}
