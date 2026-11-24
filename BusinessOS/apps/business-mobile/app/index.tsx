import { workspaceColors } from "@businessos/design-tokens";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.title}>
          BusinessOS
        </Text>
        <Text style={styles.description}>Business workspace</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: workspaceColors.background,
  },
  card: {
    backgroundColor: workspaceColors.surface,
    borderRadius: 16,
    padding: 24,
  },
  title: {
    color: workspaceColors.text,
    fontSize: 24,
    fontWeight: "600",
  },
  description: {
    marginTop: 8,
    color: workspaceColors.subtleText,
    fontSize: 16,
  },
});
