import { useEffect, useState } from "react";
import { AveraLoader } from "@/components/brand/AveraLoader";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input, InputField } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { router } from "expo-router";
import {
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { useColorScheme } from "nativewind";
import { configureGoogleAuth } from "@/utils/google-auth";
import {
  useGoogleLoginMutation,
  useRegisterMutation,
} from "@/features/auth/hooks";
import { useToast } from "@/contexts/ToastContext";

// 🔹 Validation schema with Zod
const RegisterSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character",
    ),
});

export default function Register() {
  const [email, setEmail] = useState("");
  const [emailFocus, setEmailFocus] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();

  const registerMutation = useRegisterMutation({
    onRegistered: (response) => {
      router.push(
        `/(auth)/otp-verification?email=${response.email}&id=${response.id}`,
      );
    },
    onFieldErrors: (fieldErrors) => {
      setErrors(fieldErrors);
    },
    onErrorMessage: (message) => {
      setErrors({ email: message });
    },
  });

  const googleLoginMutation = useGoogleLoginMutation({
    onLoggedIn: () => {
      router.replace("/(tabs)/home");
    },
    onErrorMessage: (message) => {
      toast.show({
        title: "Google sign-in failed",
        description: message,
        variant: "error",
      });
    },
  });

  useEffect(() => {
    configureGoogleAuth();
  }, []);

  const handleSubmit = () => {
    setErrors({});

    // 🔹 Run local validation first
    const parsed = RegisterSchema.safeParse({ email, password });
    if (!parsed.success) {
      const issues: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        if (typeof i.path[0] === "string") {
          issues[i.path[0]] = i.message;
        }
      });
      setErrors(issues);
      return;
    }

    registerMutation.mutate({ email, password });
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]">
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
            Create Account
          </Text>
          <Text className="mb-6 mt-2 text-base text-gray-500 dark:text-gray-400">
            Set up your account to start buying, selling, and trading on Avera.
          </Text>
        </View>

        <View className="mt-4">
          <View>
            <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Email address
            </Text>
            <Input
              className="h-14 rounded-2xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
              variant="outline"
              size="xl"
            >
              <InputField
                value={email}
                placeholder="example123@gmail.com"
                onChangeText={setEmail}
                keyboardType="email-address"
                className="h-14 px-4 text-sm text-black dark:text-white"
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                placeholderTextColor="#888"
                autoCapitalize="none"
              />
            </Input>
            {errors.email && (
              <Text className="text-red-400 mt-1">{errors.email}</Text>
            )}
          </View>

          <View className="mt-6">
            <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Password
            </Text>
            <Input
              className="h-14 rounded-2xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
              variant="outline"
              size="xl"
            >
              <InputField
                value={password}
                onChangeText={setPassword}
                type={showPassword ? "text" : "password"}
                placeholder="Password123@"
                className="h-14 px-4 text-sm text-black dark:text-white"
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
                placeholderTextColor="#888"
              />
              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                className="mr-3 h-10 w-10 items-center justify-center"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={isDark ? "rgba(255,255,255,0.45)" : "#6B7280"}
                />
              </Pressable>
            </Input>
            {errors.password && (
              <Text className="text-red-400 mt-1">{errors.password}</Text>
            )}
          </View>

          <Button
            onPress={handleSubmit}
            size="xl"
            className="mt-8 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <AveraLoader size={24} color="#FFFFFF" compact />
            ) : (
              <ButtonText className="font-bold text-typography-white">
                Sign Up
              </ButtonText>
            )}
          </Button>

          <View className="flex-row items-center justify-center mt-6">
            <Divider className="w-[32%] bg-gray-200 dark:bg-white/10" />
            <Text className="mx-2 text-gray-500 dark:text-gray-400">
              Or continue with
            </Text>
            <Divider className="w-[32%] bg-gray-200 dark:bg-white/10" />
          </View>

          <Button
            onPress={() => googleLoginMutation.mutate()}
            variant="outline"
            size="xl"
            className="mt-8 h-14 w-full flex-row items-center justify-center rounded-full border border-gray-100 dark:border-white/10"
            disabled={googleLoginMutation.isPending}
          >
            {googleLoginMutation.isPending ? (
              <AveraLoader
                size={24}
                color={isDark ? "#FFFFFF" : "#111827"}
                compact
              />
            ) : (
              <>
                <Image
                  source={require("@/assets/images/onboarding/google-logo.png")}
                  className="w-5 h-5"
                />
                <ButtonText className="text-black dark:text-white">
                  Google
                </ButtonText>
              </>
            )}
          </Button>
        </View>
      </View>

      <View className="mt-auto border-t border-gray-200 pb-6 pt-4 dark:border-white/10">
        <View className="flex-row items-center justify-center">
          <Text className="text-base text-gray-500 dark:text-gray-400">
            Already have an account?
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="ml-2 px-2 py-1 rounded"
            style={({ pressed }) => [
              { backgroundColor: pressed ? "#1e293b" : "transparent" },
            ]}
          >
            <Text className="text-brand text-base font-semibold">Log In</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
