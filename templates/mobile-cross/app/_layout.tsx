import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#fff" },
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: "#fff" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Studio Zero" }} />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
