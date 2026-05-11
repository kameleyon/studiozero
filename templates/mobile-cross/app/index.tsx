import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Studio Zero Mobile</Text>
      <Text style={styles.subtitle}>
        Expo + Expo Router + TypeScript. Replace this scaffold with your app.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel="Get started — primary action"
      >
        <Text style={styles.ctaText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#52525b", lineHeight: 24 },
  cta: {
    marginTop: 32,
    backgroundColor: "#000",
    paddingVertical: 16,           // 44+ touch target
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
