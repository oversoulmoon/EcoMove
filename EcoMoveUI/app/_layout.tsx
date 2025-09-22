import { Stack } from "expo-router";
import { LogBox } from "react-native";

LogBox.ignoreAllLogs();
export default function RootLayout() {
  return (
    <Stack initialRouteName="loading" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="modal" />
      <Stack.Screen
        name="capture"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}
