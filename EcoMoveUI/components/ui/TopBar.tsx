import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Leaf } from "lucide-react-native";

export default function TopBar() {
  return (
    <SafeAreaView edges={["top"]} style={styles.wrapper}>
      <View style={styles.container}>
        <Leaf size={22} color="#059669" />
        <Text style={styles.title}>EcoMove</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
  },
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#065F46",
    marginLeft: 8,
  },
});
