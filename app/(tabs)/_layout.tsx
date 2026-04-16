import { Tabs } from "expo-router";
import { CustomTabBar } from "@/components/CustomTabBar";
import { FloatingPawBot } from "@/components/FloatingPawBot";
import { View } from "react-native";

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {/* Visible in tab bar */}
        <Tabs.Screen name="index"    options={{ title: "Home" }} />
        <Tabs.Screen name="adoption" options={{ title: "Adopt" }} />
        <Tabs.Screen name="health"   options={{ title: "Health" }} />
        <Tabs.Screen name="vets"     options={{ title: "Vets" }} />
        <Tabs.Screen name="profile"  options={{ title: "Profile" }} />

        {/* Hidden screens — navigated to programmatically */}
        <Tabs.Screen name="list-pet"   options={{ href: null }} />
        <Tabs.Screen name="pet-detail" options={{ href: null }} />
        <Tabs.Screen name="pets"       options={{ href: null }} />
        <Tabs.Screen name="community"  options={{ href: null }} />
        <Tabs.Screen name="pawbot"     options={{ href: null }} />
      </Tabs>
      <FloatingPawBot />
    </View>
  );
}
