import { useState } from "react";
import { Text } from "@/components/ui/text";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PasswordResetMailStep } from "@/components/auth/password-reset/MailStep";
import { PasswordResetNewPasswordStep } from "@/components/auth/password-reset/NewPasswordStep";
import { PasswordResetOtpStep } from "@/components/auth/password-reset/OtpStep";
import { useTheme } from "@/contexts/ThemeContext";

export default function PasswordResetComponent() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
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
          <View className="max-w-[80%]">
            <Text
              size="4xl"
              className="mb-2 font-bold text-gray-900 dark:text-white"
            >
              Reset Password
            </Text>
            <Text className="mb-6 mt-2 text-lg text-gray-500 dark:text-gray-400">
              {step === 1 && "Enter your email to receive a reset code."}
              {step === 2 && "Enter the code sent to your email."}
              {step === 3 && "Create a new password for your account."}
            </Text>
          </View>

          {step === 1 && (
            <PasswordResetMailStep
              email={email}
              setEmail={setEmail}
              next={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <PasswordResetOtpStep
              otp={otp}
              setOtp={setOtp}
              email={email}
              next={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <PasswordResetNewPasswordStep email={email} otp={otp} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
