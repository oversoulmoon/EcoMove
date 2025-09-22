import { Tabs } from "expo-router";
import FloatingTabBar from "@/components/ui/FloatingTabBar";
import TopBar from "@/components/ui/TopBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: true, header: () => <TopBar /> }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="scanner" options={{ title: "Scanner" }} />
      <Tabs.Screen name="impact" options={{ title: "Impact" }} />
      <Tabs.Screen name="guide" options={{ title: "Guide" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
    </Tabs>
  );
}
