import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/themed/theme";

type Props = {
  counterpartInitial: string;
  counterpartName: string;
  counterpartOnline: boolean;
  isDark: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenActions: () => void;
};

export function MessageDetailsHeader({
  counterpartInitial,
  counterpartName,
  counterpartOnline,
  isDark,
  onBack,
  onOpenProfile,
  onOpenActions,
}: Props) {
  return (
    <View className="border-b border-gray-100 bg-white px-4 pb-3 pt-3 dark:border-white/5 dark:bg-[#0A0A0A]">
      <View className="flex-row items-center">
        <Pressable
          onPress={onBack}
          className="h-11 w-11 items-center justify-center rounded-full border border-gray-100 bg-gray-50 dark:border-white/10 dark:bg-white/5"
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={isDark ? "white" : "#111827"}
          />
        </Pressable>

        <Pressable onPress={onOpenProfile} className="ml-3 flex-1 flex-row items-center">
          <View className="relative h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
            <Text variant="none" className="text-base font-semibold text-brand">
              {counterpartInitial}
            </Text>
            <View
              className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#0A0A0A] ${
                counterpartOnline ? "bg-emerald-500" : "bg-gray-300"
              }`}
            />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-gray-950 dark:text-white">
              {counterpartName}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              {counterpartOnline ? "Online" : "Offline"} • usually replies fast
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={onOpenActions}
          className="h-11 w-11 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={isDark ? "white" : "#111827"}
          />
        </Pressable>
      </View>
    </View>
  );
}
