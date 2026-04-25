import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/contexts/ThemeContext";

type OnboardingHeaderProps = {
  showBack: boolean;
  showSkip: boolean;
  onBack: () => void;
};

export function OnboardingHeader({
  showBack,
  showSkip,
  onBack,
}: OnboardingHeaderProps) {
  const { isDark } = useTheme();
  const controlIconColor = isDark ? "#FFFFFF" : "#111827";

  return (
    <View className="flex-row items-center justify-between pt-1">
      {showBack ? (
        <Pressable
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
        >
          <Ionicons name="chevron-back" size={18} color={controlIconColor} />
        </Pressable>
      ) : (
        <View className="h-10 w-10" />
      )}

      <Text className="text-xl font-extrabold leading-8 tracking-tight text-brand">
        Avera
      </Text>

      {showSkip ? (
        <Link href="/(auth)/login" asChild>
          <Pressable className="min-h-9 items-center justify-center rounded-full border border-gray-100 bg-gray-50 px-3 dark:border-white/10 dark:bg-white/5">
            <Text className="text-xs font-bold text-gray-700 dark:text-white">
              Skip
            </Text>
          </Pressable>
        </Link>
      ) : (
        <View className="h-9 min-w-16" />
      )}
    </View>
  );
}
