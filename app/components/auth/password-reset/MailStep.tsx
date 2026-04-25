import { useState } from "react";
import { View } from "react-native";

import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { axiosInstance } from "@/utils/axios";
import { PasswordResetMailStepProps } from "@/components/auth/password-reset/types";

export function PasswordResetMailStep({
  email,
  setEmail,
  next,
}: PasswordResetMailStepProps) {
  const [error, setError] = useState("");

  const initiatePasswordReset = async () => {
    setError("");

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      await axiosInstance.post("/auth/password-reset/send-otp", { email });
      next();
    } catch (error: any) {
      setError(error?.response?.data?.message || "Failed to send code");
    }
  };

  return (
    <View className="flex-1 justify-between">
      <View>
        <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          Enter your email address
        </Text>
        <Input
          className="h-14 rounded-2xl border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-[#1A1A1A]"
          variant="outline"
          size="xl"
        >
          <InputField
            placeholder="Enter your email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            className="h-14 px-4 text-sm text-black dark:text-white"
            placeholderTextColor="#888"
          />
        </Input>
        {error && <Text className="mt-1 text-red-400">{error}</Text>}
      </View>

      <Button
        size="xl"
        className="mb-6 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
        onPress={initiatePasswordReset}
      >
        <ButtonText className="font-bold text-typography-white">
          Send Code
        </ButtonText>
      </Button>
    </View>
  );
}
