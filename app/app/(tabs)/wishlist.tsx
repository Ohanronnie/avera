import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/themed/theme";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { router } from "expo-router";

export default function WishlistScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#0A0A0A]" edges={["top"]}>
      <View className="border-b border-gray-100 bg-white px-5 py-4 dark:border-white/5 dark:bg-[#0A0A0A]">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">
          Wishlist
        </Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-1 items-center justify-center px-10 py-32">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-50 dark:bg-white/5">
            <Ionicons
              name="heart-outline"
              size={40}
              color={isDark ? "#4B5563" : "#9CA3AF"}
            />
          </View>

          <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
            Nothing saved yet
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Save products you like and come back to them later.
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(tabs)/home")}
            className="mt-8 rounded-2xl bg-brand px-8 py-4"
            activeOpacity={0.8}
          >
            <Text className="font-bold text-white">Browse Products</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
