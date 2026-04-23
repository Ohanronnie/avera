import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";

import { AveraLoader } from "@/components/brand/AveraLoader";
import { OTPInput } from "@/components/auth/otp/OTPInput";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useToast } from "@/contexts/ToastContext";
import { axiosInstance } from "@/utils/axios";

type VerificationContentProps = {
  email: string;
  userId: string;
};

export function VerificationContent({
  email,
  userId,
}: VerificationContentProps) {
  const [otps, setOtps] = useState("");
  const [correct, setCorrect] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(false);
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

  const resendOtp = async () => {
    if (resendCooldown > 0) return;

    try {
      await axiosInstance.post(`/auth/resend-otp/${userId}`);
      setResendCooldown(120);
      toast.show({
        title: "Code resent",
        description: `We sent another verification code to ${email}.`,
        variant: "success",
      });
    } catch (error: any) {
      const response = error?.response?.data;

      if (response?.code === "OTP_RESEND_COOLDOWN") {
        setResendCooldown(response.retryAfter ?? 120);
      }

      toast.show({
        title: "Unable to resend",
        description:
          response?.message || "Failed to resend OTP. Please try again.",
        variant: "error",
      });
    }
  };

  const handleSubmit = async () => {
    if (otps.length !== 6) {
      toast.show({
        title: "Invalid code",
        description: "Please enter a valid 6-digit OTP.",
        variant: "error",
      });
      return;
    }

    setLoading(true);

    try {
      await axiosInstance.post("/auth/validate-otp", {
        userId,
        otp: otps,
      });
      setCorrect(true);
      toast.show({
        title: "Verification successful",
        description: "Your account has been verified.",
        variant: "success",
      });
      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 1000);
    } catch (error) {
      setCorrect(false);
      toast.show({
        title: "Invalid code",
        description: "Invalid OTP. Please try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View className="max-w-[80%]">
        <Text
          size="4xl"
          className="mb-2 font-bold text-gray-900 dark:text-white"
        >
          Check Your Email
        </Text>
        <Text className="mb-6 mt-2 text-base text-gray-500 dark:text-gray-400">
          We&apos;ve just sent your verification code to your email address{" "}
          <Text className="font-semibold text-gray-900 dark:text-white">
            {email}
          </Text>
        </Text>
      </View>

      <View className="mt-4">
        <Text className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
          Enter 6-digit code
        </Text>
        <OTPInput correct={correct} setOtps={setOtps} />

        <Button
          size="xl"
          onPress={handleSubmit}
          className="mt-8 h-14 rounded-full bg-brand flex flex-row items-center justify-center"
          disabled={loading}
        >
          {loading ? (
            <AveraLoader size={24} color="#FFFFFF" compact />
          ) : (
            <ButtonText className="font-bold text-typography-white">
              Verify
            </ButtonText>
          )}
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
    </>
  );
}
