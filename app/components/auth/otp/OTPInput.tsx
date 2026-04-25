import { useRef, useState } from "react";
import { TextInput, View } from "react-native";

import { useTheme } from "@/contexts/ThemeContext";

type OTPInputProps = {
  correct: null | boolean;
  setOtps: (value: string) => void;
};

export function OTPInput({ correct, setOtps }: OTPInputProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef<any[]>([]);
  const { isDark } = useTheme();

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/[^0-9]/g, "");
    setOtp(newOtp);
    setOtps(newOtp.join(""));

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View className="mb-2 mt-2 w-full flex-row justify-between">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref;
          }}
          className={`h-14 w-12 rounded-2xl border text-center text-xl font-bold text-black dark:text-white ${
            correct == null
              ? "border-gray-200 dark:border-white/10"
              : correct
                ? "border-green-500"
                : "border-red-500"
          }`}
          maxLength={1}
          keyboardType="numeric"
          value={otp[index]}
          onChangeText={(value) => handleOtpChange(value, index)}
          onKeyPress={(event) => handleKeyPress(event, index)}
          selectTextOnFocus
          placeholder="•"
          placeholderTextColor="#888"
          style={{
            backgroundColor: isDark ? "#1A1A1A" : "#F9FAFB",
          }}
        />
      ))}
    </View>
  );
}
