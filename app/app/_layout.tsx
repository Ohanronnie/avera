import { Stack } from "expo-router";
import "../global.css" with { type: "css" };
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useMeQuery } from "@/features/profile/hooks";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import {
  createAppQueryClient,
  hydrateQueryCache,
  subscribeToQueryCachePersistence,
} from "@/utils/query-cache";
import { StatusBar } from "expo-status-bar";
import { router, useSegments } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { KeyboardProvider } from "react-native-keyboard-controller";

SplashScreen.preventAutoHideAsync().catch(() => {
  // The splash screen may already be hidden in fast refresh.
});

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="product" />
      <Stack.Screen name="product-details" />
      <Stack.Screen name="wallet-asset/[symbol]" />
      <Stack.Screen name="messages" />
      <Stack.Screen name="order/[id]" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="seller" />
      <Stack.Screen name="seller-listings" />
      <Stack.Screen name="wallet-quote" />
      <Stack.Screen name="p2p" />
    </Stack>
  );
}

function AuthGate() {
  const { login } = useAuth();
  const segments = useSegments();
  const firstSegment = segments[0];
  const {
    data: me,
    error,
    isError,
    isSuccess,
  } = useMeQuery(firstSegment === "(tabs)");

  useEffect(() => {
    if (firstSegment !== "(tabs)") return;

    if (isSuccess && me) {
      login(me);
      if (!me.infoUpdated) {
        router.replace("/(auth)/user-info");
      }
      return;
    }

    if (isError) {
      const errorResponse = (error as any)?.response?.data;
      if (
        errorResponse?.message &&
        (errorResponse.code as string) === "ACCOUNT_NOT_VERIFIED"
      ) {
        router.replace({
          pathname: "/(auth)/otp-verification",
          params: {
            email: errorResponse.email,
            id: errorResponse.userId,
          },
        });
        return;
      }
      console.log(JSON.stringify((error as any)?.response));
      router.replace("/(auth)/login");
    }
  }, [error, firstSegment, isError, isSuccess, login, me]);

  return <RootNavigator />;
}

function AppProviders() {
  const { hydrated, isDark } = useTheme();
  const [queryCacheHydrated, setQueryCacheHydrated] = useState(false);
  const client = useMemo(() => createAppQueryClient(), []);

  useEffect(() => {
    hydrateQueryCache(client);
    const unsubscribe = subscribeToQueryCachePersistence(client);
    setQueryCacheHydrated(true);

    return unsubscribe;
  }, [client]);

  useEffect(() => {
    if (!hydrated || !queryCacheHydrated) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, queryCacheHydrated]);
  console.log(
    "Theme hydrated:",
    hydrated,
    "Query cache hydrated:",
    queryCacheHydrated,
    "Dark mode:",
    isDark,
  );

  return (
    <QueryClientProvider client={client}>
      <KeyboardProvider>
        <AuthProvider>
          <GluestackUIProvider mode={isDark ? "dark" : "light"}>
            <ToastProvider>
              <StatusBar style={isDark ? "light" : "dark"} />
              <AuthGate />
            </ToastProvider>
          </GluestackUIProvider>
        </AuthProvider>
      </KeyboardProvider>
    </QueryClientProvider>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AppProviders />
    </ThemeProvider>
  );
}
