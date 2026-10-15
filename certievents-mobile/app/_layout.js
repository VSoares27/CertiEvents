import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../src/contexts/AuthContext";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";

// Silencia o warning de keep-awake do Expo Go em desenvolvimento
LogBox.ignoreLogs(["Unable to activate keep awake"]);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0A0A1A" },
          }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
