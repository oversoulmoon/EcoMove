import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Camera, BarChart2, MapPin, Users } from "lucide-react-native";

const ICONS: Record<string, React.ComponentType<any>> = {
  scanner: Camera,
  impact: BarChart2,
  guide: MapPin,
  community: Users,
};

const LABELS: Record<string, string> = {
  scanner: "Scanner",
  impact: "Impact",
  guide: "Guide",
  community: "Community",
};

export default function FloatingTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const Icon = ICONS[route.name] ?? Camera;
          const label = LABELS[route.name] ?? route.name;

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.item}>
              <View style={[styles.pill, isFocused && styles.pillActive]}>
                <Icon size={26} color={isFocused ? "white" : "#6b7280"} />
                <Text
                  style={[styles.label, isFocused && styles.labelActive]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16, 
  },
  container: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 14, 
    paddingHorizontal: 8, 
    borderRadius: 30,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  item: {
    flex: 1, 
  },
  pill: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: "#10b981",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 4,
  },
  labelActive: {
    color: "white",
  },
});
