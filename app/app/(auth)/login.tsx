import { useEffect, useState } from "react";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input, InputField } from "@/components/ui/input";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { View, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { useColorScheme } from "nativewind";
import { configureGoogleAuth } from "@/utils/google-auth";
import {
  useEmailLoginMutation,
  useGoogleLoginMutation,
} from "@/features/auth/hooks";
import { useToast } from "@/contexts/ToastContext";
import { AveraLoader } from "@/components/brand/AveraLoader";

const loginSchema = z.object({
  email: z
    .string()
    .nonempty("Email cannot be empty")
    .email("Please provide a valid email address"),
  password: z.string().nonempty("Please enter your password"),
});

type LoginFields = z.infer<typeof loginSchema>;

export default function Login() {
  const [form, setForm] = useState<LoginFields>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoginFields, string>>
  >({});
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();

  const loginMutation = useEmailLoginMutation({
    onLoggedIn: () => {
      router.replace("/(tabs)/home");
    },
    onUnverified: (userId) => {
      router.push(`/(auth)/otp-verification?email=${form.email}&id=${userId}`);
    },
    onFieldErrors: (fieldErrors) => {
      setErrors({
        ...fieldErrors,
        ...(fieldErrors.password
          ? { password: "Invalid email or password." }
          : {}),
      });
    },
    onInvalidCredentials: () => {
      setErrors({ password: "Invalid email or password." });
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

  const handleSignIn = () => {
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        if (typeof issue.path[0] === "string") {
          fieldErrors[issue.path[0]] =
            issue.path[0] === "password"
              ? "Invalid email or password."
              : issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    loginMutation.mutate(form);
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
            Welcome Back
          </Text>
          <Text className="mb-6 mt-2 text-base text-gray-500 dark:text-gray-400">
            Sign in to continue buying, selling, and trading on Avera.
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
              <Ionicons
                name="mail-outline"
                size={20}
                color={isDark ? "rgba(255,255,255,0.45)" : "#6B7280"}
                style={{ marginLeft: 12 }}
              />
              <InputField
                value={form.email}
                placeholder="example123@gmail.com"
                onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
                keyboardType="email-address"
                className="h-14 px-4 text-sm text-black dark:text-white"
                placeholderTextColor="#888"
                autoCapitalize="none"
              />
            </Input>
            {errors.email && (
              <Text className="mt-1 text-red-400">{errors.email}</Text>
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
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={isDark ? "rgba(255,255,255,0.45)" : "#6B7280"}
                style={{ marginLeft: 12 }}
              />
              <InputField
                type={showPassword ? "text" : "password"}
                value={form.password}
                placeholder="Password123@"
                onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
                className="h-14 px-4 text-sm text-black dark:text-white"
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
              <Text className="mt-1 text-red-400">{errors.password}</Text>
            )}
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/password-reset")}
            className="self-end py-2"
          >
            <Text className="text-brand font-bold text-sm">
              Forgot Password?
            </Text>
          </Pressable>

          <Button
            onPress={handleSignIn}
            size="xl"
            className="mt-8 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <AveraLoader size={24} color="#FFFFFF" compact />
            ) : (
              <ButtonText className="font-bold text-typography-white">
                Sign In
              </ButtonText>
            )}
          </Button>

          <View className="mt-6 flex-row items-center justify-center">
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
                <Text className="ml-3 font-bold text-gray-900 dark:text-white">
                  Google
                </Text>
              </>
            )}
          </Button>
        </View>
      </View>

      <View className="mt-auto border-t border-gray-200 pb-6 pt-4 dark:border-white/10">
        <View className="flex-row items-center justify-center">
          <Text className="text-base text-gray-500 dark:text-gray-400">
            Don&apos;t have an account?
          </Text>
          <Pressable
            onPress={() => router.push("/(auth)/register")}
            className="ml-2 px-2 py-1 rounded"
            style={({ pressed }) => [
              { backgroundColor: pressed ? "#1e293b" : "transparent" },
            ]}
          >
            <Text className="text-brand text-base font-semibold">Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
