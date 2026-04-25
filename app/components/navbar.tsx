import { Text } from "@/components/themed/theme";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { View } from "react-native";
interface NavbarProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

import { useColorScheme } from "nativewind";

export function Navbar({ title, showBack = true, rightElement }: NavbarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className="flex-row items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#0A0A0A] min-h-[64px]">
      <View className="flex-1 items-start">
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            className="p-2 rounded-2xl active:bg-gray-100 dark:active:bg-white/5"
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={isDark ? "white" : "#111"}
            />
          </Pressable>
        )}
      </View>

      <View className="flex-[2] items-center">
        <Text
          className="font-bold text-lg text-black dark:text-white"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <View className="flex-1 items-end">
        {rightElement || <View className="w-10" />}
      </View>
    </View>
  );
}
