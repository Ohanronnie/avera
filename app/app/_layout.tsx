import { Stack } from "expo-router";
import "../global.css" with { type: "css" };
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { axiosInstance } from "@/utils/axios";
import { StatusBar } from "expo-status-bar";
import { router, useSegments } from "expo-router";
import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";
import { KeyboardProvider } from "react-native-keyboard-controller";

const client = new QueryClient();

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

  useEffect(() => {
    if (firstSegment !== "(tabs)") return;

    const getUser = async () => {
      try {
        const response = await axiosInstance.get("/users/me");
        const data = response.data;
        login(data);
        if (!data.infoUpdated) {
          router.replace("/(auth)/user-info");
        }
      } catch (error: any) {
        const errorResponse = error?.response?.data;
        if (
          errorResponse?.message &&
          (errorResponse.code as string) === "ACCOUNT_NOT_VERIFIED"
        ) {
          return router.replace({
            pathname: "/(auth)/otp-verification",
            params: {
              email: errorResponse.email,
              id: errorResponse.userId,
            },
          });
        }
        console.log(JSON.stringify(error.response));
        return router.replace("/(auth)/login");
      }
    };
    getUser();
  }, [firstSegment, login]);

  return <RootNavigator />;
}

function AppProviders() {
  const { hydrated, isDark } = useTheme();

  useEffect(() => {
    if (!hydrated) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);
  console.log("Theme hydrated:", hydrated, "Dark mode:", isDark);
  return (
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
