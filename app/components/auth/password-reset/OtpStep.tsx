import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { PasswordResetOtpStepProps } from "@/components/auth/password-reset/types";
import { OTPInput } from "@/components/auth/otp/OTPInput";
import { useToast } from "@/contexts/ToastContext";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { axiosInstance } from "@/utils/axios";

export function PasswordResetOtpStep({
  otp,
  setOtp,
  email,
  next,
}: PasswordResetOtpStepProps) {
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(120);
  const toast = useToast();

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  const formatCooldown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const verifyOtp = async () => {
    setError("");

    if (otp.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    try {
      await axiosInstance.post("/auth/password-reset/verify-otp", {
        email,
        otp,
      });
      next();
    } catch (error: any) {
      toast.show({
        title: "Invalid code",
        description: error?.response?.data?.message || "Invalid code",
        variant: "error",
      });
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      await axiosInstance.post("/auth/password-reset/send-otp", { email });
      setResendCooldown(120);
      toast.show({
        title: "Code resent",
        description: `We sent another reset code to ${email}.`,
        variant: "success",
      });
    } catch (error: any) {
      const response = error?.response?.data;

      if (response?.code === "OTP_RESEND_COOLDOWN") {
        setResendCooldown(response.retryAfter ?? 120);
      }

      toast.show({
        title: "Unable to resend",
        description: response?.message || "Failed to resend code",
        variant: "error",
      });
    }
  };

  return (
    <View>
      <Text className="mb-3 text-sm text-gray-500 dark:text-gray-400">
        We sent a reset code to{" "}
        <Text className="font-semibold text-gray-900 dark:text-white">
          {email}
        </Text>
      </Text>
      <OTPInput correct={null} setOtps={setOtp} />
      {error && <Text className="mt-1 text-red-400">{error}</Text>}

      <Button
        size="xl"
        className="mt-8 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
        onPress={verifyOtp}
        disabled={otp.length < 6}
      >
        <ButtonText className="font-bold text-typography-white">
          Verify Code
        </ButtonText>
      </Button>

      <View className="mt-6 flex-row items-center justify-center">
        <Text className="text-gray-500 dark:text-gray-400">
          Didn&apos;t receive the code?
        </Text>
        <Pressable
          className="ml-2 rounded px-2 py-1"
          onPress={resendOtp}
          disabled={resendCooldown > 0}
          style={({ pressed }) => [
            {
              backgroundColor: pressed ? "#1e293b" : "transparent",
              opacity: resendCooldown > 0 ? 0.45 : 1,
            },
          ]}
        >
          <Text className="font-semibold text-brand">
            {resendCooldown > 0
              ? `Resend in ${formatCooldown(resendCooldown)}`
              : "Resend"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
