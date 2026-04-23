import { View } from "react-native";

import { Text } from "@/components/themed/theme";
import { AnimatedAveraLogo } from "./AnimatedAveraLogo";

type AveraLoaderProps = {
  size?: number;
  color?: string;
  label?: string;
  compact?: boolean;
};

export function AveraLoader({
  size = 54,
  color = "#2563EB",
  label,
  compact = false,
}: AveraLoaderProps) {
  return (
    <View className="items-center justify-center">
      <AnimatedAveraLogo size={size} color={color} loop />
      {label ? (
        <Text
          variant="none"
          className={`text-center font-semibold text-gray-500 dark:text-gray-400 ${
            compact ? "mt-1 text-xs" : "mt-3 text-sm"
          }`}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}
