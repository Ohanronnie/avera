import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { PasswordResetNewPasswordStepProps } from "@/components/auth/password-reset/types";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useToast } from "@/contexts/ToastContext";
import { axiosInstance } from "@/utils/axios";

export function PasswordResetNewPasswordStep({
  email,
  otp,
}: PasswordResetNewPasswordStepProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  const resetPassword = async () => {
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
        password,
      )
    ) {
      setError(
        "Password must be at least 8 characters, include uppercase, lowercase, number, and symbol",
      );
      return;
    }

    try {
      await axiosInstance.post("/auth/password-reset/reset", {
        email,
        otp,
        newPassword: password,
      });
      toast.show({
        title: "Password reset",
        description: "Your password has been updated successfully.",
        variant: "success",
      });
      router.replace("/(auth)/login");
    } catch (error: any) {
      toast.show({
        title: "Reset failed",
        description: error?.response?.data?.message || "Reset failed",
        variant: "error",
      });
    }
  };

  return (
    <View>
      <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
        New Password
      </Text>
      <Input
        className="h-14 rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
        variant="outline"
        size="xl"
      >
        <InputField
          type="password"
          placeholder="Enter new password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="h-14 px-4 text-sm text-black dark:text-white"
          placeholderTextColor="#888"
        />
      </Input>

      <Text className="mb-2 mt-6 text-lg font-medium text-gray-900 dark:text-white">
        Confirm New Password
      </Text>
      <Input
        className="h-14 rounded-xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
        variant="outline"
        size="xl"
      >
        <InputField
          type="password"
          placeholder="Confirm new password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          className="h-14 px-4 text-sm text-black dark:text-white"
          placeholderTextColor="#888"
        />
      </Input>
      {error && <Text className="mt-1 text-red-400">{error}</Text>}

      <Button
        size="xl"
        className="mt-8 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
        onPress={resetPassword}
      >
        <ButtonText className="font-bold text-typography-white">
          Reset Password
        </ButtonText>
      </Button>
    </View>
  );
}
