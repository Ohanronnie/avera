import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VerificationContent } from "@/components/auth/otp/VerificationContent";
import { useTheme } from "@/contexts/ThemeContext";

export default function OTPVerification() {
  const { email, id } = useLocalSearchParams<{ email: string; id: string }>();
  const { isDark } = useTheme();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="pt-4">
          <Pressable
            onPress={() => router.back()}
            className="ml-4 h-11 w-11 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5"
            style={({ pressed }) => [
              {
                transform: [{ scale: pressed ? 0.97 : 1 }],
                borderColor: pressed
                  ? "#3b82f6"
                  : isDark
                    ? "rgba(255,255,255,0.08)"
                    : "#E5E7EB",
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDark ? "white" : "#181718"}
            />
          </Pressable>
        </View>
        <View className="mt-16 mx-4 flex-1">
          <VerificationContent email={email ?? ""} userId={id ?? ""} />
        </View>
        <View className="mt-auto border-t border-gray-200 pb-6 pt-4 dark:border-white/10">
          <View className="flex-row items-center justify-center">
            <Text className="text-base text-gray-500 dark:text-gray-400">
              Need help?
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/support")}
              className="ml-2 px-2 py-1 rounded"
              style={({ pressed }) => [
                { backgroundColor: pressed ? "#1e293b" : "transparent" },
              ]}
            >
              <Text className="text-brand text-base font-semibold">
                Contact Support
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
