import { Stack } from "expo-router";
import "../global.css" with { type: "css"};
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { StatusBar } from "expo-status-bar";

const client = new QueryClient();

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="product" />
      <Stack.Screen name="wallet-asset/[symbol]" />
      <Stack.Screen name="messages" />
    </Stack>
  );
}

function AppProviders() {
  const { isDark } = useTheme();

  return (
    <AuthProvider>
      <GluestackUIProvider mode={isDark ? "dark" : "light"}>
        <ToastProvider>
          <StatusBar style={isDark ? "light" : "dark"} />
          <RootNavigator />
        </ToastProvider>
      </GluestackUIProvider>
    </AuthProvider>
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <AppProviders />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
